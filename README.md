# Zoom Clone — Modern Video Conferencing Platform
> **Scaler SDE Fullstack Assignment**  
> A full-featured, secure, and production-ready web application replicating Zoom's user experience, design system, and core video conferencing workflows.

---

## 🌟 Overview

This project is a high-fidelity fullstack clone of the **Zoom Web Application**, designed to match Zoom's interface, responsiveness, and meeting lifecycle. Built with a modern **FastAPI** Python backend, **Next.js 16 (Turbopack)** frontend, **SQLite** relational database, and real-time **WebSockets**, it provides an intuitive platform where authenticated users can host, schedule, and moderate meetings while guests can seamlessly join with meeting IDs or invitation links.

---

## 🛠️ Tech Stack

| Layer | Technology | Key Libraries / Frameworks |
|---|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript | Tailwind CSS v4, Lucide React, WebRTC / MediaStream APIs |
| **Backend** | Python 3.11+, FastAPI | SQLAlchemy 2.0, Pydantic v2, WebSockets, PassLib, PyJWT, Uvicorn |
| **Database** | SQLite (with foreign key enforcement) | Custom relational schema with cascading relationships & seed data |
| **Real-Time** | WebSockets & WebRTC Signaling | Real-time participant state sync, chat, emoji reactions, peer signaling |

---

## 🏗️ Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────┐
│                      Next.js SPA Frontend                   │
│  (Dashboard, Lobby, Video Grid, Chat, Modals, Controls)     │
└──────────────┬───────────────────────────────▲──────────────┘
               │ HTTP REST (JWT Bearer Token)  │ WebSocket Events
               ▼                               │ (Signaling, Chat,
┌──────────────────────────────────────────────┴──────────────┐
│                    FastAPI Backend Server                   │
│  - REST API Endpoints (/auth, /meetings, /join, /security)  │
│  - Real-time Connection Manager (/ws/meeting/{id})          │
│  - Host Ownership & Anti-Impersonation Verification         │
│  - Input Validation & Error Handling (Pydantic v2)          │
└──────────────┬──────────────────────────────────────────────┘
               │ SQLAlchemy ORM
               ▼
┌─────────────────────────────────────────────────────────────┐
│                     SQLite Relational Database              │
│    [users] ◄───► [meetings] ◄───► [participants]            │
│                       ▲                                     │
│                       ├───► [chat_messages]                 │
│                       └───► [meeting_activities]            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Design & Schema

The relational schema is implemented using SQLAlchemy in `backend/app/models.py` with foreign key constraints and cascading deletes.

### 1. `users` Table
Stores registered hosts and authenticated accounts.
- `id` (VARCHAR(36), PK): UUID.
- `email` (VARCHAR(255), Unique, Indexed): User email address.
- `password_hash` (VARCHAR(255)): Bcrypt-hashed password.
- `full_name` (VARCHAR(100)): Full name / host display name.
- `created_at` (DATETIME): Registration timestamp (UTC).

### 2. `meetings` Table
Stores all meeting sessions (both instant and scheduled).
- `id` (VARCHAR(32), PK, Indexed): Formatted Zoom Meeting ID (e.g. `849 204 1284`).
- `title` (VARCHAR(255), Not Null): Topic/title of the meeting.
- `description` (TEXT, Nullable): Meeting agenda or description.
- `meeting_type` (VARCHAR(50)): `instant` or `scheduled`.
- `scheduled_at` (DATETIME, Nullable): Scheduled date and time in UTC.
- `duration_minutes` (INTEGER): Duration in minutes (default: 45).
- `host_name` (VARCHAR(100)): Display name of the meeting host.
- `owner_id` (VARCHAR(36), FK -> `users.id`, Nullable, Indexed): ID of the meeting creator.
- `invite_token` (VARCHAR(64), Unique, Indexed): URL-safe token for shareable links.
- `passcode` (VARCHAR(32), Nullable): 6-digit meeting passcode.
- `status` (VARCHAR(50)): `scheduled`, `active`, or `ended`.
- `is_locked` (BOOLEAN): If true, prevents new participants from joining.
- `allow_share_screen` (BOOLEAN): Security policy for screen sharing.
- `allow_chat` (BOOLEAN): Security policy for in-meeting chat.
- `allow_rename` (BOOLEAN): Security policy allowing participants to rename themselves.
- `allow_unmute` (BOOLEAN): Security policy allowing participants to unmute their mic.
- `created_at`, `updated_at` (DATETIME): Audit timestamps (UTC).

### 3. `participants` Table
Tracks meeting attendees, their verified roles, and live media states.
- `id` (VARCHAR(36), PK): UUID.
- `meeting_id` (VARCHAR(32), FK -> `meetings.id`, Indexed): Meeting identifier.
- `display_name` (VARCHAR(100), Not Null): Participant's display name.
- `role` (VARCHAR(50)): `host` or `participant`.
- `is_muted` (BOOLEAN): Microphone mute state.
- `is_video_off` (BOOLEAN): Camera off state.
- `is_hand_raised` (BOOLEAN): Raised hand state.
- `joined_at` (DATETIME): Join timestamp (UTC).
- `left_at` (DATETIME, Nullable): Departure timestamp (UTC).

### 4. `chat_messages` Table
Maintains the real-time chat history for meetings.
- `id` (VARCHAR(36), PK): UUID.
- `meeting_id` (VARCHAR(32), FK -> `meetings.id`, Indexed): Meeting identifier.
- `sender_name` (VARCHAR(100)): Sender display name.
- `sender_role` (VARCHAR(50)): `host` or `participant`.
- `message` (TEXT): Chat message body.
- `sent_at` (DATETIME): Message timestamp (UTC).

### 5. `meeting_activities` Table
Audit trail for meeting lifecycle events (creation, participant joins, departure, end).

---

## 🚀 Key Features

### 1. Modern Dashboard Experience
- **Zoom Visual Style**: Zoom signature blue (`#0E71EB`), responsive layout, and dark/light mode support.
- **Streamlined Navigation**:
  - **Sidebar**: Focused on active workflows — **Home**, **Meetings**, and **Recordings** (non-functional mock placeholders have been removed for clarity).
  - **Top Navbar**: Cleaned up to display the Zoom brand, search input, and user profile avatar with sign-in/sign-out dropdowns (dead notification and settings buttons removed).
- **Interactive Live Clock Widget**: Real-time clock displaying hours, minutes, seconds, date, and greeting.
- **Four Iconic Quick Action Buttons**:
  1. 🟠 **New Meeting** (Signature Zoom Orange): Instantly creates and launches a new meeting.
  2. 🔵 **Join Meeting**: Opens modal or `/join` to enter a Meeting ID or invite URL.
  3. 🔵 **Schedule Meeting**: Opens date, time, duration, and passcode modal.
  4. 🔵 **Share Screen**: Fast screen share shortcut into a meeting.
- **Upcoming & Recent Meetings**:
  - Displays scheduled sessions with Meeting ID, passcode, local time, "Start", "Copy Invite", "Reschedule", and "Delete".
  - Recent meetings history with participant summary.

### 2. User Authentication & Guest Access
- **JWT-Based Authentication**: Secure sign up and sign in (`/api/auth/register`, `/api/auth/login`).
- **Meeting Ownership**: Meetings are linked to authenticated user accounts (`owner_id`), ensuring full meeting management and isolation.
- **Seamless Guest Access**: Unauthenticated participants can join any meeting with a Meeting ID/link and passcode without having to sign up.

### 3. Anti-Impersonation & Strict Host Authorization
- **Host Role Protection**: The `host` role is strictly granted ONLY to the authenticated creator matching `meeting.owner_id`.
- **Anti-Impersonation**: If an unauthenticated guest enters the host's display name, the server automatically appends `"(Guest)"` to eliminate room deception.
- **Database Isolation**: Rejoining or deduplication logic is partitioned by role, preventing participants from hijacking or overwriting active host records.
- **WebSocket Role Verification**: Real-time room presence and role permissions are verified directly against the database participant record rather than trusting client URL query parameters.

### 4. Meeting Lifecycle Management: Reschedule & Delete
- **Reschedule Meetings**: Host can update the meeting topic, description, scheduled date/time, duration, and passcode via the dashboard (`PATCH /api/meetings/{id}`).
- **Delete Meetings**: Host can permanently delete meetings with full cascading cleanup across participants, chat messages, and activities (`DELETE /api/meetings/{id}`).

### 5. Accurate Timezone & Passcode Enforcement
- **Accurate Scheduling**: Meetings are scheduled and displayed in the user's exact local timezone, with standardized ISO 8601 UTC backend storage.
- **Mandatory Passcodes**: Meetings configured with passcodes strictly enforce verification upon joining (`/api/meetings/{id}/join`), returning `401 Unauthorized` for incorrect or missing passcodes. Authenticated hosts automatically bypass passcode entry.

### 6. In-Meeting Host Security Controls
- **Security Modal (`/api/meetings/{id}/security`)**: Host can configure room policies in real-time:
  - **Lock Meeting**: Block new participants from entering.
  - **Allow / Disallow Chat**: Restrict participant chat while preserving host announcements.
  - **Allow / Disallow Unmute**: Prevent participants from unmuting their own microphones.
  - **Allow / Disallow Rename**: Restrict participants from changing their display names.
- **Targeted Ask-to-Unmute**: Host can click "Ask to Unmute" for a participant, which delivers a polite prompt to the user rather than forcefully altering their microphone state.
- **Mute All & Remove Participant**: Host can mute all participants at once or eject any disruptive participant from the room.

### 7. Interactive Meeting Room & Layout
- **Pin & Active Speaker Layout**: Clicking "Pin" on any participant tile makes their video the primary main screen.
- **Horizontal Filmstrip Thumbnail Bar**: In multi-participant meetings, participants remain accessible in a Zoom-style horizontally scrollable thumbnail bar rather than shrinking into an unusable grid.
- **Flicker-Free Screen Sharing**: Screen sharing uses `getDisplayMedia` with dedicated local loopback protection, preventing display flicker on the host's side.
- **Instant Camera Synchronization**: Toggling video immediately enables/disables media tracks with real-time WebRTC renegotiation across all peers.
- **Reactions & Hand Raising**: Cross-device animated floating emoji reactions (👏, 👍, ❤️, 😂, 😮, 🎉) and raised-hand indicators.
- **Refresh Deduplication**: Refreshing the browser reuses existing participant records via session storage, preventing ghost duplicates.
- **Mobile-Responsive UI**: Mobile viewports feature an ergonomic bottom control bar with the "Leave Meeting" button placed on its own row to avoid button overcrowding.

---

## 📡 API Endpoints Reference

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user account |
| `POST` | `/api/auth/login` | Authenticate user and receive JWT token |
| `GET` | `/api/auth/me` | Retrieve profile of the authenticated user |

### Meeting Management
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check endpoint |
| `GET` | `/api/meetings?view=upcoming\|recent\|all` | Retrieve user's meetings by view |
| `POST` | `/api/meetings/instant` | Create a new instant meeting (Auth required) |
| `POST` | `/api/meetings/scheduled` | Schedule a new meeting (Auth required) |
| `GET` | `/api/meetings/{id}` | Get meeting details, active participants, and chat |
| `PATCH` | `/api/meetings/{id}` | Reschedule meeting details / passcode (Host only) |
| `DELETE` | `/api/meetings/{id}` | Delete meeting permanently (Host only) |
| `POST` | `/api/meetings/resolve` | Resolve a meeting ID or invite token |
| `GET` | `/api/invites/{token}` | Resolve meeting details by invite token |

### Participation & Security
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/meetings/{id}/join` | Join meeting (verifies passcode and role) |
| `POST` | `/api/meetings/{id}/leave` | Leave meeting |
| `POST` | `/api/meetings/{id}/security` | Update room security settings (Host only) |
| `POST` | `/api/meetings/{id}/mute-all` | Mute all active participants (Host only) |
| `POST` | `/api/meetings/{id}/participants/{pId}/status` | Update participant audio, video, or name |
| `POST` | `/api/meetings/{id}/participants/{pId}/ask-unmute` | Send unmute request to participant (Host only) |
| `DELETE` | `/api/meetings/{id}/participants/{pId}` | Eject participant from room (Host only) |
| `POST` | `/api/meetings/{id}/end` | Terminate meeting for all (Host only) |
| `GET` | `/api/meetings/{id}/messages` | Retrieve in-meeting chat history |
| `POST` | `/api/meetings/{id}/messages` | Post a chat message |
| `WS` | `/ws/meeting/{id}` | Real-time WebSocket signaling & event bus |

---

## 🔄 Real-Time WebSocket Events

The WebSocket gateway (`/ws/meeting/{meetingId}`) powers live room synchronization:

| Event Type | Payload Fields | Purpose |
|---|---|---|
| `JOIN` | `participant_id`, `display_name`, `role` | Broadcasts new participant presence |
| `LEAVE` | `participant_id` | Broadcasts participant departure |
| `SIGNAL` | `target`, `sender`, `signal` | WebRTC peer signaling (offer, answer, ICE candidates) |
| `REACTION` | `sender_name`, `sender_id`, `emoji` | Broadcasts floating emoji reaction |
| `PARTICIPANT_UPDATED` | `participant` object | Broadcasts mute, video, or hand-raise toggle |
| `SCREEN_SHARE_STARTED` | `participant_id`, `display_name` | Broadcasts active screen share |
| `SCREEN_SHARE_STOPPED` | `participant_id`, `display_name` | Broadcasts screen share cessation |
| `ASK_UNMUTE` | `target`, `host_name` | Direct notification requesting participant to unmute |
| `HOST_MUTED_YOU` | `target`, `host_name` | Direct notification when host mutes participant |
| `CHAT_MESSAGE` | `id`, `sender_name`, `sender_role`, `message` | Broadcasts chat message to room |

---

## ⚙️ Local Setup Instructions

### Prerequisites
- **Node.js**: v18+ (tested on v22.13.1)
- **Python**: v3.10+ (tested on v3.11.5)
- **Git**

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/armansuri300105/Scalar_labs_assignment.git
cd Scalar_labs
```

---

### Step 2: Backend Setup (FastAPI + SQLite)

1. Open a terminal in the `backend/` directory:
```bash
cd backend
```

2. (Optional) Create and activate a virtual environment:
```bash
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the automated test suite:
```bash
python test_api.py
```

5. Start the FastAPI backend server:
```bash
python run.py
```
> The API will be live at `http://localhost:8000`.  
> Interactive Swagger API documentation: `http://localhost:8000/docs`.

---

### Step 3: Frontend Setup (Next.js 16)

1. Open a new terminal in the `frontend/` directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the Next.js development server:
```bash
npm run dev
```
> The frontend application will be live at `http://localhost:3000`.

---

## 🧪 Automated Testing & Verification

The backend includes a comprehensive test suite in [backend/test_api.py](backend/test_api.py) verifying all critical functionality:
- **Health Check & Protected Routes**: Rejection of unauthenticated meeting creation.
- **Authentication Lifecycle**: Registration, duplicate rejection, login, and `/api/auth/me` profile lookup.
- **Meeting Ownership & Isolation**: Verification that User A cannot view User B's meetings.
- **Guest Access & Chat Deduplication**: Guest joins, chats, and leaves without database duplication.
- **Security Options & Policies**: Testing locked room admissions, chat blocking, unmute blocking, rename blocking, and ask-to-unmute.
- **Reschedule & Deletion**: Verifying field updates and 404 upon deletion.
- **Passcode Enforcement**: Verification of 401 on missing/wrong passcodes and owner bypass.
- **Refresh Deduplication**: Verifying rejoining by `participant_id` or `display_name` reuses existing participant records without duplicate copies.
- **Anti-Impersonation Protection**: Verifying that entering the host's display name assigns the `participant` role, appends `"(Guest)"`, and blocks host API actions.

Run tests at any time with:
```bash
cd backend
python test_api.py
```

---

## 🚀 Deployment Guide

### Deploying Frontend to Vercel
1. Push repository to GitHub.
2. Go to [Vercel](https://vercel.com) and import the repository.
3. Set Root Directory to `frontend`.
4. Configure Environment Variable:
   - `NEXT_PUBLIC_API_URL`: URL of your deployed backend (e.g. `https://your-backend.onrender.com`).
5. Click **Deploy**.

### Deploying Backend to Render / Railway
1. Create a new Web Service on [Render](https://render.com) or [Railway](https://railway.app).
2. Set Root Directory to `backend`.
3. Set Build Command: `pip install -r requirements.txt`.
4. Set Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
5. Deploy and set the backend public URL in the frontend's `NEXT_PUBLIC_API_URL`.
