package service

import (
	"context"
	"encoding/json"

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
	Name         string          `json:"name"`
	Phone        string          `json:"phone"`
	Email        string          `json:"email"`
	Address      string          `json:"address"`
	WorkingHours string          `json:"workingHours"`
	AboutText    string          `json:"aboutText"`
	FooterIcons  json.RawMessage `json:"footerIcons"`
}

func (s *SettingsService) Update(ctx context.Context, input UpdateSettingsInput) (*domain.Settings, error) {
	footerIcons := input.FooterIcons
	if len(footerIcons) == 0 {
		footerIcons = json.RawMessage("[]")
	}
	return s.repo.Update(ctx, &domain.Settings{
		Name:         input.Name,
		Phone:        input.Phone,
		Email:        input.Email,
		Address:      input.Address,
		WorkingHours: input.WorkingHours,
		AboutText:    input.AboutText,
		FooterIcons:  footerIcons,
	})
}
