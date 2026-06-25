# Project Aura Backend (FastAPI + PostgreSQL)

Backend API for Project Aura (dating application). It uses FastAPI, SQLAlchemy, and PostgreSQL, exposing REST endpoints for users, profiles, messaging, matching, and common catalog data.

## Stack
- FastAPI (`app.main:app`)
- SQLAlchemy ORM (`app.models`, `app.database`)
- PostgreSQL (Cloud SQL or local)
- Pydantic v2 schemas (`app.schemas/*`)
- Uvicorn for dev server

## Directory Structure
- `app/`
  - `main.py` – FastAPI app factory, CORS, router registration.
  - `database.py` – Settings and SQLAlchemy engine/session.
  - `models.py` – ORM models (User, Profile, Message, Matches, etc.).
  - `routes/` – API routers grouped by domain.
  - `schemas/` – Pydantic request/response models.
  - `crud/` – Data access helpers used by routes.
  - `utils/` – Utilities (helpers and shared logic).
- `.env.example` – Example environment variables (see note below).
- `requirements.txt` – Python dependencies.
- `test_connection.py` – Database connectivity diagnostics.
- `test_api.py` – Simple endpoint smoke test.

## Table of Contents
- [Windows Quick Start](#windows-quick-start)
- [Non-Windows Quick Start](#non-windows-quick-start)
- [Environment configuration](#environment-configuration)
- [Cloud SQL Proxy](#connect-via-google-cloud-sql-auth-proxy)
- [API Overview](#api-overview)

## Windows Quick Start

1. Open PowerShell: `cd "backend\\Google Cloud SQL"`
2. Start proxy: `.\start-cloud-sql-proxy.bat` and keep the window open.
3. Create venv and install deps:
   - `cd ..` (to `backend/`)
   - `python -m venv .venv && .venv\Scripts\activate`
   - `pip install -r requirements.txt`
4. Configure `.env` (see [Environment configuration](#environment-configuration)):
   - Set `DATABASE_HOST=127.0.0.1` and `DATABASE_PORT=1234` when using the proxy
5. Verify DB: `python test_connection.py`
6. Run API: `uvicorn app.main:app --reload --port 8000`
7. Docs: `http://localhost:8000/docs`

## Non-Windows Quick Start

1. Open a terminal and start Cloud SQL proxy:
   - `./cloud-sql-proxy --address 127.0.0.1 --port 1234 gaia-capstone3-prd:asia-southeast1:project-aura`
   - Keep this terminal open; closing it stops the proxy.
2. Create venv and install deps:
   - `cd backend/`
   - `python3 -m venv .venv && source .venv/bin/activate`
   - `pip install -r requirements.txt`
3. Configure `.env` (see [Environment configuration](#environment-configuration)):
   - Set `DATABASE_HOST=127.0.0.1` and `DATABASE_PORT=1234` when using the proxy.
4. Verify DB: `python test_connection.py`
5. Run API: `uvicorn app.main:app --reload --port 8000`
6. Docs: `http://localhost:8000/docs`

## Quick Start

### Prerequisites
- Python 3.11+ recommended
- PostgreSQL database (local or Cloud SQL)

### Install dependencies
```powershell
# From `backend/`
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### Environment configuration
`app.database.Settings` reads these variables from `.env`:
```env
# Required by app.database.Settings
DATABASE_HOST=your_db_host
DATABASE_PORT=5432
DATABASE_NAME=your_db_name
DATABASE_USER=your_db_user
DATABASE_PASSWORD=your_db_password

# Optional (not used by code yet; CORS is hard-coded in main.py)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```
Note: `.env.example` now matches the application’s settings. Populate the `DATABASE_*` variables shown above; `DATABASE_URL` and `ASYNC_DATABASE_URL` are commented and currently not used by the code.

Passwords with special characters are safely URL-encoded in `database.py` using `quote_plus`.

### Connect via Google Cloud SQL Auth Proxy

Use the Cloud SQL Auth Proxy to connect securely to your Cloud SQL Postgres instance while your app and tools connect to a local TCP port.

- Why: The proxy performs Google authentication (ADC or service account) and opens a local port that behaves like a normal Postgres server.
- Prerequisites:
  - Install the Cloud SQL Auth Proxy: https://cloud.google.com/sql/docs/postgres/connect-auth-proxy
  - Authenticate:
    - Option A (recommended): `gcloud auth application-default login` and ensure your account has `roles/cloudsql.client` on `gaia-capstone3-prd`.
    - Option B: Use a service account JSON with `Cloud SQL Client` role and pass `--credentials-file <path-to-key.json>`.
  - Verify instance connection name (ICN): `gaia-capstone3-prd:asia-southeast1:project-aura`.

- Start the proxy:
  - Windows (CLI): `cloud-sql-proxy.exe --address 127.0.0.1 --port 1234 gaia-capstone3-prd:asia-southeast1:project-aura`
  - macOS/Linux: `./cloud-sql-proxy --address 127.0.0.1 --port 1234 gaia-capstone3-prd:asia-southeast1:project-aura`
  - Windows (via provided `.bat` script):
    - Path: `backend/Google Cloud SQL/start-cloud-sql-proxy.bat`
    - Ensure `cloud-sql-proxy.exe` is in the same folder or on your PATH.
    - Edit the instance connection name if needed (see the .bat file).
    - Run from PowerShell:
      - `cd "backend\\Google Cloud SQL"`
      - `.\start-cloud-sql-proxy.bat`
      - Or double-click the `.bat` file in Explorer.
    - Keep this window open; closing it stops the proxy.
    
- Configure `.env` (see [Environment configuration](#environment-configuration)):
  - When using the proxy, set `DATABASE_HOST=127.0.0.1` and `DATABASE_PORT=1234`.

- Client tools (DBeaver, psql):
  - Host `127.0.0.1`, Port `1234`, DB name/user/password as above.
  - SSL can be disabled; the proxy handles secure upstream transport.

- Common proxy error: `could not find default credentials` → run `gcloud auth application-default login` or provide `--credentials-file` for a service account with `Cloud SQL Client` role.

### Verify DB connectivity
```powershell
python test_connection.py
```
This script checks required env vars and prints tables/FK relationships when a connection succeeds.

### Run the API server
```powershell
uvicorn app.main:app --reload --port 8000
```
- Docs: `http://localhost:8000/docs`
- Health: `GET /health`

On startup, `Base.metadata.create_all(bind=engine)` will create missing tables.

## API Overview

### Root
- `GET /` – Welcome and basic metadata.
- `GET /health` – Health check.

### Users (`/users`)
- `POST /users/register` – Create user.
- `POST /users/login` – Login (returns `UserResponse`, no JWT yet).
- `GET /users/{user_id}` – Get by ID.
- `GET /users` – List with `skip`, `limit`.
- `PUT /users/{user_id}` – Update.
- `DELETE /users/{user_id}` – Delete.
- `POST /users/{user_id}/change-password` – Change password.

Example `POST /users/register` body:
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "date_of_birth": "1990-01-15",
  "gender": "male"
}
```

### Profiles (`/profiles`)
- `POST /profiles/` – Create profile.
- `GET /profiles/{user_id}` – Get by user.
- `PUT /profiles/{user_id}` – Update profile.
- `GET /profiles/{user_id}/pictures` – List pictures.
- `POST /profiles/{user_id}/pictures` – Add picture.
- `DELETE /profiles/pictures/{picture_id}` – Delete picture.
- `GET /profiles/{user_id}/emergency-contacts` – List contacts.
- `POST /profiles/{user_id}/emergency-contacts` – Add contact.
- `DELETE /profiles/emergency-contacts/{contact_id}` – Delete contact.
- `GET /profiles/{user_id}/preferences` – Get preferences.
- `PUT /profiles/{user_id}/preferences` – Update preferences.

### Messages (`/messages`)
- `POST /messages/sessions` – Create chat session.
- `GET /messages/sessions/{session_id}` – Get session.
- `GET /messages/sessions/user/{user_id}` – Sessions by user.
- `POST /messages/sessions/{session_id}/participants` – Add participant (`user_id`, `role` as query params).
- `POST /messages/` – Send message.
- `GET /messages/{message_id}` – Get message.
- `GET /messages/session/{session_id}` – List messages (`skip`, `limit`).
- `DELETE /messages/{message_id}` – Soft delete.
- `POST /messages/attachments` – Add attachment.

### Matches (`/matches`)
- `POST /matches/like` – Like/Dislike (`status`: `LIKE` or `DISLIKE`).
- `GET /matches/user/{user_id}` – User matches (mutual likes).
- `GET /matches/check/{user1_id}/{user2_id}` – Check match.
- `GET /matches/liked-by/{user_id}` – IDs who liked the user.
- `GET /matches/liked/{user_id}` – IDs the user liked.

### Common (`/common`)
- `GET /common/interests`, `POST /common/interests`.
- `GET /common/languages`, `POST /common/languages`.
- `GET /common/prompts`, `POST /common/prompts`, `GET /common/prompts/{prompt_id}`.

## Data Model Summary
Key entities in `app/models.py`:
- `User` – core account, relations to `Profile`, `UserPreferences`, messages, likes.
- `Profile` – bio, picture URL, `Interest` and `Language` links.
- `UserPreferences` – match filters (age range, verified-only).
- `EmergencyContact`, `ProfilePicture`, `ProfileAnalysis`, `PremiumUser`.
- Messaging: `ChatSession`, `ChatParticipant`, `Message`, `MessageAttachment`.
- Matching: `LikeDislike` with relationships to `User`.
- Catalog: `Interest`, `Language`, `Prompt`, `UserPrompt`.

## Testing
- API smoke test: `python test_api.py`
- DB connectivity: `python test_connection.py`

## CORS
Allowed origins are currently hard-coded in `app/main.py` to `http://localhost:3000` and `http://localhost:5173`. Update there if you need different origins.

## Notes & Future Work
- Add JWT-based auth and tokens for login.
- Consider centralizing CORS to use `.env` (`ALLOWED_ORIGINS`).
- Replace hard-coded settings with `pydantic-settings` overrides where appropriate.