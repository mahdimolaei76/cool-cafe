package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/coolcafe/backend/internal/domain"
)

type UserRepository struct {
	db *sqlx.DB
}

func NewUserRepository(db *sqlx.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) FindByUsername(ctx context.Context, username string) (*domain.User, error) {
	var user domain.User
	query := `SELECT * FROM users WHERE username = $1 AND is_active = true`
	err := r.db.GetContext(ctx, &user, query, username)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	var user domain.User
	query := `SELECT * FROM users WHERE id = $1 AND is_active = true`
	err := r.db.GetContext(ctx, &user, query, id)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// SaveRefreshToken ذخیره توکن refresh برای یک کاربر
func (r *UserRepository) SaveRefreshToken(ctx context.Context, userID uuid.UUID, tokenHash string, expiresAt time.Time) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id) DO UPDATE
		  SET token_hash = EXCLUDED.token_hash,
		      expires_at = EXCLUDED.expires_at,
		      created_at = now()
	`, userID, tokenHash, expiresAt)
	return err
}

// FindRefreshToken پیدا کردن توکن refresh معتبر
func (r *UserRepository) FindRefreshToken(ctx context.Context, tokenHash string) (*domain.RefreshTokenRecord, error) {
	var rec domain.RefreshTokenRecord
	err := r.db.GetContext(ctx, &rec, `
		SELECT rt.user_id, rt.token_hash, rt.expires_at, u.role, u.name
		FROM refresh_tokens rt
		JOIN users u ON u.id = rt.user_id AND u.is_active = true
		WHERE rt.token_hash = $1 AND rt.expires_at > now()
	`, tokenHash)
	if err != nil {
		return nil, err
	}
	return &rec, nil
}

// RevokeRefreshToken حذف توکن refresh یک کاربر
func (r *UserRepository) RevokeRefreshToken(ctx context.Context, userID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM refresh_tokens WHERE user_id = $1`, userID)
	return err
}

func (r *UserRepository) Create(ctx context.Context, user *domain.User) error {
	query := `
		INSERT INTO users (username, password_hash, name, role)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRowContext(ctx, query,
		user.Username, user.PasswordHash, user.Name, user.Role,
	).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
}

func (r *UserRepository) Update(ctx context.Context, user *domain.User) error {
	query := `
		UPDATE users SET
			name = $2,
			role = $3,
			is_active = $4,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`
	_, err := r.db.ExecContext(ctx, query, user.ID, user.Name, user.Role, user.IsActive)
	return err
}
