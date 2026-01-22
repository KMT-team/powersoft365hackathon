# Database Schema

## Tables

### users
```sql
id            SERIAL PRIMARY KEY
email         TEXT UNIQUE NOT NULL
password_hash TEXT NOT NULL
salt          TEXT NOT NULL
created_at    TIMESTAMPTZ DEFAULT now()
```

### sessions
```sql
id         UUID PRIMARY KEY DEFAULT uuid_generate_v4()
user_id    INT REFERENCES users(id) ON DELETE CASCADE
expires_at TIMESTAMPTZ NOT NULL
created_at TIMESTAMPTZ DEFAULT now()
```

**Indexes:** `user_id`, `expires_at`

## Relationships

`users (1) ──< (N) sessions`

## Key Queries

**Create user:**
```sql
INSERT INTO users (email, password_hash, salt) VALUES ($1, $2, $3) RETURNING id;
```

**Validate session:**
```sql
SELECT u.id, u.email FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE s.id = $1 AND s.expires_at > now();
```

**Delete session:**
```sql
DELETE FROM sessions WHERE id = $1;
```

## Migration

Auto-applied on server start via `migrations/001_create_tables.sql`
