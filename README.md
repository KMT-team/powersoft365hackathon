# Learnflowy - Interactive Learning Platform

Learnflowy is an AI-powered learning platform with interactive simulations for software tools. Built for the Powersoft 365 x Zone01 Athens Hackathon.

## Quick Start

```bash
# 1. Setup environment
cp .env.example .env
# Edit .env with your credentials

# 2. Start PostgreSQL and create database
psql -U postgres -c "CREATE DATABASE flowy;"

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

- [Architecture](docs/architecture.md) - System design and components
- [Database Schema](docs/database_schema.md) - Tables and relationships
- [Setup Guide](docs/how_to_run.md) - Detailed installation steps

## Security

- Passwords hashed with bcrypt (cost 10)
- Sessions stored in PostgreSQL with expiry
- HTTP-only cookies prevent XSS
- Input validation on all endpoints
- Guest users isolated with system email

## License

MIT - See [LICENSE](legal/LICENSE)

## Team

Built by Marios, Thodoris, and Katerina for Powersoft 365 Hackathon 2025-2026!
