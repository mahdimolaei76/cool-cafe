package repository

import (
	"context"
	"time"

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

// List returns a page of customers (مدیریت مشتری‌ها pagination).
func (r *CustomerRepository) List(ctx context.Context, search string, limit, offset int) ([]domain.Customer, int, error) {
	var customers []domain.Customer
	var total int

	if search != "" {
		like := "%" + search + "%"
		if err := r.db.GetContext(ctx, &total, `
			SELECT COUNT(*) FROM customers WHERE phone ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1
		`, like); err != nil {
			return nil, 0, err
		}
		if err := r.db.SelectContext(ctx, &customers, `
			SELECT * FROM customers
			WHERE phone ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1
			ORDER BY created_at DESC LIMIT $2 OFFSET $3
		`, like, limit, offset); err != nil {
			return nil, 0, err
		}
		return customers, total, nil
	}

	if err := r.db.GetContext(ctx, &total, `SELECT COUNT(*) FROM customers`); err != nil {
		return nil, 0, err
	}
	if err := r.db.SelectContext(ctx, &customers, `
		SELECT * FROM customers ORDER BY created_at DESC LIMIT $1 OFFSET $2
	`, limit, offset); err != nil {
		return nil, 0, err
	}
	return customers, total, nil
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

// AdjustBalanceRecorded atomically adds `delta` to the customer's
// credit_balance AND records a credit_history row for it in the same
// transaction, so every change to the balance — manual or automatic —
// is always reflected in the customer's timeline. orderID is nil for
// manual admin/cashier adjustments.
func (r *CustomerRepository) AdjustBalanceRecorded(ctx context.Context, id uuid.UUID, delta int64, kind string, orderID *uuid.UUID, note string) (*domain.Customer, error) {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var customer domain.Customer
	if err := tx.GetContext(ctx, &customer, `
		UPDATE customers SET credit_balance = credit_balance + $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 RETURNING *
	`, id, delta); err != nil {
		return nil, err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO credit_history (customer_id, order_id, kind, amount, balance_after, note)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, id, orderID, kind, delta, customer.CreditBalance, note); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &customer, nil
}

// SetBalanceRecorded atomically sets credit_balance to an exact value
// (تسویه حساب کامل) and records the resulting delta in credit_history.
func (r *CustomerRepository) SetBalanceRecorded(ctx context.Context, id uuid.UUID, balance int64, kind, note string) (*domain.Customer, error) {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var before domain.Customer
	if err := tx.GetContext(ctx, &before, `SELECT * FROM customers WHERE id = $1 FOR UPDATE`, id); err != nil {
		return nil, err
	}
	delta := balance - before.CreditBalance

	var customer domain.Customer
	if err := tx.GetContext(ctx, &customer, `
		UPDATE customers SET credit_balance = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *
	`, id, balance); err != nil {
		return nil, err
	}

	if delta != 0 {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO credit_history (customer_id, order_id, kind, amount, balance_after, note)
			VALUES ($1, NULL, $2, $3, $4, $5)
		`, id, kind, delta, customer.CreditBalance, note); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &customer, nil
}

// HistoryFilter narrows the combined order+credit timeline shown in the
// customer history modal.
type HistoryFilter struct {
	DateFrom      *time.Time
	DateTo        *time.Time
	PaymentMethod string
	Limit         int
	Offset        int
}

// HistoryEntry is one unified row of a customer's combined order +
// credit-account timeline, used by the "تاریخچه سفارشات" modal.
type HistoryEntry struct {
	EntryType     string     `json:"entryType"`
	ID            uuid.UUID  `json:"id"`
	OrderNumber   string     `json:"orderNumber,omitempty"`
	OrderStatus   string     `json:"orderStatus,omitempty"`
	PaymentMethod string     `json:"paymentMethod,omitempty"`
	CreditKind    string     `json:"creditKind,omitempty"`
	Amount        int64      `json:"amount"`
	CreatedAt     time.Time  `json:"createdAt"`
	DeliveredAt   *time.Time `json:"deliveredAt,omitempty"`
}

// CombinedHistory merges this customer's finalized orders (delivered/
// cancelled) with their credit_history entries into one paginated,
// filterable timeline, sorted by created_at desc.
func (r *CustomerRepository) CombinedHistory(ctx context.Context, customerID uuid.UUID, phone string, f HistoryFilter) ([]HistoryEntry, int, error) {
	orderClause := `o.customer_phone = $1 AND o.status IN ('delivered', 'cancelled')`
	creditClause := `ch.customer_id = $2`
	args := []interface{}{phone, customerID}
	argN := 3

	if f.DateFrom != nil {
		orderClause += " AND o.created_at >= $" + itoa(argN)
		creditClause += " AND ch.created_at >= $" + itoa(argN)
		args = append(args, *f.DateFrom)
		argN++
	}
	if f.DateTo != nil {
		orderClause += " AND o.created_at <= $" + itoa(argN)
		creditClause += " AND ch.created_at <= $" + itoa(argN)
		args = append(args, *f.DateTo)
		argN++
	}

	includeOrders := true
	includeCredit := true
	if f.PaymentMethod == "credit" {
		includeOrders = false
	} else if f.PaymentMethod != "" {
		includeCredit = false
		orderClause += " AND o.payment_method = $" + itoa(argN)
		args = append(args, f.PaymentMethod)
		argN++
	}

	var parts []string
	if includeOrders {
		parts = append(parts, `
			SELECT 'order' AS entry_type, o.id, o.order_number, o.status, o.payment_method,
				'' AS credit_kind, o.total AS amount, o.created_at, o.delivered_at
			FROM orders o WHERE `+orderClause)
	}
	if includeCredit {
		parts = append(parts, `
			SELECT 'credit' AS entry_type, ch.id, '' AS order_number, '' AS status, 'credit' AS payment_method,
				ch.kind AS credit_kind, ch.amount AS amount, ch.created_at, NULL::timestamptz AS delivered_at
			FROM credit_history ch WHERE `+creditClause)
	}

	union := ""
	for i, p := range parts {
		if i > 0 {
			union += " UNION ALL "
		}
		union += p
	}
	if union == "" {
		return []HistoryEntry{}, 0, nil
	}

	countQuery := `SELECT COUNT(*) FROM (` + union + `) t`
	var total int
	if err := r.db.GetContext(ctx, &total, countQuery, args...); err != nil {
		return nil, 0, err
	}

	limit := f.Limit
	if limit <= 0 {
		limit = 20
	}
	pageQuery := union + " ORDER BY created_at DESC LIMIT $" + itoa(argN) + " OFFSET $" + itoa(argN+1)
	pageArgs := append(append([]interface{}{}, args...), limit, f.Offset)

	rows, err := r.db.QueryxContext(ctx, pageQuery, pageArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var entries []HistoryEntry
	for rows.Next() {
		var (
			entryType, orderNumber, status, paymentMethod, creditKind string
			id                                                        uuid.UUID
			amount                                                    int64
			createdAt                                                 time.Time
			deliveredAt                                               *time.Time
		)
		if err := rows.Scan(&entryType, &id, &orderNumber, &status, &paymentMethod, &creditKind, &amount, &createdAt, &deliveredAt); err != nil {
			return nil, 0, err
		}
		entries = append(entries, HistoryEntry{
			EntryType: entryType, ID: id, OrderNumber: orderNumber, OrderStatus: status,
			PaymentMethod: paymentMethod, CreditKind: creditKind, Amount: amount,
			CreatedAt: createdAt, DeliveredAt: deliveredAt,
		})
	}
	return entries, total, nil
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	var b []byte
	for n > 0 {
		b = append([]byte{byte('0' + n%10)}, b...)
		n /= 10
	}
	if neg {
		b = append([]byte{'-'}, b...)
	}
	return string(b)
}

// OrderHistory (legacy, kept for CustomerWithHistory-only callers) —
// returns this customer's finalized orders with no filter/pagination.
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
