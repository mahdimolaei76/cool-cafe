package handler

import (
	"encoding/json"
	"log"
	"net/http"
)

type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// respondError sends a generic message to the client (so internals like
// SQL details never leak over the API) while logging the real cause
// server-side. Previously the underlying error was discarded entirely,
// so a 500 gave no way to tell whether it came from the DB, a bad query,
// or a code bug without adding ad-hoc log lines by hand.
func respondError(w http.ResponseWriter, status int, message string) {
	if status >= 500 {
		log.Printf("❌ %d %s", status, message)
	}
	respondJSON(w, status, ErrorResponse{
		Error:   http.StatusText(status),
		Message: message,
	})
}

// respondErrorWithCause is like respondError but also logs the original
// error value (e.g. a *pq.Error from the DB driver), which is what you
// actually need to tell a DB-side failure from a code bug.
func respondErrorWithCause(w http.ResponseWriter, status int, message string, cause error) {
	if status >= 500 {
		log.Printf("❌ %d %s: %v", status, message, cause)
	}
	respondJSON(w, status, ErrorResponse{
		Error:   http.StatusText(status),
		Message: message,
	})
}
