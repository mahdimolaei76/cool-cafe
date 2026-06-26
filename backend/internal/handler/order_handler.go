package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/coolcafe/backend/internal/service"
)

type OrderHandler struct {
	orderService *service.OrderService
}

func NewOrderHandler(orderService *service.OrderService) *OrderHandler {
	return &OrderHandler{orderService: orderService}
}

func (h *OrderHandler) List(w http.ResponseWriter, r *http.Request) {
	params := service.ListOrdersParams{
		Status: r.URL.Query().Get("status"),
		Limit:  50,
		Offset: 0,
	}

	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			params.Limit = limit
		}
	}

	if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil {
			params.Offset = offset
		}
	}

	result, err := h.orderService.List(r.Context(), params)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch orders")
		return
	}

	respondJSON(w, http.StatusOK, result)
}

func (h *OrderHandler) Get(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		// Try to find by order number
		order, err := h.orderService.GetByOrderNumber(r.Context(), idStr)
		if err != nil {
			respondError(w, http.StatusNotFound, "Order not found")
			return
		}
		respondJSON(w, http.StatusOK, order)
		return
	}

	order, err := h.orderService.Get(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "Order not found")
		return
	}

	respondJSON(w, http.StatusOK, order)
}

func (h *OrderHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input service.CreateOrderInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if len(input.Items) == 0 {
		respondError(w, http.StatusBadRequest, "Order must have at least one item")
		return
	}

	if input.CustomerFirstName == "" {
		input.CustomerFirstName = "مشتری"
	}

	order, err := h.orderService.Create(r.Context(), input)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create order")
		return
	}

	respondJSON(w, http.StatusCreated, order)
}

func (h *OrderHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid order ID")
		return
	}

	var input service.UpdateStatusInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	order, err := h.orderService.UpdateStatus(r.Context(), id, input)
	if err != nil {
		if err == service.ErrInvalidStatusTransition {
			respondError(w, http.StatusBadRequest, "Invalid status transition")
			return
		}
		respondError(w, http.StatusInternalServerError, "Failed to update order status")
		return
	}

	respondJSON(w, http.StatusOK, order)
}
