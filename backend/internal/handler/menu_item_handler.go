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
