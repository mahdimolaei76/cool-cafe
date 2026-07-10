package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/coolcafe/backend/internal/domain"
)

type CustomerRepository struct {
	db *sqlx.DB
}

func NewCustomerRepository(db *sqlx.DB) *CustomerRepository {
	return &CustomerRepository{db: db}
}

func (r *CustomerRepository) List(ctx context.Context, search string) ([]domain.Customer, error) {
	var customers []domain.Customer
	if search != "" {
		query := `
			SELECT * FROM customers
			WHERE phone ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1
			ORDER BY created_at DESC
		`
		err := r.db.SelectContext(ctx, &customers, query, "%"+search+"%")
		return customers, err
	}
	query := `SELECT * FROM customers ORDER BY created_at DESC`
	err := r.db.SelectContext(ctx, &customers, query)
	return customers, err
}

func (r *CustomerRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.Customer, error) {
	var customer domain.Customer
	query := `SELECT * FROM customers WHERE id = $1`
	if err := r.db.GetContext(ctx, &customer, query, id); err != nil {
		return nil, err
	}
	return &customer, nil
}

func (r *CustomerRepository) FindByPhone(ctx context.Context, phone string) (*domain.Customer, error) {
	var customer domain.Customer
	query := `SELECT * FROM customers WHERE phone = $1`
	if err := r.db.GetContext(ctx, &customer, query, phone); err != nil {
		return nil, err
	}
	return &customer, nil
}

func (r *CustomerRepository) Create(ctx context.Context, customer *domain.Customer) error {
	query := `
		INSERT INTO customers (phone, first_name, last_name, credit_enabled, credit_balance)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRowContext(ctx, query,
		customer.Phone, customer.FirstName, customer.LastName, customer.CreditEnabled, customer.CreditBalance,
	).Scan(&customer.ID, &customer.CreatedAt, &customer.UpdatedAt)
}

func (r *CustomerRepository) Update(ctx context.Context, customer *domain.Customer) error {
	query := `
		UPDATE customers SET
			phone = $2,
			first_name = $3,
			last_name = $4,
			credit_enabled = $5,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		RETURNING updated_at
	`
	return r.db.QueryRowContext(ctx, query,
		customer.ID, customer.Phone, customer.FirstName, customer.LastName, customer.CreditEnabled,
	).Scan(&customer.UpdatedAt)
}

func (r *CustomerRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM customers WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

// AdjustBalance atomically adds `delta` (positive or negative) to the
// customer's credit_balance and returns the updated row. Doing the
// read-modify-write inside the DB (rather than in Go) avoids a race
// between two concurrent adjustments (e.g. an order paid by credit at
// the same time as a manual admin adjustment) stepping on each other.
func (r *CustomerRepository) AdjustBalance(ctx context.Context, id uuid.UUID, delta int64) (*domain.Customer, error) {
	var customer domain.Customer
	query := `
		UPDATE customers SET
			credit_balance = credit_balance + $2,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		RETURNING *
	`
	if err := r.db.GetContext(ctx, &customer, query, id, delta); err != nil {
		return nil, err
	}
	return &customer, nil
}

// SetBalance atomically sets credit_balance to an exact value (used for
// "تسویه کامل بدهی" — full settlement, i.e. reset to 0).
func (r *CustomerRepository) SetBalance(ctx context.Context, id uuid.UUID, balance int64) (*domain.Customer, error) {
	var customer domain.Customer
	query := `
		UPDATE customers SET
			credit_balance = $2,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		RETURNING *
	`
	if err := r.db.GetContext(ctx, &customer, query, id, balance); err != nil {
		return nil, err
	}
	return &customer, nil
}

// OrderHistory returns this customer's orders that have reached a final
// state (delivered/cancelled) — matched purely by phone number, per the
// requirement that an order only "enters" a customer's history once its
// status becomes final, and matching is by phone rather than a hard FK.
func (r *CustomerRepository) OrderHistory(ctx context.Context, phone string) ([]domain.Order, error) {
	var orders []domain.Order
	query := `
		SELECT * FROM orders
		WHERE customer_phone = $1 AND status IN ('delivered', 'cancelled')
		ORDER BY created_at DESC
	`
	if err := r.db.SelectContext(ctx, &orders, query, phone); err != nil {
		return nil, err
	}
	return orders, nil
}
