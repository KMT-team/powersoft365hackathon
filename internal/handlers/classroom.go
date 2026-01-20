package handlers

import (
	"net/http"
)

// ServeClassroom handles requests to /classroom/
// It enforces authentication before serving static files from web/classroom
func ServeClassroom(w http.ResponseWriter, r *http.Request) {
	// 1. Check for valid session
	cookie, err := r.Cookie("session")
	if err != nil {
		// No session cookie -> redirect to login
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	_, _, err = GetSessionUser(cookie.Value)
	if err != nil {
		// Invalid session -> redirect to login
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	// 2. Serve static files if authenticated
	// We strip the "/classroom/" prefix so that the file server sees the path relative to "web/classroom"
	// e.g. /classroom/index.html -> web/classroom/index.html
	fileServer := http.StripPrefix("/classroom/", http.FileServer(http.Dir("web/classroom")))

	// If the path ends in /classroom so it is just directory, we want it to map to index.html
	// FileServer handles index.html for directories automatically, but StripPrefix + FileServer
	// sometimes needs careful handling of trailing slashes.
	// The http.FileServer handles standard "index.html" resolution.
	// However, if the user navigates literally to "/classroom" (without slash), the redirect might be needed
	// on the router level or here. Usually router handles it or we check path.
	if r.URL.Path == "/classroom" {
		http.Redirect(w, r, "/classroom/", http.StatusMovedPermanently)
		return
	}

	fileServer.ServeHTTP(w, r)
}
