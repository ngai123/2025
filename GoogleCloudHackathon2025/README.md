# Project Aura

A full‑stack dating application with a React/Vite frontend and a FastAPI + PostgreSQL backend. This README covers local setup, environment configuration, how to run both apps, API overview, and troubleshooting.

**Tech Stack**
- Frontend: React 19, Vite 7, Tailwind (configured), Axios
- Backend: FastAPI, SQLAlchemy, Uvicorn, Pydantic v2
- Database: PostgreSQL (local or Google Cloud SQL via Auth Proxy)
- CI/CD: GitLab Auto DevOps with Secret Detection enabled

**Repository Layout**
- `Project-Aura-Development/frontend/` – React + Vite app
- `Project-Aura-Development/backend/` – FastAPI service
- `Project-Aura-Development/backend/.env.example` – backend env template
- `Project-Aura-Development/backend/Readme.md` – detailed backend docs
- `.gitlab-ci.yml` – Auto DevOps pipeline template

**Prerequisites**
- Node.js 18+ and npm
- Python 3.11+
- PostgreSQL instance (local) or access to Google Cloud SQL

**Environment Variables**
- Backend (`backend/.env`):
  - `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`
  - Optional: `SECRET_KEY`, `ENVIRONMENT`, `ALLOWED_ORIGINS`
- Frontend (`frontend/.env`):
  - `VITE_API_BASE_URL` (default fallback is `http://localhost:8000`)

**Backend Setup**
- From `Project-Aura-Development/backend`:
  - `python -m venv .venv`
  - `.venv\Scripts\activate` (Windows) or `source .venv/bin/activate` (macOS/Linux)
  - `pip install -r requirements.txt`
  - Copy `.env.example` to `.env` and fill in DB values
  - Start API: `uvicorn app.main:app --reload --port 8000`
- Useful scripts:
  - `python test_connection.py` – verifies DB env and lists tables
  - `python test_api.py` – health check, sample register/login calls
- Notes:
  - Passwords with special characters are URL‑encoded automatically in `app/database.py`.
  - On startup, `Base.metadata.create_all(bind=engine)` creates missing tables.

**Cloud SQL (Optional)**
- Use the Cloud SQL Auth Proxy to connect securely to Google Cloud SQL.
- Example (Windows): `cloud-sql-proxy.exe --address 127.0.0.1 --port 1234 project-aura-475314:us-central1:aura-database`
- Then set backend `.env`: `DATABASE_HOST=127.0.0.1`, `DATABASE_PORT=1234`, plus DB name/user/password.
- See `Project-Aura-Development/backend/Readme.md` for full proxy instructions and troubleshooting.

**Frontend Setup**
- From `Project-Aura-Development/frontend`:
  - `npm install`
  - Create `frontend/.env` and set `VITE_API_BASE_URL=http://localhost:8000`
  - `npm run dev` → app on `http://localhost:5173/`
- Routes (from `src/App.jsx`):
  - `/` → Welcome
  - `/account-creation` → Account creation flow
  - `/profile`, `/profile-picture`, `/id-verification`, `/voice-setup`, `/main`, `/chat` (and `/chat/:id`), `/report`, `/report/submain`, `/report/upload`

**API Overview (Quick)**
- `GET /` and `GET /health`
- `POST /users/register`, `POST /users/login`, `GET /users/{id}`, `GET /users`, `PUT /users/{id}`, `DELETE /users/{id}`, `POST /users/{id}/change-password`
- Profiles: create/get/update, pictures, emergency contacts, preferences
- Messages: chat sessions, participants, messages, attachments
- Matches: like/dislike, user matches, check match, liked by/liked
- Common catalog: interests, languages, prompts
- See backend `Readme.md` for details and example bodies

**Local Run (Summary)**
- Start backend first: `uvicorn app.main:app --reload --port 8000`
- Start frontend: `npm run dev`
- Open `http://localhost:5173/` and navigate to `/account-creation`

**Development**
- Backend formatting/tools: `black`, `flake8`, `pytest`
- Frontend: `npm run lint`, `npm run build`, `npm run preview`
- CORS is currently whitelisted for `http://localhost:3000` and `http://localhost:5173` in `backend/app/main.py`.

**CI/CD**
- `.gitlab-ci.yml` uses GitLab Auto DevOps with Secret Detection
- Customize stages and variables per environment needs

**Troubleshooting**
- Frontend can’t reach API: ensure backend is running on `:8000` and set `VITE_API_BASE_URL`.
- DB connection fails: run `python test_connection.py` and verify `.env` values; if using Cloud SQL, start the Auth Proxy and check credentials.
- Git “upstream branch does not match”: set correct upstream with `git push -u origin <current-branch-name>` or fix tracking via `git branch -u origin/<remote-branch>`.

**Credits / Notes**
- Backend authored by Christian Lew; project uses modern FastAPI + SQLAlchemy patterns.
- Future work: add JWT auth, centralize CORS via env, refine CI steps.


**Please read this file before attempting to code or build**

**Git Operations:**
1. It is a good habit to fetch and pull from repo before trying to code
2. For all modifications of codes, kindly perform on your own branch.
3. Merging from Sub branches to Main branch requires approval from the maintainer of repository
4. If your code is good to merge with the main branch, a short code review will be conducted with the team members before merge operations
5. PLEASE DO NOT PLAY AROUND WITH GIT FUNCTIONS THAT YOU HAVE NO IDEA WITH
6. Please watch this video to learn how to use git in CLI:
- [Git Tutorial for Beginners: Learn Git in 1 Hour
] https://youtu.be/8JJ101D3knE?si=g5Ujx3uWZKzNC0L-

**Coding:**
1. Try to include some comments during coding as it will greatly assist the teammates in understanding your codes
2. Try to organize your code neatly for easier reading
3. Please watch this video to learn and develop some good habits:
- [My 10 “Clean” Code Principles (Start These Now)] https://youtu.be/wSDyiEjhp8k?si=vaZBPNlZVEfwn2sM