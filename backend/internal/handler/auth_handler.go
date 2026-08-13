package handler

import (
	"encoding/json"
	"net/http"

	"github.com/coolcafe/backend/internal/middleware"
	"github.com/coolcafe/backend/internal/service"
)

type AuthHandler struct {
	authService *service.AuthService
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refreshToken"`
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Username == "" || req.Password == "" {
		respondError(w, http.StatusBadRequest, "Username and password are required")
		return
	}

	result, err := h.authService.Login(r.Context(), req.Username, req.Password)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "نام کاربری یا رمز عبور اشتباه است")
		return
	}

	respondJSON(w, http.StatusOK, result)
}

// Refresh یک access token جدید (و refresh token چرخشی) صادر می‌کند.
// اگه refresh token نامعتبر/منقضی بود → 401 (فرانت باید به لاگین بره)
func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.RefreshToken == "" {
		respondError(w, http.StatusBadRequest, "refreshToken is required")
		return
	}

	result, err := h.authService.Refresh(r.Context(), req.RefreshToken)
	if err != nil {
		// 401 → فرانت می‌فهمه که باید به صفحه لاگین بره
		respondError(w, http.StatusUnauthorized, "نشست شما منقضی شده. لطفاً دوباره وارد شوید.")
		return
	}

	respondJSON(w, http.StatusOK, result)
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	user, err := h.authService.GetUserByID(r.Context(), userID)
	if err != nil {
		respondError(w, http.StatusNotFound, "User not found")
		return
	}

	respondJSON(w, http.StatusOK, user)
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	if userID, ok := middleware.GetUserID(r.Context()); ok {
		h.authService.Logout(r.Context(), userID)
	}
	respondJSON(w, http.StatusOK, map[string]string{"message": "Logged out successfully"})
}
