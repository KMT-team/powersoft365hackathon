# Architecture

## Business Context

Learnflowy addresses a critical retail/hospitality challenge: **expensive and time-consuming ERP training**. Traditional methods require dedicated trainers, lengthy sessions, and repeated practice. Our interactive simulation platform reduces onboarding time through gamified, self-paced learning with AI coaching.

## System Overview

```
┌─────────┐      ┌───────────┐      ┌────────────┐
│ Browser │ ───> │ Go Server │ ───> │ PostgreSQL │
└─────────┘      └─────┬─────┘      └────────────┘
                       │
                       ▼
               ┌───────────────┐
               │ Gemini 3 API  │
               └───────────────┘
```

## Tech Stack

- **Backend:** Go (routing, auth, AI)
- **Database:** PostgreSQL (users, sessions, progress)
- **Frontend:** JS, CSS (no frameworks), HTML
- **AI:** Google Gemini 3 Flash Preview

## Request Flow

```
Landing ──> Login ──> Dashboard ──> Classroom ──> AI Chat
  GET /     POST        GET           GET           POST
            /api/login  /dashboard    /classroom    /api/chat
```

## Learning Progression

```
┌────────────┐    ┌────────────┐         ┌────────────┐
│ Exercise 1 │ -> │ Exercise 2 │ -> ... ->│ Exercise 5 │
│  (Basic)   │    │            │         │ (Advanced) │
└──────┬─────┘    └────────────┘         └──────┬─────┘
       │                                         │
       ▼                                         ▼
  Hints + AI                              Completion
```

Progress tracked in localStorage, AI adapts coaching based on inventory context and exercise difficulty.

## Data Storage

**Server (PostgreSQL):**
- User credentials (bcrypt hashed)
- Session tokens (UUID, 24h expiry)  

**Client (localStorage):**
- Theme preference
- Inventory state
- Exercise progress (completion tracking)

## Security

- Passwords: bcrypt
- Sessions: HTTP-only cookies
- Guest users: `guest@system.local`

## File Structure

```
cmd
  └─ server
       └─ main.go              # Entry point
internal
  ├─ handlers                  # Auth, classroom, chat
  └─ ai                        # Prompt engineering
web
  ├─ pre-login                 # Landing page
  ├─ login                     # Auth UI
  ├─ classroom                 # Simulator
  ├─ exercises                 # Exercise engine
  └─ styles.css                # Global theme
migrations                     # Database schema
assets                         # Images and logos
```
