from fastapi.testclient import TestClient
from datetime import datetime, timezone, timedelta
import sys
sys.stdout.reconfigure(encoding='utf-8')
from app.main import app

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    print("✓ Health check passed")

def test_list_meetings():
    res = client.get("/api/meetings?view=upcoming")
    assert res.status_code == 200
    upcoming = res.json()
    assert len(upcoming) > 0
    print(f"✓ List upcoming meetings passed (found {len(upcoming)})")

    res2 = client.get("/api/meetings?view=recent")
    assert res2.status_code == 200
    recent = res2.json()
    assert len(recent) > 0
    print(f"✓ List recent meetings passed (found {len(recent)})")

def test_create_instant_meeting():
    res = client.post("/api/meetings/instant", json={
        "title": "Ad-hoc Standup",
        "host_name": "Test Host"
    })
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == "Ad-hoc Standup"
    assert data["meeting_type"] == "instant"
    assert data["status"] == "active"
    assert len(data["id"]) >= 9
    assert data["invite_token"] is not None
    print(f"✓ Create instant meeting passed (ID: {data['id']})")
    return data["id"], data["invite_token"]

def test_create_scheduled_meeting():
    sched_time = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    res = client.post("/api/meetings/scheduled", json={
        "title": "Quarterly All Hands",
        "description": "Company-wide alignment",
        "scheduled_at": sched_time,
        "duration_minutes": 60,
        "host_name": "CEO Test",
        "passcode": "778899"
    })
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == "Quarterly All Hands"
    assert data["duration_minutes"] == 60
    assert data["passcode"] == "778899"
    print(f"✓ Create scheduled meeting passed (ID: {data['id']})")

def test_resolve_meeting(meeting_id, invite_token):
    # Resolve by exact ID
    r1 = client.post("/api/meetings/resolve", json={"query": meeting_id})
    assert r1.status_code == 200
    assert r1.json()["id"] == meeting_id

    # Resolve by token
    r2 = client.post("/api/meetings/resolve", json={"query": invite_token})
    assert r2.status_code == 200
    assert r2.json()["id"] == meeting_id

    # Resolve by full URL
    r3 = client.post("/api/meetings/resolve", json={"query": f"https://zoom.scaler.com/invite/{invite_token}"})
    assert r3.status_code == 200
    assert r3.json()["id"] == meeting_id

    # Resolve invalid
    r4 = client.post("/api/meetings/resolve", json={"query": "non-existent-12345"})
    assert r4.status_code == 404
    print("✓ Resolve meeting queries passed (exact ID, token, URL, invalid 404)")

def test_join_meeting_and_chat(meeting_id):
    # Join with empty name -> validation error
    r_empty = client.post(f"/api/meetings/{meeting_id}/join", json={"display_name": ""})
    assert r_empty.status_code == 422

    # Join valid participant
    r_join = client.post(f"/api/meetings/{meeting_id}/join", json={
        "display_name": "Bob Builder",
        "role": "participant"
    })
    assert r_join.status_code == 200
    p_data = r_join.json()
    p_id = p_data["id"]
    assert p_data["display_name"] == "Bob Builder"
    print("✓ Participant joined successfully")

    # Send chat message
    r_chat = client.post(f"/api/meetings/{meeting_id}/messages", json={
        "sender_name": "Bob Builder",
        "message": "Hello world from test!"
    })
    assert r_chat.status_code == 201
    assert r_chat.json()["message"] == "Hello world from test!"

    # Get chat messages
    r_get_chat = client.get(f"/api/meetings/{meeting_id}/messages")
    assert r_get_chat.status_code == 200
    assert len(r_get_chat.json()) >= 1
    print("✓ In-meeting chat passed")

    # Host controls: mute all
    r_mute = client.post(f"/api/meetings/{meeting_id}/mute-all")
    assert r_mute.status_code == 200
    print("✓ Host control: mute-all passed")

    # Host control: remove participant
    r_remove = client.delete(f"/api/meetings/{meeting_id}/participants/{p_id}")
    assert r_remove.status_code == 200
    print("✓ Host control: remove participant passed")

if __name__ == "__main__":
    print("\nRunning backend automated test suite...")
    test_health()
    test_list_meetings()
    mid, token = test_create_instant_meeting()
    test_create_scheduled_meeting()
    test_resolve_meeting(mid, token)
    test_join_meeting_and_chat(mid)
    print("\nALL BACKEND API TESTS PASSED! 🎉\n")
