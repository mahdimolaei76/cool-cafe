package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/coolcafe/backend/internal/service"
)

type CategoryHandler struct {
	categoryService *service.CategoryService
}

func NewCategoryHandler(categoryService *service.CategoryService) *CategoryHandler {
	return &CategoryHandler{categoryService: categoryService}
}

func (h *CategoryHandler) List(w http.ResponseWriter, r *http.Request) {
	activeOnly := r.URL.Query().Get("active") == "true"

	categories, err := h.categoryService.List(r.Context(), activeOnly)
	if err != nil {
		respondErrorWithCause(w, http.StatusInternalServerError, "Failed to fetch categories", err)
		return
	}

	respondJSON(w, http.StatusOK, categories)
}

func (h *CategoryHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input service.CreateCategoryInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	category, err := h.categoryService.Create(r.Context(), input)
	if err != nil {
		respondErrorWithCause(w, http.StatusInternalServerError, "Failed to create category", err)
		return
	}

	respondJSON(w, http.StatusCreated, category)
}

func (h *CategoryHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid category ID")
		return
	}

	var input service.UpdateCategoryInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	category, err := h.categoryService.Update(r.Context(), id, input)
	if err != nil {
		respondErrorWithCause(w, http.StatusInternalServerError, "Failed to update category", err)
		return
	}

	respondJSON(w, http.StatusOK, category)
}

func (h *CategoryHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid category ID")
		return
	}

	if err := h.categoryService.Delete(r.Context(), id); err != nil {
		respondErrorWithCause(w, http.StatusInternalServerError, "Failed to delete category", err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *CategoryHandler) Reorder(w http.ResponseWriter, r *http.Request) {
	var input struct {
		IDs []string `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	ids := make([]uuid.UUID, 0, len(input.IDs))
	for _, s := range input.IDs {
		id, err := uuid.Parse(s)
		if err != nil {
			respondError(w, http.StatusBadRequest, "Invalid category ID in list")
			return
		}
		ids = append(ids, id)
	}

	categories, err := h.categoryService.Reorder(r.Context(), ids)
	if err != nil {
		respondErrorWithCause(w, http.StatusInternalServerError, "Failed to reorder categories", err)
		return
	}

	respondJSON(w, http.StatusOK, categories)
}
