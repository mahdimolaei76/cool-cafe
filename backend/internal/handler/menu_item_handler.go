package handler

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/coolcafe/backend/internal/service"
)

type MenuItemHandler struct {
	menuItemService *service.MenuItemService
	// مسیر پوشه‌ای که فرانت از آن serve می‌شه (معمولاً ./static یا ./public)
	staticDir string
}

func NewMenuItemHandler(menuItemService *service.MenuItemService) *MenuItemHandler {
	// مسیر پیش‌فرض: ./static — می‌توان با متغیر محیطی STATIC_DIR تغییر داد
	staticDir := os.Getenv("STATIC_DIR")
	if staticDir == "" {
		staticDir = "./static"
	}
	return &MenuItemHandler{menuItemService: menuItemService, staticDir: staticDir}
}

func (h *MenuItemHandler) List(w http.ResponseWriter, r *http.Request) {
	availableOnly := r.URL.Query().Get("available") != "false"

	items, err := h.menuItemService.List(r.Context(), availableOnly)
	if err != nil {
		respondErrorWithCause(w, http.StatusInternalServerError, "Failed to fetch menu items", err)
		return
	}

	respondJSON(w, http.StatusOK, items)
}

func (h *MenuItemHandler) Get(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid menu item ID")
		return
	}

	item, err := h.menuItemService.Get(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "Menu item not found")
		return
	}

	respondJSON(w, http.StatusOK, item)
}

func (h *MenuItemHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input service.CreateMenuItemInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	item, err := h.menuItemService.Create(r.Context(), input)
	if err != nil {
		respondErrorWithCause(w, http.StatusInternalServerError, "Failed to create menu item", err)
		return
	}

	respondJSON(w, http.StatusCreated, item)
}

func (h *MenuItemHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid menu item ID")
		return
	}

	var input service.UpdateMenuItemInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	item, err := h.menuItemService.Update(r.Context(), id, input)
	if err != nil {
		respondErrorWithCause(w, http.StatusInternalServerError, "Failed to update menu item", err)
		return
	}

	respondJSON(w, http.StatusOK, item)
}

func (h *MenuItemHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid menu item ID")
		return
	}

	if err := h.menuItemService.Delete(r.Context(), id); err != nil {
		respondErrorWithCause(w, http.StatusInternalServerError, "Failed to delete menu item", err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *MenuItemHandler) ReorderItems(w http.ResponseWriter, r *http.Request) {
	var input struct {
		IDs []string `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if len(input.IDs) == 0 {
		respondError(w, http.StatusBadRequest, "ids array is required")
		return
	}
	if err := h.menuItemService.ReorderItems(r.Context(), input.IDs); err != nil {
		respondErrorWithCause(w, http.StatusInternalServerError, "Failed to reorder items", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *MenuItemHandler) ListByCategory(w http.ResponseWriter, r *http.Request) {
	catIDStr := chi.URLParam(r, "categoryId")
	catID, err := uuid.Parse(catIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid category ID")
		return
	}
	items, err := h.menuItemService.ListByCategory(r.Context(), catID)
	if err != nil {
		respondErrorWithCause(w, http.StatusInternalServerError, "Failed to fetch items", err)
		return
	}
	respondJSON(w, http.StatusOK, items)
}

// DefaultImages لیست فایل‌های عکس پیش‌فرض را از پوشه images/defaultMenuImages برمی‌گرداند.
// GET /api/menu/default-images  — عمومی، نیاز به توکن ندارد
func (h *MenuItemHandler) DefaultImages(w http.ResponseWriter, r *http.Request) {
	imagesDir := filepath.Join(h.staticDir, "images", "defaultMenuImages")

	entries, err := os.ReadDir(imagesDir)
	if err != nil {
		// اگه پوشه وجود نداشت آرایه خالی برمی‌گردانیم (نه خطا)
		respondJSON(w, http.StatusOK, map[string][]string{"images": {}})
		return
	}

	var images []string
	allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".gif": true}
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		ext := strings.ToLower(filepath.Ext(e.Name()))
		if allowed[ext] {
			images = append(images, e.Name())
		}
	}
	if images == nil {
		images = []string{}
	}

	respondJSON(w, http.StatusOK, map[string][]string{"images": images})
}
