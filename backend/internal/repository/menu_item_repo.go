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
	query := `SELECT * FROM menu_items ORDER BY sort_order ASC, created_at ASC`
	err := r.db.SelectContext(ctx, &items, query)
	return items, err
}

func (r *MenuItemRepository) ListAvailable(ctx context.Context) ([]domain.MenuItem, error) {
	var items []domain.MenuItem
	query := `SELECT * FROM menu_items WHERE is_available = true ORDER BY sort_order ASC, created_at ASC`
	err := r.db.SelectContext(ctx, &items, query)
	return items, err
}

func (r *MenuItemRepository) ListByCategory(ctx context.Context, categoryID uuid.UUID) ([]domain.MenuItem, error) {
	var items []domain.MenuItem
	query := `SELECT * FROM menu_items WHERE category_id = $1 ORDER BY sort_order ASC, created_at ASC`
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
	// Auto-assign sort_order as max+1 within the category so new items
	// appear at the end of the list rather than all colliding at 0.
	query := `
		INSERT INTO menu_items
			(name, description, price, price_type, price_label, category_id, image_url, is_available, is_featured, sort_order)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
			COALESCE((SELECT MAX(sort_order)+1 FROM menu_items WHERE category_id = $6), 1))
		RETURNING id, sort_order, created_at, updated_at
	`
	return r.db.QueryRowContext(ctx, query,
		item.Name, item.Description, item.Price, item.PriceType, item.PriceLabel,
		item.CategoryID, item.ImageURL, item.IsAvailable, item.IsFeatured,
	).Scan(&item.ID, &item.SortOrder, &item.CreatedAt, &item.UpdatedAt)
}

func (r *MenuItemRepository) Update(ctx context.Context, item *domain.MenuItem) error {
	query := `
		UPDATE menu_items SET
			name        = $2,
			description = $3,
			price       = $4,
			price_type  = $5,
			price_label = $6,
			category_id = $7,
			image_url   = $8,
			is_available= $9,
			is_featured = $10,
			sort_order  = $11,
			updated_at  = CURRENT_TIMESTAMP
		WHERE id = $1
	`
	_, err := r.db.ExecContext(ctx, query,
		item.ID, item.Name, item.Description, item.Price, item.PriceType, item.PriceLabel,
		item.CategoryID, item.ImageURL, item.IsAvailable, item.IsFeatured, item.SortOrder,
	)
	return err
}

// UpdateSortOrder updates only the sort_order of a single item.
// Called by the batch reorder endpoint to avoid re-sending the full item.
func (r *MenuItemRepository) UpdateSortOrder(ctx context.Context, id uuid.UUID, sortOrder int) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE menu_items SET sort_order = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
		id, sortOrder,
	)
	return err
}

func (r *MenuItemRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM menu_items WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}
