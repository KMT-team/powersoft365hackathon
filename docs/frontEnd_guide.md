# Frontend Developer Guide - Learning Platform API

## Overview
This guide explains how to connect the HTML/CSS/JS/etc. frontend to the backend API.

---

## Base URL
```
http://localhost:8080
```

---

## API Endpoints

### 1. **Login / Sign Up**
**Endpoint:** `POST /api/login`

**What it does:** Creates a new account if email doesn't exist, or logs in if it does.

**Request:**
```javascript
fetch('http://localhost:8080/api/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: "user@example.com",
    password: "Test123!"
  })
})
```

**Success Response (200):**
```json
{"message": "Success"}
```
- Sets a session cookie automatically
- User is now logged in

**Error Responses:**
- `400` - "Email and password required" (empty fields)
- `400` - "Invalid email format" (wrong email format)
- `400` - "Password must be 8+ chars..." (weak password for new accounts)
- `401` - "Invalid credentials" (wrong password for existing account)
- `429` - "Too many failed attempts..." (5 failed login attempts)

**Password Requirements:**
- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- At least 1 special character (!@#$%^&*)

**Email Format:**
- Must be valid: `user@domain.com`

---

### 2. **Check Authentication**
**Endpoint:** `GET /api/check-auth`

**What it does:** Checks if user is currently logged in.

**Request:**
```javascript
fetch('http://localhost:8080/api/check-auth', {
  method: 'GET',
  credentials: 'include'  // Important: sends cookies
})
```

**Success Response (200):**
```json
{"email": "user@example.com"}
```

**Error Response:**
- `401` - "Not authenticated" (user not logged in)

---

### 3. **Logout**
**Endpoint:** `POST /api/logout`

**What it does:** Ends the user's session.

**Request:**
```javascript
fetch('http://localhost:8080/api/logout', {
  method: 'POST',
  credentials: 'include'  // Important: sends cookies
})
```

**Success Response (200):**
```json
{"message": "Logged out"}
```

---

### 4. **Homepage (Protected)**
**Endpoint:** `GET /homepage`

**What it does:** Returns user dashboard data (only if logged in).

**Request:**
```javascript
fetch('http://localhost:8080/homepage', {
  method: 'GET',
  credentials: 'include'  // Important: sends cookies
})
```

**Success Response (200):**
```json
{
  "message": "Welcome to Learning Platform",
  "email": "user@example.com"
}
```

**Error Response:**
- `401` - "Not authenticated" (user not logged in)


---

## Testing

### Method 1: Terminal Testing (using curl)

**Step 1: Start the server**
```bash
go run main.go
```
You should see: `Server running on http://localhost:8080`

**Step 2: Open a new terminal** (keep server running in first terminal)

**Step 3: Run these commands one by one:**

```bash
# Test 1: Create account
curl -X POST http://localhost:8080/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}' \
  -c cookies.txt
```
Expected: `{"message":"Success"}`

```bash
# Test 2: Check authentication
curl http://localhost:8080/api/check-auth -b cookies.txt
```
Expected: `{"email":"test@example.com"}`

```bash
# Test 3: Access homepage
curl http://localhost:8080/homepage -b cookies.txt
```
Expected: `{"message":"Welcome to Learning Platform","email":"test@example.com"}`

```bash
# Test 4: Logout
curl -X POST http://localhost:8080/api/logout -b cookies.txt
```
Expected: `{"message":"Logged out"}`

```bash
# Test 5: Try homepage after logout (should fail)
curl http://localhost:8080/homepage -b cookies.txt
```
Expected: `Not authenticated`

**Step 4: Stop the server**
- Go back to the first terminal (where server is running)
- Press `Ctrl + C` to stop the server

---

### Method 2: Browser Console Testing

**Step 1: Start the server**
```bash
go run main.go
```

**Step 2: Open browser**
- Go to `http://localhost:8080`
- Press `F12` (or right-click → Inspect)
- Click on **Console** tab

**Step 3: Paste and run each command (press Enter after each):**

```javascript
// Test 1: Create account
fetch('http://localhost:8080/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: "test@example.com", password: "Test123!" })
}).then(r => r.json()).then(console.log)
```
Expected: `{message: "Success"}`

```javascript
// Test 2: Check authentication
fetch('http://localhost:8080/api/check-auth', {
  method: 'GET',
  credentials: 'include'
}).then(r => r.json()).then(console.log)
```
Expected: `{email: "test@example.com"}`

```javascript
// Test 3: Access homepage
fetch('http://localhost:8080/homepage', {
  method: 'GET',
  credentials: 'include'
}).then(r => r.json()).then(console.log)
```
Expected: `{message: "Welcome to Learning Platform", email: "test@example.com"}`

```javascript
// Test 4: Logout
fetch('http://localhost:8080/api/logout', {
  method: 'POST',
  credentials: 'include'
}).then(r => r.json()).then(console.log)
```
Expected: `{message: "Logged out"}`

```javascript
// Test 5: Try homepage after logout (should fail)
fetch('http://localhost:8080/homepage', {
  method: 'GET',
  credentials: 'include'
}).then(r => r.text()).then(console.log)
```
Expected: `"Not authenticated"`

**Step 4: Stop the server**
- Go back to terminal where server is running
- Press `Ctrl + C` to stop
