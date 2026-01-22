package handlers

import (
	"net/http"
	"path/filepath"
	"strings"
)

// ServePreLogin serves landing page and assets
func ServePreLogin(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/" || r.URL.Path == "/index.html" {
		http.ServeFile(w, r, "web/pre-login/index.html")
		return
	}

	if r.URL.Path == "/flow.js" {
		w.Header().Set("Content-Type", "application/javascript")
		http.ServeFile(w, r, "web/pre-login/flow.js")
		return
	}

	if strings.HasPrefix(r.URL.Path, "/assets/") {
		http.ServeFile(w, r, filepath.Join(".", r.URL.Path))
		return
	}

	http.NotFound(w, r)
}
