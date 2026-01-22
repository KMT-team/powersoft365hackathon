# Architecture

## System Overview

```
Browser → Go Server → PostgreSQL
              ↓
         Google Gemini API
```

## Tech Stack

- **Backend:** Go (routing, auth, AI)
- **Database:** PostgreSQL (users, sessions)
- **Frontend:** JS, CSS (no frameworks), HTML
- **AI:** Google Gemini 1.5 Flash

## Request Flow

**Landing:** `GET /` → `web/pre-login/index.html`  
**Login:** `POST /api/login` → verify password → create session → set cookie  
**Classroom:** `GET /classroom/` → check session → serve interface  
**AI Chat:** `POST /api/chat` → Gemini API → stream response  

## Data Storage

**Server (PostgreSQL):**
- User credentials (bcrypt hashed)
- Session tokens (UUID, 24h expiry)  

**Client (localStorage):**
- Theme preference
- Inventory state
- Exercise progress

## Security

- Passwords: bcrypt
- Sessions: HTTP-only cookies
- Guest users: `guest@system.local`

## File Structure

```
cmd/server/main.go       # Entry point
internal/handlers/       # Auth, classroom, chat
internal/ai/            # Prompt engineering
web/
  ├── pre-login/        # Landing page
  ├── login/            # Auth UI
  ├── classroom/        # Simulator
  ├── exercises/        # Exercise engine
  └── styles.css        # Global theme
migrations/             # Database schema
```
