package service

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"

	"github.com/coolcafe/backend/internal/domain"
	"github.com/coolcafe/backend/internal/repository"
)

var (
	ErrCustomerPhoneRequired  = errors.New("phone is required")
	ErrCustomerPhoneTaken     = errors.New("phone already registered to another customer")
	ErrCustomerNotFound       = errors.New("customer not found")
	ErrCreditToggleWithDebt   = errors.New("credit balance must be settled (zero) before changing credit availability")
	ErrCreditNotEnabled       = errors.New("customer does not have credit payment enabled")
	ErrInvalidCreditAmount    = errors.New("amount must be greater than zero")
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

func (s *CustomerService) List(ctx context.Context, search string) ([]domain.Customer, error) {
	return s.repo.List(ctx, search)
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
	CreditAdjustIncrease = "increase" // افزایش اعتبار — customer pays in advance
	CreditAdjustPurchase = "purchase" // خرید جدید — manually record a purchase against credit
	CreditAdjustSettle   = "settle"   // تسویه کامل بدهی — zero the balance out
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
		return s.repo.AdjustBalance(ctx, id, amount)
	case CreditAdjustPurchase:
		if amount <= 0 {
			return nil, ErrInvalidCreditAmount
		}
		return s.repo.AdjustBalance(ctx, id, -amount)
	case CreditAdjustSettle:
		return s.repo.SetBalance(ctx, id, 0)
	default:
		return nil, ErrInvalidCreditAdjustKind
	}
}

// ChargeOrder deducts an order's total from the customer's credit
// balance (called when an order is paid via پرداخت اعتباری). The
// customer must exist and have credit payment enabled.
func (s *CustomerService) ChargeOrder(ctx context.Context, phone string, amount int64) (*domain.Customer, error) {
	customer, err := s.repo.FindByPhone(ctx, phone)
	if err != nil {
		return nil, ErrCustomerNotFound
	}
	if !customer.CreditEnabled {
		return nil, ErrCreditNotEnabled
	}
	return s.repo.AdjustBalance(ctx, customer.ID, -amount)
}
