package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/coolcafe/backend/internal/domain"
	"github.com/coolcafe/backend/internal/repository"
)

var (
	ErrCustomerPhoneRequired   = errors.New("phone is required")
	ErrCustomerPhoneTaken      = errors.New("phone already registered to another customer")
	ErrCustomerNotFound        = errors.New("customer not found")
	ErrCreditToggleWithDebt    = errors.New("credit balance must be settled (zero) before changing credit availability")
	ErrCreditNotEnabled        = errors.New("customer does not have credit payment enabled")
	ErrInvalidCreditAmount     = errors.New("amount must be greater than zero")
	ErrInvalidCreditAdjustKind = errors.New("invalid credit adjustment type")
)

type CustomerService struct {
	repo *repository.CustomerRepository
}

func NewCustomerService(repo *repository.CustomerRepository) *CustomerService {
	return &CustomerService{repo: repo}
}

type CustomerWithHistory struct {
	domain.Customer
	Orders []domain.Order `json:"orders"`
}

type ListCustomersParams struct {
	Search string
	Page   int
	PageSize int
}

type ListCustomersResult struct {
	Customers []domain.Customer `json:"customers"`
	Total     int               `json:"total"`
}

func (s *CustomerService) List(ctx context.Context, params ListCustomersParams) (*ListCustomersResult, error) {
	page := params.Page
	if page < 1 {
		page = 1
	}
	pageSize := params.PageSize
	if pageSize <= 0 {
		pageSize = 20
	}
	customers, total, err := s.repo.List(ctx, params.Search, pageSize, (page-1)*pageSize)
	if err != nil {
		return nil, err
	}
	return &ListCustomersResult{Customers: customers, Total: total}, nil
}

func (s *CustomerService) Get(ctx context.Context, id uuid.UUID) (*CustomerWithHistory, error) {
	customer, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	orders, err := s.repo.OrderHistory(ctx, customer.Phone)
	if err != nil {
		return nil, err
	}
	return &CustomerWithHistory{Customer: *customer, Orders: orders}, nil
}

type HistoryParams struct {
	DateFrom      *time.Time
	DateTo        *time.Time
	PaymentMethod string
	Page          int
	PageSize      int
}

type HistoryResult struct {
	Customer domain.Customer               `json:"customer"`
	Entries  []repository.HistoryEntry     `json:"entries"`
	Total    int                           `json:"total"`
}

// GetHistory returns the combined, filtered, paginated order+credit
// timeline shown in the "تاریخچه سفارشات" modal.
func (s *CustomerService) GetHistory(ctx context.Context, id uuid.UUID, params HistoryParams) (*HistoryResult, error) {
	customer, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	page := params.Page
	if page < 1 {
		page = 1
	}
	pageSize := params.PageSize
	if pageSize <= 0 {
		pageSize = 20
	}
	entries, total, err := s.repo.CombinedHistory(ctx, id, customer.Phone, repository.HistoryFilter{
		DateFrom:      params.DateFrom,
		DateTo:        params.DateTo,
		PaymentMethod: params.PaymentMethod,
		Limit:         pageSize,
		Offset:        (page - 1) * pageSize,
	})
	if err != nil {
		return nil, err
	}
	return &HistoryResult{Customer: *customer, Entries: entries, Total: total}, nil
}

// Lookup finds a customer by phone — used by the cashier checkout's
// "پرداخت اعتباری" checkbox and the credit-management modal to show the
// customer's current debt/credit before committing an order or adjustment.
func (s *CustomerService) Lookup(ctx context.Context, phone string) (*domain.Customer, error) {
	phone = strings.TrimSpace(phone)
	if phone == "" {
		return nil, ErrCustomerPhoneRequired
	}
	return s.repo.FindByPhone(ctx, phone)
}

type CustomerInput struct {
	Phone         string `json:"phone"`
	FirstName     string `json:"firstName"`
	LastName      string `json:"lastName"`
	CreditEnabled bool   `json:"creditEnabled"`
}

func (s *CustomerService) Create(ctx context.Context, input CustomerInput) (*domain.Customer, error) {
	phone := strings.TrimSpace(input.Phone)
	if phone == "" {
		return nil, ErrCustomerPhoneRequired
	}
	if existing, err := s.repo.FindByPhone(ctx, phone); err == nil && existing != nil {
		return nil, ErrCustomerPhoneTaken
	}

	customer := &domain.Customer{
		Phone:         phone,
		FirstName:     input.FirstName,
		LastName:      input.LastName,
		CreditEnabled: input.CreditEnabled,
		CreditBalance: 0,
	}
	if err := s.repo.Create(ctx, customer); err != nil {
		return nil, err
	}
	return customer, nil
}

func (s *CustomerService) Update(ctx context.Context, id uuid.UUID, input CustomerInput) (*domain.Customer, error) {
	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrCustomerNotFound
	}

	phone := strings.TrimSpace(input.Phone)
	if phone == "" {
		return nil, ErrCustomerPhoneRequired
	}
	if phone != existing.Phone {
		if other, err := s.repo.FindByPhone(ctx, phone); err == nil && other != nil && other.ID != id {
			return nil, ErrCustomerPhoneTaken
		}
	}

	// Credit availability can only change while the account is settled —
	// otherwise a debt/credit could be silently "hidden" by turning the
	// feature off without ever being collected/refunded.
	if input.CreditEnabled != existing.CreditEnabled && existing.CreditBalance != 0 {
		return nil, ErrCreditToggleWithDebt
	}

	existing.Phone = phone
	existing.FirstName = input.FirstName
	existing.LastName = input.LastName
	existing.CreditEnabled = input.CreditEnabled

	if err := s.repo.Update(ctx, existing); err != nil {
		return nil, err
	}
	return existing, nil
}

func (s *CustomerService) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}

// Credit adjustment kinds for the "تغییر مقدار بدهی" modal (shared by the
// admin customer page and the cashier's "مدیریت حساب اعتباری" modal).
const (
	CreditAdjustIncrease = domain.CreditHistoryIncrease // افزایش اعتبار — customer pays in advance
	CreditAdjustPurchase = domain.CreditHistoryPurchase // خرید جدید — manually record a purchase against credit
	CreditAdjustSettle   = domain.CreditHistorySettle   // تسویه حساب کامل — zero the balance out
)

func (s *CustomerService) AdjustCredit(ctx context.Context, id uuid.UUID, kind string, amount int64) (*domain.Customer, error) {
	customer, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrCustomerNotFound
	}
	if !customer.CreditEnabled {
		return nil, ErrCreditNotEnabled
	}

	switch kind {
	case CreditAdjustIncrease:
		if amount <= 0 {
			return nil, ErrInvalidCreditAmount
		}
		return s.repo.AdjustBalanceRecorded(ctx, id, amount, kind, nil, "افزایش اعتبار")
	case CreditAdjustPurchase:
		if amount <= 0 {
			return nil, ErrInvalidCreditAmount
		}
		return s.repo.AdjustBalanceRecorded(ctx, id, -amount, kind, nil, "خرید جدید")
	case CreditAdjustSettle:
		return s.repo.SetBalanceRecorded(ctx, id, 0, kind, "تسویه حساب کامل")
	default:
		return nil, ErrInvalidCreditAdjustKind
	}
}

// ChargeOrder deducts an order's total from the customer's credit
// balance. Called only once an order is actually delivered (not at
// creation/payment-selection time) — see OrderService.UpdateStatus.
func (s *CustomerService) ChargeOrder(ctx context.Context, phone string, amount int64, orderID uuid.UUID) (*domain.Customer, error) {
	customer, err := s.repo.FindByPhone(ctx, phone)
	if err != nil {
		return nil, ErrCustomerNotFound
	}
	if !customer.CreditEnabled {
		return nil, ErrCreditNotEnabled
	}
	return s.repo.AdjustBalanceRecorded(ctx, customer.ID, -amount, domain.CreditHistoryOrderCharge, &orderID, "کسر بابت تحویل سفارش")
}
