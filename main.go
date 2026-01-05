package main

import (
	"log"
	"net/http"
	"powersoft365hackathon/handlers"
)

func main() {
	// === ROUTE DEFINITIONS ===
	
	// Landing page - displays simple API info message
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("<h1>Learning Platform API</h1><p>Use /api/login to authenticate</p>"))
	})

	// === API ENDPOINTS ===
	// These endpoints handle authentication and return JSON responses
	
	http.HandleFunc("/api/login", handlers.HandleLogin)       // API: Login existing user or create new account
	http.HandleFunc("/api/logout", handlers.HandleLogout)     // API: End user session and clear cookies
	http.HandleFunc("/api/check-auth", handlers.CheckAuth)    // API: Verify if user is currently authenticated
	
	// === PROTECTED PAGES ===
	// These routes require valid authentication to access
	
	http.HandleFunc("/homepage", handlers.ServeHomepage)      // User dashboard (requires login)

	// === START SERVER ===
	// Server listens on port 8080 for incoming HTTP requests
	
	log.Println("Server running on http://localhost:8080")    // Log startup message
	log.Fatal(http.ListenAndServe(":8080", nil))              // Start server (blocks until error)
}
