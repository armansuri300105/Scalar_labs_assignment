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
    display_name: Optional[str] = None
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
    host_name: Optional[str] = None

class MeetingCreateScheduled(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    scheduled_at: datetime
    duration_minutes: int = Field(default=30, gt=0, le=1440)
    host_name: Optional[str] = None
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

class SecuritySettingsUpdate(BaseModel):
    is_locked: Optional[bool] = None
    allow_share_screen: Optional[bool] = None
    allow_chat: Optional[bool] = None
    allow_rename: Optional[bool] = None
    allow_unmute: Optional[bool] = None

class SecuritySettingsResponse(BaseModel):
    is_locked: bool
    allow_share_screen: bool
    allow_chat: bool
    allow_rename: bool
    allow_unmute: bool

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
    owner_id: Optional[str] = None
    is_locked: Optional[bool] = False
    allow_share_screen: Optional[bool] = True
    allow_chat: Optional[bool] = True
    allow_rename: Optional[bool] = True
    allow_unmute: Optional[bool] = True
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

# --- Authentication & User Schemas ---
class UserRegister(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=6, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=100)

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        clean = v.strip().lower()
        if "@" not in clean or "." not in clean:
            raise ValueError("Please provide a valid email address.")
        return clean

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Full name cannot be blank.")
        return v.strip()

class UserLogin(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        return v.strip().lower()

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    created_at: datetime

    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    user: UserResponse
    token: str

