package handlers

import (
	"encoding/json"
	"net/http"
	"time"
)

// ServeHomepage displays user dashboard (protected route)
// Only accessible to authenticated users with valid session
func ServeHomepage(w http.ResponseWriter, r *http.Request) {
	// Try to get session cookie from request
	cookie, err := r.Cookie("session")
	if err != nil { // Cookie not found - user not logged in
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

	// User is authenticated - return homepage data as JSON
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Welcome to Learning Platform", // Welcome message
		"email":   session.email,                   // User's email address
	})
}
