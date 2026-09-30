import random
import secrets
import re
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from . import models, schemas

def generate_meeting_id() -> str:
    """Generate a realistic 10-digit Zoom meeting ID, e.g. 8492041284"""
    first_digit = str(random.randint(1, 9))
    rest = "".join([str(random.randint(0, 9)) for _ in range(9)])
    return first_digit + rest

def generate_invite_token() -> str:
    """Generate a clean URL-safe invite token"""
    return secrets.token_urlsafe(12)

def clean_meeting_id(raw: str) -> str:
    """Strip spaces, dashes, parentheses from meeting ID string"""
    return re.sub(r"[^a-zA-Z0-9_-]", "", raw)

def get_meeting(db: Session, meeting_id: str) -> Optional[models.Meeting]:
    clean_id = clean_meeting_id(meeting_id)
    return db.query(models.Meeting).filter(models.Meeting.id == clean_id).first()

def get_meeting_by_token(db: Session, token: str) -> Optional[models.Meeting]:
    return db.query(models.Meeting).filter(models.Meeting.invite_token == token.strip()).first()

def resolve_meeting_query(db: Session, query_str: str) -> Optional[models.Meeting]:
    query_str = query_str.strip()
    if not query_str:
        return None

    # Check if it's an invite URL: e.g. .../invite/TOKEN or .../meeting/ID
    if "/invite/" in query_str:
        token = query_str.split("/invite/")[-1].split("?")[0].strip("/")
        meeting = get_meeting_by_token(db, token)
        if meeting:
            return meeting

    if "/meeting/" in query_str:
        mid = query_str.split("/meeting/")[-1].split("?")[0].strip("/")
        meeting = get_meeting(db, mid)
        if meeting:
            return meeting

    # Check direct token match
    meeting = get_meeting_by_token(db, query_str)
    if meeting:
        return meeting

    # Check cleaned meeting ID match
    clean_id = clean_meeting_id(query_str)
    meeting = get_meeting(db, clean_id)
    if meeting:
        return meeting

    return None

def create_instant_meeting(
    db: Session,
    title: Optional[str] = None,
    host_name: str = "Host",
    owner_id: Optional[str] = None
) -> models.Meeting:
    # Ensure unique ID
    for _ in range(10):
        mid = generate_meeting_id()
        if not get_meeting(db, mid):
            break
    
    token = generate_invite_token()
    meeting_title = title if title and title.strip() else f"{host_name}'s Personal Meeting Room"
    
    meeting = models.Meeting(
        id=mid,
        title=meeting_title,
        description="Instant video meeting created via Zoom Quick Actions",
        meeting_type="instant",
        scheduled_at=datetime.now(timezone.utc),
        duration_minutes=45,
        host_name=host_name,
        invite_token=token,
        owner_id=owner_id,
        status="active"
    )
    db.add(meeting)
    
    activity = models.MeetingActivity(
        meeting_id=mid,
        activity_type="created",
        details=f"Instant meeting started by {host_name}"
    )
    db.add(activity)

    db.commit()
    db.refresh(meeting)
    return meeting

def create_scheduled_meeting(
    db: Session,
    meeting_in: schemas.MeetingCreateScheduled,
    owner_id: Optional[str] = None,
    default_host_name: Optional[str] = None
) -> models.Meeting:
    for _ in range(10):
        mid = generate_meeting_id()
        if not get_meeting(db, mid):
            break

    token = generate_invite_token()
    passcode = meeting_in.passcode if meeting_in.passcode else f"{random.randint(100000, 999999)}"

    # If scheduled_at has no tzinfo, assume UTC
    sched_time = meeting_in.scheduled_at
    if sched_time.tzinfo is None:
        sched_time = sched_time.replace(tzinfo=timezone.utc)

    host_name = meeting_in.host_name if meeting_in.host_name and meeting_in.host_name.strip() else (default_host_name or "Host")

    meeting = models.Meeting(
        id=mid,
        title=meeting_in.title,
        description=meeting_in.description,
        meeting_type="scheduled",
        scheduled_at=sched_time,
        duration_minutes=meeting_in.duration_minutes,
        host_name=host_name,
        invite_token=token,
        passcode=passcode,
        owner_id=owner_id,
        status="scheduled"
    )
    db.add(meeting)

    activity = models.MeetingActivity(
        meeting_id=mid,
        activity_type="scheduled",
        details=f"Meeting scheduled for {sched_time.isoformat()} ({meeting_in.duration_minutes} min)"
    )
    db.add(activity)

    db.commit()
    db.refresh(meeting)
    return meeting

def get_user_meetings(
    db: Session,
    user_id: str,
    user_name: Optional[str] = None,
    view: str = "upcoming"
) -> List[models.Meeting]:
    """Retrieve only meetings owned by or authorized for the given user."""
    filters = [models.Meeting.owner_id == user_id]
    if user_name and user_name.strip():
        filters.append(models.Meeting.host_name.ilike(user_name.strip()))

    query = db.query(models.Meeting).filter(or_(*filters))

    if view == "upcoming":
        return (
            query.filter(models.Meeting.status.in_(["scheduled", "active"]))
            .order_by(models.Meeting.scheduled_at.asc(), models.Meeting.created_at.desc())
            .all()
        )
    elif view == "recent":
        return query.order_by(models.Meeting.created_at.desc()).limit(20).all()
    else:
        return query.order_by(models.Meeting.created_at.desc()).all()

def get_upcoming_meetings(db: Session, limit: int = 20) -> List[models.Meeting]:
    """Retrieve scheduled or currently active meetings."""
    return (
        db.query(models.Meeting)
        .filter(models.Meeting.status.in_(["scheduled", "active"]))
        .order_by(models.Meeting.scheduled_at.asc(), models.Meeting.created_at.desc())
        .limit(limit)
        .all()
    )

def get_recent_meetings(db: Session, limit: int = 20) -> List[models.Meeting]:
    """Retrieve recent or ended meetings."""
    return (
        db.query(models.Meeting)
        .order_by(models.Meeting.created_at.desc())
        .limit(limit)
        .all()
    )

# --- User Management CRUD ---
def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email.strip().lower()).first()

def get_user_by_id(db: Session, user_id: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()

def create_user(db: Session, email: str, password_hash: str, full_name: str) -> models.User:
    user = models.User(
        email=email.strip().lower(),
        password_hash=password_hash,
        full_name=full_name.strip()
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def join_meeting(
    db: Session,
    meeting_id: str,
    display_name: str,
    role: str = "participant"
) -> models.Participant:
    clean_id = clean_meeting_id(meeting_id)

    participant = models.Participant(
        meeting_id=clean_id,
        display_name=display_name,
        role=role,
        is_muted=False,
        is_video_off=False
    )
    db.add(participant)

    activity = models.MeetingActivity(
        meeting_id=clean_id,
        activity_type="joined",
        details=f"{display_name} ({role}) joined the meeting"
    )
    db.add(activity)

    db.commit()
    db.refresh(participant)
    return participant

def leave_meeting(
    db: Session,
    meeting_id: str,
    participant_id: str
) -> Optional[models.Participant]:
    clean_id = clean_meeting_id(meeting_id)
    participant = (
        db.query(models.Participant)
        .filter(
            models.Participant.meeting_id == clean_id,
            models.Participant.id == participant_id
        )
        .first()
    )
    if participant:
        participant.left_at = datetime.now(timezone.utc)
        activity = models.MeetingActivity(
            meeting_id=clean_id,
            activity_type="left",
            details=f"{participant.display_name} left the meeting"
        )
        db.add(activity)
        db.commit()
        db.refresh(participant)
    return participant

def get_participants(db: Session, meeting_id: str, active_only: bool = True) -> List[models.Participant]:
    clean_id = clean_meeting_id(meeting_id)
    query = db.query(models.Participant).filter(models.Participant.meeting_id == clean_id)
    if active_only:
        query = query.filter(models.Participant.left_at.is_(None))
    return query.order_by(models.Participant.joined_at.asc()).all()

def get_participant_by_id(db: Session, meeting_id: str, participant_id: str) -> Optional[models.Participant]:
    clean_id = clean_meeting_id(meeting_id)
    return db.query(models.Participant).filter(
        models.Participant.meeting_id == clean_id,
        models.Participant.id == participant_id
    ).first()

def update_participant_status(
    db: Session,
    meeting_id: str,
    participant_id: str,
    display_name: Optional[str] = None,
    is_muted: Optional[bool] = None,
    is_video_off: Optional[bool] = None,
    is_hand_raised: Optional[bool] = None
) -> Optional[models.Participant]:
    clean_id = clean_meeting_id(meeting_id)
    participant = (
        db.query(models.Participant)
        .filter(
            models.Participant.meeting_id == clean_id,
            models.Participant.id == participant_id
        )
        .first()
    )
    if participant:
        if display_name is not None and display_name.strip():
            participant.display_name = display_name.strip()
        if is_muted is not None:
            participant.is_muted = is_muted
        if is_video_off is not None:
            participant.is_video_off = is_video_off
        if is_hand_raised is not None:
            participant.is_hand_raised = is_hand_raised
        db.commit()
        db.refresh(participant)
    return participant

def mute_all_participants(db: Session, meeting_id: str, except_host: bool = True):
    clean_id = clean_meeting_id(meeting_id)
    query = db.query(models.Participant).filter(
        models.Participant.meeting_id == clean_id,
        models.Participant.left_at.is_(None)
    )
    if except_host:
        query = query.filter(models.Participant.role != "host")
    participants = query.all()
    for p in participants:
        p.is_muted = True
    db.commit()
    return participants

def remove_participant(db: Session, meeting_id: str, participant_id: str) -> bool:
    clean_id = clean_meeting_id(meeting_id)
    participant = (
        db.query(models.Participant)
        .filter(
            models.Participant.meeting_id == clean_id,
            models.Participant.id == participant_id
        )
        .first()
    )
    if participant:
        participant.left_at = datetime.now(timezone.utc)
        db.commit()
        return True
    return False

def end_meeting(db: Session, meeting_id: str) -> Optional[models.Meeting]:
    clean_id = clean_meeting_id(meeting_id)
    meeting = get_meeting(db, clean_id)
    if meeting:
        meeting.status = "ended"
        # mark all participants as left
        now = datetime.now(timezone.utc)
        for p in meeting.participants:
            if not p.left_at:
                p.left_at = now
        activity = models.MeetingActivity(
            meeting_id=clean_id,
            activity_type="ended",
            details="Meeting ended by host"
        )
        db.add(activity)
        db.commit()
        db.refresh(meeting)
    return meeting

def add_chat_message(
    db: Session,
    meeting_id: str,
    sender_name: str,
    sender_role: str,
    message: str
) -> models.ChatMessage:
    clean_id = clean_meeting_id(meeting_id)
    chat = models.ChatMessage(
        meeting_id=clean_id,
        sender_name=sender_name,
        sender_role=sender_role,
        message=message
    )
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return chat

def get_chat_messages(db: Session, meeting_id: str) -> List[models.ChatMessage]:
    clean_id = clean_meeting_id(meeting_id)
    return (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.meeting_id == clean_id)
        .order_by(models.ChatMessage.sent_at.asc())
        .all()
    )
