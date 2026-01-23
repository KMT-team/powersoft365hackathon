package handlers

import (
	"encoding/json"
	"net/http"
)

// ServeRoot serves landing page
func ServeRoot(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	http.ServeFile(w, r, "web/pre-login/index.html")
}

// ServeLogin serves login page
func ServeLogin(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/login" && r.URL.Path != "/login.html" {
		http.NotFound(w, r)
		return
	}
	http.ServeFile(w, r, "web/login/login.html")
}

// ServeDashboard serves user dashboard (requires auth)
func ServeDashboard(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session")
	if err != nil {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	_, _, err = GetSessionUser(cookie.Value)
	if err != nil {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	http.ServeFile(w, r, "web/dashboard/dashboard.html")
}

// ServeHomepage returns user data as JSON (requires auth)
func ServeHomepage(w http.ResponseWriter, r *http.Request) {
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

	json.NewEncoder(w).Encode(map[string]string{
		"message": "Welcome to Learning Platform",
		"email":   email,
	})
}
