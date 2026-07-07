package service

import (
	"context"

	"github.com/coolcafe/backend/internal/domain"
	"github.com/coolcafe/backend/internal/repository"
)

type SettingsService struct {
	repo *repository.SettingsRepository
}

func NewSettingsService(repo *repository.SettingsRepository) *SettingsService {
	return &SettingsService{repo: repo}
}

func (s *SettingsService) Get(ctx context.Context) (*domain.Settings, error) {
	return s.repo.Get(ctx)
}

type UpdateSettingsInput struct {
	Name    string `json:"name"`
	Phone   string `json:"phone"`
	Email   string `json:"email"`
	Address string `json:"address"`
}

func (s *SettingsService) Update(ctx context.Context, input UpdateSettingsInput) (*domain.Settings, error) {
	return s.repo.Update(ctx, &domain.Settings{
		Name:    input.Name,
		Phone:   input.Phone,
		Email:   input.Email,
		Address: input.Address,
	})
}
