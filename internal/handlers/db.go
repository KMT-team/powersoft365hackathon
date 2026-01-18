package handlers

import (
	"database/sql"
	"os"
	"time"

	_ "github.com/lib/pq"
)

var db *sql.DB

// InitDB opens connection. Use environment var DATABASE_URL
func InitDB(dsn string) error {
	var err error
	db, err = sql.Open("postgres", dsn)
	if err != nil {
		return err
	}
	db.SetMaxOpenConns(10)
	db.SetConnMaxLifetime(time.Minute * 5)
	return db.Ping()
}

// ApplyMigrations reads a SQL file and executes it against the provided DSN.
// Useful to run migrations from Go (development).
func ApplyMigrations(dsn, sqlFilePath string) error {
	b, err := os.ReadFile(sqlFilePath)
	if err != nil {
		return err
	}
	tmpDB, err := sql.Open("postgres", dsn)
	if err != nil {
		return err
	}
	defer tmpDB.Close()
	// execute migration SQL (Postgres accepts multiple statements)
	_, err = tmpDB.Exec(string(b))
	return err
}

// CreateUser inserts a new user and returns its id
func CreateUser(email, passwordHash, salt string) (int, error) {
	var id int
	err := db.QueryRow(`INSERT INTO users (email, password_hash, salt) VALUES ($1,$2,$3) RETURNING id`, email, passwordHash, salt).Scan(&id)
	return id, err
}

// GetUserByEmail returns id, password_hash, salt
func GetUserByEmail(email string) (id int, passwordHash, salt string, err error) {
	err = db.QueryRow(`SELECT id,password_hash,salt FROM users WHERE email=$1`, email).Scan(&id, &passwordHash, &salt)
	return
}

// CreateSession creates a session and returns the session UUID string
func CreateSession(userID int, expires time.Time) (string, error) {
	var sid string
	err := db.QueryRow(`INSERT INTO sessions (user_id, expires_at) VALUES ($1,$2) RETURNING id`, userID, expires).Scan(&sid)
	return sid, err
}

// GetSessionUser returns user id and email for a valid session id
func GetSessionUser(sessionID string) (userID int, email string, err error) {
	err = db.QueryRow(`
        SELECT u.id, u.email
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = $1 AND s.expires_at > now()
    `, sessionID).Scan(&userID, &email)
	return
}

// DeleteSession deletes a session by id
func DeleteSession(sessionID string) error {
	_, err := db.Exec(`DELETE FROM sessions WHERE id = $1`, sessionID)
	return err
}

// GetActiveSessionByUser returns an active (non-expired) session id for a user if any
func GetActiveSessionByUser(userID int) (sessionID string, expiresAt time.Time, err error) {
	err = db.QueryRow(`
        SELECT id, expires_at
        FROM sessions
        WHERE user_id = $1 AND expires_at > now()
        ORDER BY created_at DESC
        LIMIT 1
    `, userID).Scan(&sessionID, &expiresAt)
	return
}

// UpdateSessionExpiry extends an existing session expiry
func UpdateSessionExpiry(sessionID string, expires time.Time) error {
	_, err := db.Exec(`UPDATE sessions SET expires_at = $1 WHERE id = $2`, expires, sessionID)
	return err
}
