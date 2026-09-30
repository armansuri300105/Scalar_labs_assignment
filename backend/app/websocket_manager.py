from typing import Dict, List, Any
import json
from fastapi import WebSocket

class MeetingConnectionManager:
    def __init__(self):
        # meeting_id -> list of (WebSocket, participant_info)
        self.rooms: Dict[str, List[Dict[str, Any]]] = {}

    async def connect(self, meeting_id: str, websocket: WebSocket, participant_info: Dict[str, Any]):
        await websocket.accept()
        if meeting_id not in self.rooms:
            self.rooms[meeting_id] = []
        
        # Remove any stale connection for this same participant ID to prevent duplicate listeners
        pid = participant_info.get("id")
        if pid:
            self.rooms[meeting_id] = [e for e in self.rooms[meeting_id] if e["info"].get("id") != pid]

        self.rooms[meeting_id].append({
            "ws": websocket,
            "info": participant_info
        })
        
        # Notify others in the room
        await self.broadcast(meeting_id, {
            "type": "PARTICIPANT_JOINED",
            "participant": participant_info
        }, exclude=websocket)

    def disconnect(self, meeting_id: str, websocket: WebSocket):
        if meeting_id in self.rooms:
            leaving_entry = next((e for e in self.rooms[meeting_id] if e["ws"] == websocket), None)
            self.rooms[meeting_id] = [e for e in self.rooms[meeting_id] if e["ws"] != websocket]
            if not self.rooms[meeting_id]:
                del self.rooms[meeting_id]
            return leaving_entry["info"] if leaving_entry else None
        return None

    async def broadcast(self, meeting_id: str, message: dict, exclude: WebSocket = None):
        if meeting_id not in self.rooms:
            return
        
        dead_connections = []
        for entry in self.rooms[meeting_id]:
            ws = entry["ws"]
            if ws != exclude:
                try:
                    await ws.send_text(json.dumps(message))
                except Exception:
                    dead_connections.append(ws)

        for dead in dead_connections:
            self.disconnect(meeting_id, dead)

    async def send_to_user(self, meeting_id: str, target_participant_id: str, message: dict):
        if meeting_id not in self.rooms:
            return
        for entry in self.rooms[meeting_id]:
            if entry["info"].get("id") == target_participant_id:
                try:
                    await entry["ws"].send_text(json.dumps(message))
                except Exception:
                    pass

manager = MeetingConnectionManager()
