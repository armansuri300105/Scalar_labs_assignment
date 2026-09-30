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

def test_security_options(meeting_id, owner_token):
    owner_headers = {"Authorization": f"Bearer {owner_token}"}

    # 1. Non-host / unauthenticated attempt to change security settings -> 403
    r_unauth_sec = client.post(f"/api/meetings/{meeting_id}/security", json={"is_locked": True})
    assert r_unauth_sec.status_code == 403, "Unauthenticated user must not change security settings"
    print("✓ Unauthorized security options modification blocked with 403")

    # 2. Host locks meeting
    r_lock = client.post(f"/api/meetings/{meeting_id}/security", headers=owner_headers, json={"is_locked": True})
    assert r_lock.status_code == 200
    assert r_lock.json()["is_locked"] is True
    print("✓ Host successfully locked meeting")

    # 3. New guest tries to join locked meeting -> 403
    r_locked_join = client.post(f"/api/meetings/{meeting_id}/join", json={"display_name": "Late Guest"})
    assert r_locked_join.status_code == 403
    print("✓ New participant blocked from joining locked meeting with 403")

    # 4. Host unlocks meeting
    r_unlock = client.post(f"/api/meetings/{meeting_id}/security", headers=owner_headers, json={"is_locked": False})
    assert r_unlock.status_code == 200
    assert r_unlock.json()["is_locked"] is False
    print("✓ Host successfully unlocked meeting")

    # 5. Guest can now join
    r_join_ok = client.post(f"/api/meetings/{meeting_id}/join", json={"display_name": "Admitted Guest"})
    assert r_join_ok.status_code == 200
    guest_id = r_join_ok.json()["id"]
    print("✓ Participant admitted after meeting unlocked")

    # 6. Host disables chat
    r_no_chat = client.post(f"/api/meetings/{meeting_id}/security", headers=owner_headers, json={"allow_chat": False})
    assert r_no_chat.status_code == 200
    assert r_no_chat.json()["allow_chat"] is False

    # Participant tries to send chat when disabled -> 403
    r_chat_blocked = client.post(f"/api/meetings/{meeting_id}/messages", json={
        "sender_name": "Admitted Guest",
        "sender_role": "participant",
        "message": "Is chat working?"
    })
    assert r_chat_blocked.status_code == 403
    print("✓ Participant chat blocked when allow_chat is disabled by host")

    # Host can still send chat
    r_host_chat = client.post(f"/api/meetings/{meeting_id}/messages", json={
        "sender_name": "Meeting Host",
        "sender_role": "host",
        "message": "Host announcement: chat is restricted."
    })
    assert r_host_chat.status_code == 201
    print("✓ Host can still send announcements when chat is restricted")

    # Host re-enables chat
    client.post(f"/api/meetings/{meeting_id}/security", headers=owner_headers, json={"allow_chat": True})

    # 7. Host disables unmuting
    r_no_unmute = client.post(f"/api/meetings/{meeting_id}/security", headers=owner_headers, json={"allow_unmute": False})
    assert r_no_unmute.status_code == 200
    assert r_no_unmute.json()["allow_unmute"] is False

    # Participant tries to unmute themselves -> 403
    r_unmute_blocked = client.post(f"/api/meetings/{meeting_id}/participants/{guest_id}/status", json={"is_muted": False})
    assert r_unmute_blocked.status_code == 403
    print("✓ Participant self-unmute blocked when allow_unmute is disabled by host")

    # Host re-enables unmuting
    client.post(f"/api/meetings/{meeting_id}/security", headers=owner_headers, json={"allow_unmute": True})

    # 8. Host disables renaming
    r_no_rename = client.post(f"/api/meetings/{meeting_id}/security", headers=owner_headers, json={"allow_rename": False})
    assert r_no_rename.status_code == 200
    assert r_no_rename.json()["allow_rename"] is False

    # Participant tries to rename themselves -> 403
    r_rename_blocked = client.post(f"/api/meetings/{meeting_id}/participants/{guest_id}/status", json={"display_name": "Imposter"})
    assert r_rename_blocked.status_code == 403
    print("✓ Participant rename blocked when allow_rename is disabled by host")

    # Host re-enables renaming
    client.post(f"/api/meetings/{meeting_id}/security", headers=owner_headers, json={"allow_rename": True})
    r_rename_ok = client.post(f"/api/meetings/{meeting_id}/participants/{guest_id}/status", json={"display_name": "Verified Guest"})
    assert r_rename_ok.status_code == 200
    assert r_rename_ok.json()["display_name"] == "Verified Guest"
    print("✓ Participant rename permitted when enabled by host")

    # 9. Host asks participant to unmute (targeted request, does not force mic on)
    # Unauthorized caller -> 403
    r_unauth_ask = client.post(f"/api/meetings/{meeting_id}/participants/{guest_id}/ask-unmute")
    assert r_unauth_ask.status_code == 403
    print("✓ Unauthorized ask-to-unmute rejected with 403")

    # Host caller -> 200
    r_host_ask = client.post(f"/api/meetings/{meeting_id}/participants/{guest_id}/ask-unmute", headers=owner_headers)
    assert r_host_ask.status_code == 200
    assert r_host_ask.json()["message"] == "Unmute request sent to participant"
    print("✓ Host ask-to-unmute accepted with 200 without forcing participant mic state")

    # Non-existent participant -> 404
    r_ask_404 = client.post(f"/api/meetings/{meeting_id}/participants/invalid_id/ask-unmute", headers=owner_headers)
    assert r_ask_404.status_code == 404

    # Clean up guest
    client.post(f"/api/meetings/{meeting_id}/leave?participant_id={guest_id}")

def test_reschedule_and_delete_meeting(meeting_id: str, owner_token: str):
    owner_headers = {"Authorization": f"Bearer {owner_token}"}
    
    # 1. Unauthorized reschedule -> 403
    unauth_reschedule = client.patch(
        f"/api/meetings/{meeting_id}",
        json={"title": "Hacked Title", "duration_minutes": 60}
    )
    assert unauth_reschedule.status_code == 403
    print("✓ Unauthorized reschedule blocked with 403")

    # 2. Host reschedules meeting -> 200
    new_time = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    reschedule_res = client.patch(
        f"/api/meetings/{meeting_id}",
        headers=owner_headers,
        json={
            "title": "Quarterly Planning & Sprint Sync",
            "description": "Updated agenda with OKRs and deliverables",
            "scheduled_at": new_time,
            "duration_minutes": 90,
            "passcode": "987654"
        }
    )
    assert reschedule_res.status_code == 200
    updated_data = reschedule_res.json()
    assert updated_data["title"] == "Quarterly Planning & Sprint Sync"
    assert updated_data["duration_minutes"] == 90
    assert updated_data["passcode"] == "987654"
    print("✓ Host reschedule accepted with 200 and fields updated")

    # 3. Unauthorized delete -> 403
    unauth_delete = client.delete(f"/api/meetings/{meeting_id}")
    assert unauth_delete.status_code == 403
    print("✓ Unauthorized delete blocked with 403")

    # 4. Host deletes meeting -> 200
    delete_res = client.delete(f"/api/meetings/{meeting_id}", headers=owner_headers)
    assert delete_res.status_code == 200
    assert delete_res.json()["message"] == "Meeting deleted successfully"
    print("✓ Host delete accepted with 200 and meeting removed")

    # 5. Verify meeting is gone (404)
    get_res = client.get(f"/api/meetings/{meeting_id}")
    assert get_res.status_code == 404
    print("✓ Verified deleted meeting returns 404")

def test_passcode_and_timezone_enforcement():
    # 1. Register host user
    suffix = uuid.uuid4().hex[:6]
    reg = client.post("/api/auth/register", json={
        "email": f"host_pass_{suffix}@scalar.com",
        "password": "Password123!",
        "full_name": "Passcode Host"
    })
    token = reg.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Schedule a meeting with passcode
    sched_dt = datetime.now(timezone.utc) + timedelta(days=1)
    res_sched = client.post("/api/meetings/scheduled", headers=headers, json={
        "title": "Passcode Protected Strategy Session",
        "scheduled_at": sched_dt.isoformat(),
        "duration_minutes": 60,
        "passcode": "778899"
    })
    assert res_sched.status_code == 201
    m = res_sched.json()
    mid = m["id"]
    
    # Verify timezone UTC indicator in serialized response
    assert m["scheduled_at"].endswith("Z") or "+00:00" in m["scheduled_at"], "Meeting scheduled_at must serialize with UTC timezone"
    print(f"✓ Scheduled meeting timezone UTC format verified ({m['scheduled_at']})")

    # 3. Guest attempts to join without passcode -> 401
    res_no_pass = client.post(f"/api/meetings/{mid}/join", json={
        "display_name": "Intruder"
    })
    assert res_no_pass.status_code == 401
    assert "passcode" in res_no_pass.json()["detail"].lower()
    print("✓ Passcode enforcement: Guest joining without passcode blocked with 401")

    # 4. Guest attempts to join with wrong passcode -> 401
    res_bad_pass = client.post(f"/api/meetings/{mid}/join", json={
        "display_name": "Guessing Guest",
        "passcode": "111111"
    })
    assert res_bad_pass.status_code == 401
    assert "incorrect" in res_bad_pass.json()["detail"].lower()
    print("✓ Passcode enforcement: Guest joining with wrong passcode blocked with 401")

    # 5. Guest joins with correct passcode -> 200
    res_ok_pass = client.post(f"/api/meetings/{mid}/join", json={
        "display_name": "Authorized Guest",
        "passcode": "778899"
    })
    assert res_ok_pass.status_code == 200
    p = res_ok_pass.json()
    assert p["role"] == "participant"
    print("✓ Passcode enforcement: Guest joining with correct passcode accepted with 200")

    # 6. Authenticated owner joins without providing passcode -> 200 (owner bypass)
    res_owner_join = client.post(f"/api/meetings/{mid}/join", headers=headers, json={
        "display_name": "Passcode Host"
    })
    assert res_owner_join.status_code == 200
    assert res_owner_join.json()["role"] == "host"
    print("✓ Passcode enforcement: Authenticated owner joins seamlessly as host")

if __name__ == "__main__":
    print("\n==========================================")
    print("RUNNING COMPREHENSIVE SECURITY & CHAT TESTS")
    print("==========================================\n")
    test_health()
    test_unauthenticated_protection()
    token, user_id, host_name = test_user_auth_flow()
    mid, inv_token = test_authenticated_meeting_lifecycle(token, user_id, host_name)
    test_guest_access_and_chat_deduplication(mid, inv_token, token)
    test_security_options(mid, token)
    test_reschedule_and_delete_meeting(mid, token)
    test_passcode_and_timezone_enforcement()
    print("\n==========================================")
    print("ALL TESTS PASSED WITH 100% SUCCESS! 🎉")
    print("==========================================\n")
