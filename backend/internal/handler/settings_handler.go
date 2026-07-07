package handler

import (
	"encoding/json"
	"net/http"

	"github.com/coolcafe/backend/internal/service"
)

type SettingsHandler struct {
	settingsService *service.SettingsService
}

func NewSettingsHandler(settingsService *service.SettingsService) *SettingsHandler {
	return &SettingsHandler{settingsService: settingsService}
}

// Get is public — the café's name/phone/address are shown on the public
// menu sidebar, not just the admin settings page.
func (h *SettingsHandler) Get(w http.ResponseWriter, r *http.Request) {
	settings, err := h.settingsService.Get(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch settings")
		return
	}
	respondJSON(w, http.StatusOK, settings)
}

// Update is admin-only (see route registration).
func (h *SettingsHandler) Update(w http.ResponseWriter, r *http.Request) {
	var input service.UpdateSettingsInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	settings, err := h.settingsService.Update(r.Context(), input)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update settings")
		return
	}

	respondJSON(w, http.StatusOK, settings)
}
