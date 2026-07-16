package service

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/coolcafe/backend/internal/domain"
	"github.com/coolcafe/backend/internal/repository"
)

var (
	ErrInvalidStatusTransition   = errors.New("invalid status transition")
	ErrInvalidPrice              = errors.New("price must not be negative")
	ErrItemNotVariablePriced     = errors.New("order item does not have a variable price")
	ErrOrderItemNotFound         = errors.New("order item not found")
	ErrCreditPhoneRequired       = errors.New("customer phone is required for credit payment")
	ErrOrderLocked               = errors.New("order has been delivered/cancelled and can no longer be changed")
	ErrPaymentRequiredToDeliver  = errors.New("order must be marked as paid before it can be delivered")
)

type OrderService struct {
	repo            *repository.OrderRepository
	customerService *CustomerService
}

func NewOrderService(repo *repository.OrderRepository, customerService *CustomerService) *OrderService {
	return &OrderService{repo: repo, customerService: customerService}
}

type ListOrdersParams struct {
	Status string
	Limit  int
	Offset int
}

type ListOrdersResult struct {
	Orders []domain.Order `json:"orders"`
	Total  int            `json:"total"`
}

func (s *OrderService) List(ctx context.Context, params ListOrdersParams) (*ListOrdersResult, error) {
	if params.Limit == 0 {
		params.Limit = 50
	}

	if params.Status != "" {
		orders, err := s.repo.ListByStatus(ctx, params.Status)
		if err != nil {
			return nil, err
		}
		return &ListOrdersResult{
			Orders: orders,
			Total:  len(orders),
		}, nil
	}

	orders, total, err := s.repo.List(ctx, params.Limit, params.Offset)
	if err != nil {
		return nil, err
	}

	return &ListOrdersResult{
		Orders: orders,
		Total:  total,
	}, nil
}

func (s *OrderService) Get(ctx context.Context, id uuid.UUID) (*domain.Order, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *OrderService) GetByOrderNumber(ctx context.Context, orderNumber string) (*domain.Order, error) {
	return s.repo.FindByOrderNumber(ctx, orderNumber)
}

// TrackOrder looks up an order by tracking code + phone number for the
// public "track my order" page. Requiring both prevents anyone who merely
// sees a tracking code (e.g. on a printed receipt left on a table) from
// pulling up someone else's order details.
func (s *OrderService) TrackOrder(ctx context.Context, trackingCode, phone string) (*domain.Order, error) {
	return s.repo.FindByTrackingCodeAndPhone(ctx, trackingCode, phone)
}

type CreateOrderItemInput struct {
	MenuItemID *uuid.UUID `json:"menuItemId"`
	Name       string     `json:"name"`
	Price      int64      `json:"price"`
	Quantity   int        `json:"quantity"`
	// IsPriceVariable/PriceConfirmed/PriceLabel mirror domain.OrderItem —
	// carried from the client (which copies them from the menu item's
	// priceType at add-to-cart time) so a "قیمت بازار" item ordered
	// without a price yet is correctly tracked as unconfirmed instead of
	// silently being saved as a normal ۰-price line.
	IsPriceVariable bool   `json:"isPriceVariable"`
	PriceConfirmed  bool   `json:"priceConfirmed"`
	PriceLabel      string `json:"priceLabel"`
}

type CreateOrderInput struct {
	CustomerFirstName string                 `json:"customerFirstName"`
	CustomerLastName  string                 `json:"customerLastName"`
	CustomerPhone     string                 `json:"customerPhone"`
	Items             []CreateOrderItemInput `json:"items"`
	Discount          int64                  `json:"discount"`
	ServiceCharge     int64                  `json:"serviceCharge"`
	Notes             string                 `json:"notes"`
	OrderType         string                 `json:"orderType"`
	IsTakeaway        bool                   `json:"isTakeaway"`
	PaymentMethod     string                 `json:"paymentMethod"`
	PaidByCredit      bool                   `json:"paidByCredit"`
	IsPaid            bool                   `json:"isPaid"`
	CashierID         *uuid.UUID             `json:"cashierId"`
	CashierName       string                 `json:"cashier"`
}

func (s *OrderService) Create(ctx context.Context, input CreateOrderInput) (*domain.Order, error) {
	// Calculate totals
	var subtotal int64
	orderItems := make([]domain.OrderItem, len(input.Items))
	for i, item := range input.Items {
		itemSubtotal := item.Price * int64(item.Quantity)

		// Fixed-price items are always confirmed regardless of what the
		// client sent — only a genuinely variable item can be unconfirmed.
		priceConfirmed := item.PriceConfirmed || !item.IsPriceVariable

		// Unconfirmed variable-priced lines don't count toward the order
		// total yet — same rule UpdateItemPrice uses when recomputing
		// after the cashier later enters the real price.
		if priceConfirmed {
			subtotal += itemSubtotal
		}

		orderItems[i] = domain.OrderItem{
			MenuItemID:      item.MenuItemID,
			Name:            item.Name,
			Price:           item.Price,
			Quantity:        item.Quantity,
			Subtotal:        itemSubtotal,
			IsPriceVariable: item.IsPriceVariable,
			PriceConfirmed:  priceConfirmed,
			PriceLabel:      item.PriceLabel,
		}
	}

	total := subtotal - input.Discount + input.ServiceCharge
	if total < 0 {
		total = 0
	}

	// Set defaults
	orderType := input.OrderType
	if orderType == "" {
		orderType = domain.OrderTypeInPerson
	}

	paymentMethod := input.PaymentMethod
	if paymentMethod == "" {
		paymentMethod = domain.PaymentMethodCash
	}

	paidByCredit := input.PaidByCredit || paymentMethod == domain.PaymentMethodCredit
	if paidByCredit && input.CustomerPhone == "" {
		return nil, ErrCreditPhoneRequired
	}
	if paidByCredit {
		// Just verify the customer exists & has credit enabled — the
		// actual balance deduction is deferred until delivery.
		customer, err := s.customerService.Lookup(ctx, input.CustomerPhone)
		if err != nil || customer == nil {
			return nil, ErrCustomerNotFound
		}
		if !customer.CreditEnabled {
			return nil, ErrCreditNotEnabled
		}
		paymentMethod = domain.PaymentMethodCredit
	}

	order := &domain.Order{
		CustomerFirstName: input.CustomerFirstName,
		CustomerLastName:  input.CustomerLastName,
		CustomerPhone:     input.CustomerPhone,
		Items:             orderItems,
		Subtotal:          subtotal,
		Discount:          input.Discount,
		ServiceCharge:     input.ServiceCharge,
		Total:             total,
		Notes:             input.Notes,
		Status:            domain.OrderStatusPending,
		OrderType:         orderType,
		IsTakeaway:        input.IsTakeaway,
		PaymentMethod:     paymentMethod,
		PaidByCredit:      paidByCredit,
		IsPaid:            input.IsPaid,
		CashierID:         input.CashierID,
		CashierName:       input.CashierName,
	}

	if err := s.repo.Create(ctx, order); err != nil {
		return nil, err
	}

	return order, nil
}

type UpdatePaymentInput struct {
	PaymentMethod string `json:"paymentMethod"`
	IsPaid        bool   `json:"isPaid"`
	PaidByCredit  bool   `json:"paidByCredit"`
}

// UpdatePayment lets a cashier/admin set the payment method, "پرداخت شد"
// flag, and credit-payment flag from an order's status-change modal.
// Every change here is saved immediately, but it's only a *selection* —
// the customer's credit balance itself is only actually charged once the
// order is delivered (see UpdateStatus). Locked entirely once the order
// has reached a final state (delivered/cancelled).
func (s *OrderService) UpdatePayment(ctx context.Context, id uuid.UUID, input UpdatePaymentInput) (*domain.Order, error) {
	order, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if order.Status == domain.OrderStatusDelivered || order.Status == domain.OrderStatusCancelled {
		return nil, ErrOrderLocked
	}

	paymentMethod := input.PaymentMethod
	if paymentMethod == "" {
		paymentMethod = order.PaymentMethod
	}

	paidByCredit := input.PaidByCredit || paymentMethod == domain.PaymentMethodCredit
	if paidByCredit {
		if order.CustomerPhone == "" {
			return nil, ErrCreditPhoneRequired
		}
		customer, err := s.customerService.Lookup(ctx, order.CustomerPhone)
		if err != nil || customer == nil {
			return nil, ErrCustomerNotFound
		}
		if !customer.CreditEnabled {
			return nil, ErrCreditNotEnabled
		}
	}

	if err := s.repo.UpdatePayment(ctx, id, paymentMethod, input.IsPaid, paidByCredit); err != nil {
		return nil, err
	}

	return s.repo.FindByID(ctx, id)
}

type UpdateStatusInput struct {
	Status string `json:"status"`
	Note   string `json:"note"`
}

func (s *OrderService) UpdateStatus(ctx context.Context, id uuid.UUID, input UpdateStatusInput) (*domain.Order, error) {
	order, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Validate status transition
	if !s.isValidStatusTransition(order.Status, input.Status) {
		return nil, ErrInvalidStatusTransition
	}

	if err := s.repo.UpdateStatus(ctx, id, input.Status, input.Note); err != nil {
		return nil, err
	}

	// Only now — at the moment of actual delivery — does a credit-paid
	// order's amount get charged against the customer's credit account.
	// Before this point the UI only *shows* what the charge would be.
	if input.Status == domain.OrderStatusDelivered && order.PaidByCredit && order.CustomerPhone != "" {
		if _, err := s.customerService.ChargeOrder(ctx, order.CustomerPhone, order.Total, order.ID); err != nil {
			return nil, err
		}
	}

	return s.repo.FindByID(ctx, id)
}

// UpdateItemPrice lets a cashier set the price of a 'variable' priced
// order item (e.g. "قیمت بازار") when processing or confirming the
// order. The item must actually belong to the given order and must be
// a variable-priced, not-yet-confirmed line — this prevents accidentally
// overwriting an already-fixed price via the wrong endpoint.
func (s *OrderService) UpdateItemPrice(ctx context.Context, orderID, itemID uuid.UUID, unitPrice int64) (*domain.Order, error) {
	if unitPrice < 0 {
		return nil, ErrInvalidPrice
	}

	order, err := s.repo.FindByID(ctx, orderID)
	if err != nil {
		return nil, err
	}

	if order.Status == domain.OrderStatusDelivered || order.Status == domain.OrderStatusCancelled {
		return nil, ErrOrderLocked
	}

	var found bool
	for _, item := range order.Items {
		if item.ID == itemID {
			found = true
			if !item.IsPriceVariable {
				return nil, ErrItemNotVariablePriced
			}
			break
		}
	}
	if !found {
		return nil, ErrOrderItemNotFound
	}

	if err := s.repo.UpdateItemPrice(ctx, orderID, itemID, unitPrice); err != nil {
		return nil, err
	}

	return s.repo.FindByID(ctx, orderID)
}

// isValidStatusTransition allows moving directly to any status from any
// non-terminal status (e.g. skipping straight from "pending" to
// "delivered" without passing through "preparing"/"ready" first) — the
// cashier/admin may legitimately need to correct or fast-forward an
// order's status. Once an order is delivered or cancelled, though, it's
// terminal: those are final states used for financial reporting and
// shouldn't be reopened from here.
func (s *OrderService) isValidStatusTransition(current, next string) bool {
	if current == next {
		return false
	}

	terminal := map[string]bool{
		domain.OrderStatusDelivered: true,
		domain.OrderStatusCancelled: true,
	}
	if terminal[current] {
		return false
	}

	validNext := map[string]bool{
		domain.OrderStatusPending:   true,
		domain.OrderStatusPreparing: true,
		domain.OrderStatusReady:     true,
		domain.OrderStatusDelivered: true,
		domain.OrderStatusCancelled: true,
	}
	return validNext[next]
}

// UpdateTotal sets a manual price override on an order.
func (s *OrderService) UpdateTotal(ctx context.Context, orderID uuid.UUID, newTotal int64, cashierName string) (*domain.Order, error) {
	order, err := s.repo.FindByID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	if order.Status == domain.OrderStatusDelivered || order.Status == domain.OrderStatusCancelled {
		return nil, ErrOrderLocked
	}
	if err := s.repo.UpdateTotal(ctx, orderID, newTotal, cashierName); err != nil {
		return nil, err
	}
	return s.repo.FindByID(ctx, orderID)
}

// UpdateServiceCharge sets the service charge on an order and recalculates total.
func (s *OrderService) UpdateServiceCharge(ctx context.Context, orderID uuid.UUID, serviceCharge int64, cashierName string) (*domain.Order, error) {
	order, err := s.repo.FindByID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	if order.Status == domain.OrderStatusDelivered || order.Status == domain.OrderStatusCancelled {
		return nil, ErrOrderLocked
	}
	if err := s.repo.UpdateServiceCharge(ctx, orderID, serviceCharge, cashierName); err != nil {
		return nil, err
	}
	return s.repo.FindByID(ctx, orderID)
}

// UpdateItemServiceCharge sets the service charge on a specific order item.
func (s *OrderService) UpdateItemServiceCharge(ctx context.Context, orderID, itemID uuid.UUID, serviceCharge int64, cashierName string) (*domain.Order, error) {
	order, err := s.repo.FindByID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	if order.Status == domain.OrderStatusDelivered || order.Status == domain.OrderStatusCancelled {
		return nil, ErrOrderLocked
	}
	if err := s.repo.UpdateItemServiceCharge(ctx, orderID, itemID, serviceCharge, cashierName); err != nil {
		return nil, err
	}
	return s.repo.FindByID(ctx, orderID)
}
