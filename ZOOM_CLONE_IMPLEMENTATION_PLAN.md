# Zoom Clone — End-to-End Implementation Plan

Based on the assignment problem statement, build the required workflow first. Treat real multi-user WebRTC conferencing as a stretch goal, since it is not explicitly listed among the must-have requirements.

## Target Outcome

A deployed Zoom-inspired single-page application where a default user can:

1. View a dashboard, upcoming meetings, and recent meetings.
2. Start an instant meeting and receive a unique ID and invite link.
3. Join an existing meeting by meeting ID or invite URL after entering a display name.
4. Schedule a meeting and see it appear in Upcoming Meetings.
5. Open a polished meeting-room screen.

## Architecture

| Layer | Choice | Responsibility |
|---|---|---|
| Frontend | Next.js + TypeScript + Tailwind CSS | SPA, Zoom-like UI, forms, client validation |
| Backend | FastAPI + SQLAlchemy + Pydantic | REST API, meeting creation, join and scheduling validation |
| Database | SQLite | Seed data, meetings, participants, meeting activity |
| Deployment | Vercel frontend + Render/Railway backend | Public URLs for submission |

```text
Next.js UI → FastAPI REST API → SQLAlchemy → SQLite
     ↓
Dashboard / Modals / Meeting Room
```

## Data Model

Use a deliberately small, explainable schema.

### `meetings`

- `id` — UUID or short unique meeting ID
- `title`
- `description`
- `meeting_type` — `instant` or `scheduled`
- `scheduled_at` — nullable for instant meetings
- `duration_minutes`
- `host_name`
- `invite_token` — unique
- `status` — `scheduled`, `active`, or `ended`
- `created_at`

### `participants`

- `id`
- `meeting_id` — foreign key to `meetings.id`
- `display_name`
- `role` — `host` or `participant`
- `joined_at`
- `left_at`

### `meeting_activity` (optional, useful for Recent Meetings)

- `id`
- `meeting_id`
- `activity_type`
- `occurred_at`

Seed three to five scheduled and recent meetings on first run.

## API Plan

- `GET /health`
- `GET /meetings?view=upcoming|recent`
- `POST /meetings/instant`
- `POST /meetings/scheduled`
- `GET /meetings/{meetingId}`
- `POST /meetings/resolve` — accepts a meeting ID or invite URL/token
- `POST /meetings/{meetingId}/join`
- `GET /meetings/{meetingId}/participants`

Validate malformed IDs, unknown meetings, empty names, past scheduled times, and non-positive durations.

## Frontend Plan

### Screens and Routes

- `/` — dashboard
- `/join` — join form; also opened as a dashboard modal
- `/schedule` — schedule-meeting form/modal
- `/meeting/[meetingId]` — pre-join screen followed by meeting room
- `/invite/[token]` — resolves an invite link and forwards to pre-join

### Reusable Components

- `Sidebar`, `TopNavbar`, `MeetingCard`
- `NewMeetingMenu`
- `JoinMeetingModal`
- `ScheduleMeetingModal`
- `UpcomingMeetingsList`, `RecentMeetingsList`
- `PreJoinPanel`
- `MeetingRoom`, `ParticipantPanel`, `MeetingControls`
- Shared `Button`, `Input`, `Modal`, `EmptyState`, and `Toast`

### UX Details

- **New Meeting** immediately calls the API, then navigates to the meeting room.
- **Join** accepts either a raw meeting ID or a pasted invitation link.
- Scheduled meetings display local date/time and duration.
- Copy Invite uses the browser clipboard and confirms success with a toast.
- The meeting room includes a participant list, mute/video/reactions/chat placeholders, leave action, and host badge.

Use Zoom as visual inspiration—dark meeting room, clean white dashboard, blue primary actions, restrained shadows, and familiar layouts—but use original icons, assets, and code.

## Delivery Sequence for the One-Day Deadline

### Hour 1 — Setup

- Create `frontend/` and `backend/`.
- Configure environment variables, CORS, SQLite, linting, and a seed script.
- Define database schema and API contracts before UI work.

### Hours 2–3 — Backend

- Implement models, migrations or create-table bootstrap, seed data, and all endpoints.
- Test every API path in Swagger/OpenAPI.

### Hours 4–6 — Core Frontend Flows

- Build the dashboard from API data.
- Implement instant creation, scheduling, join validation, invite copying, and route handling.
- Cover loading, success, empty, and error states.

### Hours 7–8 — Meeting Experience and Responsive Polish

- Build the pre-join and meeting-room layouts.
- Match desktop, tablet, and mobile behavior.
- Add lightweight local camera preview with `getUserMedia` only if time permits; it must not block core workflows.

### Hour 9 — Verification

- Test all required flows with a fresh seeded database.
- Test invite URLs, invalid IDs, invalid schedules, refresh/deep-link behavior, and mobile layout.

### Hour 10 — Release

- Write the README: setup, environment variables, architecture, schema, assumptions, and deployment links.
- Deploy the API, configure the production frontend API URL, deploy the frontend, and retest the public build.
- Push a clean public GitHub repository.

## Acceptance Checklist

- [ ] Dashboard has Zoom-inspired navigation, actions, upcoming, and recent sections.
- [ ] Instant meeting creates a persistent unique meeting ID and invite URL.
- [ ] User is redirected to a meeting room after creation.
- [ ] Joining by ID and invite URL works only for valid meetings.
- [ ] A display name is required before joining.
- [ ] Scheduled meeting persists title, description, date/time, duration, and invite URL.
- [ ] Scheduled meeting appears in Upcoming Meetings.
- [ ] SQLite is seeded and schema relationships are clear.
- [ ] README and public deployment/repository links are ready.
- [ ] The deployed application supports direct invite-link navigation.

## Scope Control

Authentication, real-time signaling, host enforcement, and true multi-user audio/video are bonus work. Add them only after every acceptance-checklist item works end-to-end.
