package handlers

import (
	"encoding/json"
	"net/http"
)

// (Katerina) ADDED: Serves login.html at root URL
// Frontend needs this to display the login page when user visits /
func ServeLogin(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	http.ServeFile(w, r, "web/login/login.html")
}

// (Katerina) ADDED: Serves dashboard page after successful login
// Checks session cookie, shows user email if valid, redirects to login if not
func ServeDashboard(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session")
	if err != nil {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	_, email, err := GetSessionUser(cookie.Value)
	if err != nil {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(`<!DOCTYPE html>
<html>
<head>
    <title>Dashboard</title>
    <style>
        body { font-family: system-ui; max-width: 800px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        h1 { color: #333; margin: 0 0 10px 0; }
        .email { color: #666; font-size: 18px; margin: 20px 0; }
        button { padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; }
        button:hover { background: #0056b3; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to Your Dashboard</h1>
        <p class="email">Logged in as: <strong>` + email + `</strong></p>
        <button onclick="logout()">Logout</button>
    </div>
    <script>
        async function logout() {
            await fetch('/api/logout', { method: 'POST', credentials: 'include' });
            window.location.href = '/';
        }
    </script>
</body>
</html>`))
}

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
