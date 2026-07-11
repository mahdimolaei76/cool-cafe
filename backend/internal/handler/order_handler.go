package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

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
		respondErrorWithCause(w, http.StatusInternalServerError, "Failed to fetch orders", err)
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
		respondErrorWithCause(w, http.StatusInternalServerError, "Failed to create order", err)
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
		switch err {
		case service.ErrInvalidStatusTransition:
			respondError(w, http.StatusBadRequest, "تغییر وضعیت نامعتبر است")
		case service.ErrPaymentRequiredToDeliver:
			respondError(w, http.StatusBadRequest, "برای تحویل سفارش باید ابتدا پرداخت انجام شود")
		case service.ErrOrderLocked:
			respondError(w, http.StatusBadRequest, "این سفارش تحویل داده شده یا لغو شده و قابل تغییر نیست")
		case service.ErrCustomerNotFound:
			respondError(w, http.StatusNotFound, "مشتری‌ای با این شماره تلفن یافت نشد")
		case service.ErrCreditNotEnabled:
			respondError(w, http.StatusBadRequest, "این مشتری قابلیت پرداخت اعتباری ندارد")
		default:
			respondErrorWithCause(w, http.StatusInternalServerError, "Failed to update order status", err)
		}
		return
	}

	respondJSON(w, http.StatusOK, order)
}

// UpdateItemPriceRequest is the payload for setting a variable-priced
// order item's price during cashier processing/confirmation.
type UpdateItemPriceRequest struct {
	Price int64 `json:"price"`
}

// UpdateItemPrice handles PATCH /orders/{id}/items/{itemId}/price — a
// cashier entering the actual amount for a "قیمت بازار" style item.
func (h *OrderHandler) UpdateItemPrice(w http.ResponseWriter, r *http.Request) {
	orderID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid order ID")
		return
	}
	itemID, err := uuid.Parse(chi.URLParam(r, "itemId"))
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid order item ID")
		return
	}

	var input UpdateItemPriceRequest
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	order, err := h.orderService.UpdateItemPrice(r.Context(), orderID, itemID, input.Price)
	if err != nil {
		switch err {
		case service.ErrInvalidPrice:
			respondError(w, http.StatusBadRequest, "قیمت نمی‌تواند منفی باشد")
		case service.ErrItemNotVariablePriced:
			respondError(w, http.StatusBadRequest, "این قلم قیمت متغیر ندارد")
		case service.ErrOrderItemNotFound:
			respondError(w, http.StatusNotFound, "قلم سفارش یافت نشد")
		case service.ErrOrderLocked:
			respondError(w, http.StatusBadRequest, "این سفارش تحویل داده شده یا لغو شده و قابل تغییر نیست")
		default:
			respondErrorWithCause(w, http.StatusInternalServerError, "Failed to update item price", err)
		}
		return
	}

	respondJSON(w, http.StatusOK, order)
}

// UpdatePayment handles PATCH /orders/{id}/payment — the payment method
// dropdown, "پرداخت شد" checkbox, and "پرداخت اعتباری" checkbox shown in
// order status-change modals.
func (h *OrderHandler) UpdatePayment(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid order ID")
		return
	}

	var input service.UpdatePaymentInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	order, err := h.orderService.UpdatePayment(r.Context(), id, input)
	if err != nil {
		switch err {
		case service.ErrCreditPhoneRequired:
			respondError(w, http.StatusBadRequest, "برای پرداخت اعتباری، شماره تلفن مشتری الزامی است")
		case service.ErrCustomerNotFound:
			respondError(w, http.StatusNotFound, "مشتری‌ای با این شماره تلفن یافت نشد")
		case service.ErrCreditNotEnabled:
			respondError(w, http.StatusBadRequest, "این مشتری قابلیت پرداخت اعتباری ندارد")
		case service.ErrOrderLocked:
			respondError(w, http.StatusBadRequest, "این سفارش تحویل داده شده یا لغو شده و قابل تغییر نیست")
		default:
			respondErrorWithCause(w, http.StatusInternalServerError, "Failed to update order payment", err)
		}
		return
	}

	respondJSON(w, http.StatusOK, order)
}

// TrackOrderRequest is the payload for the public order-tracking lookup.
type TrackOrderRequest struct {
	TrackingCode string `json:"trackingCode"`
	Phone        string `json:"phone"`
}

// Track handles the public "track my order" lookup. It requires both the
// tracking code and the phone number used when the order was placed, so a
// tracking code alone (e.g. visible on a receipt) can't be used to pull up
// someone else's order.
func (h *OrderHandler) Track(w http.ResponseWriter, r *http.Request) {
	var input TrackOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	code := strings.ToUpper(strings.TrimSpace(input.TrackingCode))
	phone := strings.TrimSpace(input.Phone)

	if code == "" || phone == "" {
		respondError(w, http.StatusBadRequest, "کد پیگیری و شماره تماس الزامی است")
		return
	}

	order, err := h.orderService.TrackOrder(r.Context(), code, phone)
	if err != nil {
		respondError(w, http.StatusNotFound, "سفارشی با این مشخصات یافت نشد")
		return
	}

	respondJSON(w, http.StatusOK, order)
}
