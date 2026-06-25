# /Users/dev/Documents/trigomuda-project-aura/Project-Aura-Development/backend/app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
from app.websocket import sio
from app.database import engine, Base
from app import models
from app.routes import (
    users_router,
    profiles_router,
    messages_router,  # This is correct
    matches_router,
    common_router,
    likes_router,
    payment_router,
    ai_router,
    profile_analysis_router,
    advice_router, # <--- NEW: Import the advice_router from app.routes
    compatibility_router,
)

"""
File: main.py
Author: Christian Lew
Date: October 21, 2025
Description: This file initializes the FastAPI app for the Dating App API.
"""

# Create database tables (if they don't exist)
# Note: Since we already have tables, this won't recreate them
try:
    print("[Startup] Attempting to create/verify database tables...")
    Base.metadata.create_all(bind=engine)
    print("[Startup] Database tables verified successfully")
except Exception as e:
    print(f"[Startup] WARNING: Could not create/verify tables: {e}")
    print("[Startup] Application will continue, but database operations may fail")

# Initialize FastAPI app
fastapi_app = FastAPI(
    title="Project Aura - Backend API",
    description="Backend API for Project Aura Dating Application",
    version="1.0.0"
)

# CORS configuration
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://192.168.0.52:5173",  # Local network IP for mobile testing
        "https://project-aura-final.web.app",
        "https://project-aura-final.firebaseapp.com",
        "https://project-aura-final--staging.web.app",
        "https://aura-dating-app.com",
        "https://www.aura-dating-app.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers (NO PREFIX HERE since it's already in the router definition)
fastapi_app.include_router(users_router)
fastapi_app.include_router(profiles_router)
fastapi_app.include_router(messages_router)  # ✅ Correct - no prefix needed
fastapi_app.include_router(matches_router)
fastapi_app.include_router(common_router)
fastapi_app.include_router(likes_router)
fastapi_app.include_router(payment_router)
fastapi_app.include_router(profile_analysis_router)
fastapi_app.include_router(advice_router)
fastapi_app.include_router(ai_router)
fastapi_app.include_router(compatibility_router)

# DEBUG: Print all registered routes
print("\n" + "="*50)
print("REGISTERED ROUTES:")
print("="*50)
for route in fastapi_app.routes:
    if hasattr(route, 'methods'):
        methods = ', '.join(route.methods)
        print(f"{methods:12} {route.path}")
print("="*50 + "\n")

@fastapi_app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": "Welcome to Dating App API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running"
    }

@fastapi_app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

@fastapi_app.get("/debug/db")
def debug_db():
    """Debug endpoint to check database configuration"""
    import os
    from app.database import DATABASE_URL

    cloud_sql_conn = os.getenv("CLOUD_SQL_CONNECTION_NAME")
    socket_path = f"/cloudsql/{cloud_sql_conn}" if cloud_sql_conn else None
    socket_exists = os.path.exists(socket_path) if socket_path else False

    # Mask password in DATABASE_URL for security
    masked_url = DATABASE_URL
    if "@" in masked_url:
        parts = masked_url.split("@")
        user_pass = parts[0].split("://")[1]
        if ":" in user_pass:
            user, _ = user_pass.split(":")
            masked_url = masked_url.replace(user_pass, f"{user}:****")

    return {
        "cloud_sql_connection_name": cloud_sql_conn,
        "socket_path": socket_path,
        "socket_exists": socket_exists,
        "database_url": masked_url,
        "environment": os.getenv("ENVIRONMENT", "unknown")
    }

# Wrap FastAPI app with Socket.IO ASGI app
# This MUST be the last thing exported as 'app' so uvicorn serves it
# socketio_path is set to '/socket.io' to avoid interfering with FastAPI routes
app = socketio.ASGIApp(
    sio,
    other_asgi_app=fastapi_app,
    socketio_path='/socket.io'
)