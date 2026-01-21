package handlers

import (
	"encoding/json"
	"net/http"
)

// ServeRoot serves the project's root index.html (landing page)
func ServeRoot(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	http.ServeFile(w, r, "index.html")
}

// (Katerina) ADDED: Serves login.html at root URL
// Frontend needs this to display the login page when user visits /
func ServeLogin(w http.ResponseWriter, r *http.Request) {
	// Serve login page at /login or /login.html
	if r.URL.Path != "/login" && r.URL.Path != "/login.html" {
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

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Write([]byte(`<!DOCTYPE html>
<html>
<head>
    <title>Dashboard</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui, -apple-system, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2); max-width: 600px; width: 100%; }
        h1 { color: #333; margin: 0 0 20px 0; font-size: 28px; }
        .email { color: #666; font-size: 16px; margin: 15px 0 30px 0; }
        .button-group { display: flex; gap: 15px; flex-wrap: wrap; }
        .btn { padding: 12px 28px; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; text-decoration: none; text-align: center; transition: all 0.3s ease; display: inline-block; }
        .btn-logout { background: #007bff; color: white; }
        .btn-logout:hover { background: #0056b3; transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0, 123, 255, 0.4); }
        .btn-moda { background: #6f46e5; color: white; }
        .btn-moda:hover { background: #5e35cc; transform: translateY(-2px); box-shadow: 0 5px 15px rgba(111, 70, 229, 0.4); }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to Your Dashboard</h1>
        <p class="email">Logged in as: <strong>` + email + `</strong></p>
        <div class="button-group">
			<a href="/web/classroom/index.html" class="btn btn-moda">Moda Pro</a>
            <button type="button" class="btn btn-logout" onclick="logout()">Logout</button>
        </div>
    </div>
    <script>
        function logout() {
            fetch('/api/logout', { method: 'POST', credentials: 'include' })
                .then(() => { window.location.href = '/web/login/login.html'; })
                .catch(err => { console.error('Logout error:', err); alert('Logout failed'); });
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
