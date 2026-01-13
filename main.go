package main

import (
	"log"
	"net/http"
	"os"
	"strings"

	"powersoft365hackathon/handlers"
)

func loadDotEnv(path string) error {
	b, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	for _, line := range strings.Split(string(b), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		val := strings.TrimSpace(parts[1])
		// remove optional surrounding quotes
		val = strings.Trim(val, `"'`)
		os.Setenv(key, val)
	}
	return nil
}

func main() {
	// load .env if present (ignore error if not)
	_ = loadDotEnv(".env")

	// apply migrations (development)
	if err := handlers.ApplyMigrations(os.Getenv("DATABASE_URL"), "migrations/001_create_tables.sql"); err != nil {
		log.Println("migrations:", err)
	}

	// init DB from env
	if err := handlers.InitDB(os.Getenv("DATABASE_URL")); err != nil {
		log.Fatal("db init:", err)
	}

	// === ROUTE DEFINITIONS ===

	// Landing page - displays simple API info message
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("<h1>Learning Platform API</h1><p>Use /api/login to authenticate</p>"))
	})

	// === API ENDPOINTS ===
	http.HandleFunc("/api/login", handlers.HandleLogin)    // API: Login existing user or create new account
	http.HandleFunc("/api/logout", handlers.HandleLogout)  // API: End user session and clear cookies
	http.HandleFunc("/api/check-auth", handlers.CheckAuth) // API: Verify if user is currently authenticated

	// === PROTECTED PAGES ===
	http.HandleFunc("/homepage", handlers.ServeHomepage) // User dashboard (requires login)

	// === START SERVER ===
	log.Println("Server running on http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
