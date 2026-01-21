# How to Run ModaPro Tutor

## Prerequisites

Before running the application, ensure you have the following installed:

1. **Go 1.25 or higher**
   - Download from: https://go.dev/dl/
   - Verify installation: `go version`

2. **PostgreSQL 12 or higher**
   - Download from: https://www.postgresql.org/download/
   - Verify installation: `psql --version`

3. **Google Gemini API Key**
   - Get free API key from: https://ai.google.dev/
   - Required for AI tutor functionality

4. **Git** (for cloning the repository)
   - Download from: https://git-scm.com/downloads

---

## Step 1: Clone the Repository

```bash
git clone <repository-url>
cd powersoft365hackathon
```

---

## Step 2: Set Up PostgreSQL Database

### Option A: Using psql Command Line

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE learningplatform;

# Exit psql
\q
```

### Option B: Using PostgreSQL GUI (pgAdmin)

1. Open pgAdmin
2. Right-click on "Databases"
3. Select "Create" → "Database"
4. Name it: `learningplatform`
5. Click "Save"

---

## Step 3: Configure Environment Variables

### Create .env File

Copy the example file and edit it:

```bash
cp .env.example .env
```

### Edit .env File

Open `.env` in a text editor and add your credentials:

```env
# Database Connection
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/learningplatform?sslmode=disable

# Google AI API Key
GOOGLE_API_KEY=your_gemini_api_key_here

# Server Port (optional, defaults to 8080)
PORT=8080
```

**Replace:**
- `YOUR_PASSWORD` with your PostgreSQL password
- `your_gemini_api_key_here` with your actual Gemini API key

**Why these settings?**
- `DATABASE_URL`: Tells the app where to find your database
- `GOOGLE_API_KEY`: Enables AI tutor functionality
- `PORT`: Which port the web server runs on (8080 is standard for development)

---

## Step 4: Install Go Dependencies

The application will automatically download dependencies on first run, but you can pre-install them:

```bash
go mod download
```

This downloads:
- PostgreSQL driver
- Google Gemini SDK
- Bcrypt for password hashing

---

## Step 5: Run the Application

### Start the Server

```bash
go run cmd/server/main.go
```

**What happens when you run this:**
1. Loads environment variables from `.env`
2. Connects to PostgreSQL database
3. Runs database migrations (creates tables automatically)
4. Starts HTTP server on port 8080
5. Prints: `Server running on http://localhost:8080`

### Expected Output

```
migrations: <nil>
Server running on http://localhost:8080
```

If you see warnings about `GOOGLE_API_KEY`, the AI features won't work but the rest of the app will run.

---

## Step 6: Access the Application

Open your web browser and navigate to:

```
http://localhost:8080
```

You should see the login/register page.

---

## Step 7: Create an Account

### Option 1: Register a New Account

1. Click "Create an account"
2. Enter:
   - Email: `test@example.com`
   - Username: `testuser`
   - Password: `Test123!@#` (must have uppercase, lowercase, number, special char)
   - Confirm password
3. Click "Sign up"
4. You'll be redirected to the dashboard

### Option 2: Use Guest Mode

1. Click "Continue as a guest"
2. Instant access without registration
3. Limited features (no progress saving)

---

## Step 8: Access the Classroom

From the dashboard, navigate to:

```
http://localhost:8080/classroom/
```

You'll see:
- **Left side:** Inventory simulator (55% width)
- **Right side:** AI tutor chat (45% width)

---

## Troubleshooting

### Problem: "connection refused" error

**Cause:** PostgreSQL is not running

**Solution:**
```bash
# On Linux/Mac
sudo service postgresql start

# On Windows
# Start PostgreSQL from Services app
```

### Problem: "database does not exist"

**Cause:** Database not created

**Solution:**
```bash
psql -U postgres -c "CREATE DATABASE learningplatform;"
```

### Problem: "GOOGLE_API_KEY not found"

**Cause:** Missing or incorrect API key in `.env`

**Solution:**
1. Check `.env` file exists in project root
2. Verify `GOOGLE_API_KEY=` line has your actual key
3. No spaces around the `=` sign
4. Restart the server

### Problem: "password authentication failed"

**Cause:** Wrong PostgreSQL password in `DATABASE_URL`

**Solution:**
1. Open `.env`
2. Update password in `DATABASE_URL`
3. Format: `postgres://postgres:CORRECT_PASSWORD@localhost:5432/learningplatform?sslmode=disable`

### Problem: Port 8080 already in use

**Cause:** Another application is using port 8080

**Solution:**
```bash
# Option 1: Change port in .env
PORT=3000

# Option 2: Kill process using port 8080
# On Linux/Mac
lsof -ti:8080 | xargs kill -9

# On Windows
netstat -ano | findstr :8080
taskkill /PID <PID_NUMBER> /F
```

### Problem: "go: command not found"

**Cause:** Go is not installed or not in PATH

**Solution:**
1. Install Go from https://go.dev/dl/
2. Verify: `go version`
3. Restart terminal

---

## Development Workflow

### Making Code Changes

The server does NOT auto-reload. After changing code:

1. Stop server: `Ctrl+C`
2. Restart: `go run cmd/server/main.go`

### Resetting the Database

To start fresh:

```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE learningplatform;"
psql -U postgres -c "CREATE DATABASE learningplatform;"

# Restart server (migrations run automatically)
go run cmd/server/main.go
```

### Viewing Logs

All logs print to terminal. Watch for:
- `Server running on http://localhost:8080` - Success
- `db init: <error>` - Database connection failed
- `migrations: <error>` - Database setup failed

---

## Production Deployment

For production deployment, you need to:

1. **Build the binary:**
   ```bash
   go build -o modapro-tutor cmd/server/main.go
   ```

2. **Set production environment variables:**
   ```env
   DATABASE_URL=postgres://user:pass@production-host:5432/dbname?sslmode=require
   GOOGLE_API_KEY=production_key
   PORT=80
   ```

3. **Enable secure cookies:**
   - Uncomment `Secure: true` in `internal/handlers/login.go`
   - Requires HTTPS

4. **Run the binary:**
   ```bash
   ./modapro-tutor
   ```

---

## Why This Setup?

### Why PostgreSQL?
- Reliable and mature database
- Supports UUID for secure session IDs
- Free and open-source
- Industry standard

### Why .env File?
- Keeps secrets out of code
- Easy to change settings without recompiling
- Different settings for development vs production
- Standard practice in Go applications

### Why Port 8080?
- Standard development port
- Doesn't require admin/root privileges
- Easy to remember
- Won't conflict with common services

### Why Migrations Run Automatically?
- Ensures database is always up-to-date
- No manual SQL execution needed
- Safe to run multiple times (idempotent)
- Beginner-friendly

---

## Quick Reference

### Start Application
```bash
go run cmd/server/main.go
```

### Access Application
```
http://localhost:8080
```

### Stop Application
```
Ctrl+C
```

### Reset Database
```bash
psql -U postgres -c "DROP DATABASE learningplatform; CREATE DATABASE learningplatform;"
```

### Check Database
```bash
psql -U postgres -d learningplatform -c "\dt"
```

---

## Next Steps

After successfully running the application:

1. Read [architecture.md](architecture.md) to understand the codebase
2. Read [testing_guide.md](testing_guide.md) to test all features
3. Read [flowchart.md](flowchart.md) to see code execution paths
4. Explore the simulator and AI tutor features

---

## Support

If you encounter issues not covered here:

1. Check the terminal output for error messages
2. Verify all prerequisites are installed
3. Ensure `.env` file is configured correctly
4. Check PostgreSQL is running
5. Review the documentation in `/docs` folder

---

**Status:** Ready for development and testing
**Last Updated:** January 2026
