# Database Operations Documentation

## Overview
This document explains the database layer operations for the Learning Platform authentication system, including connection management, migrations, and CRUD operations for users and sessions.

## Database Schema

### Tables Structure

```mermaid
erDiagram
    users {
        id SERIAL PK
        email VARCHAR UNIQUE
        password_hash VARCHAR
        salt VARCHAR
        created_at TIMESTAMP
    }
    
    sessions {
        id UUID PK
        user_id INTEGER FK
        expires_at TIMESTAMP
        created_at TIMESTAMP
    }
    
    users ||--o{ sessions : "has many"
```

## Database Functions Flow

### 1. Database Initialization Flow

```mermaid
flowchart TD
    A[Start: InitDB(dsn)] --> B[Open Database Connection]
    B --> C[Configure Connection Pool]
    C --> D[Set MaxOpenConns]
    D --> E[Set MaxIdleConns]
    E --> F[Set ConnMaxLifetime]
    F --> G[Ping Database]
    G --> H{Ping Successful?}
    H -->|Yes| I[Return DB Connection]
    H -->|No| J[Return Error]
    
    style A fill:#e1f5fe
    style I fill:#c8e6c9
    style J fill:#ffcdd2
```

### 2. Migration Application Flow

```mermaid
flowchart TD
    A[Start: ApplyMigrations(dsn, sqlFile)] --> B[Read SQL Migration File]
    B --> C[Open Database Connection]
    C --> D[Begin Transaction]
    D --> E[Execute SQL Statements]
    E --> F{Execution Successful?}
    F -->|Yes| G[Commit Transaction]
    F -->|No| H[Rollback Transaction]
    G --> I[Close Connection]
    H --> J[Return Error]
    I --> K[Return Success]
    
    style A fill:#e1f5fe
    style K fill:#c8e6c9
    style J fill:#ffcdd2
```

### 3. User Management Operations

#### Create User Flow
```mermaid
flowchart TD
    A[Start: CreateUser(email, passwordHash, salt)] --> B[Prepare SQL Statement]
    B --> C[Execute INSERT Query]
    C --> D{Insert Successful?}
    D -->|Yes| E[Get Generated User ID]
    D -->|No| F[Check for Duplicate Email]
    E --> G[Return User ID]
    F --> H{Email Already Exists?}
    H -->|Yes| I[Return Duplicate Error]
    H -->|No| J[Return Database Error]
    
    style A fill:#e1f5fe
    style G fill:#c8e6c9
    style I fill:#fff3e0
    style J fill:#ffcdd2
```

#### Get User by Email Flow
```mermaid
flowchart TD
    A[Start: GetUserByEmail(email)] --> B[Prepare SELECT Query]
    B --> C[Execute Query with Email Parameter]
    C --> D{User Found?}
    D -->|Yes| E[Scan Row Data]
    D -->|No| F[Return User Not Found Error]
    E --> G[Return ID, PasswordHash, Salt]
    
    style A fill:#e1f5fe
    style G fill:#c8e6c9
    style F fill:#fff3e0
```

### 4. Session Management Operations

#### Create Session Flow
```mermaid
flowchart TD
    A[Start: CreateSession(userID, expires)] --> B[Generate UUID for Session]
    B --> C[Prepare INSERT Statement]
    C --> D[Execute INSERT with UUID, UserID, Expires]
    D --> E{Insert Successful?}
    E -->|Yes| F[Return Session UUID]
    E -->|No| G[Return Database Error]
    
    style A fill:#e1f5fe
    style F fill:#c8e6c9
    style G fill:#ffcdd2
```

#### Get Session User Flow
```mermaid
flowchart TD
    A[Start: GetSessionUser(sessionID)] --> B[Prepare JOIN Query]
    B --> C[Execute Query: sessions JOIN users]
    C --> D[Check expires_at > NOW()]
    D --> E{Session Valid & Not Expired?}
    E -->|Yes| F[Scan UserID and Email]
    E -->|No| G[Return Session Invalid Error]
    F --> H[Return UserID, Email]
    
    style A fill:#e1f5fe
    style H fill:#c8e6c9
    style G fill:#fff3e0
```

#### Delete Session Flow
```mermaid
flowchart TD
    A[Start: DeleteSession(sessionID)] --> B[Prepare DELETE Statement]
    B --> C[Execute DELETE WHERE id = sessionID]
    C --> D{Delete Successful?}
    D -->|Yes| E[Return Success]
    D -->|No| F[Return Database Error]
    
    style A fill:#e1f5fe
    style E fill:#c8e6c9
    style F fill:#ffcdd2
```

#### Get Active Session by User Flow
```mermaid
flowchart TD
    A[Start: GetActiveSessionByUser(userID)] --> B[Prepare SELECT Query]
    B --> C[Execute: WHERE user_id = ? AND expires_at > NOW()]
    C --> D[ORDER BY created_at DESC LIMIT 1]
    D --> E{Active Session Found?}
    E -->|Yes| F[Return Session ID & Expires]
    E -->|No| G[Return No Active Session]
    
    style A fill:#e1f5fe
    style F fill:#c8e6c9
    style G fill:#fff3e0
```

#### Update Session Expiry Flow
```mermaid
flowchart TD
    A[Start: UpdateSessionExpiry(sessionID, expires)] --> B[Prepare UPDATE Statement]
    B --> C[Execute: SET expires_at = ? WHERE id = ?]
    C --> D{Update Successful?}
    D -->|Yes| E[Return Success]
    D -->|No| F[Return Database Error]
    
    style A fill:#e1f5fe
    style E fill:#c8e6c9
    style F fill:#ffcdd2
```

## Database Configuration

### Connection Pool Settings
- **MaxOpenConns**: Maximum number of open connections to the database
- **MaxIdleConns**: Maximum number of idle connections in the pool
- **ConnMaxLifetime**: Maximum amount of time a connection may be reused

### Security Considerations
- All queries use prepared statements to prevent SQL injection
- Password hashes are stored using bcrypt (never plain text)
- Sessions have expiration timestamps for automatic cleanup
- UUID-based session IDs provide cryptographic randomness

### Performance Optimizations
- Indexes on frequently queried columns (email, user_id, expires_at)
- Connection pooling for efficient resource usage
- Prepared statements for query plan caching