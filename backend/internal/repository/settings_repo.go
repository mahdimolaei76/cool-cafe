package repository

import (
	"context"

	"github.com/jmoiron/sqlx"

	"github.com/coolcafe/backend/internal/domain"
)

type SettingsRepository struct {
	db *sqlx.DB
}

func NewSettingsRepository(db *sqlx.DB) *SettingsRepository {
	return &SettingsRepository{db: db}
}

// Get returns the singleton settings row. If it doesn't exist yet
// (a database that predates the settings migration having somehow
// skipped its default insert), it's created with sensible defaults
// first so callers never have to special-case a missing row.
func (r *SettingsRepository) Get(ctx context.Context) (*domain.Settings, error) {
	var s domain.Settings
	err := r.db.GetContext(ctx, &s, `SELECT * FROM settings WHERE id = 1`)
	if err == nil {
		return &s, nil
	}

	if _, insertErr := r.db.ExecContext(ctx, `
		INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING
	`); insertErr != nil {
		return nil, insertErr
	}

	if err := r.db.GetContext(ctx, &s, `SELECT * FROM settings WHERE id = 1`); err != nil {
		return nil, err
	}
	return &s, nil
}

// Update saves the given fields onto the singleton settings row.
func (r *SettingsRepository) Update(ctx context.Context, s *domain.Settings) (*domain.Settings, error) {
	query := `
		INSERT INTO settings (id, name, phone, email, address, working_hours, about_text, footer_icons, takeaway_fee_enabled, takeaway_fee, updated_at)
		VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			phone = EXCLUDED.phone,
			email = EXCLUDED.email,
			address = EXCLUDED.address,
			working_hours = EXCLUDED.working_hours,
			about_text = EXCLUDED.about_text,
			footer_icons = EXCLUDED.footer_icons,
			takeaway_fee_enabled = EXCLUDED.takeaway_fee_enabled,
			takeaway_fee = EXCLUDED.takeaway_fee,
			updated_at = EXCLUDED.updated_at
		RETURNING *
	`
	var updated domain.Settings
	if err := r.db.GetContext(ctx, &updated, query,
		s.Name, s.Phone, s.Email, s.Address, s.WorkingHours, s.AboutText, []byte(s.FooterIcons),
		s.TakeawayFeeEnabled, s.TakeawayFee,
	); err != nil {
		return nil, err
	}
	return &updated, nil
}
