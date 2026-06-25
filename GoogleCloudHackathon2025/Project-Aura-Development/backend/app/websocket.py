import socketio
from typing import Dict, Set

# Create Socket.IO server instance with proper CORS configuration
# Using wildcard '*' for cors_allowed_origins to allow all origins
# The FastAPI CORS middleware will handle the actual CORS restrictions
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    cors_credentials=True,
    logger=True,
    engineio_logger=True
)

# Store active connections: {user_id: set of socket_ids}
user_connections: Dict[int, Set[str]] = {}

# Store which chat session each socket is in: {socket_id: session_id}
socket_sessions: Dict[str, int] = {}


@sio.event
async def connect(sid, environ):
    """Handle new WebSocket connection"""
    print(f"Client connected: {sid}")


@sio.event
async def disconnect(sid):
    """Handle WebSocket disconnection"""
    print(f"Client disconnected: {sid}")
    
    # Clean up user connections
    for user_id, sockets in user_connections.items():
        if sid in sockets:
            sockets.remove(sid)
            break
    
    # Clean up session tracking
    if sid in socket_sessions:
        del socket_sessions[sid]


@sio.event
async def join_chat(sid, data):
    """
    User joins a chat session
    data = {"user_id": 1, "session_id": 1}
    """
    user_id = data.get('user_id')
    session_id = data.get('session_id')
    
    print(f"User {user_id} joining chat session {session_id}")
    
    # Track this user's connection
    if user_id not in user_connections:
        user_connections[user_id] = set()
    user_connections[user_id].add(sid)
    
    # Track which session this socket is in
    socket_sessions[sid] = session_id
    
    # Join the socket.io room for this chat session
    await sio.enter_room(sid, f"chat_{session_id}")
    
    await sio.emit('joined_chat', {'session_id': session_id}, room=sid)


@sio.event
async def leave_chat(sid, data):
    """User leaves a chat session"""
    session_id = data.get('session_id')
    
    if sid in socket_sessions:
        del socket_sessions[sid]
    
    await sio.leave_room(sid, f"chat_{session_id}")


@sio.event
async def new_message(sid, data):
    """
    Broadcast new message to all users in chat session
    data = message object from database
    """
    session_id = data.get('session_id')
    
    if session_id:
        # Broadcast to everyone in this chat room EXCEPT sender
        await sio.emit('message_created', data, room=f"chat_{session_id}", skip_sid=sid)


@sio.event
async def message_deleted(sid, data):
    """
    Broadcast message deletion to all users in chat session
    data = {"message_id": 123, "session_id": 1, "deleted_by_user_id": 1}
    """
    session_id = data.get('session_id')
    
    if session_id:
        # Broadcast to everyone in this chat room
        await sio.emit('message_deleted', data, room=f"chat_{session_id}")


@sio.event
async def message_edited(sid, data):
    """
    Broadcast message edit to all users in chat session
    data = {"message_id": 123, "content": "new text", "session_id": 1}
    """
    session_id = data.get('session_id')

    if session_id:
        # Broadcast to everyone in this chat room
        await sio.emit('message_edited', data, room=f"chat_{session_id}")


@sio.event
async def typing_start(sid, data):
    """
    Broadcast typing indicator start to other users in chat session
    data = {"user_id": 1, "session_id": 1}
    """
    session_id = data.get('session_id')
    user_id = data.get('user_id')

    if session_id and user_id:
        # Broadcast to everyone in this chat room EXCEPT sender
        await sio.emit('user_typing', {
            'user_id': user_id,
            'session_id': session_id,
            'is_typing': True
        }, room=f"chat_{session_id}", skip_sid=sid)


@sio.event
async def typing_stop(sid, data):
    """
    Broadcast typing indicator stop to other users in chat session
    data = {"user_id": 1, "session_id": 1}
    """
    session_id = data.get('session_id')
    user_id = data.get('user_id')

    if session_id and user_id:
        # Broadcast to everyone in this chat room EXCEPT sender
        await sio.emit('user_typing', {
            'user_id': user_id,
            'session_id': session_id,
            'is_typing': False
        }, room=f"chat_{session_id}", skip_sid=sid)


@sio.event
async def message_delivered(sid, data):
    """
    Broadcast message delivery confirmation
    data = {"message_id": 123, "session_id": 1, "user_id": 1}
    """
    session_id = data.get('session_id')
    message_id = data.get('message_id')
    user_id = data.get('user_id')

    if session_id and message_id:
        await sio.emit('message_status_update', {
            'message_id': message_id,
            'status': 'delivered',
            'user_id': user_id
        }, room=f"chat_{session_id}")


@sio.event
async def message_read(sid, data):
    """
    Broadcast message read confirmation
    data = {"message_ids": [1,2,3], "session_id": 1, "user_id": 1}
    """
    session_id = data.get('session_id')
    message_ids = data.get('message_ids', [])
    user_id = data.get('user_id')

    if session_id and message_ids:
        await sio.emit('messages_read', {
            'message_ids': message_ids,
            'read_by_user_id': user_id,
            'session_id': session_id
        }, room=f"chat_{session_id}")


@sio.event
async def message_reaction(sid, data):
    """
    Broadcast message reaction to all users in chat session
    data = {"message_id": 123, "session_id": 1, "user_id": 1, "emoji": "❤️", "action": "add" | "remove"}
    """
    session_id = data.get('session_id')

    if session_id:
        await sio.emit('reaction_update', data, room=f"chat_{session_id}")