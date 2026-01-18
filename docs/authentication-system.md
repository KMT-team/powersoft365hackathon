# Authentication System Documentation

## Overview
This document explains the authentication and session management system for the Learning Platform, including user registration, login, logout, and session validation processes.

## Authentication Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        A[Web Browser]
        B[HTTP Requests]
        C[Session Cookies]
    end
    
    subgraph "Server Layer"
        D[HTTP Handlers]
        E[Password Validation]
        F[Session Management]
        G[Cookie Management]
    end
    
    subgraph "Database Layer"
        H[Users Table]
        I[Sessions Table]
    end
    
    A --> B
    B --> D
    D --> E
    D --> F
    F --> G
    G --> C
    E --> H
    F --> I
```

## Authentication Flows

### 1. User Registration Flow

```mermaid
flowchart TD
    A[POST /api/register] --> B[Parse JSON Request Body]
    B --> C[Validate Email Format]
    C --> D{Valid Email?}
    D -->|No| E[Return 400: Invalid Email]
    D -->|Yes| F[Validate Password Strength]
    F --> G{Strong Password?}
    G -->|No| H[Return 400: Weak Password]
    G -->|Yes| I[Check if User Exists]
    I --> J{User Exists?}
    J -->|Yes| K[Return 409: User Already Exists]
    J -->|No| L[Generate Salt]
    L --> M[Hash Password with bcrypt]
    M --> N[CreateUser in Database]
    N --> O[CreateSession for User]
    O --> P[Set Session Cookie]
    P --> Q[Return 200: Registration Success]
    
    style A fill:#e1f5fe
    style Q fill:#c8e6c9
    style E fill:#ffcdd2
    style H fill:#ffcdd2
    style K fill:#fff3e0
```

### 2. User Login Flow

```mermaid
flowchart TD
    A[POST /api/login] --> B[Parse JSON Request Body]
    B --> C[Validate Email Format]
    C --> D{Valid Email?}
    D -->|No| E[Return 400: Invalid Email]
    D -->|Yes| F[Get User by Email]
    F --> G{User Found?}
    G -->|No| H[Return 401: Invalid Credentials]
    G -->|Yes| I[Verify Password with bcrypt]
    I --> J{Password Valid?}
    J -->|No| H
    J -->|Yes| K[Check Client Session Cookie]
    K --> L{Has Valid Session Cookie?}
    L -->|Yes| M[Check if Session Active for User]
    L -->|No| N[Check for Existing Active Session]
    M --> O{Session Active?}
    O -->|Yes| P[Update Session Expiry]
    O -->|No| N
    N --> Q{Active Session Exists?}
    Q -->|Yes| R[Reuse Existing Session]
    Q -->|No| S[Create New Session]
    P --> T[Set Session Cookie]
    R --> T
    S --> T
    T --> U[Return 200: Login Success]
    
    style A fill:#e1f5fe
    style U fill:#c8e6c9
    style E fill:#ffcdd2
    style H fill:#ffcdd2
```

### 3. Session Validation Flow (CheckAuth)

```mermaid
flowchart TD
    A[Protected Route Request] --> B[Read Session Cookie]
    B --> C{Cookie Exists?}
    C -->|No| D[Return 401: Not Authenticated]
    C -->|Yes| E[GetSessionUser from Database]
    E --> F{Session Valid & Not Expired?}
    F -->|No| G[Return 401: Session Invalid]
    F -->|Yes| H[Return User Email & Continue]
    
    style A fill:#e1f5fe
    style H fill:#c8e6c9
    style D fill:#ffcdd2
    style G fill:#ffcdd2
```

### 4. User Logout Flow

```mermaid
flowchart TD
    A[POST /api/logout] --> B[Read Session Cookie]
    B --> C{Cookie Exists?}
    C -->|No| D[Return 400: No Active Session]
    C -->|Yes| E[DeleteSession from Database]
    E --> F[Clear Session Cookie]
    F --> G[Set Cookie MaxAge = -1]
    G --> H[Return 200: Logout Success]
    
    style A fill:#e1f5fe
    style H fill:#c8e6c9
    style D fill:#fff3e0
```

### 5. Homepage Access Flow

```mermaid
flowchart TD
    A[GET /api/homepage] --> B[Read Session Cookie]
    B --> C{Cookie Exists?}
    C -->|No| D[Return 401: Not Authenticated]
    C -->|Yes| E[GetSessionUser from Database]
    E --> F{Session Valid?}
    F -->|No| G[Return 401: Session Invalid]
    F -->|Yes| H[Return Welcome Message + Email]
    
    style A fill:#e1f5fe
    style H fill:#c8e6c9
    style D fill:#ffcdd2
    style G fill:#ffcdd2
```

## Password Security

### Password Hashing Process
```mermaid
flowchart LR
    A[Plain Password] --> B[Generate Random Salt]
    B --> C[Combine Password + Salt]
    C --> D[bcrypt Hash Function]
    D --> E[Store Hash + Salt in DB]
    
    style A fill:#ffebee
    style E fill:#c8e6c9
```

### Password Verification Process
```mermaid
flowchart LR
    A[Login Attempt] --> B[Retrieve Stored Hash + Salt]
    B --> C[Hash Candidate Password]
    C --> D[Compare Hashes]
    D --> E{Hashes Match?}
    E -->|Yes| F[Authentication Success]
    E -->|No| G[Authentication Failed]
    
    style A fill:#e1f5fe
    style F fill:#c8e6c9
    style G fill:#ffcdd2
```

## Session Management Strategy

### Session Lifecycle
```mermaid
stateDiagram-v2
    [*] --> Created: User Login/Register
    Created --> Active: Session Valid & Not Expired
    Active --> Refreshed: Update Expiry
    Refreshed --> Active
    Active --> Expired: Time Passes
    Active --> Deleted: User Logout
    Expired --> [*]
    Deleted --> [*]
```

### Session Reuse Logic
```mermaid
flowchart TD
    A[User Login Request] --> B{Client Has Session Cookie?}
    B -->|Yes| C[Check if Session Active for User]
    B -->|No| D[Check DB for Active Session]
    C --> E{Session Active?}
    E -->|Yes| F[Refresh Session Expiry]
    E -->|No| D
    D --> G{Active Session Found?}
    G -->|Yes| H[Reuse Existing Session]
    G -->|No| I[Create New Session]
    F --> J[Set Cookie & Return Success]
    H --> J
    I --> J
    
    style A fill:#e1f5fe
    style J fill:#c8e6c9
```

## Security Features

### Cookie Security Configuration
- **HttpOnly**: Prevents JavaScript access to cookies
- **Secure**: Ensures cookies only sent over HTTPS in production
- **SameSite**: Protects against CSRF attacks
- **Expiration**: Automatic cleanup of expired sessions

### Authentication Security Measures
1. **bcrypt Password Hashing**: Computationally expensive, salt-based hashing
2. **Session Expiration**: Time-limited sessions prevent indefinite access
3. **Single Active Session**: Prevents session proliferation per user
4. **Secure Cookie Handling**: Production-ready cookie security flags
5. **Input Validation**: Email format and password strength validation

### Validation Rules
- **Email**: Must be valid email format
- **Password**: Minimum strength requirements (length, complexity)
- **Session**: Must exist, belong to user, and not be expired