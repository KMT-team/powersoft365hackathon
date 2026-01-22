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

// ChatHandler manages AI chat
type ChatHandler struct {
	sessionService session.Service
	model          model.LLM
	modelInitOnce  sync.Once
	modelInitErr   error
}

// NewChatHandler creates chat handler
func NewChatHandler(sessionService session.Service) *ChatHandler {
	return &ChatHandler{
		sessionService: sessionService,
	}
}

// getOrInitModel lazy-loads AI model
func (h *ChatHandler) getOrInitModel(ctx context.Context) (model.LLM, error) {
	h.modelInitOnce.Do(func() {
		apiKey := os.Getenv("GOOGLE_API_KEY")
		if apiKey == "" {
			h.modelInitErr = fmt.Errorf("GOOGLE_API_KEY not set")
			log.Println("Error: GOOGLE_API_KEY not set")
			return
		}

		clientConfig := &genai.ClientConfig{
			APIKey: apiKey,
		}

		// Init Gemini model
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

// ServeHTTP handles POST /api/chat
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

	// Set defaults
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

	systemInstruction := ai.GetSystemPrompt(input.Mode)

	// Create LLM agent
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

	// Create runner
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

	// Ensure session exists
	_, _ = h.sessionService.Create(ctx, &session.CreateRequest{
		AppName:   "modapro-tutor",
		UserID:    input.UserID,
		SessionID: input.SessionID,
	})

	// Build user message
	msg := &genai.Content{
		Parts: []*genai.Part{{Text: input.Message}},
		Role:  "user",
	}

	// Run agent and collect response
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
	// Send JSON response
	resp := struct {
		Response string `json:"response"`
	}{Response: fullResponse}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// ========== FUTURE FEATURES ==========

// GenerateScenario - TODO: dynamic scenario generation
func (h *ChatHandler) GenerateScenario(userID string, level int) map[string]interface{} {
	return map[string]interface{}{
		"id":    level,
		"title": fmt.Sprintf("Level %d - Dynamic Task", level),
		"steps": []string{"Step 1", "Step 2", "Step 3"},
		"hints": []string{"Hint 1", "Hint 2", "Hint 3"},
	}
}

// ProvideFeedback - TODO: AI-powered feedback
func (h *ChatHandler) ProvideFeedback(userID string, performance map[string]interface{}) string {
	mistakes := performance["mistakes"].(int)
	timeTaken := performance["timeTaken"].(int)

	if mistakes == 0 {
		return fmt.Sprintf("Great job! You completed the task in %d seconds with no mistakes.", timeTaken)
	}
	return fmt.Sprintf("You completed the task in %d seconds with %d mistakes. Review the steps carefully.", timeTaken, mistakes)
}

// AdaptToPerformance - TODO: adaptive tutoring
func (h *ChatHandler) AdaptToPerformance(userID string, performance map[string]interface{}) string {
	mistakes := performance["mistakes"].(int)

	if mistakes > 3 {
		return "It seems you're struggling. Would you like a hint or a walkthrough?"
	}
	return "You're doing well! Let's move to the next challenge."
}
