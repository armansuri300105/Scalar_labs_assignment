import os
import hmac
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .database import get_db
from . import models

# Configurable JWT settings
JWT_SECRET = os.getenv("JWT_SECRET", "scalar-zoom-jwt-super-secret-key-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRES_DAYS = 7

# NIST-compliant PBKDF2 password hashing (pure Python, zero binary issues)
def hash_password(password: str) -> str:
    salt = os.urandom(16).hex()
    pwd_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt),
        100000
    ).hex()
    return f"{salt}${pwd_hash}"

def verify_password(plain_password: str, stored_hash: str) -> bool:
    try:
        salt, pwd_hash = stored_hash.split("$", 1)
        check_hash = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            bytes.fromhex(salt),
            100000
        ).hex()
        return hmac.compare_digest(pwd_hash, check_hash)
    except Exception:
        return False

def create_access_token(user_id: str, email: str) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=JWT_EXPIRES_DAYS)
    payload = {
        "sub": user_id,
        "email": email,
        "iat": now,
        "exp": expire
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except (jwt.PyJWTError, Exception):
        return None

# HTTP Bearer security schemes
security = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> models.User:
    """Enforce authentication on protected endpoints."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in to manage or host meetings.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    payload = decode_access_token(credentials.credentials)
    if not payload or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    user = db.query(models.User).filter(models.User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return user

def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[models.User]:
    """Optional authentication for endpoints accessible to both hosts and guests."""
    if not credentials or not credentials.credentials:
        return None
    payload = decode_access_token(credentials.credentials)
    if not payload or not payload.get("sub"):
        return None
    return db.query(models.User).filter(models.User.id == payload["sub"]).first()
