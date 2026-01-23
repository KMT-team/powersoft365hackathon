# AI Implementation

## Overview

Google Gemini 3 Flash Preview with adaptive coaching that adjusts to user skill level and exercise context. The AI acts as a personalized tutor, providing context-aware guidance based on current inventory state and exercise difficulty.

## Coaching Modes

**Soft (Onboarding Buddy)**
- Warm, encouraging, detailed explanations
- Best for: First-time users, complex tasks
- Example: "Great question! Adding a product is super easy..."

**Intermediate (Consultant)**
- Professional, balanced, step-by-step guidance
- Best for: Users with basic familiarity
- Example: "To add a product, click 'Add New Product'..."

**Realistic (Manager)**
- Direct, concise, efficient instructions
- Best for: Experienced users, quick lookups
- Example: "Click 'Add New Product', fill form, submit."

## Adaptive Intelligence

**Context Awareness:**
- Receives full inventory state with each message
- Understands current exercise requirements
- Provides specific guidance based on user's progress

**Exercise-Aware Coaching:**
- Adjusts complexity based on exercise difficulty (1-5)
- Offers hints without revealing full solutions
- Encourages exploration and problem-solving

## Implementation

**Backend:** `internal/handlers/chat.go`
- Loads Gemini model
- Builds mode-specific system prompt with inventory context
- Streams response via SSE

**Frontend:** `web/classroom/classroom.js`
- Sends message + mode + inventory state
- Reads SSE stream
- Appends chunks to chat bubble in real-time

## API Configuration

- Model: `gemini-3-flash-preview`
- Temperature: 0.7 (balanced creativity/accuracy)
- Tokens per minute: 250K (input)
- Streaming: Enabled for responsive UX

## Cost Estimate

**Free tier**: 5 RPM, 1M tokens/day, 20 RPD Requests per day  
**Paid**: [Depending on the model and tier of subscription](https://ai.google.dev/gemini-api/docs/rate-limits)

## Future Enhancements

- Conversation history (DB storage)
- Multi-language support  
- Exercise-aware prompts  
- Custom simulations  
- Adaptive difficulty