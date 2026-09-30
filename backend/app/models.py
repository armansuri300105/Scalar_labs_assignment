import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)

    meetings = relationship("Meeting", back_populates="owner", cascade="all, delete-orphan")


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(String, primary_key=True, index=True) # e.g. "8492041284"
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    meeting_type = Column(String(50), nullable=False, default="instant") # "instant" or "scheduled"
    scheduled_at = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, nullable=False, default=45)
    host_name = Column(String(100), nullable=False, default="Host")
    invite_token = Column(String(64), unique=True, index=True, nullable=False)
    passcode = Column(String(32), nullable=True)
    status = Column(String(50), nullable=False, default="scheduled") # "scheduled", "active", "ended"
    owner_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now, nullable=False)

    # Relationships
    owner = relationship("User", back_populates="meetings")
    participants = relationship("Participant", back_populates="meeting", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="meeting", cascade="all, delete-orphan")
    activities = relationship("MeetingActivity", back_populates="meeting", cascade="all, delete-orphan")



class Participant(Base):
    __tablename__ = "participants"

    id = Column(String, primary_key=True, default=generate_uuid)
    meeting_id = Column(String, ForeignKey("meetings.id"), nullable=False, index=True)
    display_name = Column(String(100), nullable=False)
    role = Column(String(50), nullable=False, default="participant") # "host" or "participant"
    is_muted = Column(Boolean, default=False)
    is_video_off = Column(Boolean, default=False)
    is_hand_raised = Column(Boolean, default=False)
    joined_at = Column(DateTime, default=get_utc_now, nullable=False)
    left_at = Column(DateTime, nullable=True)

    meeting = relationship("Meeting", back_populates="participants")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=generate_uuid)
    meeting_id = Column(String, ForeignKey("meetings.id"), nullable=False, index=True)
    sender_name = Column(String(100), nullable=False)
    sender_role = Column(String(50), nullable=False, default="participant")
    message = Column(Text, nullable=False)
    sent_at = Column(DateTime, default=get_utc_now, nullable=False)

    meeting = relationship("Meeting", back_populates="chat_messages")


class MeetingActivity(Base):
    __tablename__ = "meeting_activities"

    id = Column(String, primary_key=True, default=generate_uuid)
    meeting_id = Column(String, ForeignKey("meetings.id"), nullable=False, index=True)
    activity_type = Column(String(50), nullable=False) # e.g. "created", "joined", "ended"
    details = Column(String(255), nullable=True)
    occurred_at = Column(DateTime, default=get_utc_now, nullable=False)

    meeting = relationship("Meeting", back_populates="activities")
