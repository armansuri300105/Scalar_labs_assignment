from datetime import datetime, timezone, timedelta
from .database import SessionLocal, engine, Base
from . import models, crud

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if meetings already seeded
        existing_count = db.query(models.Meeting).count()
        if existing_count > 0:
            print(f"Database already contains {existing_count} meetings. Skipping seed.")
            return

        print("Seeding database with realistic Zoom sample meetings and participants...")
        now = datetime.now(timezone.utc)

        # 1. Upcoming Meeting: Sprint Demo
        m1 = models.Meeting(
            id="8492041284",
            title="Zoom Clone Sprint Demo & Showcase",
            description="Live walkthrough of Zoom clone features, architecture, and responsive UI.",
            meeting_type="scheduled",
            scheduled_at=now + timedelta(hours=2),
            duration_minutes=45,
            host_name="Mohammed Arshad",
            invite_token="scaler-zoom-demo-2026",
            passcode="847291",
            status="scheduled",
            created_at=now - timedelta(days=1)
        )
        db.add(m1)

        # 2. Upcoming Meeting: Architecture Review
        m2 = models.Meeting(
            id="7361928405",
            title="SDE Fullstack Architecture Review",
            description="Review FastAPI backend schemas, SQLite database design, and Next.js SPA frontend components.",
            meeting_type="scheduled",
            scheduled_at=now + timedelta(days=1, hours=3),
            duration_minutes=60,
            host_name="Mohammed Arshad",
            invite_token="scaler-arch-review-2026",
            passcode="984210",
            status="scheduled",
            created_at=now - timedelta(hours=5)
        )
        db.add(m2)

        # 3. Upcoming Meeting: Frontend Design System Sync
        m3 = models.Meeting(
            id="9204817562",
            title="Design System & Responsive Polish",
            description="Discuss dark theme colors, video grid layout, mobile responsiveness, and animations.",
            meeting_type="scheduled",
            scheduled_at=now + timedelta(days=2, hours=4),
            duration_minutes=30,
            host_name="Alex Rivera",
            invite_token="design-sync-grid-ui",
            passcode="554433",
            status="scheduled",
            created_at=now - timedelta(hours=10)
        )
        db.add(m3)

        # 4. Recent Meeting: Product Strategy (ended)
        m4 = models.Meeting(
            id="6482019472",
            title="Product Strategy & Q4 Roadmap",
            description="Quarterly planning session covering customer feedback, core feature priorities, and deliverables.",
            meeting_type="scheduled",
            scheduled_at=now - timedelta(days=1, hours=4),
            duration_minutes=60,
            host_name="Sarah Connor",
            invite_token="q4-strategy-roadmap",
            passcode="204918",
            status="ended",
            created_at=now - timedelta(days=2)
        )
        db.add(m4)

        # 5. Recent Meeting: Engineering 1-on-1 Catchup (ended)
        m5 = models.Meeting(
            id="5193028471",
            title="Engineering 1-on-1 Catchup",
            description="Bi-weekly career and technical progress check-in.",
            meeting_type="instant",
            scheduled_at=now - timedelta(days=3),
            duration_minutes=30,
            host_name="Mohammed Arshad",
            invite_token="eng-1on1-catchup",
            passcode=None,
            status="ended",
            created_at=now - timedelta(days=3)
        )
        db.add(m5)

        db.flush()

        # Seed participants for Demo meeting
        p1 = models.Participant(
            meeting_id=m1.id,
            display_name="Mohammed Arshad",
            role="host",
            is_muted=False,
            is_video_off=False,
            joined_at=now - timedelta(minutes=5)
        )
        p2 = models.Participant(
            meeting_id=m1.id,
            display_name="Priya Sharma",
            role="participant",
            is_muted=True,
            is_video_off=False,
            joined_at=now - timedelta(minutes=3)
        )
        p3 = models.Participant(
            meeting_id=m1.id,
            display_name="David Miller",
            role="participant",
            is_muted=False,
            is_video_off=True,
            joined_at=now - timedelta(minutes=2)
        )
        db.add_all([p1, p2, p3])

        # Seed sample chat messages in Demo meeting
        c1 = models.ChatMessage(
            meeting_id=m1.id,
            sender_name="Mohammed Arshad",
            sender_role="host",
            message="Welcome everyone! Let's get started with the Zoom Clone demo.",
            sent_at=now - timedelta(minutes=4)
        )
        c2 = models.ChatMessage(
            meeting_id=m1.id,
            sender_name="Priya Sharma",
            sender_role="participant",
            message="Hey Arshad! Audio and video are crystal clear.",
            sent_at=now - timedelta(minutes=3)
        )
        db.add_all([c1, c2])

        # Seed sample activities
        act1 = models.MeetingActivity(
            meeting_id=m1.id,
            activity_type="created",
            details="Meeting created by Mohammed Arshad",
            occurred_at=now - timedelta(days=1)
        )
        act2 = models.MeetingActivity(
            meeting_id=m4.id,
            activity_type="ended",
            details="Meeting ended normally (Duration: 58 mins)",
            occurred_at=now - timedelta(days=1, hours=3)
        )
        db.add_all([act1, act2])

        db.commit()
        print("Database seeded successfully with 5 sample meetings, participants, and chat logs.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
