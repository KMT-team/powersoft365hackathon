# Application Flow

## User Journey

```
Landing (/) → Login (/login) → Dashboard → Classroom (/classroom/)
```

## Authentication Flow

**Register:**
```
User submits form → Validate input → Hash password (bcrypt)
→ Insert user → Create session → Set cookie → Success
```

**Login:**
```
User submits credentials → Find user → Verify password
→ Create/reuse session → Set cookie → Success
```

**Guest:**
```
Click guest → Create/reuse guest@system.local
→ Create session → Set cookie → Clear localStorage
```

## Exercise Flow

```
User clicks Start → Check prerequisites → Load exercise
→ Show hints (if enabled) → User performs actions
→ Validate every 1s → Complete → Increment counter → Return to list
```

## AI Chat Flow

```
User types message → POST /api/chat with inventory context
→ Build system prompt (mode-specific) → Call Gemini API
→ Stream response chunks (SSE) → Display in chat bubble
```

## Data Persistence

**Server:** Users, sessions (PostgreSQL)
**Client:** Theme, inventory, exercises (localStorage)
