package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/coolcafe/backend/internal/domain"
)

type MenuItemRepository struct {
	db *sqlx.DB
}

func NewMenuItemRepository(db *sqlx.DB) *MenuItemRepository {
	return &MenuItemRepository{db: db}
}

func (r *MenuItemRepository) List(ctx context.Context) ([]domain.MenuItem, error) {
	var items []domain.MenuItem
	query := `SELECT * FROM menu_items ORDER BY created_at DESC`
	err := r.db.SelectContext(ctx, &items, query)
	return items, err
}

func (r *MenuItemRepository) ListAvailable(ctx context.Context) ([]domain.MenuItem, error) {
	var items []domain.MenuItem
	query := `SELECT * FROM menu_items WHERE is_available = true ORDER BY created_at DESC`
	err := r.db.SelectContext(ctx, &items, query)
	return items, err
}

func (r *MenuItemRepository) ListByCategory(ctx context.Context, categoryID uuid.UUID) ([]domain.MenuItem, error) {
	var items []domain.MenuItem
	query := `SELECT * FROM menu_items WHERE category_id = $1 ORDER BY created_at DESC`
	err := r.db.SelectContext(ctx, &items, query, categoryID)
	return items, err
}

func (r *MenuItemRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.MenuItem, error) {
	var item domain.MenuItem
	query := `SELECT * FROM menu_items WHERE id = $1`
	err := r.db.GetContext(ctx, &item, query, id)
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *MenuItemRepository) Create(ctx context.Context, item *domain.MenuItem) error {
	query := `
		INSERT INTO menu_items (name, description, price, category_id, image_url, is_available, is_featured)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRowContext(ctx, query,
		item.Name, item.Description, item.Price, item.CategoryID, item.ImageURL, item.IsAvailable, item.IsFeatured,
	).Scan(&item.ID, &item.CreatedAt, &item.UpdatedAt)
}

func (r *MenuItemRepository) Update(ctx context.Context, item *domain.MenuItem) error {
	query := `
		UPDATE menu_items SET
			name = $2,
			description = $3,
			price = $4,
			category_id = $5,
			image_url = $6,
			is_available = $7,
			is_featured = $8,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`
	_, err := r.db.ExecContext(ctx, query,
		item.ID, item.Name, item.Description, item.Price, item.CategoryID, item.ImageURL, item.IsAvailable, item.IsFeatured,
	)
	return err
}

func (r *MenuItemRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM menu_items WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}
