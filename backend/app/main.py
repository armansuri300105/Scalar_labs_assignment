from fastapi import FastAPI, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List, Optional
import json

from .database import engine, Base, get_db
from . import models, schemas, crud, auth
from .config import CORS_ORIGINS
from .seed import seed_database
from .websocket_manager import manager
from sqlalchemy import text

# Initialize SQLite tables
Base.metadata.create_all(bind=engine)

# Auto-migrate SQLite schema if new columns are missing
try:
    with engine.connect() as conn:
        res = conn.execute(text("PRAGMA table_info(meetings);"))
        columns = [row[1] for row in res.fetchall()]
        if columns and "owner_id" not in columns:
            conn.execute(text("ALTER TABLE meetings ADD COLUMN owner_id VARCHAR;"))
            conn.commit()
except Exception as _e:
    pass

app = FastAPI(
    title="Zoom Clone REST API",
    description="Backend services for Zoom Clone web app replicating Zoom's design, meetings, participants, and host controls.",
    version="1.0.0"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # allow all for seamless local and cloud deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def enrich_meeting(m: models.Meeting) -> dict:
    data = {
        "id": m.id,
        "title": m.title,
        "description": m.description,
        "meeting_type": m.meeting_type,
        "scheduled_at": m.scheduled_at,
        "duration_minutes": m.duration_minutes,
        "host_name": m.host_name,
        "invite_token": m.invite_token,
        "passcode": m.passcode,
        "status": m.status,
        "owner_id": m.owner_id,
        "created_at": m.created_at,
        "updated_at": m.updated_at,
        "participant_count": len([p for p in m.participants if not p.left_at]) if m.participants else 0,
        "invite_url": f"/invite/{m.invite_token}"
    }
    return data

# --- Health Check ---
@app.get("/health", response_model=schemas.HealthResponse, tags=["System"])
@app.get("/api/health", response_model=schemas.HealthResponse, tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc),
        "version": "1.0.0"
    }

@app.post("/api/database/reset", tags=["System"])
def reset_database(db: Session = Depends(get_db)):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    return {
        "status": "success",
        "message": "All database records have been deleted. Database is completely fresh."
    }

# --- Authentication & Authorization Endpoints ---
@app.post("/api/auth/register", response_model=schemas.AuthResponse, status_code=status.HTTP_201_CREATED, tags=["Auth"])
def register(
    payload: schemas.UserRegister,
    db: Session = Depends(get_db)
):
    existing = crud.get_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please log in."
        )
    hashed_pwd = auth.hash_password(payload.password)
    user = crud.create_user(
        db,
        email=payload.email,
        password_hash=hashed_pwd,
        full_name=payload.full_name
    )
    token = auth.create_access_token(user.id, user.email)
    return {
        "user": user,
        "token": token
    }

@app.post("/api/auth/login", response_model=schemas.AuthResponse, tags=["Auth"])
def login(
    payload: schemas.UserLogin,
    db: Session = Depends(get_db)
):
    user = crud.get_user_by_email(db, payload.email)
    if not user or not auth.verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please verify your credentials."
        )
    token = auth.create_access_token(user.id, user.email)
    return {
        "user": user,
        "token": token
    }

@app.get("/api/auth/me", response_model=schemas.UserResponse, tags=["Auth"])
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

# --- Meetings Management (Authenticated & Authorized) ---
@app.get("/api/meetings", response_model=List[schemas.MeetingResponse], tags=["Meetings"])
def list_meetings(
    view: str = Query("upcoming", regex="^(upcoming|recent|all)$"),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    meetings = crud.get_user_meetings(db, user_id=current_user.id, user_name=current_user.full_name, view=view)
    return [enrich_meeting(m) for m in meetings]

@app.post("/api/meetings/instant", response_model=schemas.MeetingResponse, status_code=status.HTTP_201_CREATED, tags=["Meetings"])
def create_instant_meeting(
    payload: schemas.MeetingCreateInstant = schemas.MeetingCreateInstant(),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    host_name = payload.host_name.strip() if payload.host_name and payload.host_name.strip() and payload.host_name.strip() != "Host" else current_user.full_name
    meeting = crud.create_instant_meeting(
        db,
        title=payload.title,
        host_name=host_name,
        owner_id=current_user.id
    )
    return enrich_meeting(meeting)

@app.post("/api/meetings/scheduled", response_model=schemas.MeetingResponse, status_code=status.HTTP_201_CREATED, tags=["Meetings"])
def create_scheduled_meeting(
    payload: schemas.MeetingCreateScheduled,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    meeting = crud.create_scheduled_meeting(
        db,
        payload,
        owner_id=current_user.id,
        default_host_name=current_user.full_name
    )
    return enrich_meeting(meeting)

@app.post("/api/meetings/resolve", response_model=schemas.MeetingResponse, tags=["Meetings"])
def resolve_meeting(
    payload: schemas.MeetingResolveRequest,
    db: Session = Depends(get_db)
):
    meeting = crud.resolve_meeting_query(db, payload.query)
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found. Please verify the meeting ID or invitation link."
        )
    return enrich_meeting(meeting)

@app.get("/api/meetings/{meeting_id}", response_model=schemas.MeetingDetailResponse, tags=["Meetings"])
def get_meeting_details(
    meeting_id: str,
    db: Session = Depends(get_db)
):
    meeting = crud.get_meeting(db, meeting_id)
    if not meeting:
        # Check by invite token as well
        meeting = crud.get_meeting_by_token(db, meeting_id)
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found."
        )
    
    data = enrich_meeting(meeting)
    active_participants = crud.get_participants(db, meeting.id, active_only=True)
    chat_messages = crud.get_chat_messages(db, meeting.id)
    
    data["participants"] = active_participants
    data["chat_messages"] = chat_messages
    return data

@app.get("/api/invites/{token}", response_model=schemas.MeetingResponse, tags=["Meetings"])
def get_meeting_by_invite(
    token: str,
    db: Session = Depends(get_db)
):
    meeting = crud.get_meeting_by_token(db, token)
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid invitation link or token."
        )
    return enrich_meeting(meeting)

# --- Join & Participant Controls ---
@app.post("/api/meetings/{meeting_id}/join", response_model=schemas.ParticipantResponse, tags=["Participants"])
async def join_meeting_endpoint(
    meeting_id: str,
    payload: schemas.MeetingJoinRequest,
    current_user: Optional[models.User] = Depends(auth.get_optional_user),
    db: Session = Depends(get_db)
):
    meeting = crud.get_meeting(db, meeting_id)
    if not meeting:
        meeting = crud.get_meeting_by_token(db, meeting_id)
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cannot join: Meeting does not exist."
        )

    # Check passcode if meeting has one and provided
    if meeting.passcode and payload.passcode:
        if payload.passcode.strip() != meeting.passcode.strip():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect meeting passcode."
            )

    # Assign role: If meeting has an owner_id, only the authenticated owner can be host
    if meeting.owner_id:
        if current_user and current_user.id == meeting.owner_id:
            role = "host"
        else:
            role = "participant"
    else:
        # Fallback for meetings created without owner_id
        is_host = (payload.role == "host" or payload.display_name.strip().lower() == meeting.host_name.strip().lower())
        role = "host" if is_host else "participant"

    participant = crud.join_meeting(
        db,
        meeting_id=meeting.id,
        display_name=payload.display_name.strip(),
        role=role
    )

    # If meeting was scheduled, activate it
    if meeting.status == "scheduled":
        meeting.status = "active"
        db.commit()

    return participant

@app.post("/api/meetings/{meeting_id}/leave", tags=["Participants"])
async def leave_meeting_endpoint(
    meeting_id: str,
    participant_id: str = Query(...),
    db: Session = Depends(get_db)
):
    participant = crud.leave_meeting(db, meeting_id, participant_id)
    if participant:
        await manager.broadcast(meeting_id, {
            "type": "PARTICIPANT_LEFT",
            "participant_id": participant_id,
            "display_name": participant.display_name
        })

        # If room is now empty, automatically end the meeting
        remaining = crud.get_participants(db, meeting_id, active_only=True)
        if len(remaining) == 0:
            crud.end_meeting(db, meeting_id)
            await manager.broadcast(meeting_id, {
                "type": "MEETING_ENDED"
            })

    return {"message": "Left meeting successfully"}

@app.get("/api/meetings/{meeting_id}/participants", response_model=List[schemas.ParticipantResponse], tags=["Participants"])
def list_participants(
    meeting_id: str,
    db: Session = Depends(get_db)
):
    meeting = crud.get_meeting(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return crud.get_participants(db, meeting.id, active_only=True)

@app.post("/api/meetings/{meeting_id}/participants/{participant_id}/status", response_model=schemas.ParticipantResponse, tags=["Participants"])
async def update_participant_state(
    meeting_id: str,
    participant_id: str,
    payload: schemas.ParticipantUpdate,
    db: Session = Depends(get_db)
):
    participant = crud.update_participant_status(
        db,
        meeting_id=meeting_id,
        participant_id=participant_id,
        is_muted=payload.is_muted,
        is_video_off=payload.is_video_off,
        is_hand_raised=payload.is_hand_raised
    )
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    await manager.broadcast(meeting_id, {
        "type": "PARTICIPANT_UPDATED",
        "participant": {
            "id": participant.id,
            "display_name": participant.display_name,
            "role": participant.role,
            "is_muted": participant.is_muted,
            "is_video_off": participant.is_video_off,
            "is_hand_raised": participant.is_hand_raised
        }
    })
    return participant

def check_host_authorization(meeting: models.Meeting, user: Optional[models.User]):
    if meeting.owner_id:
        if not user or user.id != meeting.owner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the meeting host/owner is authorized to perform this host action."
            )
    elif user and user.full_name.strip().lower() != meeting.host_name.strip().lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the meeting host is authorized to perform this host action."
        )

# --- Host Controls (Authorized) ---
@app.post("/api/meetings/{meeting_id}/mute-all", tags=["Host Controls"])
async def mute_all(
    meeting_id: str,
    current_user: Optional[models.User] = Depends(auth.get_optional_user),
    db: Session = Depends(get_db)
):
    meeting = crud.get_meeting(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    check_host_authorization(meeting, current_user)
    
    crud.mute_all_participants(db, meeting.id)
    await manager.broadcast(meeting.id, {
        "type": "HOST_MUTED_ALL"
    })
    return {"message": "All participants muted by host"}

@app.delete("/api/meetings/{meeting_id}/participants/{participant_id}", tags=["Host Controls"])
async def remove_participant_endpoint(
    meeting_id: str,
    participant_id: str,
    current_user: Optional[models.User] = Depends(auth.get_optional_user),
    db: Session = Depends(get_db)
):
    meeting = crud.get_meeting(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    check_host_authorization(meeting, current_user)
    
    success = crud.remove_participant(db, meeting.id, participant_id)
    if not success:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    await manager.broadcast(meeting.id, {
        "type": "PARTICIPANT_REMOVED",
        "participant_id": participant_id
    })
    return {"message": "Participant removed by host"}

@app.post("/api/meetings/{meeting_id}/end", tags=["Host Controls"])
async def end_meeting_endpoint(
    meeting_id: str,
    current_user: Optional[models.User] = Depends(auth.get_optional_user),
    db: Session = Depends(get_db)
):
    meeting = crud.get_meeting(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    check_host_authorization(meeting, current_user)
    
    crud.end_meeting(db, meeting_id)
    await manager.broadcast(meeting_id, {
        "type": "MEETING_ENDED"
    })
    return {"message": "Meeting ended for all"}

# --- Chat In-Meeting ---
@app.get("/api/meetings/{meeting_id}/messages", response_model=List[schemas.ChatMessageResponse], tags=["Chat"])
def get_messages(
    meeting_id: str,
    db: Session = Depends(get_db)
):
    meeting = crud.get_meeting(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return crud.get_chat_messages(db, meeting.id)

@app.post("/api/meetings/{meeting_id}/messages", response_model=schemas.ChatMessageResponse, status_code=status.HTTP_201_CREATED, tags=["Chat"])
async def send_chat_message(
    meeting_id: str,
    payload: schemas.ChatMessageCreate,
    db: Session = Depends(get_db)
):
    meeting = crud.get_meeting(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    chat = crud.add_chat_message(
        db,
        meeting_id=meeting.id,
        sender_name=payload.sender_name,
        sender_role=payload.sender_role or "participant",
        message=payload.message
    )
    
    msg_dict = {
        "id": chat.id,
        "meeting_id": chat.meeting_id,
        "sender_name": chat.sender_name,
        "sender_role": chat.sender_role,
        "message": chat.message,
        "sent_at": chat.sent_at.isoformat()
    }
    
    await manager.broadcast(meeting.id, {
        "type": "CHAT_MESSAGE",
        "message": msg_dict
    })
    return chat

# --- Real-Time WebSocket Endpoint ---
@app.websocket("/ws/meeting/{meeting_id}")
async def meeting_websocket(
    websocket: WebSocket,
    meeting_id: str,
    display_name: str = Query("Guest"),
    participant_id: str = Query(""),
    role: str = Query("participant"),
    db: Session = Depends(get_db)
):
    p_info = {
        "id": participant_id,
        "display_name": display_name,
        "role": role,
        "is_muted": False,
        "is_video_off": False
    }
    await manager.connect(meeting_id, websocket, p_info)
    try:
        while True:
            raw_text = await websocket.receive_text()
            data = json.loads(raw_text)
            event_type = data.get("type")

            if event_type == "REACTION":
                # emoji reactions (e.g. clap, thumbs up, heart, joy, surprised, tada)
                await manager.broadcast(meeting_id, {
                    "type": "REACTION",
                    "sender_name": display_name,
                    "emoji": data.get("emoji", "👍")
                })
            elif event_type == "SIGNAL":
                # WebRTC peer signaling (offer/answer/ice-candidate)
                target_id = data.get("target")
                if target_id:
                    await manager.send_to_user(meeting_id, target_id, {
                        "type": "SIGNAL",
                        "sender": participant_id,
                        "payload": data.get("payload")
                    })
            elif event_type == "CHAT":
                # Chat message via socket
                content = data.get("message", "").strip()
                if content:
                    chat = crud.add_chat_message(
                        db,
                        meeting_id=meeting_id,
                        sender_name=display_name,
                        sender_role=role,
                        message=content
                    )
                    await manager.broadcast(meeting_id, {
                        "type": "CHAT_MESSAGE",
                        "message": {
                            "id": chat.id,
                            "meeting_id": chat.meeting_id,
                            "sender_name": chat.sender_name,
                            "sender_role": chat.sender_role,
                            "message": chat.message,
                            "sent_at": chat.sent_at.isoformat()
                        }
                    })
    except WebSocketDisconnect:
        left_info = manager.disconnect(meeting_id, websocket)
        if left_info:
            await manager.broadcast(meeting_id, {
                "type": "PARTICIPANT_LEFT",
                "participant_id": left_info.get("id"),
                "display_name": left_info.get("display_name")
            })
