# Application Flow & Architecture Documentation

## Overview
This document explains the overall application architecture, startup process, and request flow for the Learning Platform, including environment configuration, database initialization, and HTTP routing.

## Application Architecture

```mermaid
graph TB
    subgraph "Environment Layer"
        A[.env Configuration]
        B[Environment Variables]
        C[Database Connection String]
    end
    
    subgraph "Application Layer"
        D[main.go - Entry Point]
        E[HTTP Server]
        F[Route Handlers]
        G[Middleware]
    end
    
    subgraph "Business Logic Layer"
        H[Authentication Logic]
        I[Session Management]
        J[User Validation]
        K[Password Handling]
    end
    
    subgraph "Data Layer"
        L[Database Connection Pool]
        M[Migration System]
        N[CRUD Operations]
        O[PostgreSQL Database]
    end
    
    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
    I --> J
    J --> K
    K --> L
    L --> M
    M --> N
    N --> O
```

## Application Startup Flow

```mermaid
flowchart TD
    A[Start: main.go] --> B[Load .env File]
    B --> C[Read Environment Variables]
    C --> D{DATABASE_URL Provided?}
    D -->|No| E[Compose from POSTGRES_* Variables]
    D -->|Yes| F[Use Provided DATABASE_URL]
    E --> G[Append sslmode=disable for Development]
    F --> G
    G --> H[Apply Database Migrations]
    H --> I{Migrations Successful?}
    I -->|No| J[Exit with Error]
    I -->|Yes| K[Initialize Database Connection]
    K --> L{DB Connection Successful?}
    L -->|No| J
    L -->|Yes| M[Setup HTTP Routes]
    M --> N[Get PORT from Environment]
    N --> O[Start HTTP Server]
    O --> P[Listen for Requests]
    
    style A fill:#e1f5fe
    style P fill:#c8e6c9
    style J fill:#ffcdd2
```

## HTTP Request Flow

### Overall Request Processing
```mermaid
flowchart TD
    A[HTTP Request] --> B[Route Matching]
    B --> C{Route Found?}
    C -->|No| D[Return 404 Not Found]
    C -->|Yes| E[Execute Handler Function]
    E --> F{Protected Route?}
    F -->|Yes| G[Check Authentication]
    F -->|No| H[Process Request]
    G --> I{Authenticated?}
    I -->|No| J[Return 401 Unauthorized]
    I -->|Yes| H
    H --> K[Generate Response]
    K --> L[Send HTTP Response]
    
    style A fill:#e1f5fe
    style L fill:#c8e6c9
    style D fill:#fff3e0
    style J fill:#ffcdd2
```

## API Endpoints Flow

### 1. Registration Endpoint Flow
```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant DB as Database
    
    C->>S: POST /api/register {email, password}
    S->>S: Validate Input
    S->>DB: Check if User Exists
    DB-->>S: User Status
    alt User Doesn't Exist
        S->>S: Hash Password
        S->>DB: Create User
        DB-->>S: User ID
        S->>DB: Create Session
        DB-->>S: Session UUID
        S->>C: Set-Cookie: session=UUID
        S-->>C: 200 OK {message: "ok"}
    else User Exists
        S-->>C: 409 Conflict {error: "User exists"}
    end
```

### 2. Login Endpoint Flow
```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant DB as Database
    
    C->>S: POST /api/login {email, password}
    S->>S: Validate Input
    S->>DB: Get User by Email
    DB-->>S: User Data
    S->>S: Verify Password
    alt Password Valid
        S->>S: Check Client Cookie
        alt Has Valid Session
            S->>DB: Refresh Session Expiry
            S-->>C: 200 OK {message: "ok"}
        else No Valid Session
            S->>DB: Check for Active Session
            alt Active Session Exists
                S->>C: Set-Cookie: existing session
                S-->>C: 200 OK {message: "ok"}
            else No Active Session
                S->>DB: Create New Session
                S->>C: Set-Cookie: new session
                S-->>C: 200 OK {message: "ok"}
            end
        end
    else Invalid Password
        S-->>C: 401 Unauthorized
    end
```

### 3. Protected Route Access Flow
```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant DB as Database
    
    C->>S: GET /api/homepage (with cookie)
    S->>S: Read Session Cookie
    alt Cookie Exists
        S->>DB: Get Session User
        DB-->>S: User Data
        alt Session Valid
            S-->>C: 200 OK {message, email}
        else Session Invalid/Expired
            S-->>C: 401 Unauthorized
        end
    else No Cookie
        S-->>C: 401 Unauthorized
    end
```

### 4. Logout Flow
```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant DB as Database
    
    C->>S: POST /api/logout (with cookie)
    S->>S: Read Session Cookie
    alt Cookie Exists
        S->>DB: Delete Session
        DB-->>S: Deletion Confirmed
        S->>C: Clear Cookie (MaxAge: -1)
        S-->>C: 200 OK {message: "logged out"}
    else No Cookie
        S-->>C: 400 Bad Request
    end
```

## Environment Configuration Flow

```mermaid
flowchart TD
    A[Application Start] --> B[Load .env File]
    B --> C[Parse Environment Variables]
    C --> D[POSTGRES_HOST]
    C --> E[POSTGRES_PORT]
    C --> F[POSTGRES_USER]
    C --> G[POSTGRES_PASSWORD]
    C --> H[POSTGRES_DB]
    C --> I[DATABASE_URL]
    C --> J[PORT]
    
    D --> K{DATABASE_URL Set?}
    E --> K
    F --> K
    G --> K
    H --> K
    
    K -->|No| L[Compose DATABASE_URL]
    K -->|Yes| M[Use Existing DATABASE_URL]
    
    L --> N[Add sslmode=disable for Dev]
    M --> O[Database Connection Ready]
    N --> O
    
    J --> P[Set Server Port]
    P --> Q[Default to 8080 if not set]
    
    style A fill:#e1f5fe
    style O fill:#c8e6c9
    style Q fill:#c8e6c9
```

## Database Migration Flow

```mermaid
flowchart TD
    A[Application Startup] --> B[Locate Migration Files]
    B --> C[Read 001_create_tables.sql]
    C --> D[Connect to Database]
    D --> E[Begin Transaction]
    E --> F[Enable uuid-ossp Extension]
    F --> G[Create Users Table]
    G --> H[Create Sessions Table]
    H --> I[Create Indexes]
    I --> J[Add Foreign Key Constraints]
    J --> K{All Operations Successful?}
    K -->|Yes| L[Commit Transaction]
    K -->|No| M[Rollback Transaction]
    L --> N[Migration Complete]
    M --> O[Migration Failed]
    
    style A fill:#e1f5fe
    style N fill:#c8e6c9
    style O fill:#ffcdd2
```

## Session Management Architecture

```mermaid
graph TB
    subgraph "Session Lifecycle Management"
        A[Session Creation]
        B[Session Validation]
        C[Session Refresh]
        D[Session Cleanup]
    end
    
    subgraph "Session Storage"
        E[Database Sessions Table]
        F[UUID Primary Key]
        G[User Foreign Key]
        H[Expiration Timestamp]
    end
    
    subgraph "Client-Side Storage"
        I[HTTP-Only Cookies]
        J[Secure Flag]
        K[SameSite Protection]
        L[Automatic Expiry]
    end
    
    A --> E
    B --> F
    C --> G
    D --> H
    E --> I
    F --> J
    G --> K
    H --> L
```

## Error Handling Flow

```mermaid
flowchart TD
    A[Request Processing] --> B{Error Occurred?}
    B -->|No| C[Success Response]
    B -->|Yes| D[Determine Error Type]
    D --> E{Validation Error?}
    D --> F{Authentication Error?}
    D --> G{Database Error?}
    D --> H{Server Error?}
    
    E -->|Yes| I[Return 400 Bad Request]
    F -->|Yes| J[Return 401 Unauthorized]
    G -->|Yes| K[Return 500 Internal Server Error]
    H -->|Yes| L[Return 500 Internal Server Error]
    
    I --> M[Log Error Details]
    J --> M
    K --> M
    L --> M
    
    style A fill:#e1f5fe
    style C fill:#c8e6c9
    style I fill:#fff3e0
    style J fill:#ffcdd2
    style K fill:#ffcdd2
    style L fill:#ffcdd2
```

## Production vs Development Configuration

### Development Environment
- `sslmode=disable` for local PostgreSQL
- Relaxed cookie security settings
- Detailed error logging
- Hot reload capabilities

### Production Environment
- SSL/TLS required for database connections
- Secure cookie flags enabled (HttpOnly, Secure, SameSite)
- Error logging without sensitive data exposure
- Environment variable validation

## Performance Considerations

### Database Connection Pooling
- Configurable maximum open connections
- Idle connection management
- Connection lifetime limits
- Automatic connection health checks

### Session Management Optimization
- Efficient session lookup by UUID
- Automatic cleanup of expired sessions
- Minimal database queries per request
- Cookie-based session storage (no server-side memory)