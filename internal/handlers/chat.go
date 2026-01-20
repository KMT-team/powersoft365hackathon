package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"modapro-tutor/internal/ai"
	"net/http"
	"os"
	"sync"

	"google.golang.org/adk/agent"
	"google.golang.org/adk/agent/llmagent"
	"google.golang.org/adk/model"
	"google.golang.org/adk/model/gemini"
	"google.golang.org/adk/runner"
	"google.golang.org/adk/session"
	"google.golang.org/genai"
)

// ChatHandler manages the AI chat interaction.
type ChatHandler struct {
	sessionService session.Service
	model          model.LLM
	modelInitOnce  sync.Once
	modelInitErr   error
}

// NewChatHandler creates a new ChatHandler.
// Note: The model is not initialized here; it is lazy-loaded on the first request.
func NewChatHandler(sessionService session.Service) *ChatHandler {
	return &ChatHandler{
		sessionService: sessionService,
	}
}

// getOrInitModel safely initializes the AI model if it hasn't been already.
func (h *ChatHandler) getOrInitModel(ctx context.Context) (model.LLM, error) {
	h.modelInitOnce.Do(func() {
		apiKey := os.Getenv("GOOGLE_API_KEY")
		if apiKey == "" {
			h.modelInitErr = fmt.Errorf("GOOGLE_API_KEY environment variable not set")
			log.Println("Error: GOOGLE_API_KEY not set")
			return
		}

		clientConfig := &genai.ClientConfig{
			APIKey: apiKey,
		}

		// Initialize the Gemini model (gemini-3-flash-preview).
		var err error
		h.model, err = gemini.NewModel(ctx, "gemini-3-flash-preview", clientConfig)
		if err != nil {
			h.modelInitErr = fmt.Errorf("failed to create model: %v", err)
			return
		}
		log.Println("AI Model initialized successfully (Lazy Load)")
	})

	return h.model, h.modelInitErr
}

// HandleChat processes POST requests to /api/chat.
func (h *ChatHandler) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Lazy load model
	modelInstance, err := h.getOrInitModel(req.Context())
	if err != nil {
		http.Error(w, fmt.Sprintf("AI functionality unavailable: %v", err), http.StatusServiceUnavailable)
		return
	}

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
	systemInstruction := ai.GetSystemPrompt(input.Mode)

	// Configure a new LLM agent with the specified model and instructions.
	ag, err := llmagent.New(llmagent.Config{
		Name:        "ModaProTutor",
		Description: "Expert tutor for ModaPro ecosystem",
		Model:       modelInstance,
		Instruction: systemInstruction,
	})
	if err != nil {
		http.Error(w, "Failed to create agent", http.StatusInternalServerError)
		log.Printf("Failed to create agent: %v", err)
		return
	}

	// Create a runner to execute the agent within a session context.
	currentRunner, err := runner.New(runner.Config{
		AppName:        "modapro-tutor",
		Agent:          ag,
		SessionService: h.sessionService,
	})
	if err != nil {
		http.Error(w, "Failed to create runner", http.StatusInternalServerError)
		log.Printf("Failed to create runner: %v", err)
		return
	}

	// Ensure the session exists in the session service.
	_, _ = h.sessionService.Create(ctx, &session.CreateRequest{
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
			log.Printf("Runner Execution Error: %v", err)
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
}

// Helper for fmt usage since I used it inside the function but didn't import it in the initial list if I copied poorly.
// Wait, I missed "fmt" in imports. I should check before writing.
// I will rewrite the content to include fmt properly.
