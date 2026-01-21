# Code Flow and Execution Paths

## Application Startup Flow

```
1. User runs: go run cmd/server/main.go
   |
   v
2. main() function executes
   |
   v
3. loadDotEnv(".env")
   - Reads .env file line by line
   - Sets environment variables
   - Ignores comments and empty lines
   |
   v
4. Check GOOGLE_API_KEY
   - If missing: Print warning
   - If present: Continue
   |
   v
5. ApplyMigrations()
   - Read migrations/001_create_tables.sql
   - Connect to database
   - Execute SQL statements
   - Create users and sessions tables
   |
   v
6. InitDB()
   - Open PostgreSQL connection
   - Set connection pool (max 10 connections)
   - Set connection lifetime (5 minutes)
   - Ping database to verify
   |
   v
7. Create session service (in-memory)
   |
   v
8. Create ChatHandler with session service
   |
   v
9. Register HTTP routes:
   - GET  /                    → ServeLogin
   - GET  /styles.css          → ServeCSS
   - GET  /login.js            → ServeJS
   - GET  /dashboard.html      → ServeDashboard
   - GET  /classroom/          → ServeClassroom
   - POST /api/register        → HandleRegister
   - POST /api/login           → HandleLogin
   - POST /api/logout          → HandleLogout
   - GET  /api/check-auth      → CheckAuth
   - POST /api/guest           → HandleGuestLogin
   - POST /api/chat            → ChatHandler.ServeHTTP
   |
   v
10. Start HTTP server on port 8080
    |
    v
11. Print: "Server running on http://localhost:8080"
    |
    v
12. Listen for incoming HTTP requests
```

---

## User Registration Flow

### File Path: `web/login/login.js` → `internal/handlers/login.go` → `internal/handlers/db.go`

```
1. User fills registration form
   - Email: user@example.com
   - Username: testuser
   - Password: Test123!@#
   - Confirm Password: Test123!@#
   |
   v
2. Frontend validation (login.js)
   - Check all fields filled
   - Check passwords match
   - Check email format (basic)
   |
   v
3. POST /api/register
   Body: {
     identifier: "user@example.com",
     username: "testuser",
     password: "Test123!@#",
     confirmPassword: "Test123!@#"
   }
   |
   v
4. HandleRegister() in login.go
   |
   v
5. Parse JSON request body
   |
   v
6. Validate email format (regex)
   - Pattern: ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$
   - If invalid: Return 400 "Invalid email format"
   |
   v
7. Validate password strength
   - Check length >= 8
   - Check has uppercase letter
   - Check has lowercase letter
   - Check has digit
   - Check has special character
   - If invalid: Return 400 "Password must be 8+ chars..."
   |
   v
8. Check if user exists
   - Call GetUserByEmail(email) in db.go
   - Query: SELECT id, password_hash, salt FROM users WHERE email=$1
   - If found: Return 409 "Email already registered"
   |
   v
9. Hash password
   - Call bcrypt.GenerateFromPassword(password, cost=10)
   - Result: $2a$10$N9qo8uLOickgx2ZMRZoMye...
   |
   v
10. Create user in database
    - Call CreateUser(email, hash, "") in db.go
    - Query: INSERT INTO users (email, password_hash, salt) VALUES ($1,$2,$3) RETURNING id
    - Returns: user_id (e.g., 1)
    |
    v
11. Create session
    - Calculate expiry: now + 24 hours
    - Call CreateSession(user_id, expiry) in db.go
    - Query: INSERT INTO sessions (user_id, expires_at) VALUES ($1,$2) RETURNING id
    - Returns: session_uuid (e.g., "a3bb189e-8bf9-41c4-b3cf-4c8f9e8c3a2d")
    |
    v
12. Set session cookie
    - Name: "session"
    - Value: session_uuid
    - HttpOnly: true
    - Expires: 24 hours from now
    - Path: "/"
    |
    v
13. Return 200 OK
    Body: {"message": "Registration successful"}
    |
    v
14. Frontend redirects to /dashboard.html
```

---

## User Login Flow

### File Path: `web/login/login.js` → `internal/handlers/login.go` → `internal/handlers/db.go`

```
1. User fills login form
   - Email: user@example.com
   - Password: Test123!@#
   |
   v
2. Frontend validation (login.js)
   - Check fields not empty
   |
   v
3. POST /api/login
   Body: {
     identifier: "user@example.com",
     password: "Test123!@#"
   }
   |
   v
4. HandleLogin() in login.go
   |
   v
5. Parse JSON request body
   |
   v
6. Validate email format
   - If invalid: Return 400 "Invalid email format"
   |
   v
7. Get user from database
   - Call GetUserByEmail(email) in db.go
   - Query: SELECT id, password_hash, salt FROM users WHERE email=$1
   - If not found: Return 401 "Invalid credentials"
   - Returns: user_id, password_hash, salt
   |
   v
8. Verify password
   - Call bcrypt.CompareHashAndPassword(stored_hash, candidate_password)
   - If mismatch: Return 401 "Invalid credentials"
   |
   v
9. Check if client has valid session cookie
   - Read "session" cookie from request
   - If cookie exists:
     |
     v
     9a. Validate session
         - Call GetSessionUser(cookie_value) in db.go
         - Query: SELECT u.id, u.email FROM sessions s JOIN users u ON s.user_id = u.id 
                  WHERE s.id = $1 AND s.expires_at > now()
         - If valid AND belongs to this user:
           |
           v
           9b. Refresh session expiry
               - Calculate new expiry: now + 24 hours
               - Call UpdateSessionExpiry(session_id, new_expiry) in db.go
               - Query: UPDATE sessions SET expires_at = $1 WHERE id = $2
               - Set cookie with new expiry
               - Return 200 "Login successful"
               - STOP HERE
   |
   v
10. Check for existing active session in database
    - Call GetActiveSessionByUser(user_id) in db.go
    - Query: SELECT id, expires_at FROM sessions 
             WHERE user_id = $1 AND expires_at > now() 
             ORDER BY created_at DESC LIMIT 1
    - If found:
      |
      v
      10a. Reuse existing session
           - Set cookie with existing session_id
           - Return 200 "Login successful"
           - STOP HERE
    |
    v
11. Create new session
    - Calculate expiry: now + 24 hours
    - Call CreateSession(user_id, expiry) in db.go
    - Query: INSERT INTO sessions (user_id, expires_at) VALUES ($1,$2) RETURNING id
    - Returns: new_session_uuid
    |
    v
12. Set session cookie
    - Name: "session"
    - Value: new_session_uuid
    - HttpOnly: true
    - Expires: 24 hours from now
    |
    v
13. Return 200 OK
    Body: {"message": "Login successful"}
    |
    v
14. Frontend redirects to /dashboard.html
```

---

## Guest Login Flow

### File Path: `web/login/login.js` → `internal/handlers/login.go` → `internal/handlers/db.go`

```
1. User clicks "Continue as a guest"
   |
   v
2. POST /api/guest (no body needed)
   |
   v
3. HandleGuestLogin() in login.go
   |
   v
4. Check if guest user exists
   - Email: "guest@system.local"
   - Call GetUserByEmail("guest@system.local") in db.go
   - If not found:
     |
     v
     4a. Create guest user
         - Call CreateUser("guest@system.local", "", "") in db.go
         - Query: INSERT INTO users (email, password_hash, salt) VALUES ($1,$2,$3) RETURNING id
         - Returns: guest_user_id
   |
   v
5. Create session for guest
   - Calculate expiry: now + 24 hours
   - Call CreateSession(guest_user_id, expiry) in db.go
   - Returns: session_uuid
   |
   v
6. Set session cookie
   - Name: "session"
   - Value: session_uuid
   - HttpOnly: true
   - Expires: 24 hours from now
   |
   v
7. Return 200 OK
   Body: {"message": "guest ok"}
   |
   v
8. Frontend redirects to /dashboard.html
```

---

## Accessing Protected Routes (Classroom)

### File Path: Browser → `internal/handlers/classroom.go` → `internal/handlers/db.go`

```
1. User navigates to http://localhost:8080/classroom/
   |
   v
2. ServeClassroom() in classroom.go
   |
   v
3. Read "session" cookie from request
   - If cookie missing:
     |
     v
     3a. Redirect to / (login page)
         - HTTP 303 See Other
         - STOP HERE
   |
   v
4. Validate session
   - Call GetSessionUser(cookie_value) in db.go
   - Query: SELECT u.id, u.email FROM sessions s JOIN users u ON s.user_id = u.id 
            WHERE s.id = $1 AND s.expires_at > now()
   - If invalid or expired:
     |
     v
     4a. Redirect to / (login page)
         - HTTP 303 See Other
         - STOP HERE
   |
   v
5. Session valid - serve static files
   - Strip "/classroom/" prefix from URL path
   - Serve files from web/classroom/ directory
   - If path is /classroom/ → serve index.html
   - If path is /classroom/js/tutor.js → serve js/tutor.js
   - If path is /classroom/css/tutor.css → serve css/tutor.css
   |
   v
6. Browser receives HTML/CSS/JS files
   |
   v
7. Browser loads and executes:
   - index.html (structure)
   - CSS files (styling)
   - simulator-main.js (controller)
   - simulator-store.js (state management)
   - simulator-ui.js (rendering)
   - tutor.js (AI chat)
```

---

## Simulator Inventory Management Flow

### File Path: `web/classroom/js/simulator-main.js` → `simulator-store.js` → `simulator-ui.js`

### Adding a Product

```
1. User clicks "Add New Product" button
   |
   v
2. Event listener in simulator-main.js
   - Function: openAddModal()
   - Show modal: #sim-add-item-modal
   - Clear variant container
   - Add one empty variant row
   |
   v
3. User fills form:
   - Product Name: "Vintage Denim Jacket"
   - Category: "Men"
   - Price: 89.99
   - Variant 1: Color="Blue", Size="Large", Stock=10
   |
   v
4. User clicks "Save Product"
   |
   v
5. Form submit event in simulator-main.js
   - Prevent default form submission
   - Collect form data
   - Collect all variant rows
   - Validate: at least one variant with color and size
   |
   v
6. Create product object:
   {
     name: "Vintage Denim Jacket",
     category: "Men",
     price: 89.99,
     variants: [
       {color: "Blue", size: "Large", stock: 10}
     ]
   }
   |
   v
7. Call Store.addProduct(newProduct) in simulator-store.js
   |
   v
8. Store.addProduct() logic:
   - Generate ID: Date.now() (e.g., 1705650123456)
   - Set active: true
   - Set deactivationReason: null
   - Add to inventory array (at beginning)
   - Save to localStorage:
     - Key: "sim_luxe_threads_inventory"
     - Value: JSON.stringify(inventory)
   |
   v
9. Call refreshUI() in simulator-main.js
   |
   v
10. refreshUI() calls:
    - refreshInventory()
    - refreshLogs()
    |
    v
11. refreshInventory() logic:
    - Get all products from Store.getInventory()
    - Filter by currentFilter (all/Men/Women/Accessories)
    - Call UI.renderInventory(filteredProducts)
    |
    v
12. UI.renderInventory() in simulator-ui.js
    - For each product, call createProductCard(product)
    - Generate HTML for product card
    - Insert into #sim-inventory-grid
    |
    v
13. User sees new product card in inventory grid
```

### Selling an Item

```
1. User clicks "Sell" button on a variant
   |
   v
2. Button onclick calls: window.handleSell(productId, variantIndex)
   |
   v
3. handleSell() in simulator-main.js
   - Call Store.sellItem(productId, variantIndex)
   |
   v
4. Store.sellItem() in simulator-store.js
   - Find product by ID
   - Check if product is active
     - If inactive: alert "This item is currently inactive"
     - Return false
   - Get variant by index
   - Check if stock > 0
     - If stock = 0: alert "Out of Stock!"
     - Return false
   - Decrement stock by 1
   - Create log entry: "Sold [name] ([color]/[size]) - [time]"
   - Add log to logs array (at beginning)
   - Save inventory to localStorage
   - Save logs to localStorage
   - Return true
   |
   v
5. If success, call refreshUI() in simulator-main.js
   |
   v
6. UI updates:
   - Product card shows new stock count
   - Transaction log shows new entry in sidebar
```

### Editing a Product

```
1. User clicks product name in card
   |
   v
2. Title onclick calls: window.handleEdit(productId)
   |
   v
3. handleEdit() in simulator-main.js
   - Get product from Store.getInventory()
   - Call UI.populateEditModal(product, currentRole)
   - Show modal: #sim-edit-item-modal
   |
   v
4. UI.populateEditModal() in simulator-ui.js
   - Fill form fields with product data
   - Generate variant rows with current values
   - Show/hide controls based on role:
     - Admin: Can edit everything, delete, add variants
     - Employee: Can only deactivate/activate
   |
   v
5. User modifies data and clicks "Save Changes"
   |
   v
6. Form submit event in simulator-main.js
   - Collect updated form data
   - Collect all variant rows
   - Create updatedData object
   - Call Store.updateProduct(id, updatedData)
   |
   v
7. Store.updateProduct() in simulator-store.js
   - Find product by ID
   - Merge existing data with updates
   - Save to localStorage
   - Create log entry: "Updated Product: [name] - [time]"
   - Save logs to localStorage
   |
   v
8. Call refreshUI() and closeEditModal()
   |
   v
9. UI shows updated product card
```

---

## AI Tutor Chat Flow

### File Path: `web/classroom/js/tutor.js` → `internal/handlers/chat.go` → `internal/ai/prompt.go`

```
1. User types message in chat input
   - Example: "How do I add a new product?"
   |
   v
2. User presses Enter or clicks Send button
   |
   v
3. sendMessage() function in tutor.js
   |
   v
4. Add user message to chat history
   - Create message bubble with "tutor-user" class
   - Display in #tutor-chat-history
   - Scroll to bottom
   |
   v
5. Clear input field
   |
   v
6. POST /api/chat
   Body: {
     message: "How do I add a new product?",
     user_id: "user-web",
     session_id: "session-abc123",
     mode: "soft" (from dropdown)
   }
   |
   v
7. ChatHandler.ServeHTTP() in chat.go
   |
   v
8. Lazy-load AI model (first request only)
   - getOrInitModel()
   - Read GOOGLE_API_KEY from environment
   - Create Gemini client
   - Initialize model: "gemini-3-flash-preview"
   - Store in ChatHandler.model
   |
   v
9. Parse JSON request body
   - Extract: message, user_id, session_id, mode
   - Set defaults if missing
   |
   v
10. Get system prompt
    - Call ai.GetSystemPrompt(mode) in prompt.go
    - Read base prompt from message.txt
    - Append mode-specific instructions:
      - soft: "Be warm and patient"
      - intermediate: "Use scaffolding"
      - realistic: "Be direct, simulate pressure"
    |
    v
11. Create LLM agent
    - llmagent.New() with:
      - Name: "ModaProTutor"
      - Model: gemini model
      - Instruction: system prompt
    |
    v
12. Create runner
    - runner.New() with:
      - AppName: "modapro-tutor"
      - Agent: LLM agent
      - SessionService: in-memory session service
    |
    v
13. Ensure session exists
    - sessionService.Create() with user_id and session_id
    - Stores conversation history in memory
    |
    v
14. Construct message content
    - Create genai.Content with user's message
    - Role: "user"
    |
    v
15. Run agent
    - runner.Run() with message
    - Sends to Gemini API
    - Streams response parts
    - Collect all parts into fullResponse string
    |
    v
16. Return JSON response
    Body: {
      response: "To add a new product, click the 'Add New Product' button..."
    }
    |
    v
17. Frontend receives response
    - addMessage(data.response, 'bot') in tutor.js
    - Create message bubble with "tutor-bot" class
    - Display in chat history
    - Scroll to bottom
    |
    v
18. User sees AI response
```

---

## Logout Flow

### File Path: `web/login/login.js` → `internal/handlers/login.go` → `internal/handlers/db.go`

```
1. User clicks "Logout" button
   |
   v
2. JavaScript calls logout() function
   |
   v
3. POST /api/logout (with session cookie)
   |
   v
4. HandleLogout() in login.go
   |
   v
5. Read "session" cookie from request
   - If missing: Return 401 "Not authenticated"
   |
   v
6. Delete session from database
   - Call DeleteSession(cookie_value) in db.go
   - Query: DELETE FROM sessions WHERE id = $1
   |
   v
7. Clear session cookie
   - Set cookie with:
     - Name: "session"
     - Value: ""
     - MaxAge: -1 (tells browser to delete)
   |
   v
8. Return 200 OK
   Body: {"message": "logged out"}
   |
   v
9. Frontend redirects to / (login page)
```

---

## File Dependencies Map

### Backend Dependencies

```
cmd/server/main.go
  ├─ Imports: internal/handlers
  ├─ Imports: google.golang.org/adk/session
  └─ Calls:
      ├─ handlers.ApplyMigrations()
      ├─ handlers.InitDB()
      ├─ handlers.NewChatHandler()
      └─ All handler functions

internal/handlers/login.go
  ├─ Imports: internal/handlers (db.go functions)
  ├─ Imports: golang.org/x/crypto/bcrypt
  └─ Calls:
      ├─ GetUserByEmail()
      ├─ CreateUser()
      ├─ CreateSession()
      ├─ GetSessionUser()
      ├─ DeleteSession()
      ├─ GetActiveSessionByUser()
      └─ UpdateSessionExpiry()

internal/handlers/chat.go
  ├─ Imports: internal/ai
  ├─ Imports: google.golang.org/adk/agent
  ├─ Imports: google.golang.org/adk/model/gemini
  └─ Calls:
      └─ ai.GetSystemPrompt()

internal/handlers/classroom.go
  ├─ Imports: internal/handlers (db.go functions)
  └─ Calls:
      └─ GetSessionUser()

internal/handlers/dashboard.go
  ├─ Imports: internal/handlers (db.go functions)
  └─ Calls:
      └─ GetSessionUser()

internal/handlers/db.go
  ├─ Imports: github.com/lib/pq (PostgreSQL driver)
  └─ Provides:
      ├─ InitDB()
      ├─ ApplyMigrations()
      ├─ CreateUser()
      ├─ GetUserByEmail()
      ├─ CreateSession()
      ├─ GetSessionUser()
      ├─ DeleteSession()
      ├─ GetActiveSessionByUser()
      └─ UpdateSessionExpiry()

internal/ai/prompt.go
  ├─ Embeds: message.txt
  └─ Provides:
      └─ GetSystemPrompt()
```

### Frontend Dependencies

```
web/login/login.html
  ├─ Loads: ../styles.css
  ├─ Loads: login.js
  └─ Uses: Font Awesome icons

web/login/login.js
  └─ Calls API:
      ├─ POST /api/register
      ├─ POST /api/login
      └─ POST /api/guest

web/classroom/index.html
  ├─ Loads: ../styles.css
  ├─ Loads: css/classroom.css
  ├─ Loads: css/simulator.css
  ├─ Loads: css/tutor.css
  ├─ Loads: js/simulator-main.js (module)
  ├─ Loads: js/tutor.js
  └─ Uses: Tailwind CSS CDN

web/classroom/js/simulator-main.js
  ├─ Imports: ./simulator-store.js
  ├─ Imports: ./simulator-ui.js
  └─ Coordinates:
      ├─ Event listeners
      ├─ Modal management
      └─ UI refresh

web/classroom/js/simulator-store.js
  ├─ Uses: localStorage API
  └─ Provides:
      ├─ getInventory()
      ├─ getLogs()
      ├─ addProduct()
      ├─ sellItem()
      ├─ updateProduct()
      ├─ deleteProduct()
      └─ toggleProductStatus()

web/classroom/js/simulator-ui.js
  └─ Provides:
      ├─ renderInventory()
      ├─ renderLogs()
      ├─ populateEditModal()
      └─ createProductCard()

web/classroom/js/tutor.js
  └─ Calls API:
      └─ POST /api/chat
```

---

## Data Flow Summary

### User Data Flow
```
Browser Form → JSON → Backend Handler → Validation → bcrypt → Database → Session → Cookie → Browser
```

### Inventory Data Flow
```
Browser UI → JavaScript → Store Module → localStorage → UI Module → Browser Display
```

### AI Chat Data Flow
```
Browser Input → JSON → Backend Handler → AI Prompt → Gemini API → Response → JSON → Browser Display
```

### Authentication Flow
```
Login → Validate → Create Session → Set Cookie → All Requests Include Cookie → Validate Session → Allow/Deny
```

---

## Key Execution Paths

### Critical Path 1: First-Time User
```
Visit / → Register → Create User → Create Session → Set Cookie → Redirect to Dashboard → Access Classroom → Load Simulator → Use AI Tutor
```

### Critical Path 2: Returning User
```
Visit / → Login → Validate Password → Reuse/Create Session → Set Cookie → Redirect to Dashboard → Access Classroom
```

### Critical Path 3: Guest User
```
Visit / → Guest Login → Create/Find Guest User → Create Session → Set Cookie → Redirect to Dashboard → Access Classroom
```

### Critical Path 4: Inventory Management
```
Load Classroom → Load from localStorage → Display Products → User Action → Update State → Save to localStorage → Refresh UI
```

### Critical Path 5: AI Interaction
```
Type Message → Send to Backend → Load AI Model → Get System Prompt → Call Gemini API → Stream Response → Display to User
```

---

## Performance Considerations

### Database Queries
- User lookup: Indexed on email (fast)
- Session validation: Indexed on session_id and expires_at (fast)
- Session cleanup: Indexed on expires_at (fast)

### Frontend Performance
- Inventory stored in localStorage (instant access)
- No database calls for simulator operations
- AI calls are async (non-blocking UI)

### Backend Performance
- Connection pooling (max 10 connections)
- Lazy AI model loading (only on first chat)
- Session reuse (reduces database writes)

---

**Status:** Complete code flow documentation
**Last Updated:** January 2026
