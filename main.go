package main

import (
	"context"
	"fmt"
	"log"
	"net/url"
	"os"
	"time"

	"training-platform-api/api/checks"
	"training-platform-api/api/endpoints"

	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load() // prefer env overrides; errors not fatal

	apiKey := os.Getenv("API_KEY")
	if apiKey == "" {
		log.Fatal("API_KEY not set")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// build base URLs
	base := endpoints.BaseURL
	// check connection
	if _, err := checks.GetStatus(ctx, nil, base+endpoints.TestConnPath); err != nil {
		log.Fatalf("connection test failed: %v", err)
	}
	// login check
	loginURL := base + endpoints.TestLoginPath + "?token=" + url.QueryEscape(apiKey)
	if _, err := checks.GetStatus(ctx, nil, loginURL); err != nil {
		log.Fatalf("login test failed: %v", err)
	}
	// param post
	if _, err := checks.PostParm(ctx, nil, base+endpoints.TestParmPath, "test"); err != nil {
		log.Fatalf("parm test failed: %v", err)
	}

	fmt.Println("API Connection Successful")
}
