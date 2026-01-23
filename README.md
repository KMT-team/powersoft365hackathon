<div align="center">
  <img src="assets/learnflowy-logo.svg" alt="Learnflowy Logo" width="200"/>
  <h1>Learnflowy - Interactive Learning Platform</h1>
  <p>AI-powered learning platform with interactive simulations for ERP/POS tools</p>
  <p><strong>Built for Powersoft 365 x Zone01 Athens Hackathon 2025-2026</strong></p>
</div>

---

## Problem & Solution

**Challenge:** Training retail and hospitality staff on ERP systems is slow, expensive, and requires dedicated trainers.

**Solution:** Learnflowy provides gamified, self-paced learning through interactive simulations with AI coaching, reducing onboarding time and costs.

## Quick Start

```bash
# 1. Setup environment
cp .env.example .env
# Edit .env with your credentials

# 2. Start PostgreSQL (Docker recommended)
docker run --name flowy-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=flowy \
  -p 5432:5432 -d postgres:15

# 3. Run server (auto-applies migrations)
go run cmd/server/main.go

# 4. Open http://localhost:8080
```

## Features

- **Landing Page**: Smooth scrolling, theme toggle, responsive design
- **Authentication**: Register/login with bcrypt, guest mode, session management
- **Classroom**: Split-pane interface with inventory simulator and AI tutor
- **Exercises**: 5 progressive exercises with hints, validation, and completion tracking
- **AI Tutor**: Google Gemini integration with adaptive coaching modes
- **Inventory Sim**: Product/variant management with sell/damage actions

## Tech Stack

- **Backend**: Go 1.21+
- **Database**: PostgreSQL with UUID extension / Docker
- **AI**: Google Gemini API
- **Frontend**: JavaScript, CSS variables, HTML
- **Auth**: bcrypt password hashing, HTTP-only session cookies

## Project Structure

```
cmd/server/main.go           # Server entry point
internal/
  ├── handlers/              # HTTP handlers (auth, classroom, chat)
  └── ai/                    # AI prompt engineering
web/
  ├── pre-login/             # Landing page
  ├── login/                 # Authentication UI
  ├── classroom/             # Simulator interface
  ├── exercises/             # Exercise engine + hints
  └── styles.css             # Global theme (dark/light)
migrations/                  # Database schema
assets/                      # Images and logos
```

## API Endpoints

```
GET    /                     # Landing page
GET    /login                # Login page
GET    /dashboard.html       # User dashboard
GET    /classroom/           # Classroom interface

POST   /api/register         # Create account
POST   /api/login            # Authenticate user
POST   /api/logout           # End session
POST   /api/guest            # Guest login
GET    /api/check-auth       # Verify session
POST   /api/chat             # AI tutor chat
```

## Environment Variables Example

```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/flowy"
GOOGLE_API_KEY="your-gemini-api-key"
```

## Documentation

- [Architecture](docs/architecture.md) - System design and business context
- [Database Schema](docs/database_schema.md) - Tables and data strategy
- [Setup Guide](docs/how_to_run.md) - Detailed installation steps
- [AI Implementation](docs/ai_implementation.md) - Adaptive coaching system
- [User Journey](docs/flowchart.md) - Learning experience flow

## Security

- Passwords hashed with bcrypt
- Sessions stored in PostgreSQL
- Guest users isolated with system email

## Team

Built by **Marios**, **Thodoris**, and **Katerina** for Powersoft 365 Hackathon 2025-2026!

## License

MIT - See [LICENSE](legal/LICENSE)
