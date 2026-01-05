package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"regexp"
	"sync"
	"time"
	"unicode"
)

// User credentials from login request
type User struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Login attempt tracking for rate limiting
type loginAttempt struct {
	count   int       // Number of failed attempts
	lastTry time.Time // Timestamp of last failed attempt
}

// Session data with expiry tracking
type sessionData struct {
	email   string    // User's email address
	expires time.Time // When this session expires
}

// In-memory storage (data lost on server restart)
var (
	users         = make(map[string]string)        // Maps email -> hashed password for all registered users
	salts         = make(map[string]string)        // Maps email -> random salt used for password hashing
	sessions      = make(map[string]*sessionData)  // Maps sessionID -> session data (email + expiry time)
	loginAttempts = make(map[string]*loginAttempt) // Maps email -> failed login attempt tracking
	mu            sync.Mutex                       // Mutex for thread-safe access to all maps above
	emailRegex    = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`) // Regex pattern for email validation
	sessionExpiry = 24 * time.Hour                 // Sessions expire after 24 hours of inactivity
)

// Hash password with salt using SHA256
// Combines password + salt before hashing to ensure same password = different hash per user
func hashPassword(password, salt string) string {
	hash := sha256.Sum256([]byte(password + salt)) // Create SHA256 hash of password+salt
	return hex.EncodeToString(hash[:])             // Convert hash bytes to hexadecimal string
}

// Generate random salt for password hashing
// Each user gets unique salt to prevent rainbow table attacks
func generateSalt() (string, error) {
	bytes := make([]byte, 16)          // Create 16-byte array for random data
	if _, err := rand.Read(bytes); err != nil { // Fill with cryptographically secure random bytes
		return "", err
	}
	return hex.EncodeToString(bytes), nil // Convert random bytes to hexadecimal string
}

// Validate email format using regex pattern
// Ensures email follows standard format: user@domain.extension
func isValidEmail(email string) bool {
	return emailRegex.MatchString(email) // Returns true if email matches regex pattern
}

// Validate password strength requirements
// Password must have: 8+ chars, uppercase, lowercase, number, special character
func isValidPassword(password string) bool {
	if len(password) < 8 { // Check minimum length requirement
		return false
	}
	// Track which character types are present in password
	var hasUpper, hasLower, hasNumber, hasSpecial bool
	for _, char := range password { // Loop through each character
		switch {
		case unicode.IsUpper(char):  // Check for uppercase letter (A-Z)
			hasUpper = true
		case unicode.IsLower(char):  // Check for lowercase letter (a-z)
			hasLower = true
		case unicode.IsNumber(char): // Check for number (0-9)
			hasNumber = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char): // Check for special character (!@#$%)
			hasSpecial = true
		}
	}
	return hasUpper && hasLower && hasNumber && hasSpecial // All requirements must be met
}

// HandleLogin creates new account or logs in existing user
// Automatically detects if email exists: creates account if new, logs in if existing
func HandleLogin(w http.ResponseWriter, r *http.Request) {
	// Only accept POST requests (security best practice)
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse JSON request body into User struct
	var user User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest) // Return 400 if JSON is malformed
		return
	}

	// Validate that both email and password fields are provided
	if user.Email == "" || user.Password == "" {
		http.Error(w, "Email and password required", http.StatusBadRequest) // Return 400 if fields empty
		return
	}

	// Validate email format using regex (must be user@domain.extension)
	if !isValidEmail(user.Email) {
		http.Error(w, "Invalid email format", http.StatusBadRequest) // Return 400 if email format wrong
		return
	}

	// Lock mutex to ensure thread-safe access to shared data structures
	mu.Lock()
	defer mu.Unlock() // Unlock when function exits (even if error occurs)

	// Check if user account already exists in database
	if storedHash, exists := users[user.Email]; exists {
		// === EXISTING USER LOGIN PATH ===
		
		// Check if user has failed login attempts tracked
		attempt, hasAttempts := loginAttempts[user.Email]
		if hasAttempts {
			// If 5+ failed attempts within 5 minutes, block login (rate limiting)
			if attempt.count >= 5 && time.Since(attempt.lastTry) < 5*time.Minute {
				http.Error(w, "Too many failed attempts. Try again in 5 minutes", http.StatusTooManyRequests)
				return
			}
			// If 5+ minutes passed since last attempt, reset counter
			if time.Since(attempt.lastTry) >= 5*time.Minute {
				attempt.count = 0
			}
		}

		// Verify password by hashing input and comparing to stored hash
		salt := salts[user.Email]                      // Get user's unique salt from database
		hashedInput := hashPassword(user.Password, salt) // Hash the provided password with salt
		if hashedInput != storedHash {                   // Compare hashes
			// === PASSWORD INCORRECT ===
			// Track this failed attempt for rate limiting
			if !hasAttempts {
				// First failed attempt - create new tracking entry
				loginAttempts[user.Email] = &loginAttempt{count: 1, lastTry: time.Now()}
			} else {
				// Increment existing failed attempt counter
				attempt.count++
				attempt.lastTry = time.Now()
			}
			http.Error(w, "Invalid credentials", http.StatusUnauthorized) // Return 401 error
			return
		}
		// Password correct - reset failed attempt counter
		delete(loginAttempts, user.Email)
	} else {
		// === NEW USER SIGNUP PATH ===
		
		// Validate password meets strength requirements before creating account
		if !isValidPassword(user.Password) {
			http.Error(w, "Password must be 8+ chars with uppercase, lowercase, number, and special character", http.StatusBadRequest)
			return
		}
		// Generate unique random salt for this user
		salt, err := generateSalt()
		if err != nil {
			http.Error(w, "Server error", http.StatusInternalServerError) // Return 500 if salt generation fails
			return
		}
		// Hash password with salt and store in database
		hashedPassword := hashPassword(user.Password, salt)
		users[user.Email] = hashedPassword // Store hashed password
		salts[user.Email] = salt           // Store salt for future logins
	}

	// === CREATE SESSION (both login and signup reach here) ===
	
	// Use email as session ID (simple approach for demo)
	sessionID := user.Email
	// Store session with expiry time (24 hours from now)
	sessions[sessionID] = &sessionData{
		email:   user.Email,
		expires: time.Now().Add(sessionExpiry), // Session expires in 24 hours
	}

	// Set HTTP cookie in browser to maintain session
	http.SetCookie(w, &http.Cookie{
		Name:     "session",  // Cookie name
		Value:    sessionID,  // Cookie value (user's email)
		Path:     "/",        // Cookie valid for entire site
		HttpOnly: true,       // Prevent JavaScript access (security)
		MaxAge:   86400,      // Cookie expires in 24 hours (86400 seconds)
	})

	// Return success response as JSON
	json.NewEncoder(w).Encode(map[string]string{"message": "Success"})
}

// HandleLogout ends user session and clears authentication
// Removes session from server and deletes browser cookie
func HandleLogout(w http.ResponseWriter, r *http.Request) {
	// Try to get session cookie from request
	cookie, err := r.Cookie("session")
	if err == nil { // If cookie exists
		// Remove session from server storage (thread-safe)
		mu.Lock()
		delete(sessions, cookie.Value) // Delete session data
		mu.Unlock()
	}

	// Clear session cookie in browser by setting MaxAge to -1
	http.SetCookie(w, &http.Cookie{
		Name:   "session", // Same cookie name
		Value:  "",        // Empty value
		Path:   "/",       // Same path as original cookie
		MaxAge: -1,        // Negative MaxAge deletes cookie immediately
	})

	// Return success response as JSON
	json.NewEncoder(w).Encode(map[string]string{"message": "Logged out"})
}

// CheckAuth verifies if user is currently logged in
// Returns user email if authenticated, error if not
func CheckAuth(w http.ResponseWriter, r *http.Request) {
	// Try to get session cookie from request
	cookie, err := r.Cookie("session")
	if err != nil { // Cookie not found
		http.Error(w, "Not authenticated", http.StatusUnauthorized) // Return 401 error
		return
	}

	// Check if session exists in server storage (thread-safe)
	mu.Lock()
	session, exists := sessions[cookie.Value] // Look up session by cookie value
	mu.Unlock()

	// Verify session exists and hasn't expired
	if !exists || time.Now().After(session.expires) {
		// Session doesn't exist or has expired
		if exists {
			// Clean up expired session from storage
			mu.Lock()
			delete(sessions, cookie.Value)
			mu.Unlock()
		}
		http.Error(w, "Not authenticated", http.StatusUnauthorized) // Return 401 error
		return
	}

	// Session valid - return user email as JSON
	json.NewEncoder(w).Encode(map[string]string{"email": session.email})
}
