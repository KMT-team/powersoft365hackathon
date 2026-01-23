package handlers

import (
	"database/sql"
	"net/http"
	"time"
)

// ServeClassroom serves classroom with auto-guest session
func ServeClassroom(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session")
	if err != nil || cookie.Value == "" {
		guestEmail := "guest@system.local"
		guestID, _, _, err := GetUserByEmail(guestEmail)
		switch err {
		case sql.ErrNoRows:
			guestID, err = CreateUser(guestEmail, "", "")
			if err == nil {
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
		case nil:
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

	if r.URL.Path == "/classroom" || r.URL.Path == "/classroom/" {
		http.ServeFile(w, r, "web/classroom/index.html")
		return
	}

	fileServer := http.StripPrefix("/classroom/", http.FileServer(http.Dir("web/classroom")))
	fileServer.ServeHTTP(w, r)
}
