# AI Implementation

## Overview

Google Gemini 1.5 Flash with 3 coaching modes and context-aware responses.

## Coaching Modes

**Soft (Onboarding Buddy)**
- Warm, encouraging, detailed
- Example: "Great question! 🎉 Adding a product is super easy..."

**Intermediate (Consultant)**
- Professional, balanced, step-by-step
- Example: "To add a product, click 'Add New Product'..."

**Realistic (Manager)**
- Direct, concise, efficient
- Example: "Click 'Add New Product', fill form, submit."

## Implementation

**Backend:** `internal/handlers/chat.go`
- Loads Gemini model
- Builds mode-specific system prompt
- Streams response via SSE

**Frontend:** `web/classroom/classroom.js`
- Sends message + mode + inventory
- Reads SSE stream
- Appends chunks to chat bubble

## API Configuration

- Model: `gemini-3-flash-preview`
- Temperature: 0.7 (balanced)
- Tokens per minute (input) =  250K  
- Streaming: Enabled 

## Cost Estimate

**Free tier:** 5 RPM, 1M tokens/day , 20 RPD  Requests per day
**Paid:** [Depending on the model and tier of subscription](https://ai.google.dev/gemini-api/docs/rate-limits) 

## Future Enhancements

- Conversation history (store in DB)
- Exercise-aware prompts
- Adaptive difficulty
- Custom simulations
- Multi-language support
