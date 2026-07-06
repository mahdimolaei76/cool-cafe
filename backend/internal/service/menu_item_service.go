package service

import (
	"context"

	"github.com/google/uuid"

	"github.com/coolcafe/backend/internal/domain"
	"github.com/coolcafe/backend/internal/repository"
)

type MenuItemService struct {
	repo *repository.MenuItemRepository
}

func NewMenuItemService(repo *repository.MenuItemRepository) *MenuItemService {
	return &MenuItemService{repo: repo}
}

func (s *MenuItemService) List(ctx context.Context, availableOnly bool) ([]domain.MenuItem, error) {
	if availableOnly {
		return s.repo.ListAvailable(ctx)
	}
	return s.repo.List(ctx)
}

func (s *MenuItemService) Get(ctx context.Context, id uuid.UUID) (*domain.MenuItem, error) {
	return s.repo.FindByID(ctx, id)
}

type CreateMenuItemInput struct {
	Name        string     `json:"name"`
	Description string     `json:"description"`
	Price       int64      `json:"price"`
	// PriceType: "fixed" (default) or "variable" (e.g. "قیمت بازار" —
	// no set price; the cashier enters the amount per order instead).
	PriceType   string     `json:"priceType"`
	PriceLabel  string     `json:"priceLabel"`
	CategoryID  *uuid.UUID `json:"categoryId"`
	ImageURL    string     `json:"image"`
	IsAvailable bool       `json:"isAvailable"`
	IsFeatured  bool       `json:"isFeatured"`
}

func (s *MenuItemService) Create(ctx context.Context, input CreateMenuItemInput) (*domain.MenuItem, error) {
	priceType := input.PriceType
	if priceType != "variable" {
		priceType = "fixed" // default/backward-compatible for older clients that don't send this field
	}

	item := &domain.MenuItem{
		Name:        input.Name,
		Description: input.Description,
		Price:       input.Price,
		PriceType:   priceType,
		PriceLabel:  input.PriceLabel,
		CategoryID:  input.CategoryID,
		ImageURL:    input.ImageURL,
		IsAvailable: input.IsAvailable,
		IsFeatured:  input.IsFeatured,
	}

	if err := s.repo.Create(ctx, item); err != nil {
		return nil, err
	}

	return item, nil
}

type UpdateMenuItemInput struct {
	Name        *string    `json:"name"`
	Description *string    `json:"description"`
	Price       *int64     `json:"price"`
	PriceType   *string    `json:"priceType"`
	PriceLabel  *string    `json:"priceLabel"`
	CategoryID  *uuid.UUID `json:"categoryId"`
	ImageURL    *string    `json:"image"`
	IsAvailable *bool      `json:"isAvailable"`
	IsFeatured  *bool      `json:"isFeatured"`
}

func (s *MenuItemService) Update(ctx context.Context, id uuid.UUID, input UpdateMenuItemInput) (*domain.MenuItem, error) {
	item, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if input.Name != nil {
		item.Name = *input.Name
	}
	if input.Description != nil {
		item.Description = *input.Description
	}
	if input.Price != nil {
		item.Price = *input.Price
	}
	if input.PriceType != nil && (*input.PriceType == "fixed" || *input.PriceType == "variable") {
		item.PriceType = *input.PriceType
	}
	if input.PriceLabel != nil {
		item.PriceLabel = *input.PriceLabel
	}
	if input.CategoryID != nil {
		item.CategoryID = input.CategoryID
	}
	if input.ImageURL != nil {
		item.ImageURL = *input.ImageURL
	}
	if input.IsAvailable != nil {
		item.IsAvailable = *input.IsAvailable
	}
	if input.IsFeatured != nil {
		item.IsFeatured = *input.IsFeatured
	}

	if err := s.repo.Update(ctx, item); err != nil {
		return nil, err
	}

	return item, nil
}

func (s *MenuItemService) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}
