// Package main serves as the entry point for the ModaPro Tutor application.
// It initializes the environment, sets up the Google GenAI client, configures the
// AI model and agent, and starts the web server handling chat interactions.
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	"google.golang.org/adk/agent"
	"google.golang.org/adk/agent/llmagent"
	"google.golang.org/adk/model"
	"google.golang.org/adk/model/gemini"
	"google.golang.org/adk/runner"
	"google.golang.org/adk/session"
	"google.golang.org/genai"
)

// main initializes the application state, loads configuration,
// creates the AI model client, and starts the HTTP server.
func main() {
	// Load environment variables from .env file if available.
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Ensure the GOOGLE_API_KEY environment variable is set.
	AgentApiKey := os.Getenv("GOOGLE_API_KEY")
	if AgentApiKey == "" {
		log.Fatal("GOOGLE_API_KEY environment variable must be set")
	}

	ctx := context.Background()

	// Configure the GenAI client with the API key.
	clientConfig := &genai.ClientConfig{
		APIKey: AgentApiKey,
	}

	// Initialize the Gemini model (gemini-3-flash-preview).
	// This model is used to drive the agent's logic.
	model, err := gemini.NewModel(ctx, "gemini-3-flash-preview", clientConfig)
	if err != nil {
		log.Fatalf("Failed to create model: %v", err)
	}

	// Create an in-memory session service to track user sessions.
	sessionService := session.InMemoryService()

	// Start the web server with the configured session service and model.
	startWebServer(sessionService, model)
}

// startWebServer configures and starts the HTTP server.
// It sets up handlers for static files and the API endpoint for chat interactions.
func startWebServer(sessionService session.Service, model model.LLM) {
	// Serve static files from the "./frontend" directory.
	http.Handle("/", http.FileServer(http.Dir("./frontend")))

	// Handle POST requests to /api/chat.
	// This endpoint receives user messages, processes them via the AI agent,
	// and returns the generated responses.
	http.HandleFunc("/api/chat", func(w http.ResponseWriter, req *http.Request) {
		if req.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Input struct defines the expected JSON payload for chat requests.
		var input struct {
			Message   string `json:"message"`
			UserID    string `json:"user_id"`
			SessionID string `json:"session_id"`
			Mode      string `json:"mode"`
		}

		if err := json.NewDecoder(req.Body).Decode(&input); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}

		// Set default values if fields are missing.
		if input.UserID == "" {
			input.UserID = "default-user"
		}
		if input.SessionID == "" {
			input.SessionID = "default-session"
		}
		if input.Mode == "" {
			input.Mode = "soft"
		}

		ctx := req.Context()

		// Retrieve system instructions based on the selected mode.
		systemInstruction := GetSystemPrompt(input.Mode)

		// Configure a new LLM agent with the specified model and instructions.
		ag, err := llmagent.New(llmagent.Config{
			Name:        "ModaProTutor",
			Description: "Expert tutor for ModaPro ecosystem",
			Model:       model,
			Instruction: systemInstruction,
		})
		if err != nil {
			http.Error(w, "Failed to create agent", http.StatusInternalServerError)
			return
		}

		// Create a runner to execute the agent within a session context.
		currentRunner, err := runner.New(runner.Config{
			AppName:        "modapro-tutor",
			Agent:          ag,
			SessionService: sessionService,
		})
		if err != nil {
			http.Error(w, "Failed to create runner", http.StatusInternalServerError)
			return
		}

		// Ensure the session exists in the session service.
		_, _ = sessionService.Create(ctx, &session.CreateRequest{
			AppName:   "modapro-tutor",
			UserID:    input.UserID,
			SessionID: input.SessionID,
		})

		// Construct the content message from the user's input.
		msg := &genai.Content{
			Parts: []*genai.Part{{Text: input.Message}},
			Role:  "user",
		}

		// Run the agent loop to process the message and stream/collect the response.
		var fullResponse string
		for event, err := range currentRunner.Run(ctx, input.UserID, input.SessionID, msg, agent.RunConfig{}) {
			if err != nil {
				log.Printf("Error: %v", err)
				break
			}
			if event.Content != nil {
				for _, part := range event.Content.Parts {
					if part.Text != "" {
						fullResponse += part.Text
					}
				}
			}
		}

		// Prepare and send the JSON response.
		resp := struct {
			Response string `json:"response"`
		}{Response: fullResponse}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	})

	fmt.Printf("Starting web server on http://localhost:8080\n")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
}
