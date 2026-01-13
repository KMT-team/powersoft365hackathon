package checks

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"
)

type StandardResponse struct {
	ResponseMsg  string `json:"response_msg"`
	ResponseID   string `json:"response_id"`
	ResponseCode string `json:"response_code"`
	Verb         string `json:"verb"`
	Parm         string `json:"parm"`
}

var defaultClient = &http.Client{Timeout: 10 * time.Second}

// helper to GET and decode
func GetStatus(ctx context.Context, client *http.Client, rawurl string) (StandardResponse, error) {
	if client == nil {
		client = defaultClient
	}
	u, err := url.Parse(rawurl)
	if err != nil {
		return StandardResponse{}, fmt.Errorf("invalid url: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return StandardResponse{}, err
	}
	resp, err := client.Do(req)
	if err != nil {
		return StandardResponse{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return StandardResponse{}, fmt.Errorf("unexpected status %d", resp.StatusCode)
	}
	var result StandardResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return StandardResponse{}, err
	}
	return result, nil
}

// helper to POST JSON parm (builds URL safely)
func PostParm(ctx context.Context, client *http.Client, baseURL string, parm string) (StandardResponse, error) {
	if client == nil {
		client = defaultClient
	}
	u, err := url.Parse(baseURL)
	if err != nil {
		return StandardResponse{}, fmt.Errorf("invalid url: %w", err)
	}
	// If API expects parm as query parameter
	q := u.Query()
	q.Set("parm", parm)
	u.RawQuery = q.Encode()

	body := map[string]string{"parm": parm}
	buf := new(bytes.Buffer)
	if err := json.NewEncoder(buf).Encode(body); err != nil {
		return StandardResponse{}, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, u.String(), buf)
	if err != nil {
		return StandardResponse{}, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return StandardResponse{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return StandardResponse{}, fmt.Errorf("unexpected status %d", resp.StatusCode)
	}

	var result StandardResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return StandardResponse{}, err
	}
	return result, nil
}
