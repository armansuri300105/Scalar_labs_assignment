from fastapi.testclient import TestClient
from datetime import datetime, timezone, timedelta
import sys
import uuid
sys.stdout.reconfigure(encoding='utf-8')
from app.main import app

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    print("✓ Health check passed")

def test_unauthenticated_protection():
    # 1. Listing meetings without token -> 401
    res1 = client.get("/api/meetings?view=upcoming")
    assert res1.status_code == 401, f"Expected 401, got {res1.status_code}"
    
    # 2. Creating instant meeting without token -> 401
    res2 = client.post("/api/meetings/instant", json={"title": "Unauthorized Meeting"})
    assert res2.status_code == 401, f"Expected 401, got {res2.status_code}"

    # 3. Creating scheduled meeting without token -> 401
    sched_time = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    res3 = client.post("/api/meetings/scheduled", json={
        "title": "Unauthorized Schedule",
        "scheduled_at": sched_time,
        "duration_minutes": 30
    })
    assert res3.status_code == 401, f"Expected 401, got {res3.status_code}"

    print("✓ Unauthenticated access protection passed (returned 401 for protected routes)")

def test_user_auth_flow():
    unique_suffix = uuid.uuid4().hex[:6]
    email = f"tester_{unique_suffix}@scalar.com"
    password = "SecurePassword123!"
    full_name = f"Test Host {unique_suffix}"

    # 1. Register new user
    res_reg = client.post("/api/auth/register", json={
        "email": email,
        "password": password,
        "full_name": full_name
    })
    assert res_reg.status_code == 201, res_reg.text
    data_reg = res_reg.json()
    assert "token" in data_reg
    assert data_reg["user"]["email"] == email
    token = data_reg["token"]
    user_id = data_reg["user"]["id"]
    print(f"✓ User registration passed (User: {email})")

    # 2. Duplicate registration should fail
    res_dup = client.post("/api/auth/register", json={
        "email": email,
        "password": password,
        "full_name": full_name
    })
    assert res_dup.status_code == 400
    print("✓ Duplicate email rejection passed")

    # 3. Login with wrong password
    res_bad_pw = client.post("/api/auth/login", json={
        "email": email,
        "password": "WrongPassword!"
    })
    assert res_bad_pw.status_code == 401
    print("✓ Invalid login rejection passed")

    # 4. Login with correct password
    res_login = client.post("/api/auth/login", json={
        "email": email,
        "password": password
    })
    assert res_login.status_code == 200
    login_data = res_login.json()
    assert login_data["token"] is not None
    print("✓ User login passed")

    # 5. Get current user profile
    headers = {"Authorization": f"Bearer {token}"}
    res_me = client.get("/api/auth/me", headers=headers)
    assert res_me.status_code == 200
    assert res_me.json()["id"] == user_id
    print("✓ Auth profile verification (/api/auth/me) passed")

    return token, user_id, full_name

def test_authenticated_meeting_lifecycle(token, user_id, host_name):
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create instant meeting as authenticated user
    res_inst = client.post("/api/meetings/instant", headers=headers, json={
        "title": "Engineering Standup"
    })
    assert res_inst.status_code == 201, res_inst.text
    m_data = res_inst.json()
    meeting_id = m_data["id"]
    invite_token = m_data["invite_token"]
    assert m_data["owner_id"] == user_id
    assert m_data["host_name"] == host_name
    print(f"✓ Authenticated instant meeting creation passed (ID: {meeting_id})")

    # 2. Create scheduled meeting as authenticated user
    sched_time = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    res_sched = client.post("/api/meetings/scheduled", headers=headers, json={
        "title": "Product Roadmap Sync",
        "description": "Discussion on Q4 roadmap",
        "scheduled_at": sched_time,
        "duration_minutes": 45,
        "passcode": "654321"
    })
    assert res_sched.status_code == 201, res_sched.text
    sched_data = res_sched.json()
    assert sched_data["owner_id"] == user_id
    print(f"✓ Authenticated scheduled meeting creation passed (ID: {sched_data['id']})")

    # 3. List user's meetings
    res_list = client.get("/api/meetings?view=all", headers=headers)
    assert res_list.status_code == 200
    user_meetings = res_list.json()
    assert len(user_meetings) >= 2
    for m in user_meetings:
        assert m["owner_id"] == user_id
    print(f"✓ Authenticated meeting listing isolation passed (count: {len(user_meetings)})")

    # 4. User B cannot see User A's meetings
    res_reg_b = client.post("/api/auth/register", json={
        "email": f"user_b_{uuid.uuid4().hex[:6]}@scalar.com",
        "password": "Password123!",
        "full_name": "User B"
    })
    token_b = res_reg_b.json()["token"]
    res_list_b = client.get("/api/meetings?view=all", headers={"Authorization": f"Bearer {token_b}"})
    assert res_list_b.status_code == 200
    assert len(res_list_b.json()) == 0
    print("✓ Cross-user meeting isolation verified (User B sees 0 meetings)")

    return meeting_id, invite_token

def test_guest_access_and_chat_deduplication(meeting_id, invite_token, owner_token):
    # 1. Guest resolves meeting code without auth token
    r_res = client.post("/api/meetings/resolve", json={"query": invite_token})
    assert r_res.status_code == 200
    assert r_res.json()["id"] == meeting_id
    print("✓ Guest meeting resolve passed without auth token")

    # 2. Guest retrieves meeting details without auth token
    r_detail = client.get(f"/api/meetings/{meeting_id}")
    assert r_detail.status_code == 200
    print("✓ Guest meeting details lookup passed without auth token")

    # 3. Guest joins meeting without token -> assigned participant
    r_join_guest = client.post(f"/api/meetings/{meeting_id}/join", json={
        "display_name": "Guest Participant",
        "role": "host" # Attempting to claim host role without token
    })
    assert r_join_guest.status_code == 200
    guest_info = r_join_guest.json()
    guest_id = guest_info["id"]
    # Because meeting has owner_id and guest is unauthenticated, role MUST be participant
    assert guest_info["role"] == "participant", "Guest should not be permitted host role without ownership"
    print("✓ Guest joined without token: assigned participant role (host hijack prevented)")

    # 4. Guest attempts host action -> 403 Forbidden
    r_unauth_mute = client.post(f"/api/meetings/{meeting_id}/mute-all")
    assert r_unauth_mute.status_code == 403
    print("✓ Unauthorized host action by guest rejected with 403")

    # 5. Owner calls host action with token -> 200 OK
    r_owner_mute = client.post(f"/api/meetings/{meeting_id}/mute-all", headers={"Authorization": f"Bearer {owner_token}"})
    assert r_owner_mute.status_code == 200
    print("✓ Authorized host action by owner accepted with 200")

    # 6. Guest sends chat messages
    r_msg1 = client.post(f"/api/meetings/{meeting_id}/messages", json={
        "sender_name": "Guest Participant",
        "message": "Hi everyone!"
    })
    assert r_msg1.status_code == 201
    msg1 = r_msg1.json()
    assert msg1["id"] is not None
    assert msg1["message"] == "Hi everyone!"

    r_msg2 = client.post(f"/api/meetings/{meeting_id}/messages", json={
        "sender_name": "Guest Participant",
        "message": "Can you hear me?"
    })
    assert r_msg2.status_code == 201
    msg2 = r_msg2.json()

    # 7. Verify chat messages are unique and distinct
    r_all_msgs = client.get(f"/api/meetings/{meeting_id}/messages")
    assert r_all_msgs.status_code == 200
    all_msgs = r_all_msgs.json()
    msg_ids = [m["id"] for m in all_msgs]
    assert len(msg_ids) == len(set(msg_ids)), "Chat messages must have unique IDs (no database duplication)"
    assert msg1["id"] != msg2["id"]
    print("✓ Chat messages sent and verified without duplicates in database")

    # 8. Guest leaves meeting
    r_leave = client.post(f"/api/meetings/{meeting_id}/leave?participant_id={guest_id}")
    assert r_leave.status_code == 200
    print("✓ Guest left meeting successfully")

if __name__ == "__main__":
    print("\n==========================================")
    print("RUNNING COMPREHENSIVE SECURITY & CHAT TESTS")
    print("==========================================\n")
    test_health()
    test_unauthenticated_protection()
    token, user_id, host_name = test_user_auth_flow()
    mid, inv_token = test_authenticated_meeting_lifecycle(token, user_id, host_name)
    test_guest_access_and_chat_deduplication(mid, inv_token, token)
    print("\n==========================================")
    print("ALL TESTS PASSED WITH 100% SUCCESS! 🎉")
    print("==========================================\n")
