package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"regexp"
	"time"
	"unicode"

	"golang.org/x/crypto/bcrypt"
)

// User credentials from login/register request (Katerina) ADDED: more parameters to match frontend
type User struct {
	Email           string `json:"email"`
	Identifier      string `json:"identifier"`
	Username        string `json:"username"`
	Password        string `json:"password"`
	ConfirmPassword string `json:"confirmPassword"`
}

// Login attempt tracking (kept minimal if needed later)
type loginAttempt struct {
	count   int
	lastTry time.Time
}

// Session data struct (kept for in-memory compatibility if needed)
type sessionData struct {
	email   string
	expires time.Time
}

var (
	// regex for email validation
	emailRegex    = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	sessionExpiry = 24 * time.Hour
)

// hashPassword returns bcrypt hash of password
func hashPassword(password string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

// verifyPassword compares bcrypt hash with candidate password
func verifyPassword(storedHash, candidate string) bool {
	return bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(candidate)) == nil
}

// isValidEmail checks email regex
func isValidEmail(email string) bool {
	return emailRegex.MatchString(email)
}

// isValidPassword enforces: >=8 chars, upper, lower, digit, special
func isValidPassword(password string) bool {
	var hasUpper, hasLower, hasDigit, hasSpecial bool
	if len(password) < 8 {
		return false
	}
	for _, r := range password {
		switch {
		case unicode.IsUpper(r):
			hasUpper = true
		case unicode.IsLower(r):
			hasLower = true
		case unicode.IsDigit(r):
			hasDigit = true
		default:
			hasSpecial = true
		}
	}
	return hasUpper && hasLower && hasDigit && hasSpecial
}

// setSessionCookie helper
func setSessionCookie(w http.ResponseWriter, sid string, expires time.Time) {
	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    sid,
		Path:     "/",
		Expires:  expires,
		HttpOnly: true,
		// Secure: true, // enable in production
	})
}

// HandleRegister creates a new user account and issues a session cookie (Katerina) ADDED: edited the syntax to match the user data
func HandleRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var u User
	if err := json.NewDecoder(r.Body).Decode(&u); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Frontend sends identifier field as email in register mode
	if u.Identifier != "" {
		u.Email = u.Identifier
	}

	// Validate required fields
	if u.Email == "" || u.Password == "" || u.Username == "" {
		http.Error(w, "Email, username and password required", http.StatusBadRequest)
		return
	}

	// Check passwords match
	if u.Password != u.ConfirmPassword {
		http.Error(w, "Passwords do not match", http.StatusBadRequest)
		return
	}

	if !isValidEmail(u.Email) {
		http.Error(w, "Invalid email format", http.StatusBadRequest)
		return
	}

	if !isValidPassword(u.Password) {
		http.Error(w, "Password must be 8+ chars with uppercase, lowercase, number, and special character", http.StatusBadRequest)
		return
	}

	// Check if user already exists
	_, _, _, err := GetUserByEmail(u.Email)
	if err == nil {
		http.Error(w, "Email already registered", http.StatusConflict)
		return
	}
	if err != sql.ErrNoRows {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}

	hashed, err := hashPassword(u.Password)
	if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}

	id, err := CreateUser(u.Email, hashed, "")
	if err != nil {
		http.Error(w, "Could not create user", http.StatusInternalServerError)
		return
	}

	// Create session and set cookie
	expires := time.Now().Add(sessionExpiry)
	sid, err := CreateSession(id, expires)
	if err != nil {
		http.Error(w, "Could not create session", http.StatusInternalServerError)
		return
	}

	setSessionCookie(w, sid, expires)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Registration successful"})
}

// HandleLogin authenticates existing user and creates/reuses session (Katerina) ADDED: edited parameters to match the user data
func HandleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var u User
	if err := json.NewDecoder(r.Body).Decode(&u); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Frontend sends identifier field (email or username)
	if u.Identifier != "" {
		u.Email = u.Identifier
	}

	if u.Email == "" || u.Password == "" {
		http.Error(w, "Email and password required", http.StatusBadRequest)
		return
	}

	if !isValidEmail(u.Email) {
		http.Error(w, "Invalid email format", http.StatusBadRequest)
		return
	}

	// Find user
	userID, storedHash, _, err := GetUserByEmail(u.Email)
	if err != nil {
		// user not found -> do not auto-create here
		if err == sql.ErrNoRows {
			http.Error(w, "Invalid credentials", http.StatusUnauthorized)
			return
		}
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}

	// Verify password
	if !verifyPassword(storedHash, u.Password) {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	// If client has valid session for this user, refresh it
	if cookie, err := r.Cookie("session"); err == nil {
		if sidUserID, _, err2 := GetSessionUser(cookie.Value); err2 == nil && sidUserID == userID {
			expires := time.Now().Add(sessionExpiry)
			if err := UpdateSessionExpiry(cookie.Value, expires); err == nil {
				setSessionCookie(w, cookie.Value, expires)
				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(map[string]string{"message": "Login successful"})
				return
			}
		}
	}

	// Check if user has any active session and reuse it
	if existingSID, expires, err := GetActiveSessionByUser(userID); err == nil {
		setSessionCookie(w, existingSID, expires)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "Login successful"})
		return
	}

	// Create new session
	expires := time.Now().Add(sessionExpiry)
	sid, err := CreateSession(userID, expires)
	if err != nil {
		http.Error(w, "Could not create session", http.StatusInternalServerError)
		return
	}

	setSessionCookie(w, sid, expires)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Login successful"})
}

// HandleLogout ends user session and clears authentication POST ONLY
func HandleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		// allow only POST for logout
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	cookie, err := r.Cookie("session")
	if err != nil {
		http.Error(w, "Not authenticated", http.StatusUnauthorized)
		return
	}
	_ = DeleteSession(cookie.Value)
	http.SetCookie(w, &http.Cookie{
		Name:   "session",
		Value:  "",
		Path:   "/",
		MaxAge: -1,
	})
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "logged out"})
}

// (Katerina) ADDED: guest login functionality
func HandleGuestLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 1. Ensure a real guest user exists
	guestEmail := "guest@system.local"
	guestPasswordHash := "" // no password needed
	guestSalt := ""

	guestID, _, _, err := GetUserByEmail(guestEmail)
	if err == sql.ErrNoRows {
		// Create guest user if missing
		guestID, err = CreateUser(guestEmail, guestPasswordHash, guestSalt)
		if err != nil {
			http.Error(w, "Could not create guest user", http.StatusInternalServerError)
			return
		}
	} else if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}

	// 2. Create a session for the guest user
	expires := time.Now().Add(24 * time.Hour)
	sid, err := CreateSession(guestID, expires)
	if err != nil {
		http.Error(w, "Could not create guest session", http.StatusInternalServerError)
		return
	}

	// 3. Set session cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    sid,
		Expires:  expires,
		Path:     "/",
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
	})

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"message":"guest ok"}`))
}

// CheckAuth verifies if user is currently logged in and returns email
func CheckAuth(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session")
	if err != nil {
		http.Error(w, "Not authenticated", http.StatusUnauthorized)
		return
	}
	_, email, err := GetSessionUser(cookie.Value)
	if err != nil {
		http.Error(w, "Not authenticated", http.StatusUnauthorized)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"email": email})
}

// (Katerina) ADDED: serve static files for login page
// Serves styles.css
func ServeCSS(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/css")
	http.ServeFile(w, r, "web/styles.css")
}

// Serves login.js
func ServeJS(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/javascript")
	http.ServeFile(w, r, "web/login/login.js")
}
