package handlers

import (
	"database/sql"
	"net/http"
	"time"
)

// ServeClassroom handles requests to /classroom/
// It enforces authentication before serving static files from web/classroom
func ServeClassroom(w http.ResponseWriter, r *http.Request) {
	// Ensure a guest session exists for anonymous visitors, then serve static files.
	// 1. Check for valid session cookie
	cookie, err := r.Cookie("session")
	if err != nil || cookie.Value == "" {
		// Create or reuse a guest user and session
		guestEmail := "guest@system.local"
		guestID, _, _, err := GetUserByEmail(guestEmail)
		if err == sql.ErrNoRows {
			guestID, err = CreateUser(guestEmail, "", "")
			if err == nil {
				// create session
				sid, err2 := CreateSession(guestID, time.Now().Add(24*time.Hour))
				if err2 == nil {
					http.SetCookie(w, &http.Cookie{
						Name:     "session",
						Value:    sid,
						Path:     "/",
						Expires:  time.Now().Add(24 * time.Hour),
						HttpOnly: true,
					})
				}
			}
		} else if err == nil {
			sid, err2 := CreateSession(guestID, time.Now().Add(24*time.Hour))
			if err2 == nil {
				http.SetCookie(w, &http.Cookie{
					Name:     "session",
					Value:    sid,
					Path:     "/",
					Expires:  time.Now().Add(24 * time.Hour),
					HttpOnly: true,
				})
			}
		}
	}

	// Serve classroom static files from web/classroom.
	// If the request is exactly /classroom or /classroom/, serve classroom.htm as default.
	if r.URL.Path == "/classroom" || r.URL.Path == "/classroom/" {
		http.ServeFile(w, r, "web/classroom/classroom.htm")
		return
	}

	fileServer := http.StripPrefix("/classroom/", http.FileServer(http.Dir("web/classroom")))
	fileServer.ServeHTTP(w, r)
}
