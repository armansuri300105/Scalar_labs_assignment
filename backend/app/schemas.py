from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime

# --- Participant Schemas ---
class ParticipantBase(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=100)
    role: str = Field(default="participant")

class ParticipantCreate(ParticipantBase):
    pass

class ParticipantResponse(ParticipantBase):
    id: str
    meeting_id: str
    is_muted: bool = False
    is_video_off: bool = False
    is_hand_raised: bool = False
    joined_at: datetime
    left_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ParticipantUpdate(BaseModel):
    is_muted: Optional[bool] = None
    is_video_off: Optional[bool] = None
    is_hand_raised: Optional[bool] = None

# --- Chat Message Schemas ---
class ChatMessageCreate(BaseModel):
    sender_name: str = Field(..., min_length=1, max_length=100)
    message: str = Field(..., min_length=1)
    sender_role: Optional[str] = "participant"

class ChatMessageResponse(BaseModel):
    id: str
    meeting_id: str
    sender_name: str
    sender_role: str
    message: str
    sent_at: datetime

    class Config:
        from_attributes = True

# --- Meeting Schemas ---
class MeetingCreateInstant(BaseModel):
    title: Optional[str] = "Instant Meeting"
    host_name: Optional[str] = "Default User"

class MeetingCreateScheduled(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    scheduled_at: datetime
    duration_minutes: int = Field(default=30, gt=0, le=1440)
    host_name: Optional[str] = "Default User"
    passcode: Optional[str] = None

    @field_validator("title")
    @classmethod
    def validate_title_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Meeting title cannot be blank or empty.")
        return v.strip()

class MeetingResolveRequest(BaseModel):
    query: str = Field(..., min_length=1)

class MeetingJoinRequest(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=100)
    passcode: Optional[str] = None
    role: Optional[str] = "participant"

    @field_validator("display_name")
    @classmethod
    def validate_name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Display name cannot be blank or whitespace.")
        return v.strip()

class MeetingResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    meeting_type: str
    scheduled_at: Optional[datetime] = None
    duration_minutes: int
    host_name: str
    invite_token: str
    passcode: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    participant_count: Optional[int] = 0
    invite_url: Optional[str] = None

    class Config:
        from_attributes = True

class MeetingDetailResponse(MeetingResponse):
    participants: List[ParticipantResponse] = []
    chat_messages: List[ChatMessageResponse] = []

class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    version: str = "1.0.0"
