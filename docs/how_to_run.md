# Setup Guide

## Prerequisites

- Go 1.21+
- PostgreSQL 12+ / Docker
- Google Gemini API key

## Quick Setup

```bash
# Clone and install
git clone <repository-url>
cd powersoft365hackathon
go mod download

(# Setup database
psql -U postgres -c "CREATE DATABASE powersoft365;")

# Configure
cp .env.example .env
# Edit .env: DATABASE_URL and GOOGLE_API_KEY

# Run
go run cmd/server/main.go
# Open http://localhost:8080
```

## Environment

```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/flowy"
GOOGLE_API_KEY="your-key"  # Get from https://makersuite.google.com/app/apikey
```

## Troubleshooting

**Database error:** `pg_isready` to check PostgreSQL  
**Port 8080 in use:** `lsof -i :8080` then `kill -9 <PID>`  
**AI not working:** Check GOOGLE_API_KEY in `.env`
