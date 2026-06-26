package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/coolcafe/backend/internal/domain"
)

type CategoryRepository struct {
	db *sqlx.DB
}

func NewCategoryRepository(db *sqlx.DB) *CategoryRepository {
	return &CategoryRepository{db: db}
}

func (r *CategoryRepository) List(ctx context.Context) ([]domain.Category, error) {
	var categories []domain.Category
	query := `SELECT * FROM categories ORDER BY sort_order ASC`
	err := r.db.SelectContext(ctx, &categories, query)
	return categories, err
}

func (r *CategoryRepository) ListActive(ctx context.Context) ([]domain.Category, error) {
	var categories []domain.Category
	query := `SELECT * FROM categories WHERE is_active = true ORDER BY sort_order ASC`
	err := r.db.SelectContext(ctx, &categories, query)
	return categories, err
}

func (r *CategoryRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.Category, error) {
	var category domain.Category
	query := `SELECT * FROM categories WHERE id = $1`
	err := r.db.GetContext(ctx, &category, query, id)
	if err != nil {
		return nil, err
	}
	return &category, nil
}

func (r *CategoryRepository) Create(ctx context.Context, category *domain.Category) error {
	query := `
		INSERT INTO categories (name, slug, icon, sort_order, is_active)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRowContext(ctx, query,
		category.Name, category.Slug, category.Icon, category.SortOrder, category.IsActive,
	).Scan(&category.ID, &category.CreatedAt, &category.UpdatedAt)
}

func (r *CategoryRepository) Update(ctx context.Context, category *domain.Category) error {
	query := `
		UPDATE categories SET
			name = $2,
			slug = $3,
			icon = $4,
			sort_order = $5,
			is_active = $6,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`
	_, err := r.db.ExecContext(ctx, query,
		category.ID, category.Name, category.Slug, category.Icon, category.SortOrder, category.IsActive,
	)
	return err
}

func (r *CategoryRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM categories WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}
