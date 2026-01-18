# ModaPro Tutor

An intelligent AI agent powered by Google's Gemini model, designed to assist users within the ModaPro ecosystem. The agent adapts its persona based on the selected mode, ranging from a supportive onboarding buddy to a challenging regional manager.

## Overview

ModaPro Tutor utilizes the Google GenAI Go SDK and ADK to create a stateful, interactive tutoring experience. It features a web server that hosts a frontend interface and provides a RESTful API for chat interactions.

## Prerequisites

- **Go 1.25** or higher
- **Google Cloud API Key** with access to Gemini models.

## Configuration

Create a `.env` file in the root directory (`modapro-tutor/`) and add your Google API key:

```env
GOOGLE_API_KEY=your_api_key_here
```

## Usage

### Running the Server

You can run the application directly using Go:

```bash
go run .
```

Or build and run the binary:

```bash
go build -o modapro-tutor
./modapro-tutor
```

The server will start at `http://localhost:8080`.

### Interaction Modes

The agent supports different modes passed via the JSON API payload:

-   **soft** (Default): "The Onboarding Buddy" - Warm, patient, and helpful.
-   **intermediate**: "The Implementation Consultant" - Professional, uses scaffolding techniques.
-   **realistic**: "The Regional Manager" - Direct, simulates pressure, answers are earned.

### API Endpoint

**POST** `/api/chat`

**Payload:**

```json
{
  "message": "Hello, how do I start?",
  "user_id": "user123",
  "session_id": "session_abc",
  "mode": "soft"
}
```

## Project Structure

-   `main.go`: Entry point. Initializes the server, model, and handles API requests.
-   `prompt.go`: Manages system instructions and persona adaptation logic.
-   `message.txt`: Base system instruction file.
-   `frontend/`: Directory for static web assets.
