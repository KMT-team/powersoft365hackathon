package main

import (
	"log"
	"net/http"
	"os"
	"strings"

	handlers "modapro-tutor/internal/handlers"

	"google.golang.org/adk/session"
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

	if os.Getenv("GOOGLE_API_KEY") == "" {
		log.Println("Warning: GOOGLE_API_KEY not found in environment. AI features will fail if requested.")
	}

	// apply migrations (development)
	if err := handlers.ApplyMigrations(os.Getenv("DATABASE_URL"), "migrations/001_create_tables.sql"); err != nil {
		log.Println("migrations:", err)
	}

	// init DB from env
	if err := handlers.InitDB(os.Getenv("DATABASE_URL")); err != nil {
		log.Fatal("db init:", err)
	}

	// session service (in-memory)
	sessionService := session.InMemoryService()
	chatHandler := handlers.NewChatHandler(sessionService)

	// Page routes - serve HTML/CSS files to browser
	// Root landing page
	http.HandleFunc("/", handlers.ServePreLogin)
	http.HandleFunc("/flow.js", handlers.ServePreLogin)
	http.HandleFunc("/assets/", handlers.ServePreLogin)
	// Login page
	http.HandleFunc("/login", handlers.ServeLogin)
	http.HandleFunc("/login.html", handlers.ServeLogin)
	http.HandleFunc("/styles.css", handlers.ServeCSS)
	http.HandleFunc("/login.js", handlers.ServeJS)
	http.HandleFunc("/dashboard.html", handlers.ServeDashboard)

	// Serve files under /web/ directly from the repo's web/ folder
	http.Handle("/web/", http.StripPrefix("/web/", http.FileServer(http.Dir("web/"))))
	http.HandleFunc("/classroom/", handlers.ServeClassroom)

	// (Katerina) ADDED: API routes - handle authentication logic
	http.HandleFunc("/api/register", handlers.HandleRegister)
	http.HandleFunc("/api/login", handlers.HandleLogin)
	http.HandleFunc("/api/logout", handlers.HandleLogout)
	http.HandleFunc("/api/check-auth", handlers.CheckAuth)
	http.HandleFunc("/api/guest", handlers.HandleGuestLogin)

	// (Unified) AI Chat Endpoint
	http.Handle("/api/chat", chatHandler)

	log.Println("Server running on http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
