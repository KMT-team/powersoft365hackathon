# Testing Guide

## Overview

This guide provides terminal commands and manual testing procedures to verify every aspect of the ModaPro Tutor application. Use this for debugging and quality assurance.

---

## Prerequisites

Before testing, ensure:
1. Application is running: `go run cmd/server/main.go`
2. PostgreSQL is running
3. You have `curl` installed (for API testing)
4. You have a web browser

---

## 1. Database Testing

### Test 1.1: Check Database Connection

```bash
# Test if database exists
psql -U postgres -d learningplatform -c "SELECT 1;"
```

**Expected Output:**
```
 ?column? 
----------
        1
(1 row)
```

### Test 1.2: Verify Tables Created

```bash
# List all tables
psql -U postgres -d learningplatform -c "\dt"
```

**Expected Output:**
```
          List of relations
 Schema |   Name   | Type  |  Owner   
--------+----------+-------+----------
 public | sessions | table | postgres
 public | users    | table | postgres
```

### Test 1.3: Check Table Structure

```bash
# Check users table
psql -U postgres -d learningplatform -c "\d users"

# Check sessions table
psql -U postgres -d learningplatform -c "\d sessions"
```

**Expected Output (users):**
```
                                     Table "public.users"
    Column     |           Type           | Collation | Nullable |              Default              
---------------+--------------------------+-----------+----------+-----------------------------------
 id            | integer                  |           | not null | nextval('users_id_seq'::regclass)
 email         | text                     |           | not null | 
 password_hash | text                     |           | not null | 
 salt          | text                     |           | not null | 
 created_at    | timestamp with time zone |           | not null | now()
```

### Test 1.4: Check Indexes

```bash
# List indexes
psql -U postgres -d learningplatform -c "\di"
```

**Expected Output:**
```
idx_sessions_expires_at
idx_sessions_user_id
sessions_pkey
users_email_key
users_pkey
```

---

## 2. Server Startup Testing

### Test 2.1: Server Starts Successfully

```bash
# Start server and check output
go run cmd/server/main.go
```

**Expected Output:**
```
migrations: <nil>
Server running on http://localhost:8080
```

**If you see errors:**
- `db init: connection refused` → PostgreSQL not running
- `migrations: error` → Database permissions issue
- `GOOGLE_API_KEY not found` → Warning only, app still works

### Test 2.2: Server Responds to Requests

```bash
# In a new terminal, test root endpoint
curl -I http://localhost:8080/
```

**Expected Output:**
```
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
```

### Test 2.3: Check Environment Variables

```bash
# Verify .env is loaded
curl http://localhost:8080/api/check-auth
```

**Expected Output:**
```
Not authenticated
```
(This confirms server is running and handling requests)

---

## 3. Authentication API Testing

### Test 3.1: User Registration

```bash
# Register a new user
curl -X POST http://localhost:8080/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "test@example.com",
    "username": "testuser",
    "password": "Test123!@#",
    "confirmPassword": "Test123!@#"
  }' \
  -c cookies.txt \
  -v
```

**Expected Output:**
```
< HTTP/1.1 200 OK
< Set-Cookie: session=<UUID>; Path=/; Expires=<date>; HttpOnly
{"message":"Registration successful"}
```

**Test Variations:**

```bash
# Test duplicate email (should fail)
curl -X POST http://localhost:8080/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "test@example.com",
    "username": "testuser2",
    "password": "Test123!@#",
    "confirmPassword": "Test123!@#"
  }'
```

**Expected:** `409 Conflict` - "Email already registered"

```bash
# Test weak password (should fail)
curl -X POST http://localhost:8080/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "test2@example.com",
    "username": "testuser2",
    "password": "weak",
    "confirmPassword": "weak"
  }'
```

**Expected:** `400 Bad Request` - "Password must be 8+ chars..."

```bash
# Test invalid email (should fail)
curl -X POST http://localhost:8080/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "notanemail",
    "username": "testuser2",
    "password": "Test123!@#",
    "confirmPassword": "Test123!@#"
  }'
```

**Expected:** `400 Bad Request` - "Invalid email format"

### Test 3.2: User Login

```bash
# Login with existing user
curl -X POST http://localhost:8080/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "test@example.com",
    "password": "Test123!@#"
  }' \
  -c cookies.txt \
  -v
```

**Expected Output:**
```
< HTTP/1.1 200 OK
< Set-Cookie: session=<UUID>; Path=/; Expires=<date>; HttpOnly
{"message":"Login successful"}
```

**Test Variations:**

```bash
# Test wrong password (should fail)
curl -X POST http://localhost:8080/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "test@example.com",
    "password": "WrongPassword123!"
  }'
```

**Expected:** `401 Unauthorized` - "Invalid credentials"

```bash
# Test non-existent user (should fail)
curl -X POST http://localhost:8080/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "nonexistent@example.com",
    "password": "Test123!@#"
  }'
```

**Expected:** `401 Unauthorized` - "Invalid credentials"

### Test 3.3: Guest Login

```bash
# Login as guest
curl -X POST http://localhost:8080/api/guest \
  -c cookies.txt \
  -v
```

**Expected Output:**
```
< HTTP/1.1 200 OK
< Set-Cookie: session=<UUID>; Path=/; Expires=<date>; HttpOnly
{"message":"guest ok"}
```

### Test 3.4: Check Authentication

```bash
# Check auth with valid session
curl http://localhost:8080/api/check-auth \
  -b cookies.txt
```

**Expected Output:**
```
{"email":"test@example.com"}
```

```bash
# Check auth without session (should fail)
curl http://localhost:8080/api/check-auth
```

**Expected:** `401 Unauthorized` - "Not authenticated"

### Test 3.5: Logout

```bash
# Logout
curl -X POST http://localhost:8080/api/logout \
  -b cookies.txt \
  -v
```

**Expected Output:**
```
< HTTP/1.1 200 OK
< Set-Cookie: session=; Path=/; Max-Age=-1
{"message":"logged out"}
```

```bash
# Verify session is invalid
curl http://localhost:8080/api/check-auth \
  -b cookies.txt
```

**Expected:** `401 Unauthorized` - "Not authenticated"

---

## 4. Protected Routes Testing

### Test 4.1: Dashboard Access

```bash
# Access dashboard without auth (should redirect)
curl -I http://localhost:8080/dashboard.html
```

**Expected:** `303 See Other` - Redirect to `/`

```bash
# Access dashboard with auth
curl http://localhost:8080/dashboard.html \
  -b cookies.txt \
  -L
```

**Expected:** HTML page with "Welcome to Your Dashboard"

### Test 4.2: Classroom Access

```bash
# Access classroom without auth (should redirect)
curl -I http://localhost:8080/classroom/
```

**Expected:** `303 See Other` - Redirect to `/`

```bash
# Access classroom with auth
curl http://localhost:8080/classroom/ \
  -b cookies.txt \
  -L
```

**Expected:** HTML page with "MODA PRO | Classroom"

---

## 5. AI Chat Testing

### Test 5.1: Chat Without API Key

```bash
# If GOOGLE_API_KEY not set in .env
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello",
    "user_id": "test-user",
    "session_id": "test-session",
    "mode": "soft"
  }'
```

**Expected:** `503 Service Unavailable` - "AI functionality unavailable"

### Test 5.2: Chat With API Key

```bash
# With valid GOOGLE_API_KEY in .env
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How do I add a product?",
    "user_id": "test-user",
    "session_id": "test-session",
    "mode": "soft"
  }'
```

**Expected Output:**
```json
{
  "response": "To add a product, click the 'Add New Product' button..."
}
```

### Test 5.3: Different AI Modes

```bash
# Test soft mode
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Help me understand inventory",
    "mode": "soft"
  }'

# Test intermediate mode
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Help me understand inventory",
    "mode": "intermediate"
  }'

# Test realistic mode
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Help me understand inventory",
    "mode": "realistic"
  }'
```

**Expected:** Different response tones based on mode

---

## 6. Database Verification Testing

### Test 6.1: Verify User Created

```bash
# Check users table
psql -U postgres -d learningplatform -c "SELECT id, email, created_at FROM users;"
```

**Expected Output:**
```
 id |        email        |          created_at           
----+---------------------+-------------------------------
  1 | test@example.com    | 2026-01-20 14:30:00.123456+00
  2 | guest@system.local  | 2026-01-20 14:35:00.123456+00
```

### Test 6.2: Verify Session Created

```bash
# Check sessions table
psql -U postgres -d learningplatform -c "SELECT id, user_id, expires_at FROM sessions;"
```

**Expected Output:**
```
                  id                  | user_id |          expires_at           
--------------------------------------+---------+-------------------------------
 a3bb189e-8bf9-41c4-b3cf-4c8f9e8c3a2d |       1 | 2026-01-21 14:30:00.123456+00
```

### Test 6.3: Verify Password Hashed

```bash
# Check password is hashed (not plaintext)
psql -U postgres -d learningplatform -c "SELECT email, password_hash FROM users WHERE email='test@example.com';"
```

**Expected Output:**
```
       email        |                       password_hash                        
--------------------+------------------------------------------------------------
 test@example.com   | $2a$10$N9qo8uLOickgx2ZMRZoMye...
```

(Should start with `$2a$10$` - bcrypt hash)

### Test 6.4: Verify Session Expiry

```bash
# Check session expires in future
psql -U postgres -d learningplatform -c "SELECT id, expires_at > now() as is_valid FROM sessions;"
```

**Expected Output:**
```
                  id                  | is_valid 
--------------------------------------+----------
 a3bb189e-8bf9-41c4-b3cf-4c8f9e8c3a2d | t
```

---

## 7. Frontend Manual Testing

### Test 7.1: Login Page

1. Open browser: `http://localhost:8080/`
2. **Check:**
   - Page loads without errors
   - Form fields visible
   - Theme toggle works (light/dark)
   - "Create an account" link toggles to register mode
   - "Continue as guest" link visible

### Test 7.2: Registration

1. Click "Create an account"
2. Fill form:
   - Email: `manual@test.com`
   - Username: `manualuser`
   - Password: `Manual123!@#`
   - Confirm Password: `Manual123!@#`
3. Click "Sign up"
4. **Check:**
   - Redirects to `/dashboard.html`
   - Shows "Logged in as: manual@test.com"
   - No console errors

### Test 7.3: Login

1. Navigate to `http://localhost:8080/`
2. Fill form:
   - Email: `manual@test.com`
   - Password: `Manual123!@#`
3. Click "Sign in"
4. **Check:**
   - Redirects to `/dashboard.html`
   - Shows correct email
   - Session persists on page refresh

### Test 7.4: Guest Login

1. Navigate to `http://localhost:8080/`
2. Click "Continue as a guest"
3. **Check:**
   - Redirects to `/dashboard.html`
   - Shows "Logged in as: guest@system.local"

### Test 7.5: Dashboard

1. After login, check dashboard page
2. **Check:**
   - Welcome message displays
   - Email shows correctly
   - Logout button works
   - Clicking logout redirects to `/`

### Test 7.6: Classroom Access

1. Navigate to `http://localhost:8080/classroom/`
2. **Check:**
   - Page loads (if authenticated)
   - Redirects to `/` (if not authenticated)
   - Simulator visible on left
   - AI tutor visible on right

---

## 8. Simulator Testing

### Test 8.1: Initial State

1. Open classroom
2. **Check:**
   - 3 default products visible
   - Transaction log shows "No transactions yet"
   - Role is "Admin" by default
   - Filters show "All" selected

### Test 8.2: Add Product

1. Click "Add New Product"
2. Fill form:
   - Name: "Test Jacket"
   - Category: "Men"
   - Price: 99.99
   - Variant: Color="Red", Size="Large", Stock=5
3. Click "Save Product"
4. **Check:**
   - Modal closes
   - New product appears in grid
   - Product has correct data
   - No console errors

### Test 8.3: Sell Item

1. Find a product with stock > 0
2. Click "Sell" on a variant
3. **Check:**
   - Stock decreases by 1
   - Transaction log updates
   - Log shows: "Sold [product] ([color]/[size]) - [time]"

### Test 8.4: Edit Product

1. Click product name
2. Edit modal opens
3. Change price to 79.99
4. Click "Save Changes"
5. **Check:**
   - Modal closes
   - Product card shows new price
   - Transaction log shows "Updated Product"

### Test 8.5: Delete Product (Admin Only)

1. Ensure role is "Admin"
2. Click product name
3. Click "Delete Product"
4. Confirm deletion
5. **Check:**
   - Product removed from grid
   - Transaction log shows "Deleted Product"

### Test 8.6: Deactivate Product (Employee)

1. Switch role to "Employee"
2. Click product name
3. Select deactivation reason: "OUT OF STOCK"
4. Click "Deactivate Item"
5. **Check:**
   - Product shows "INACTIVE" badge
   - Product is grayed out
   - Cannot sell from inactive product

### Test 8.7: Filter Products

1. Click "Men" filter
2. **Check:** Only Men category products show
3. Click "Women" filter
4. **Check:** Only Women category products show
5. Click "All" filter
6. **Check:** All products show

### Test 8.8: Role Switching

1. Click "Employee" role button
2. **Check:**
   - "Add New Product" button hidden
   - Edit modal shows limited controls
   - Cannot delete products
3. Click "Admin" role button
4. **Check:**
   - "Add New Product" button visible
   - Full edit controls available

### Test 8.9: LocalStorage Persistence

1. Add a product
2. Refresh page
3. **Check:**
   - Product still visible
   - Transaction log persists
4. Open browser DevTools → Application → Local Storage
5. **Check:**
   - `sim_luxe_threads_inventory` key exists
   - `sim_luxe_threads_logs` key exists

---

## 9. AI Tutor Testing

### Test 9.1: Send Message

1. Type in chat input: "How do I add a product?"
2. Press Enter or click Send
3. **Check:**
   - User message appears in chat
   - AI response appears after ~2-3 seconds
   - Response is relevant to question
   - No console errors

### Test 9.2: Mode Switching

1. Select "Soft (Onboarding Buddy)" mode
2. Ask: "Help me understand inventory"
3. **Check:** Response is warm and patient
4. Select "Realistic (Regional Manager)" mode
5. Ask same question
6. **Check:** Response is direct and concise

### Test 9.3: Conversation Memory

1. Ask: "What is ModaPro?"
2. Wait for response
3. Ask: "Tell me more about it"
4. **Check:** AI remembers context from previous message

### Test 9.4: Tutor Pane Collapse

1. Click toggle button (arrow icon)
2. **Check:**
   - Tutor pane collapses to 5% width
   - Simulator expands to 95% width
   - Icon rotates 180 degrees
3. Click toggle again
4. **Check:**
   - Tutor pane expands back to 45%
   - Simulator returns to 55%

---

## 10. Error Handling Testing

### Test 10.1: Database Connection Error

```bash
# Stop PostgreSQL
sudo service postgresql stop

# Try to start server
go run cmd/server/main.go
```

**Expected:** Error message about database connection

### Test 10.2: Invalid Session Cookie

```bash
# Try to access protected route with fake cookie
curl http://localhost:8080/dashboard.html \
  -H "Cookie: session=invalid-uuid-12345" \
  -L
```

**Expected:** Redirect to `/`

### Test 10.3: Expired Session

```bash
# Manually expire a session in database
psql -U postgres -d learningplatform -c "UPDATE sessions SET expires_at = now() - interval '1 hour';"

# Try to access protected route
curl http://localhost:8080/dashboard.html \
  -b cookies.txt \
  -L
```

**Expected:** Redirect to `/`

### Test 10.4: SQL Injection Attempt

```bash
# Try SQL injection in email field
curl -X POST http://localhost:8080/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "admin@example.com OR 1=1--",
    "password": "anything"
  }'
```

**Expected:** `400 Bad Request` or `401 Unauthorized` (not SQL error)

---

## 11. Performance Testing

### Test 11.1: Concurrent Requests

```bash
# Send 10 concurrent registration requests
for i in {1..10}; do
  curl -X POST http://localhost:8080/api/register \
    -H "Content-Type: application/json" \
    -d "{
      \"identifier\": \"user$i@example.com\",
      \"username\": \"user$i\",
      \"password\": \"Test123!@#\",
      \"confirmPassword\": \"Test123!@#\"
    }" &
done
wait
```

**Check:** All requests complete without errors

### Test 11.2: Database Connection Pool

```bash
# Check active connections
psql -U postgres -d learningplatform -c "SELECT count(*) FROM pg_stat_activity WHERE datname='learningplatform';"
```

**Expected:** Should not exceed 10 (max pool size)

### Test 11.3: Large Inventory

1. Add 50+ products to simulator
2. **Check:**
   - Page remains responsive
   - Scrolling is smooth
   - Filtering works quickly

---

## 12. Browser Compatibility Testing

### Test 12.1: Chrome/Edge

1. Open in Chrome or Edge
2. Test all features
3. **Check:** No console errors

### Test 12.2: Firefox

1. Open in Firefox
2. Test all features
3. **Check:** No console errors

### Test 12.3: Safari (if available)

1. Open in Safari
2. Test all features
3. **Check:** No console errors

---

## 13. Cleanup and Reset

### Test 13.1: Clear Database

```bash
# Delete all sessions
psql -U postgres -d learningplatform -c "DELETE FROM sessions;"

# Delete all users
psql -U postgres -d learningplatform -c "DELETE FROM users;"

# Verify empty
psql -U postgres -d learningplatform -c "SELECT count(*) FROM users;"
psql -U postgres -d learningplatform -c "SELECT count(*) FROM sessions;"
```

**Expected:** Both counts should be 0

### Test 13.2: Clear LocalStorage

1. Open browser DevTools
2. Application → Local Storage → http://localhost:8080
3. Right-click → Clear
4. Refresh page
5. **Check:** Simulator shows default 3 products

### Test 13.3: Reset Database

```bash
# Drop and recreate
psql -U postgres -c "DROP DATABASE learningplatform;"
psql -U postgres -c "CREATE DATABASE learningplatform;"

# Restart server (migrations run automatically)
go run cmd/server/main.go
```

**Check:** Server starts successfully, tables created

---

## 14. Security Testing

### Test 14.1: Password Strength

```bash
# Test various weak passwords
curl -X POST http://localhost:8080/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "weak@example.com",
    "username": "weakuser",
    "password": "password",
    "confirmPassword": "password"
  }'
```

**Expected:** `400 Bad Request` - Password requirements not met

### Test 14.2: XSS Attempt

1. Try to register with email: `<script>alert('xss')</script>@example.com`
2. **Check:** Email validation rejects it

### Test 14.3: Cookie Security

```bash
# Check cookie attributes
curl -X POST http://localhost:8080/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "test@example.com",
    "password": "Test123!@#"
  }' \
  -v 2>&1 | grep Set-Cookie
```

**Expected:** Cookie has `HttpOnly` flag

---

## Test Results Checklist

Use this checklist to track testing progress:

- [ ] Database connection works
- [ ] Tables created correctly
- [ ] Server starts without errors
- [ ] User registration works
- [ ] User login works
- [ ] Guest login works
- [ ] Session validation works
- [ ] Logout works
- [ ] Protected routes enforce auth
- [ ] AI chat responds (with API key)
- [ ] Simulator loads default products
- [ ] Can add products
- [ ] Can sell items
- [ ] Can edit products
- [ ] Can delete products (admin)
- [ ] Can deactivate products (employee)
- [ ] Role switching works
- [ ] Filters work
- [ ] LocalStorage persists data
- [ ] Tutor pane collapses
- [ ] Password hashing works
- [ ] Session expiry works
- [ ] Error handling works
- [ ] No console errors in browser
- [ ] Works in multiple browsers

---

## Debugging Tips

### Check Server Logs
```bash
# Server prints all errors to terminal
# Watch for:
# - "db init: <error>" - Database issues
# - "migrations: <error>" - Schema issues
# - "Failed to create agent" - AI issues
```

### Check Browser Console
```
F12 → Console tab
Look for:
- Network errors (red)
- JavaScript errors
- Failed API calls
```

### Check Database State
```bash
# Quick database check
psql -U postgres -d learningplatform -c "
  SELECT 
    (SELECT count(*) FROM users) as user_count,
    (SELECT count(*) FROM sessions) as session_count,
    (SELECT count(*) FROM sessions WHERE expires_at > now()) as active_sessions;
"
```

### Check LocalStorage
```
Browser DevTools → Application → Local Storage
Check keys:
- sim_luxe_threads_inventory
- sim_luxe_threads_logs
- theme
```

---

**Status:** Complete testing guide
**Last Updated:** January 2026
