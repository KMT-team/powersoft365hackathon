package main

import (
	_ "embed"
	"fmt"
)

//go:embed message.txt
var systemPromptBase string

// GetSystemPrompt constructs the final system prompt based on the selected mode.
// It takes a mode string ('soft', 'intermediate', 'realistic') and appends specific
// instructions to the base system prompt to tailor the agent's persona and difficulty.
func GetSystemPrompt(mode string) string {
	modeInstruction := ""
	switch mode {
	case "soft":
		modeInstruction = "Your current operating mode is: Soft (The Onboarding Buddy). Be warm and patient."
	case "intermediate":
		modeInstruction = "Your current operating mode is: Intermediate (The Implementation Consultant). Use scaffolding and be professional."
	case "realistic":
		modeInstruction = "Your current operating mode is: Realistic (The Regional Manager). Be direct, simulate pressure, and do not give answers easily."
	default:
		modeInstruction = "Your current operating mode is: Soft (default)."
	}

	return fmt.Sprintf("%s\n\n[CURRENT SESSION SETTINGS]\n%s", systemPromptBase, modeInstruction)
}
