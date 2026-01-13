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

// User credentials from login request
type User struct {
	Email    string `json:"email"`
	Password string `json:"password"`
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

// Register creates a new user and issues a session cookie
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
	if u.Email == "" || u.Password == "" {
		http.Error(w, "Email and password required", http.StatusBadRequest)
		return
	}
	if !isValidEmail(u.Email) {
		http.Error(w, "Invalid email format", http.StatusBadRequest)
		return
	}

	// user must not already exist
	_, _, _, err := GetUserByEmail(u.Email)
	if err == nil {
		http.Error(w, "User already exists", http.StatusBadRequest)
		return
	}
	if err != sql.ErrNoRows {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}

	// validate password
	if !isValidPassword(u.Password) {
		http.Error(w, "Password does not meet requirements", http.StatusBadRequest)
		return
	}

	hashed, err := hashPassword(u.Password)
	if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}

	id, err := CreateUser(u.Email, hashed, "") // salt not used with bcrypt
	if err != nil {
		http.Error(w, "Could not create user", http.StatusInternalServerError)
		return
	}

	// create session and set cookie
	expires := time.Now().Add(sessionExpiry)
	sid, err := CreateSession(id, expires)
	if err != nil {
		http.Error(w, "Could not create session", http.StatusInternalServerError)
		return
	}

	setSessionCookie(w, sid, expires)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "ok"})
}

// Login authenticates a user and reuses/refreshes an existing active session if present
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
	if u.Email == "" || u.Password == "" {
		http.Error(w, "Email and password required", http.StatusBadRequest)
		return
	}
	if !isValidEmail(u.Email) {
		http.Error(w, "Invalid email format", http.StatusBadRequest)
		return
	}

	// find user
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

	// verify password
	if !verifyPassword(storedHash, u.Password) {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	// 1) If client provided a session cookie that belongs to this user, refresh its expiry
	if cookie, err := r.Cookie("session"); err == nil {
		if sidUserID, _, err2 := GetSessionUser(cookie.Value); err2 == nil && sidUserID == userID {
			expires := time.Now().Add(sessionExpiry)
			if err := UpdateSessionExpiry(cookie.Value, expires); err == nil {
				setSessionCookie(w, cookie.Value, expires)
				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(map[string]string{"message": "ok"})
				return
			}
			// if update failed, proceed to reuse/create below
		}
	}

	// 2) Check DB for any other active session for this user and reuse it
	if existingSID, expires, err := GetActiveSessionByUser(userID); err == nil {
		setSessionCookie(w, existingSID, expires)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "ok"})
		return
	}

	// 3) Otherwise create a new session
	expires := time.Now().Add(sessionExpiry)
	sid, err := CreateSession(userID, expires)
	if err != nil {
		http.Error(w, "Could not create session", http.StatusInternalServerError)
		return
	}

	setSessionCookie(w, sid, expires)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "ok"})
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
