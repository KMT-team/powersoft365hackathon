package handlers

import (
	"encoding/json"
	"net/http"
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

	_, email, err := GetSessionUser(cookie.Value)
	if err != nil {
		http.Error(w, "Not authenticated", http.StatusUnauthorized)
		return
	}

	// User is authenticated - return homepage data as JSON
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Welcome to Learning Platform", // Welcome message
		"email":   email,                          // User's email address
	})
}
