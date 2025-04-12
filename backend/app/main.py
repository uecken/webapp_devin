from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List, Optional, Set
import json
import uuid
from pydantic import BaseModel

app = FastAPI()

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

class Room(BaseModel):
    id: str
    players: Dict[str, str] = {}  # player_id -> limb_type
    max_players: int = 4
    stage_id: int = 1

rooms: Dict[str, Room] = {}
connections: Dict[str, WebSocket] = {}

class ConnectionManager:
    async def connect(self, websocket: WebSocket, player_id: str):
        await websocket.accept()
        connections[player_id] = websocket
    
    async def disconnect(self, player_id: str):
        if player_id in connections:
            del connections[player_id]
            
            for room_id, room in rooms.items():
                if player_id in room.players:
                    del room.players[player_id]
                    await self.broadcast_to_room(room_id, {
                        "type": "player_left",
                        "player_id": player_id
                    })
    
    async def send_personal_message(self, message: dict, player_id: str):
        if player_id in connections:
            await connections[player_id].send_json(message)
    
    async def broadcast_to_room(self, room_id: str, message: dict):
        if room_id in rooms:
            for player_id in rooms[room_id].players:
                await self.send_personal_message(message, player_id)

manager = ConnectionManager()

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.get("/rooms")
async def get_rooms():
    return {"rooms": [{"id": room_id, "players": len(room.players), "max_players": room.max_players, "stage_id": room.stage_id} 
                     for room_id, room in rooms.items()]}

@app.post("/rooms")
async def create_room(stage_id: int = 1):
    room_id = str(uuid.uuid4())
    rooms[room_id] = Room(id=room_id, stage_id=stage_id)
    return {"room_id": room_id}

@app.get("/rooms/{room_id}")
async def get_room(room_id: str):
    if room_id not in rooms:
        raise HTTPException(status_code=404, detail="Room not found")
    return rooms[room_id]

@app.websocket("/ws/{room_id}/{player_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, player_id: str, limb_type: Optional[str] = None):
    if room_id not in rooms:
        await websocket.close(code=1000, reason="Room not found")
        return
    
    room = rooms[room_id]
    
    if len(room.players) >= room.max_players and player_id not in room.players:
        await websocket.close(code=1000, reason="Room is full")
        return
    
    if player_id not in room.players and limb_type:
        if limb_type in room.players.values():
            await websocket.close(code=1000, reason="Limb already taken")
            return
        room.players[player_id] = limb_type
    
    await manager.connect(websocket, player_id)
    
    await manager.broadcast_to_room(room_id, {
        "type": "player_joined",
        "player_id": player_id,
        "limb_type": room.players.get(player_id),
        "players": room.players
    })
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "offer" or message["type"] == "answer" or message["type"] == "ice-candidate":
                if "target" in message and message["target"] in connections:
                    await manager.send_personal_message({
                        "type": message["type"],
                        "sender": player_id,
                        "data": message["data"]
                    }, message["target"])
            
            elif message["type"] == "limb_movement":
                if "movement" in message:
                    await manager.broadcast_to_room(room_id, {
                        "type": "limb_movement",
                        "player_id": player_id,
                        "limb_type": room.players.get(player_id),
                        "movement": message["movement"]
                    })
            
            elif message["type"] == "game_state":
                if "state" in message:
                    await manager.broadcast_to_room(room_id, {
                        "type": "game_state",
                        "state": message["state"]
                    })
    
    except WebSocketDisconnect:
        await manager.disconnect(player_id)
