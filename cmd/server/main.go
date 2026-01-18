package main

import (
	"log"
	"net/http"
	"os"
	"strings"

	handlers "powersoft365hackathon/internal/handlers"
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

	// Landing page - displays simple API info message (either use this)*
	//	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
	//		w.Write([]byte("<h1>Learning Platform API</h1><p>Use /api/login to authenticate</p>"))
	//	})

	// (Katerina) ADDED: Page routes - serve HTML/CSS files to browser
	http.HandleFunc("/", handlers.ServeLogin) // *(or this does the same)
	http.HandleFunc("/styles.css", handlers.ServeCSS)
	http.HandleFunc("/login.js", handlers.ServeJS)
	http.HandleFunc("/dashboard.html", handlers.ServeDashboard)

	// (Katerina) ADDED: API routes - handle authentication logic
	http.HandleFunc("/api/register", handlers.HandleRegister)
	http.HandleFunc("/api/login", handlers.HandleLogin)
	http.HandleFunc("/api/logout", handlers.HandleLogout)
	http.HandleFunc("/api/check-auth", handlers.CheckAuth)
	http.HandleFunc("/api/guest", handlers.HandleGuestLogin)

	log.Println("Server running on http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
