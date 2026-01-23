# Setup Guide

## Prerequisites

- Go 1.21+
- Docker or PostgreSQL
- Google Gemini API key

## Quick Setup

```bash
# Clone and install
git clone <repository-url>
cd powersoft365hackathon
go mod download

# Setup database (Docker - recommended)
docker run --name flowy-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=flowy \
  -p 5432:5432 
  -d postgres:15

# OR setup database (native PostgreSQL)
psql -U postgres -c "CREATE DATABASE flowy;"

# Edit .env with your credentials
cp .env.example .env

# Run (migrations auto-apply on startup)
go run cmd/server/main.go
# Open http://localhost:8080
```

## Environment

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/flowy?sslmode=disable"
GOOGLE_API_KEY="your-key"  # Get from https://makersuite.google.com/app/apikey
```

## Troubleshooting

**Connection refused:** Start PostgreSQL or Docker container  
**Port 8080 in use:** `lsof -i :8080` then `kill -9 <PID>`  
**AI not working:** Verify GOOGLE_API_KEY in `.env`  
**Migrations fail:** Database must have UUID extension enabled (usually auto-enabled)
