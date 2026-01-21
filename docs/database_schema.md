# Database Schema Documentation

## Overview

Our database uses **PostgreSQL** with a minimal schema focused on authentication and session management. The simulation data is stored client-side in browser local storage.

---

## Schema Diagram

```
┌─────────────────────────────────┐
│           users                 │
├─────────────────────────────────┤
│ id (PK)          SERIAL         │
│ email            TEXT UNIQUE    │
│ password_hash    TEXT           │
│ salt             TEXT           │
│ created_at       TIMESTAMPTZ    │
└─────────────────────────────────┘
                 │
                 │ 1:N
                 │
                 ▼
┌─────────────────────────────────┐
│          sessions               │
├─────────────────────────────────┤
│ id (PK)          UUID           │
│ user_id (FK)     INT            │
│ expires_at       TIMESTAMPTZ    │
│ created_at       TIMESTAMPTZ    │
└─────────────────────────────────┘
```

---

## Table: `users`

### Purpose
Stores user account information for authentication.

### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Auto-incrementing user identifier |
| `email` | TEXT | NOT NULL, UNIQUE | User's email address (login identifier) |
| `password_hash` | TEXT | NOT NULL | Bcrypt hash of user's password |
| `salt` | TEXT | NOT NULL | Password salt (currently unused, reserved for future) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Account creation timestamp |

### Indexes
- **Primary Key:** `id` (automatic B-tree index)
- **Unique Constraint:** `email` (automatic unique index)

### Example Row
```sql
id: 1
email: "user@example.com"
password_hash: "$2a$10$N9qo8uLOickgx2ZMRZoMye..."
salt: ""
created_at: "2026-01-20 14:30:00+00"
```

### Design Decisions

**Why TEXT for email?**
- Flexible length (no arbitrary VARCHAR limit)
- PostgreSQL optimizes TEXT storage automatically
- Simpler than VARCHAR(255)

**Why separate salt column?**
- Bcrypt includes salt in hash (salt column currently empty)
- Reserved for future migration to different hashing algorithm
- Maintains schema flexibility

**Why TIMESTAMPTZ?**
- Stores timezone information
- Automatic UTC conversion
- Prevents timezone-related bugs

---

## Table: `sessions`

### Purpose
Tracks active user sessions for authentication state.

### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique session identifier |
| `user_id` | INT | NOT NULL, FOREIGN KEY → users(id) | Owner of this session |
| `expires_at` | TIMESTAMPTZ | NOT NULL | When session becomes invalid |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Session creation time |

### Indexes
- **Primary Key:** `id` (automatic B-tree index)
- **Foreign Key:** `user_id` → `users(id)` with CASCADE delete
- **Custom Index:** `idx_sessions_user_id` on `user_id` (fast user lookup)
- **Custom Index:** `idx_sessions_expires_at` on `expires_at` (expiry checks)

### Example Row
```sql
id: "a3bb189e-8bf9-41c4-b3cf-4c8f9e8c3a2d"
user_id: 1
expires_at: "2026-01-21 14:30:00+00"
created_at: "2026-01-20 14:30:00+00"
```

### Design Decisions

**Why UUID for session ID?**
- Cryptographically secure (unpredictable)
- No sequential guessing attacks
- Globally unique (supports distributed systems)
- 128-bit entropy

**Why expires_at instead of duration?**
- Simpler expiry checks (`WHERE expires_at > now()`)
- No calculation needed on every request
- Index-friendly for cleanup queries

**Why CASCADE delete?**
- Automatic cleanup when user deleted
- Maintains referential integrity
- Prevents orphaned sessions

**Why index on user_id?**
- Fast lookup: "Does this user have active sessions?"
- Used in login flow to reuse existing sessions
- Supports multi-device session management

**Why index on expires_at?**
- Efficient cleanup: `DELETE FROM sessions WHERE expires_at < now()`
- Fast validation: `WHERE expires_at > now()`
- Supports scheduled maintenance jobs

---

## Relationships

### users → sessions (One-to-Many)

**Cardinality:** One user can have multiple active sessions

**Use Cases:**
- User logged in on multiple devices
- Multiple browser tabs
- Mobile + desktop simultaneously

**Enforcement:**
- Foreign key constraint with CASCADE delete
- Application logic limits sessions per user (optional)

**Query Example:**
```sql
-- Get all active sessions for a user
SELECT * FROM sessions 
WHERE user_id = 1 
  AND expires_at > now();
```

---

## Database Operations

### User Registration
```sql
-- 1. Check if email exists
SELECT id FROM users WHERE email = $1;

-- 2. Insert new user
INSERT INTO users (email, password_hash, salt) 
VALUES ($1, $2, $3) 
RETURNING id;

-- 3. Create session
INSERT INTO sessions (user_id, expires_at) 
VALUES ($1, $2) 
RETURNING id;
```

### User Login
```sql
-- 1. Get user credentials
SELECT id, password_hash, salt 
FROM users 
WHERE email = $1;

-- 2. Check for active session
SELECT id, expires_at 
FROM sessions 
WHERE user_id = $1 
  AND expires_at > now() 
ORDER BY created_at DESC 
LIMIT 1;

-- 3. Create new session if none exists
INSERT INTO sessions (user_id, expires_at) 
VALUES ($1, $2) 
RETURNING id;
```

### Session Validation
```sql
-- Validate session and get user
SELECT u.id, u.email 
FROM sessions s 
JOIN users u ON s.user_id = u.id 
WHERE s.id = $1 
  AND s.expires_at > now();
```

### Logout
```sql
-- Delete specific session
DELETE FROM sessions WHERE id = $1;
```

### Session Cleanup (Maintenance)
```sql
-- Remove expired sessions
DELETE FROM sessions WHERE expires_at < now();
```

---

## Data Types Explained

### SERIAL
- Auto-incrementing integer
- Shorthand for `INT` + `SEQUENCE`
- Starts at 1, increments by 1
- Thread-safe (no race conditions)

### UUID
- 128-bit universally unique identifier
- Format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- Generated by `uuid_generate_v4()` (random)
- Requires `uuid-ossp` extension

### TEXT
- Variable-length string
- No length limit (up to 1GB)
- More flexible than VARCHAR
- Same performance as VARCHAR in PostgreSQL

### TIMESTAMPTZ
- Timestamp with timezone
- Stored in UTC internally
- Converted to client timezone on retrieval
- ISO 8601 format: `2026-01-20T14:30:00+00:00`

---

## Security Features

### Password Storage
- **Never store plaintext passwords**
- Bcrypt hashing (cost factor 10)
- Hash includes salt automatically
- Resistant to rainbow table attacks

**Example:**
```
Input: "MyPassword123!"
Output: "$2a$10$N9qo8uLOickgx2ZMRZoMye..."
         ^^^^ ^^^ ^^^^^^^^^^^^^^^^^^^^^^^^
         algo cost    salt + hash
```

### Session Security
- UUID prevents session prediction
- Expiry enforced at database level
- HttpOnly cookies prevent XSS access
- CASCADE delete prevents orphaned sessions

### SQL Injection Prevention
- All queries use parameterized statements (`$1`, `$2`)
- No string concatenation
- Go's `database/sql` package handles escaping

**Safe:**
```go
db.QueryRow("SELECT * FROM users WHERE email = $1", userEmail)
```

**Unsafe (never do this):**
```go
db.QueryRow("SELECT * FROM users WHERE email = '" + userEmail + "'")
```

---

## Performance Optimization

### Indexes Strategy

**Primary Keys (Automatic):**
- `users.id` - Fast user lookup by ID
- `sessions.id` - Fast session validation

**Foreign Keys (Automatic):**
- `sessions.user_id` - Join optimization

**Custom Indexes:**
- `idx_sessions_user_id` - User's active sessions
- `idx_sessions_expires_at` - Expiry checks

### Query Performance

**Fast Queries (Indexed):**
```sql
-- Uses primary key index
SELECT * FROM users WHERE id = 1;

-- Uses unique index
SELECT * FROM users WHERE email = 'user@example.com';

-- Uses custom index
SELECT * FROM sessions WHERE user_id = 1;

-- Uses custom index
SELECT * FROM sessions WHERE expires_at > now();
```

**Slow Queries (Avoid):**
```sql
-- Full table scan (no index on password_hash)
SELECT * FROM users WHERE password_hash LIKE '%abc%';

-- Full table scan (no index on created_at)
SELECT * FROM sessions WHERE created_at < '2026-01-01';
```

### Connection Pooling

**Configuration (in Go):**
```go
db.SetMaxOpenConns(10)        // Max 10 concurrent connections
db.SetConnMaxLifetime(5 * time.Minute)  // Recycle after 5 min
```

**Why:**
- Reuses connections (faster than creating new ones)
- Limits database load
- Prevents connection exhaustion

---

## Migration System

### File: `migrations/001_create_tables.sql`

**Purpose:** Initialize database schema

**Execution:** Automatic on server startup

**Idempotency:**
- `CREATE EXTENSION IF NOT EXISTS` - Safe to run multiple times
- `CREATE TABLE IF NOT EXISTS` - Won't fail if table exists
- `CREATE INDEX IF NOT EXISTS` - Won't duplicate indexes

**Migration Flow:**
```
1. Server starts
2. Read migration file
3. Connect to database
4. Execute SQL statements
5. Log success/failure
6. Continue startup
```

**Future Migrations:**
- Create `002_add_user_profiles.sql`
- Create `003_add_progress_tracking.sql`
- Numbering ensures order

---

## Data Not in Database

### Simulation State (Local Storage)

**Why not in database?**
- Faster access (no network latency)
- Reduces server load
- Works offline
- User-specific (no sharing needed)

**Stored in Browser:**
```javascript
localStorage.setItem('sim_luxe_threads_inventory', JSON.stringify(products));
localStorage.setItem('sim_luxe_threads_logs', JSON.stringify(transactions));
```

### AI Conversation History (In-Memory)

**Why not in database?**
- Temporary (session-based)
- High write volume
- Privacy (no persistent chat logs)
- Managed by Google ADK session service

**Stored in Server Memory:**
- Session service keeps recent messages
- Cleared when server restarts
- Not shared between users

---

## Backup and Recovery

### Backup Strategy (Production)

**Daily Backups:**
```bash
pg_dump -U postgres -d modapro_tutor > backup_$(date +%Y%m%d).sql
```

**Point-in-Time Recovery:**
- Enable WAL archiving
- Restore to specific timestamp

### Development Reset
```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS modapro_tutor;"
psql -U postgres -c "CREATE DATABASE modapro_tutor;"

# Restart server (migrations run automatically)
go run cmd/server/main.go
```

---

## Future Schema Extensions

### Potential Additions

**User Profiles:**
```sql
CREATE TABLE user_profiles (
    user_id INT PRIMARY KEY REFERENCES users(id),
    display_name TEXT,
    company_name TEXT,
    role TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

**Progress Tracking:**
```sql
CREATE TABLE user_progress (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    lesson_id TEXT,
    completed BOOLEAN DEFAULT false,
    score INT,
    completed_at TIMESTAMPTZ
);
```

**AI Chat History (Optional):**
```sql
CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    role TEXT, -- 'user' or 'bot'
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Summary

**Current Schema:**
- 2 tables (users, sessions)
- 1 relationship (1:N)
- 4 indexes (2 automatic, 2 custom)
- Minimal and focused on authentication

**Design Philosophy:**
- Simple and maintainable
- Security-first (bcrypt, UUID, parameterized queries)
- Performance-optimized (strategic indexes)
- Extensible (easy to add tables)

**What's NOT in Database:**
- Simulation data (local storage)
- AI conversations (in-memory)
- Static assets (file system)

This minimal schema keeps the database fast and focused while leveraging client-side storage for appropriate data.
