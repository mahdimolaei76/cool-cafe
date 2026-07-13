package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/coolcafe/backend/internal/service"
)

type MenuItemHandler struct {
	menuItemService *service.MenuItemService
}

func NewMenuItemHandler(menuItemService *service.MenuItemService) *MenuItemHandler {
	return &MenuItemHandler{menuItemService: menuItemService}
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

// ReorderItems handles PATCH /menu/reorder — receives an ordered list of
// item IDs and assigns sort_order 1..N to them in that sequence.
// This is a whole-category bulk update, so it's atomic: either all items
// get their new sort_order or none do (wrapped in a transaction inside
// the service).
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

// ListByCategory handles GET /menu/by-category/{categoryId} — returns
// items for a single category sorted by their current sort_order.
// Used by the category-edit modal to build the reorder list without
// having to download every item in the whole menu.
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
