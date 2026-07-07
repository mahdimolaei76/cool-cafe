package service

import (
	"context"
	"strings"

	"github.com/google/uuid"

	"github.com/coolcafe/backend/internal/domain"
	"github.com/coolcafe/backend/internal/repository"
)

type CategoryService struct {
	repo *repository.CategoryRepository
}

func NewCategoryService(repo *repository.CategoryRepository) *CategoryService {
	return &CategoryService{repo: repo}
}

func (s *CategoryService) List(ctx context.Context, activeOnly bool) ([]domain.Category, error) {
	if activeOnly {
		return s.repo.ListActive(ctx)
	}
	return s.repo.List(ctx)
}

func (s *CategoryService) Get(ctx context.Context, id uuid.UUID) (*domain.Category, error) {
	return s.repo.FindByID(ctx, id)
}

type CreateCategoryInput struct {
	Name      string `json:"name"`
	Icon      string `json:"icon"`
	SortOrder int    `json:"order"`
	IsActive  bool   `json:"isActive"`
}

func (s *CategoryService) Create(ctx context.Context, input CreateCategoryInput) (*domain.Category, error) {
	category := &domain.Category{
		Name:      input.Name,
		Slug:      generateSlug(input.Name),
		Icon:      input.Icon,
		SortOrder: input.SortOrder,
		IsActive:  input.IsActive,
	}

	if err := s.repo.Create(ctx, category); err != nil {
		return nil, err
	}

	return category, nil
}

type UpdateCategoryInput struct {
	Name      *string `json:"name"`
	Icon      *string `json:"icon"`
	SortOrder *int    `json:"order"`
	IsActive  *bool   `json:"isActive"`
}

func (s *CategoryService) Update(ctx context.Context, id uuid.UUID, input UpdateCategoryInput) (*domain.Category, error) {
	category, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if input.Name != nil {
		category.Name = *input.Name
		category.Slug = generateSlug(*input.Name)
	}
	if input.Icon != nil {
		category.Icon = *input.Icon
	}
	if input.SortOrder != nil {
		category.SortOrder = *input.SortOrder
	}
	if input.IsActive != nil {
		category.IsActive = *input.IsActive
	}

	if err := s.repo.Update(ctx, category); err != nil {
		return nil, err
	}

	return category, nil
}

func (s *CategoryService) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}

func (s *CategoryService) Reorder(ctx context.Context, orderedIDs []uuid.UUID) ([]domain.Category, error) {
	if err := s.repo.Reorder(ctx, orderedIDs); err != nil {
		return nil, err
	}
	return s.repo.List(ctx)
}

func generateSlug(name string) string {
	slug := strings.ToLower(name)
	slug = strings.ReplaceAll(slug, " ", "-")
	return slug
}
