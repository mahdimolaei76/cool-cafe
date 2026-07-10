package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/coolcafe/backend/internal/service"
)

type CustomerHandler struct {
	customerService *service.CustomerService
}

func NewCustomerHandler(customerService *service.CustomerService) *CustomerHandler {
	return &CustomerHandler{customerService: customerService}
}

func (h *CustomerHandler) List(w http.ResponseWriter, r *http.Request) {
	search := r.URL.Query().Get("search")
	customers, err := h.customerService.List(r.Context(), search)
	if err != nil {
		respondErrorWithCause(w, http.StatusInternalServerError, "Failed to fetch customers", err)
		return
	}
	respondJSON(w, http.StatusOK, customers)
}

// Lookup handles GET /customers/lookup?phone=... — used by the cashier
// checkout's credit-payment checkbox and the credit-management modal.
func (h *CustomerHandler) Lookup(w http.ResponseWriter, r *http.Request) {
	phone := r.URL.Query().Get("phone")
	customer, err := h.customerService.Lookup(r.Context(), phone)
	if err != nil {
		if err == service.ErrCustomerPhoneRequired {
			respondError(w, http.StatusBadRequest, "شماره تلفن الزامی است")
			return
		}
		respondError(w, http.StatusNotFound, "مشتری‌ای با این شماره یافت نشد")
		return
	}
	respondJSON(w, http.StatusOK, customer)
}

func (h *CustomerHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid customer ID")
		return
	}
	customer, err := h.customerService.Get(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "مشتری یافت نشد")
		return
	}
	respondJSON(w, http.StatusOK, customer)
}

func (h *CustomerHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input service.CustomerInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	customer, err := h.customerService.Create(r.Context(), input)
	if err != nil {
		h.respondCustomerErr(w, err)
		return
	}
	respondJSON(w, http.StatusCreated, customer)
}

func (h *CustomerHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid customer ID")
		return
	}
	var input service.CustomerInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	customer, err := h.customerService.Update(r.Context(), id, input)
	if err != nil {
		h.respondCustomerErr(w, err)
		return
	}
	respondJSON(w, http.StatusOK, customer)
}

func (h *CustomerHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid customer ID")
		return
	}
	if err := h.customerService.Delete(r.Context(), id); err != nil {
		respondErrorWithCause(w, http.StatusInternalServerError, "Failed to delete customer", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// AdjustCreditRequest is the payload for the "تغییر مقدار بدهی" modal.
type AdjustCreditRequest struct {
	Kind   string `json:"kind"`
	Amount int64  `json:"amount"`
}

func (h *CustomerHandler) AdjustCredit(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid customer ID")
		return
	}
	var input AdjustCreditRequest
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	customer, err := h.customerService.AdjustCredit(r.Context(), id, input.Kind, input.Amount)
	if err != nil {
		h.respondCustomerErr(w, err)
		return
	}
	respondJSON(w, http.StatusOK, customer)
}

func (h *CustomerHandler) respondCustomerErr(w http.ResponseWriter, err error) {
	switch err {
	case service.ErrCustomerPhoneRequired:
		respondError(w, http.StatusBadRequest, "شماره تلفن الزامی است")
	case service.ErrCustomerPhoneTaken:
		respondError(w, http.StatusConflict, "این شماره قبلاً برای مشتری دیگری ثبت شده است")
	case service.ErrCustomerNotFound:
		respondError(w, http.StatusNotFound, "مشتری یافت نشد")
	case service.ErrCreditToggleWithDebt:
		respondError(w, http.StatusBadRequest, "تا زمانی که حساب اعتباری مشتری صفر نشده، امکان تغییر وضعیت پرداخت اعتباری وجود ندارد")
	case service.ErrCreditNotEnabled:
		respondError(w, http.StatusBadRequest, "این مشتری قابلیت پرداخت اعتباری ندارد")
	case service.ErrInvalidCreditAmount:
		respondError(w, http.StatusBadRequest, "مبلغ باید بزرگتر از صفر باشد")
	case service.ErrInvalidCreditAdjustKind:
		respondError(w, http.StatusBadRequest, "نوع عملیات نامعتبر است")
	default:
		respondErrorWithCause(w, http.StatusInternalServerError, "Failed to process customer request", err)
	}
}
