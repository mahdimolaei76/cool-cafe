package service

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/coolcafe/backend/internal/domain"
	"github.com/coolcafe/backend/internal/repository"
)

var (
	ErrInvalidStatusTransition = errors.New("invalid status transition")
)

type OrderService struct {
	repo *repository.OrderRepository
}

func NewOrderService(repo *repository.OrderRepository) *OrderService {
	return &OrderService{repo: repo}
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

type CreateOrderItemInput struct {
	MenuItemID *uuid.UUID `json:"menuItemId"`
	Name       string     `json:"name"`
	Price      int64      `json:"price"`
	Quantity   int        `json:"quantity"`
}

type CreateOrderInput struct {
	CustomerFirstName string                 `json:"customerFirstName"`
	CustomerLastName  string                 `json:"customerLastName"`
	CustomerPhone     string                 `json:"customerPhone"`
	Items             []CreateOrderItemInput `json:"items"`
	Discount          int64                  `json:"discount"`
	Notes             string                 `json:"notes"`
	OrderType         string                 `json:"orderType"`
	PaymentMethod     string                 `json:"paymentMethod"`
	CashierID         *uuid.UUID             `json:"cashierId"`
	CashierName       string                 `json:"cashier"`
}

func (s *OrderService) Create(ctx context.Context, input CreateOrderInput) (*domain.Order, error) {
	// Calculate totals
	var subtotal int64
	orderItems := make([]domain.OrderItem, len(input.Items))
	for i, item := range input.Items {
		itemSubtotal := item.Price * int64(item.Quantity)
		subtotal += itemSubtotal
		orderItems[i] = domain.OrderItem{
			MenuItemID: item.MenuItemID,
			Name:       item.Name,
			Price:      item.Price,
			Quantity:   item.Quantity,
			Subtotal:   itemSubtotal,
		}
	}

	total := subtotal - input.Discount
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

	order := &domain.Order{
		CustomerFirstName: input.CustomerFirstName,
		CustomerLastName:  input.CustomerLastName,
		CustomerPhone:     input.CustomerPhone,
		Items:             orderItems,
		Subtotal:          subtotal,
		Discount:          input.Discount,
		Total:             total,
		Notes:             input.Notes,
		Status:            domain.OrderStatusPending,
		OrderType:         orderType,
		PaymentMethod:     paymentMethod,
		CashierID:         input.CashierID,
		CashierName:       input.CashierName,
	}

	if err := s.repo.Create(ctx, order); err != nil {
		return nil, err
	}

	return order, nil
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

	return s.repo.FindByID(ctx, id)
}

func (s *OrderService) isValidStatusTransition(current, next string) bool {
	validTransitions := map[string][]string{
		domain.OrderStatusPending:   {domain.OrderStatusPreparing, domain.OrderStatusCancelled},
		domain.OrderStatusPreparing: {domain.OrderStatusReady, domain.OrderStatusCancelled},
		domain.OrderStatusReady:     {domain.OrderStatusDelivered, domain.OrderStatusCancelled},
		domain.OrderStatusDelivered: {},
		domain.OrderStatusCancelled: {},
	}

	allowed, ok := validTransitions[current]
	if !ok {
		return false
	}

	for _, s := range allowed {
		if s == next {
			return true
		}
	}

	return false
}
