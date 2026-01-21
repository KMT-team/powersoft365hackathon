# Architecture Documentation

## System Overview

ModaPro Tutor follows a **three-tier architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                    │
│              (HTML/CSS/JavaScript Frontend)              │
└─────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                      │
│              (Go Backend + HTTP Handlers)                │
└─────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│                      DATA LAYER                          │
│         (PostgreSQL + Local Storage + AI API)            │
└─────────────────────────────────────────────────────────┘
```

---

## Directory Structure

### Root Level
```
powersoft365hackathon/
├── cmd/                    # Application entry points
├── internal/               # Private application code
├── web/                    # Frontend assets
├── migrations/             # Database schema versions
├── docs/                   # Documentation
├── legal/                  # License and policies
├── .env                    # Environment configuration (not in git)
├── .env.example            # Template for environment setup
├── go.mod                  # Go module dependencies
└── go.sum                  # Dependency checksums
```

---

## Layer 1: Presentation (Frontend)

### `/web/` Directory

#### **Purpose:** User interface and client-side logic

```
web/
├── login/                  # Authentication interface
│   ├── login.html         # Login/Register page structure
│   ├── login.js           # Form handling and API calls
│   └── (uses ../styles.css)
│
├── classroom/              # Main learning interface
│   ├── index.html         # Classroom layout (simulator + tutor)
│   ├── css/
│   │   ├── classroom.css  # Grid layout and shared styles
│   │   ├── simulator.css  # Inventory simulator styles
│   │   └── tutor.css      # AI chat interface styles
│   └── js/
│       ├── simulator-main.js   # Controller (event handlers)
│       ├── simulator-store.js  # State management (local storage)
│       ├── simulator-ui.js     # DOM rendering
│       └── tutor.js            # AI chat functionality
│
└── styles.css              # Global styles (theme, auth page)
```

#### **File Responsibilities:**

**`login/login.html`**
- Dual-mode form (login/register toggle)
- Theme switcher
- Guest login option
- Social login placeholders (UI only)

**`login/login.js`**
- Form validation
- API communication (`/api/login`, `/api/register`, `/api/guest`)
- Theme persistence (localStorage)
- Error display

**`classroom/index.html`**
- 2-column grid: Simulator (55%) + Tutor (45%)
- Simulator split: Inventory (65%) + Bottom pane (35%)
- Modal dialogs for add/edit product
- Collapsible tutor pane
- Badge UI section to display user achievements

**`classroom/js/simulator-main.js`**
- Event listeners (buttons, forms, filters)
- Role switching (admin/employee)
- Modal open/close logic
- Coordinates between store and UI modules
- Middleware logic for:
  - Loading scenarios.
  - Tracking user actions.
  - Validating steps.
  - Showing hints progressively.
  - Triggering badge unlocks.

**`classroom/js/simulator-store.js`**
- In-memory inventory state
- CRUD operations (add, update, delete, sell)
- Transaction logging
- LocalStorage persistence

**`classroom/js/simulator-ui.js`**
- Renders inventory cards
- Populates edit modal
- Updates transaction log
- Role-based UI adjustments

**`classroom/js/tutor.js`**
- Chat message handling
- API calls to `/api/chat`
- Mode selector (soft/intermediate/realistic)
- Pane collapse/expand

---

## Layer 2: Application (Backend)

### `/cmd/` Directory

#### **Purpose:** Application entry point

```
cmd/
└── server/
    └── main.go             # HTTP server initialization
```

**`main.go` Responsibilities:**
1. Load environment variables from `.env`
2. Initialize database connection
3. Apply migrations
4. Register HTTP routes
5. Start server on port 8080

**Key Functions:**
- `loadDotEnv()` - Manual .env parser (no external dependency)
- `main()` - Application bootstrap

---

### `/internal/` Directory

#### **Purpose:** Private application logic (not importable by external projects)

```
internal/
├── handlers/               # HTTP request handlers
│   ├── login.go           # Authentication endpoints
│   ├── db.go              # Database operations
│   ├── dashboard.go       # Protected page serving
│   ├── classroom.go       # Classroom page serving
│   ├── chat.go            # AI chat endpoint
│   └── scenario.go        # Scenario and progress handling
│
└── ai/                     # AI configuration
    ├── prompt.go          # System prompt builder
    └── message.txt        # Base AI instructions
```

#### **File Responsibilities:**

**`handlers/login.go`**
- `HandleRegister()` - Create new user account
- `HandleLogin()` - Authenticate existing user
- `HandleLogout()` - End session
- `HandleGuestLogin()` - Create guest session
- `CheckAuth()` - Verify session validity
- `ServeLogin()` - Serve login page HTML
- `ServeCSS()`, `ServeJS()` - Static file serving

**Key Logic:**
- Email validation (regex)
- Password strength check (8+ chars, upper, lower, digit, special)
- Bcrypt password hashing
- Session cookie management (HttpOnly, 24h expiry)

**`handlers/db.go`**
- `InitDB()` - Open PostgreSQL connection pool
- `ApplyMigrations()` - Execute SQL migration files
- `CreateUser()` - Insert new user
- `GetUserByEmail()` - Fetch user credentials
- `CreateSession()` - Generate UUID session
- `GetSessionUser()` - Validate session and return user
- `DeleteSession()` - Remove session on logout
- `GetActiveSessionByUser()` - Check for existing sessions
- `UpdateSessionExpiry()` - Extend session lifetime

**Connection Pooling:**
- Max 10 open connections
- 5-minute connection lifetime
- Automatic health checks

**`handlers/dashboard.go`**
- `ServeLogin()` - Root path handler
- `ServeDashboard()` - Protected dashboard page
- `ServeHomepage()` - JSON API for homepage data

**`handlers/classroom.go`**
- `ServeClassroom()` - Protected classroom page
- Session validation before serving
- Redirect to login if unauthenticated
- Static file server for classroom assets

**`handlers/chat.go`**
- `ChatHandler` struct - Manages AI model lifecycle
- `NewChatHandler()` - Constructor with session service
- `getOrInitModel()` - Lazy-load Gemini model (once per server lifetime)
- `ServeHTTP()` - Handle POST `/api/chat` requests

**AI Flow:**
1. Parse JSON request (message, user_id, session_id, mode)
2. Retrieve system prompt based on mode
3. Create LLM agent with instructions
4. Run agent with user message
5. Stream response parts
6. Return full response as JSON

**`handlers/scenario.go`**
- `GetNextScenario()` - Fetch the next scenario for the user
- `PostAction()` - Validate and record user actions in a scenario
- `FinishScenario()` - Finalize the scenario and award badges if applicable
- `GetProgress()` - Return user progress and earned badges

**Badge Logic:**
- First Scenario Completed
- Zero Mistakes
- Level 3 Completion

**`ai/prompt.go`**
- `GetSystemPrompt()` - Builds final prompt from base + mode
- Mode-specific instructions appended dynamically

**`ai/message.txt`**
- Base system instructions for AI tutor
- ModaPro domain knowledge
- Behavioral guidelines for 3 modes
- Safety constraints

---

## Layer 3: Data

### Database (PostgreSQL)

#### **Purpose:** Persistent user and session storage

**Location:** `/migrations/001_create_tables.sql`

**Schema:**
```sql
users
├── id (SERIAL PRIMARY KEY)
├── email (TEXT UNIQUE)
├── password_hash (TEXT)
├── salt (TEXT)
└── created_at (TIMESTAMPTZ)

sessions
├── id (UUID PRIMARY KEY)
├── user_id (INT → users.id)
├── expires_at (TIMESTAMPTZ)
└── created_at (TIMESTAMPTZ)

scenarios
├── id (SERIAL PRIMARY KEY)
├── scenario_data (JSONB)
├── created_at (TIMESTAMPTZ)

progress
├── id (SERIAL PRIMARY KEY)
├── user_id (INT → users.id)
├── scenario_id (INT → scenarios.id)
├── status (TEXT) -- e.g., 'completed', 'in_progress'
├── mistakes (INT)
├── time_taken (INT) -- in seconds
├── created_at (TIMESTAMPTZ)
```

**Indexes:**
- `idx_sessions_user_id` - Fast session lookup by user
- `idx_sessions_expires_at` - Efficient expiry checks
- `idx_progress_user_id` - Fast progress lookup by user
- `idx_progress_scenario_id` - Fast progress lookup by scenario

**Why PostgreSQL:**
- ACID compliance for user data
- UUID support for secure session IDs
- Mature ecosystem
- Free and open-source

---

### Local Storage (Browser)

#### **Purpose:** Client-side state persistence

**Keys:**
- `sim_luxe_threads_inventory` - Product catalog
- `sim_luxe_threads_logs` - Transaction history
- `theme` - User's theme preference (light/dark)

**Why Local Storage:**
- Instant load times
- Works offline
- No server load for simulation state
- Simple key-value API

---

### External APIs

#### **Google Gemini API**

**Purpose:** AI-powered tutoring

**Model:** `gemini-3-flash-preview`

**Configuration:**
- API key from environment variable
- Session-based conversation memory
- Streaming response support

**Why Gemini:**
- Fast response times
- Good instruction following
- Free tier for development
- Easy integration via Google ADK

---

## New Features

### Scenario Progression
- Tracks user progress across scenarios.
- Stores completed scenarios and awards badges based on achievements.

### Badge System
- Visual representation of user achievements.
- Badges include:
  - First Scenario Completed
  - Zero Mistakes
  - Level 3 Completion

### Enhanced AI Coach
- Dynamically generates scenarios based on user performance.
- Provides adaptive feedback and hints.
- Adjusts difficulty based on mistakes and time taken.

---

## Data Flow Examples

### User Registration Flow
```
1. User fills form → login.js validates
2. POST /api/register → handlers/login.go
3. Check email uniqueness → handlers/db.go
4. Hash password → bcrypt
5. Insert user → PostgreSQL
6. Create session → UUID generation
7. Set cookie → HTTP response
8. Redirect → /dashboard.html
```

### Inventory Update Flow
```
1. User edits product → simulator-main.js
2. Update state → simulator-store.js
3. Save to localStorage → browser API
4. Re-render UI → simulator-ui.js
5. Log transaction → simulator-store.js
6. Update sidebar → simulator-ui.js
```

### AI Chat Flow
```
1. User types message → tutor.js
2. POST /api/chat → handlers/chat.go
3. Load system prompt → ai/prompt.go
4. Initialize Gemini → Google ADK
5. Send message → Gemini API
6. Stream response → handlers/chat.go
7. Display message → tutor.js
```

### Scenario Progression Flow
```
1. User completes scenario step → simulator-main.js
2. Validate action → POST /api/scenario/:id/action → handlers/scenario.go
3. Update scenario state → simulator-store.js
4. Check for scenario completion → handlers/scenario.go
5. Award badge if criteria met → handlers/scenario.go
6. Update progress in database → handlers/db.go
7. Sync localStorage with new progress → browser API
```

---

## Design Patterns

### Backend (Go)

**Pattern:** Handler-based routing
- Each route has dedicated handler function
- Handlers grouped by feature (login, dashboard, chat)
- Shared database connection via package-level variable

**Pattern:** Lazy initialization
- AI model loaded on first chat request
- Reduces startup time
- Handles API key errors gracefully

**Pattern:** Session-based authentication
- Stateless HTTP with session cookies
- Database-backed session store
- Automatic expiry cleanup

### Frontend (JavaScript)

**Pattern:** Module separation
- `main.js` - Controller (events)
- `store.js` - Model (state)
- `ui.js` - View (rendering)

**Pattern:** Event delegation
- Parent containers handle child events
- Reduces listener count
- Supports dynamic content

**Pattern:** Local-first architecture
- State persists in browser
- Server only for auth and AI
- Fast, offline-capable

---

## Configuration Management

### Environment Variables

**File:** `.env` (not in git)

**Required:**
```bash
GOOGLE_API_KEY=<your-gemini-api-key>
DATABASE_URL=postgres://user:pass@host:5432/dbname
```

**Optional:**
```bash
PORT=8080  # Default if not set
```

**Loading:** Custom parser in `main.go` (no external dependency)

---

## Security Architecture

### Authentication
- Passwords hashed with bcrypt (cost 10)
- Sessions use cryptographically secure UUIDs
- HttpOnly cookies prevent XSS attacks
- 24-hour session expiry

### Authorization
- Session validation on protected routes
- Role-based UI (admin vs employee)
- Guest accounts have limited access

### Data Protection
- No sensitive data sent to AI
- Simulation data stays in browser
- Database credentials in environment variables
- `.gitignore` prevents secret commits

---

## Scalability Considerations

### Current Limitations
- Single server instance
- In-memory AI model (one per server)
- No load balancing
- No CDN for static assets

### Future Improvements
1. **Horizontal Scaling:**
   - Stateless backend (sessions in Redis)
   - Multiple server instances
   - Load balancer (nginx)

2. **Database Optimization:**
   - Connection pooling tuning
   - Read replicas for sessions
   - Caching layer (Redis)

3. **Frontend Optimization:**
   - CDN for static files
   - Service worker for offline mode
   - Code splitting for faster loads

---

## Technology Choices Rationale

### Why Go?
- Fast compilation and execution
- Built-in HTTP server
- Strong standard library
- Easy deployment (single binary)
- Good for beginners (simple syntax)

### Why PostgreSQL?
- Reliable and mature
- UUID support
- Good documentation
- Free and open-source

### Why Vanilla JavaScript?
- No build step required
- Fast development
- Easy to understand for beginners
- Modern ES6 modules

### Why Tailwind CSS?
- Rapid prototyping
- Consistent design system
- No custom CSS needed for common patterns
- CDN version (no build step)

---

## File Naming Conventions

- **Go files:** `lowercase.go` (e.g., `login.go`)
- **JavaScript:** `kebab-case.js` (e.g., `simulator-main.js`)
- **CSS:** `kebab-case.css` (e.g., `classroom.css`)
- **HTML:** `lowercase.html` (e.g., `index.html`)
- **Docs:** `snake_case.md` (e.g., `api_usage.md`)

---

## Summary

**Architecture Type:** Monolithic with modular frontend

**Key Principles:**
1. **Separation of Concerns** - Clear layer boundaries
2. **Simplicity** - Minimal dependencies
3. **Beginner-Friendly** - Readable code structure
4. **Security-First** - Safe defaults
5. **Performance** - Local-first, lazy loading

**What's Stored Where:**
- **PostgreSQL:** Users, sessions (persistent, server-side)
- **Local Storage:** Simulation state (persistent, client-side)
- **Memory:** AI model, HTTP handlers (ephemeral, server-side)
- **External API:** AI responses (ephemeral, third-party)

This architecture balances simplicity for a hackathon project with professional patterns for future growth.
