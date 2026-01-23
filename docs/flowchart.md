# User Journey

## Learning Path

```
┌─────────┐    ┌───────┐    ┌───────────┐    ┌─────────────┐
│ Landing │ -> │ Login │ -> │ Dashboard │ -> │  Classroom  │
└─────────┘    └───────┘    └───────────┘    └──────┬──────┘
                                                     │
                                                     ▼
                              ┌──────────────────────────────────┐
                              │  Exercise 1 -> 2 -> 3 -> 4 -> 5  │
                              └────────────┬─────────────────────┘
                                           │
                                           ▼
                                      Completion
```

## Authentication Flow

```
┌──────────────┐    ┌──────────┐    ┌──────────┐    ┌─────────┐
│ Register/    │ -> │ Validate │ -> │  Create  │ -> │ Redirect│
│ Login Form   │    │  Input   │    │  Session │    │         │
└──────────────┘    └──────────┘    └──────────┘    └─────────┘

┌──────────────┐    ┌──────────┐    ┌──────────┐
│ Guest Mode   │ -> │  Reuse   │ -> │  Clear   │
│ Click        │    │  Account │    │  Storage │
└──────────────┘    └──────────┘    └──────────┘
```

## Learning Experience

**Exercise Progression:**
```
┌───────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ Start │-> │ Load Ex. │-> │ Practice │-> │ Validate │-> │ Complete │
└───────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
                                │                              │
                                ▼                              ▼
                           Hints (optional)              Unlock Next
```

**Gamification Elements:**
- Progressive difficulty (5 exercises)
- Completion tracking (localStorage)
- Hint system for struggling users
- Real-time validation feedback
- Exercise prerequisites (sequential unlocking)

## AI Coaching Flow

```
┌─────────────┐   ┌──────────────┐   ┌─────────────┐   ┌──────────┐
│ User types  │-> │ POST /api/   │-> │ Gemini API  │-> │ Stream   │
│ message     │   │  chat with:  │   │ generates   │   │ response │
│             │   │ - Mode       │   │ adaptive    │   │ via SSE  │
│             │   │ - Inventory  │   │ response    │   │          │
│             │   │ - Context    │   │             │   │          │
└─────────────┘   └──────────────┘   └─────────────┘   └──────────┘
```

## Data Persistence

**Server (PostgreSQL):** Users, sessions  
**Client (localStorage):** Theme, inventory state, exercise progress, completion status
