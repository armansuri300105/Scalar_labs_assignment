from fastapi import FastAPI, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List, Optional
import json

from .database import engine, Base, get_db
from . import models, schemas, crud
from .config import CORS_ORIGINS
from .seed import seed_database
from .websocket_manager import manager

# Initialize SQLite tables
Base.metadata.create_all(bind=engine)

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

# --- Meetings Management ---
@app.get("/api/meetings", response_model=List[schemas.MeetingResponse], tags=["Meetings"])
def list_meetings(
    view: str = Query("upcoming", regex="^(upcoming|recent|all)$"),
    db: Session = Depends(get_db)
):
    if view == "upcoming":
        meetings = crud.get_upcoming_meetings(db)
    elif view == "recent":
        meetings = crud.get_recent_meetings(db)
    else:
        meetings = db.query(models.Meeting).order_by(models.Meeting.created_at.desc()).all()
    
    return [enrich_meeting(m) for m in meetings]

@app.post("/api/meetings/instant", response_model=schemas.MeetingResponse, status_code=status.HTTP_201_CREATED, tags=["Meetings"])
def create_instant_meeting(
    payload: schemas.MeetingCreateInstant = schemas.MeetingCreateInstant(),
    db: Session = Depends(get_db)
):
    host_name = payload.host_name.strip() if payload.host_name and payload.host_name.strip() else "Host"
    meeting = crud.create_instant_meeting(db, title=payload.title, host_name=host_name)
    return enrich_meeting(meeting)

@app.post("/api/meetings/scheduled", response_model=schemas.MeetingResponse, status_code=status.HTTP_201_CREATED, tags=["Meetings"])
def create_scheduled_meeting(
    payload: schemas.MeetingCreateScheduled,
    db: Session = Depends(get_db)
):
    meeting = crud.create_scheduled_meeting(db, payload)
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

    # Assign role: host if specified by the creator, otherwise participant
    role = "host" if payload.role == "host" else "participant"

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

# --- Host Controls (Bonus Features) ---
@app.post("/api/meetings/{meeting_id}/mute-all", tags=["Host Controls"])
async def mute_all(
    meeting_id: str,
    db: Session = Depends(get_db)
):
    meeting = crud.get_meeting(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    crud.mute_all_participants(db, meeting.id)
    await manager.broadcast(meeting.id, {
        "type": "HOST_MUTED_ALL"
    })
    return {"message": "All participants muted by host"}

@app.delete("/api/meetings/{meeting_id}/participants/{participant_id}", tags=["Host Controls"])
async def remove_participant_endpoint(
    meeting_id: str,
    participant_id: str,
    db: Session = Depends(get_db)
):
    meeting = crud.get_meeting(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
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
    db: Session = Depends(get_db)
):
    meeting = crud.end_meeting(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
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
