package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

type Scenario struct {
	ID       int      `json:"id"`
	Title    string   `json:"title"`
	Steps    []string `json:"steps"`
	Hints    []string `json:"hints"`
	Complete bool     `json:"complete"`
}

type UserProgress struct {
	UserID    int      `json:"user_id"`
	Completed []int    `json:"completed"`
	Badges    []string `json:"badges"`
}

// Scenario progression and badge tracking
var userProgress = make(map[int]UserProgress) // Mock in-memory storage

func TrackProgress(userID int, scenarioID int, mistakes int) {
	progress := userProgress[userID]
	progress.UserID = userID

	// Add scenario to completed list if not already present
	if !contains(progress.Completed, scenarioID) {
		progress.Completed = append(progress.Completed, scenarioID)
	}

	// Award badges based on conditions
	if len(progress.Completed) == 1 {
		progress.Badges = append(progress.Badges, "First Scenario")
	}
	if mistakes == 0 {
		progress.Badges = append(progress.Badges, "Zero Mistakes")
	}
	if scenarioID == 3 {
		progress.Badges = append(progress.Badges, "Level 3 Completion")
	}

	userProgress[userID] = progress
}

func contains(slice []int, item int) bool {
	for _, v := range slice {
		if v == item {
			return true
		}
	}
	return false
}

// GET /api/scenario/next
func GetNextScenario(w http.ResponseWriter, r *http.Request) {
	// Placeholder logic for fetching the next scenario
	scenario := Scenario{
		ID:    1,
		Title: "Level 1 - Add Item",
		Steps: []string{"Step 1", "Step 2", "Step 3"},
		Hints: []string{"Hint 1", "Hint 2", "Hint 3"},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(scenario)
}

// POST /api/scenario/:id/action
func PostScenarioAction(w http.ResponseWriter, r *http.Request) {
	// Extract scenario ID from URL
	parts := strings.Split(r.URL.Path, "/")
	id, err := strconv.Atoi(parts[len(parts)-2])
	if err != nil {
		http.Error(w, "Invalid scenario ID", http.StatusBadRequest)
		return
	}

	// Placeholder logic for validating user action
	var action map[string]string
	if err := json.NewDecoder(r.Body).Decode(&action); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	response := map[string]string{
		"message":     "Action validated",
		"scenario_id": strconv.Itoa(id),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// POST /api/scenario/:id/finish
func PostScenarioFinish(w http.ResponseWriter, r *http.Request) {
	// Extract scenario ID from URL
	parts := strings.Split(r.URL.Path, "/")
	id, err := strconv.Atoi(parts[len(parts)-2])
	if err != nil {
		http.Error(w, "Invalid scenario ID", http.StatusBadRequest)
		return
	}

	// Placeholder logic for finalizing scenario
	response := map[string]string{
		"message":     "Scenario finalized",
		"scenario_id": strconv.Itoa(id),
	}

	// Track user progress (mock userID = 1 for demonstration)
	TrackProgress(1, id, 0) // Assuming 0 mistakes for now

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GET /api/progress
func GetUserProgress(w http.ResponseWriter, r *http.Request) {
	// Placeholder logic for fetching user progress
	progress := UserProgress{
		UserID:    1,
		Completed: []int{1, 2},
		Badges:    []string{"First Scenario", "Zero Mistakes"},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(progress)
}
