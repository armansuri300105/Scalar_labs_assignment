# Zoom Clone — Modern Video Conferencing Platform
> **Scaler SDE Fullstack Assignment**  
> A full-featured web application clone replicating Zoom's user experience, design system, and core meeting workflows.

---

## 🌟 Overview

This project is a high-fidelity clone of the **Zoom Web Application**, designed to match the original application in UI/UX, responsiveness, and meeting workflows. It allows default users to start instant meetings, schedule upcoming meetings, join existing meetings via meeting ID or direct invite links, manage participants with host controls, and collaborate in real-time.

---

## 🛠️ Tech Stack

| Layer | Technology | Key Libraries / Frameworks |
|---|---|---|
| **Frontend** | Next.js (App Router), TypeScript | Tailwind CSS v4, Lucide React, WebRTC / MediaStream APIs |
| **Backend** | Python 3.11+, FastAPI | SQLAlchemy 2.0, Pydantic v2, WebSockets, Uvicorn |
| **Database** | SQLite | Custom relational schema with cascading relationships & seed data |
| **Real-Time** | WebSockets | Real-time participant sync, in-meeting chat, and emoji reactions |

---

## 🏗️ Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────┐
│                      Next.js SPA Frontend                   │
│  (Dashboard, Lobby, Video Grid, Chat, Modals, Controls)     │
└──────────────┬───────────────────────────────▲──────────────┘
               │ HTTP REST Requests            │ WebSocket Events
               ▼                               │ (Chat, Reactions,
┌──────────────────────────────────────────────┴──────────────┐
│                    FastAPI Backend Server                   │
│  - REST API Endpoints (/meetings, /join, /resolve, etc.)    │
│  - Real-time Connection Manager (/ws/meeting/{id})          │
│  - Input Validation & Error Handling (Pydantic v2)          │
└──────────────┬──────────────────────────────────────────────┘
               │ SQLAlchemy ORM
               ▼
┌─────────────────────────────────────────────────────────────┐
│                     SQLite Relational Database              │
│    [meetings]  ◄───►  [participants]  ◄───►  [chat_messages]│
│         ▲                                                   │
│         └───►  [meeting_activities]                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Design & Schema

The relational schema is implemented with SQLAlchemy in `backend/app/models.py`.

### 1. `meetings` Table
Stores all meeting sessions (both instant and scheduled).
- `id` (VARCHAR, PK, Indexed): 10-digit formatted Zoom Meeting ID (e.g. `849 204 1284`).
- `title` (VARCHAR(255), Not Null): Topic/title of the meeting.
- `description` (TEXT, Nullable): Agenda or description.
- `meeting_type` (VARCHAR(50)): `instant` or `scheduled`.
- `scheduled_at` (DATETIME, Nullable): Scheduled date/time in UTC.
- `duration_minutes` (INTEGER): Duration in minutes (default: 45).
- `host_name` (VARCHAR(100)): Name of the meeting host.
- `invite_token` (VARCHAR(64), Unique, Indexed): URL-safe token for shareable links.
- `passcode` (VARCHAR(32), Nullable): 6-digit meeting passcode.
- `status` (VARCHAR(50)): `scheduled`, `active`, or `ended`.
- `created_at`, `updated_at` (DATETIME): Audit timestamps.

### 2. `participants` Table
Tracks meeting attendees, their roles, and device states.
- `id` (VARCHAR(36), PK): UUID.
- `meeting_id` (VARCHAR, FK -> `meetings.id`): Foreign key to the parent meeting.
- `display_name` (VARCHAR(100), Not Null): Participant's name.
- `role` (VARCHAR(50)): `host` or `participant`.
- `is_muted` (BOOLEAN): Microphone mute state.
- `is_video_off` (BOOLEAN): Camera state.
- `is_hand_raised` (BOOLEAN): Raised hand state.
- `joined_at` (DATETIME): Join timestamp.
- `left_at` (DATETIME, Nullable): Departure timestamp.

### 3. `chat_messages` Table
Maintains the real-time chat history for meetings.
- `id` (VARCHAR(36), PK): UUID.
- `meeting_id` (VARCHAR, FK -> `meetings.id`): Meeting identifier.
- `sender_name` (VARCHAR(100)): Sender display name.
- `sender_role` (VARCHAR(50)): `host` or `participant`.
- `message` (TEXT): Message body.
- `sent_at` (DATETIME): Message timestamp.

### 4. `meeting_activities` Table
Audit trail for meeting lifecycle events (creation, participant joins, ended).

---

## 🚀 Core Features (Must-Have)

### 1. Landing Dashboard
- **Zoom Visual Style**: Zoom blue accents (`#0E71EB`), crisp dark and light themes, Zoom logo, search bar, and user profile badge.
- **Top Navbar**: Search bar, status indicator, notification bell, settings, and default user avatar (**Mohammed Arshad - Licensed Pro**).
- **Sidebar**: Quick navigation for Home, Meetings, Team Chat, Whiteboards, Contacts, and Recordings.
- **Live Clock Widget**: Dynamic real-time clock showing live hours, minutes, seconds, date, and contextual greetings.
- **Four Quick Action Buttons**:
  1. 🟠 **New Meeting** (Signature Zoom Orange): Creates an instant meeting and navigates to the meeting room. Includes dropdown for video settings.
  2. 🔵 **Join Meeting**: Opens modal or `/join` to enter meeting ID or paste invite URL.
  3. 🔵 **Schedule Meeting**: Opens scheduling dialog with date, time, duration, and passcode options.
  4. 🔵 **Share Screen**: Fast screen share shortcut.
- **Upcoming Meetings**: Displays upcoming and active calls with Meeting ID, passcode, scheduled date/time, "Start", "Copy Invite", and "Share" options.
- **Recent Meetings**: Displays past meeting logs, participants, and one-click "Re-open" action.

### 2. Instant Meeting Creation
- Generates a unique 10-digit meeting ID (e.g. `849 204 1284`).
- Generates a secure shareable invite link (`/invite/{token}`).
- Automatically designates the creator as the `host`.
- Seamlessly redirects to the pre-join lobby and meeting room.

### 3. Join Meeting
- Supports direct meeting ID (raw digits or spaced `XXX XXX XXXX`), invitation token, or full URL.
- Validates meeting existence against the SQLite database with user-friendly error prompts.
- Requires display name before joining.
- Supports passcode verification for secured meetings.

### 4. Schedule Meetings
- Title / Topic and optional description.
- Date and Time picker.
- Duration selector (15, 30, 45, 60, 90, 120 minutes).
- Automatic passcode generator and customizable security options.
- Automatically creates shareable invite link.
- Persists to database and immediately updates the dashboard's Upcoming Meetings section.

---

## 🎁 Bonus Features Included

- **Pre-Join Lobby**:
  - Live webcam preview via `navigator.mediaDevices.getUserMedia`.
  - Camera on/off toggle and Microphone mute/unmute preview before entering the room.
  - Display name customization.
- **Meeting Room Experience**:
  - **Adaptive Video Grid**: Intelligently arranges participant tiles in Gallery View or Speaker View.
  - **Screen Sharing**: Built-in screen share using `navigator.mediaDevices.getDisplayMedia` with green Zoom action button.
  - **Interactive Peers**: Dynamic participants (e.g., Priya Sharma, Alex Rivera, David Miller) with speaking indicators and avatars.
  - **Real-Time In-Meeting Chat**: Send messages to everyone with role badges and timestamps.
  - **Floating Animated Reactions**: Pop-up emojis (👏, 👍, ❤️, 😂, 😮, 🎉) and "Raise Hand" (✋) that float up the screen.
  - **Host Controls**:
    - **Mute All Participants**: Host can mute everyone in the meeting at once.
    - **Remove Participant**: Host can eject a participant from the room.
    - **Lock Meeting**: Security control to lock the meeting from new joins.
    - **End Meeting for All**: Host can terminate the meeting for everyone or leave independently.
- **Responsive Design**: Polished layout for mobile devices, tablets, and wide desktop displays.

---

## ⚙️ Local Setup Instructions

### Prerequisites
- **Node.js**: v18+ (tested on v22.13.1)
- **Python**: v3.10+ (tested on v3.11.5)
- **Git**

---

### Step 1: Clone the Repository
```bash
git clone <YOUR_REPOSITORY_URL>
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

4. Run automated tests to verify API endpoints:
```bash
python test_api.py
```

5. Start the FastAPI server:
```bash
python run.py
```
> The API will be live at `http://localhost:8000`.  
> Interactive Swagger API Documentation: `http://localhost:8000/docs`.  
> *Note: SQLite database is automatically created and seeded on first run.*

---

### Step 3: Frontend Setup (Next.js)

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

## 📡 API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check endpoint |
| `GET` | `/api/meetings?view=upcoming\|recent\|all` | Retrieve meetings by view |
| `POST` | `/api/meetings/instant` | Create a new instant meeting |
| `POST` | `/api/meetings/scheduled` | Schedule a new upcoming meeting |
| `POST` | `/api/meetings/resolve` | Resolve a meeting ID or invite URL |
| `GET` | `/api/meetings/{id}` | Get meeting details, active participants, chat |
| `GET` | `/api/invites/{token}` | Resolve meeting by invite token |
| `POST` | `/api/meetings/{id}/join` | Join meeting with display name |
| `POST` | `/api/meetings/{id}/leave` | Leave meeting |
| `POST` | `/api/meetings/{id}/mute-all` | **Host Control**: Mute all participants |
| `DELETE` | `/api/meetings/{id}/participants/{pId}` | **Host Control**: Remove participant |
| `POST` | `/api/meetings/{id}/end` | **Host Control**: Terminate meeting |
| `GET` | `/api/meetings/{id}/messages` | Get in-meeting chat messages |
| `POST` | `/api/meetings/{id}/messages` | Send an in-meeting chat message |
| `WS` | `/ws/meeting/{id}` | WebSocket for real-time room events |

---

## 📋 Assumptions Made

1. **Default User Authentication**: As specified in the assignment prompt ("*No Login Required: Assume a default user is logged in*"), the logged-in session defaults to `Mohammed Arshad` with licensed Zoom Pro permissions.
2. **Local Media Fallback**: If a camera or microphone is not available or blocked in the browser, the application displays initials-based avatars with audio indicators.
3. **Database Seed Data**: The SQLite database seeds 5 realistic meetings (upcoming sprint demos, architecture reviews, and past strategy sessions) on first initialization.

---

## 🚀 Deployment Guide

### Deploying Frontend to Vercel
1. Push this repository to GitHub.
2. Go to [Vercel](https://vercel.com) and import the repository.
3. Set the Root Directory to `frontend`.
4. Configure Environment Variable:
   - `NEXT_PUBLIC_API_URL`: URL of your deployed backend (e.g. `https://your-backend.onrender.com`).
5. Click **Deploy**.

### Deploying Backend to Render / Railway
1. Create a new Web Service on [Render](https://render.com) or [Railway](https://railway.app).
2. Set the Root Directory to `backend`.
3. Set Build Command: `pip install -r requirements.txt`.
4. Set Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
5. Deploy and copy the public URL to the frontend environment variable.
