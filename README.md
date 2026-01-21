# ModaPro Tutor - Learning Platform

AI-powered inventory management learning platform with interactive scenarios.

## Quick Start

```bash
# Setup
export DATABASE_URL=postgresql://user:pass@localhost:5432/powersoft365
export GOOGLE_API_KEY=your-api-key

# Run migrations
psql -d powersoft365 -f migrations/001_create_tables.sql

# Start server
go run cmd/server/main.go

# Open http://localhost:8080
```

## Features

- **Classroom**: 2-pane interactive interface (Simulator + AI Coach)
- **Inventory Sim**: Product management with role-based scenarios
- **AI Coaching**: Google Gemini integration with adaptive feedback
- **Progress**: Badge tracking and user progress
- **Responsive**: Mobile/tablet/desktop support
- **Accessible**: WCAG AA compliant

## API

```
POST   /api/login              # User login
GET    /api/dashboard          # Dashboard
GET    /api/scenario/next      # Get scenario
POST   /api/scenario/:id/action # Submit action
POST   /api/scenario/:id/finish # Complete scenario
GET    /api/progress           # Get progress
POST   /api/chat               # Chat with AI
```

## Structure

```
cmd/server/main.go                # Server entry
internal/handlers/                # API handlers
web/
  ├── styles.css                 # Global theme
  ├── login/                      # Login page
  └── classroom/                  # Classroom UI
      ├── index.html             # Main interface
      ├── css/classroom-theme.css # Styles
      └── js/                     # Event handlers
migrations/                       # Database schema
docs/                            # Documentation
```

## Documentation

- [Architecture](docs/architecture.md)
- [API Usage](docs/api_usage.md)
- [Database](docs/database_schema.md)
- [Setup Guide](docs/how_to_run.md)
- [Authentication](docs/authentication-system.md)

## Testing

```bash
# Manual: Go to http://localhost:8080, register, click "Moda Pro"

# API:
curl http://localhost:8080/api/scenario/next
curl -X POST http://localhost:8080/api/scenario/1/action \
  -H "Content-Type: application/json" \
  -d '{"action":"test"}'
```

## Security

- Passwords: bcrypt hashing
- Sessions: HTTP-only cookies
- Input validation on all endpoints
- CORS configured

## Build & Deploy

```bash
# Build
go build -o powersoft365 cmd/server/main.go

# Deploy
export DATABASE_URL=<db-url>
export GOOGLE_API_KEY=<api-key>
./powersoft365
```

## License

MIT - See [LICENSE](legal/LICENSE)

## Contributing

See [CONTRIBUTING.md](legal/CONTRIBUTING.md)
