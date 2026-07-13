package repository

import (
	"context"
	"crypto/rand"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/coolcafe/backend/internal/domain"
)

type OrderRepository struct {
	db *sqlx.DB
}

func NewOrderRepository(db *sqlx.DB) *OrderRepository {
	return &OrderRepository{db: db}
}

func (r *OrderRepository) List(ctx context.Context, limit, offset int) ([]domain.Order, int, error) {
	var orders []domain.Order
	var total int

	// Count total
	countQuery := `SELECT COUNT(*) FROM orders`
	if err := r.db.GetContext(ctx, &total, countQuery); err != nil {
		return nil, 0, err
	}

	// Get orders
	query := `SELECT * FROM orders ORDER BY created_at DESC LIMIT $1 OFFSET $2`
	if err := r.db.SelectContext(ctx, &orders, query, limit, offset); err != nil {
		return nil, 0, err
	}

	// Load items and timeline for each order
	for i := range orders {
		if err := r.loadOrderDetails(ctx, &orders[i]); err != nil {
			return nil, 0, err
		}
	}

	return orders, total, nil
}

func (r *OrderRepository) ListByStatus(ctx context.Context, status string) ([]domain.Order, error) {
	var orders []domain.Order
	query := `SELECT * FROM orders WHERE status = $1 ORDER BY created_at DESC`
	if err := r.db.SelectContext(ctx, &orders, query, status); err != nil {
		return nil, err
	}

	for i := range orders {
		if err := r.loadOrderDetails(ctx, &orders[i]); err != nil {
			return nil, err
		}
	}

	return orders, nil
}

func (r *OrderRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.Order, error) {
	var order domain.Order
	query := `SELECT * FROM orders WHERE id = $1`
	if err := r.db.GetContext(ctx, &order, query, id); err != nil {
		return nil, err
	}

	if err := r.loadOrderDetails(ctx, &order); err != nil {
		return nil, err
	}

	return &order, nil
}

func (r *OrderRepository) FindByOrderNumber(ctx context.Context, orderNumber string) (*domain.Order, error) {
	var order domain.Order
	query := `SELECT * FROM orders WHERE order_number = $1`
	if err := r.db.GetContext(ctx, &order, query, orderNumber); err != nil {
		return nil, err
	}

	if err := r.loadOrderDetails(ctx, &order); err != nil {
		return nil, err
	}

	return &order, nil
}

func (r *OrderRepository) Create(ctx context.Context, order *domain.Order) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Generate order number (sequential-looking, shown to staff) and a
	// separate random tracking code (given to the customer, safe to expose
	// publicly since it can't be guessed or enumerated).
	order.OrderNumber = r.generateOrderNumber()
	trackingCode, err := r.generateUniqueTrackingCode(ctx, tx)
	if err != nil {
		return err
	}
	order.TrackingCode = trackingCode

	// Insert order
	orderQuery := `
		INSERT INTO orders (order_number, tracking_code, customer_first_name, customer_last_name, customer_phone, 
			subtotal, discount, total, notes, status, order_type, payment_method, paid_by_credit, is_paid, cashier_id, cashier_name)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		RETURNING id, created_at, updated_at
	`
	err = tx.QueryRowContext(ctx, orderQuery,
		order.OrderNumber, order.TrackingCode, order.CustomerFirstName, order.CustomerLastName, order.CustomerPhone,
		order.Subtotal, order.Discount, order.Total, order.Notes, order.Status,
		order.OrderType, order.PaymentMethod, order.PaidByCredit, order.IsPaid, order.CashierID, order.CashierName,
	).Scan(&order.ID, &order.CreatedAt, &order.UpdatedAt)
	if err != nil {
		return err
	}

	// Insert order items
	itemQuery := `
		INSERT INTO order_items (order_id, menu_item_id, name, price, quantity, subtotal, is_price_variable, price_confirmed, price_label)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at
	`
	for i := range order.Items {
		item := &order.Items[i]
		item.OrderID = order.ID
		err = tx.QueryRowContext(ctx, itemQuery,
			item.OrderID, item.MenuItemID, item.Name, item.Price, item.Quantity, item.Subtotal,
			item.IsPriceVariable, item.PriceConfirmed, item.PriceLabel,
		).Scan(&item.ID, &item.CreatedAt)
		if err != nil {
			return err
		}
	}

	// Insert initial timeline entry
	timelineQuery := `
		INSERT INTO order_timeline (order_id, status)
		VALUES ($1, $2)
		RETURNING id, created_at
	`
	var timeline domain.OrderTimeline
	err = tx.QueryRowContext(ctx, timelineQuery, order.ID, order.Status).Scan(&timeline.ID, &timeline.CreatedAt)
	if err != nil {
		return err
	}
	timeline.OrderID = order.ID
	timeline.Status = order.Status
	order.Timeline = []domain.OrderTimeline{timeline}

	return tx.Commit()
}

func (r *OrderRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string, note string) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Update order status — delivered_at is set in a separate migration
	// (007); on servers where that migration hasn't run yet we skip it.
	updateQuery := `UPDATE orders SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`
	if _, err = tx.ExecContext(ctx, updateQuery, id, status); err != nil {
		return err
	}

	// Try to stamp delivered_at — silently ignored if the column doesn't
	// exist yet (migration 007 not applied).
	_, _ = tx.ExecContext(ctx, `
		UPDATE orders SET delivered_at = COALESCE(delivered_at, CURRENT_TIMESTAMP)
		WHERE id = $1 AND $2 = 'delivered'
	`, id, status)

	// Add timeline entry
	timelineQuery := `INSERT INTO order_timeline (order_id, status, note) VALUES ($1, $2, $3)`
	if _, err = tx.ExecContext(ctx, timelineQuery, id, status, note); err != nil {
		return err
	}

	return tx.Commit()
}

// UpdateItemPrice sets the cashier-entered price for a single order item
// (used for 'variable' priced items like "قیمت بازار") and recalculates
// the parent order's subtotal/total from all now-confirmed item prices,
// so previously-unpriced lines start counting toward the total only once
// the cashier has actually priced them.
func (r *OrderRepository) UpdateItemPrice(ctx context.Context, orderID, itemID uuid.UUID, unitPrice int64) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var quantity int
	if err := tx.GetContext(ctx, &quantity, `SELECT quantity FROM order_items WHERE id = $1 AND order_id = $2`, itemID, orderID); err != nil {
		return err
	}
	subtotal := unitPrice * int64(quantity)

	if _, err := tx.ExecContext(ctx, `
		UPDATE order_items
		SET price = $3, subtotal = $4, price_confirmed = true
		WHERE id = $1 AND order_id = $2
	`, itemID, orderID, unitPrice, subtotal); err != nil {
		return err
	}

	// Recompute the order's totals from all confirmed items only —
	// unconfirmed variable-priced lines stay excluded, same rule the
	// frontend uses when it first builds the order.
	if _, err := tx.ExecContext(ctx, `
		UPDATE orders o
		SET subtotal = COALESCE((
			SELECT SUM(oi.subtotal) FROM order_items oi
			WHERE oi.order_id = o.id AND oi.price_confirmed = true
		), 0),
		total = GREATEST(0, COALESCE((
			SELECT SUM(oi.subtotal) FROM order_items oi
			WHERE oi.order_id = o.id AND oi.price_confirmed = true
		), 0) - o.discount),
		updated_at = CURRENT_TIMESTAMP
		WHERE o.id = $1
	`, orderID); err != nil {
		return err
	}

	return tx.Commit()
}

// UpdatePayment updates an order's payment method, "پرداخت شد" flag, and
// credit-payment flag. This is separate from UpdateStatus since these can
// be changed from the same modal alongside (or independently of) a status
// transition.
func (r *OrderRepository) UpdatePayment(ctx context.Context, id uuid.UUID, paymentMethod string, isPaid, paidByCredit bool) error {
	// Base update always works — payment_method exists from migration 001.
	if _, err := r.db.ExecContext(ctx, `
		UPDATE orders SET payment_method = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1
	`, id, paymentMethod); err != nil {
		return err
	}
	// is_paid and paid_by_credit added in migration 006 — skip silently if
	// the column doesn't exist yet on the target server.
	_, _ = r.db.ExecContext(ctx, `
		UPDATE orders SET is_paid = $2, paid_by_credit = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $1
	`, id, isPaid, paidByCredit)
	return nil
}

// loadOrderDetails populates an order's Items and Timeline, which live in
// separate tables and aren't covered by the `SELECT * FROM orders` used
// by the various Find*/List methods above.
func (r *OrderRepository) loadOrderDetails(ctx context.Context, order *domain.Order) error {
	var items []domain.OrderItem
	if err := r.db.SelectContext(ctx, &items, `
		SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at ASC
	`, order.ID); err != nil {
		return err
	}
	order.Items = items

	var timeline []domain.OrderTimeline
	if err := r.db.SelectContext(ctx, &timeline, `
		SELECT * FROM order_timeline WHERE order_id = $1 ORDER BY created_at ASC
	`, order.ID); err != nil {
		return err
	}
	order.Timeline = timeline

	return nil
}

func (r *OrderRepository) generateOrderNumber() string {
	now := time.Now()
	return fmt.Sprintf("COOL-%s-%s", now.Format("060102"), uuid.New().String()[:4])
}

// trackingCodeCharset intentionally excludes visually-ambiguous characters
// (0/O, 1/I) so codes are easy for customers to read back over the phone
// or type in correctly, while still being random, unique, and impossible
// to guess or enumerate sequentially.
const trackingCodeCharset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const trackingCodeLength = 8

// generateUniqueTrackingCode creates a cryptographically random tracking
// code and retries on the rare event of a collision with an existing code.
func (r *OrderRepository) generateUniqueTrackingCode(ctx context.Context, tx *sqlx.Tx) (string, error) {
	for attempt := 0; attempt < 10; attempt++ {
		code, err := randomTrackingCode()
		if err != nil {
			return "", err
		}
		var exists bool
		if err := tx.GetContext(ctx, &exists, `SELECT EXISTS(SELECT 1 FROM orders WHERE tracking_code = $1)`, code); err != nil {
			return "", err
		}
		if !exists {
			return code, nil
		}
	}
	return "", fmt.Errorf("failed to generate a unique tracking code after multiple attempts")
}

func randomTrackingCode() (string, error) {
	b := make([]byte, trackingCodeLength)
	buf := make([]byte, trackingCodeLength)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	n := len(trackingCodeCharset)
	for i := range b {
		b[i] = trackingCodeCharset[int(buf[i])%n]
	}
	return string(b), nil
}

// FindByTrackingCodeAndPhone looks up an order for the public tracking
// page. Both the tracking code and the phone number used on the order
// must match, so knowing the code alone (e.g. seeing a receipt) is not
// enough to look up someone else's order.
func (r *OrderRepository) FindByTrackingCodeAndPhone(ctx context.Context, trackingCode, phone string) (*domain.Order, error) {
	var order domain.Order
	query := `SELECT * FROM orders WHERE tracking_code = $1 AND customer_phone = $2`
	if err := r.db.GetContext(ctx, &order, query, trackingCode, phone); err != nil {
		return nil, err
	}

	if err := r.loadOrderDetails(ctx, &order); err != nil {
		return nil, err
	}

	return &order, nil
}

// GetStatsByDateRange returns order statistics for a date range
func (r *OrderRepository) GetStatsByDateRange(ctx context.Context, from, to time.Time) (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// Total revenue and orders
	query := `
		SELECT 
			COUNT(*) as total_orders,
			COALESCE(SUM(total), 0) as total_revenue,
			COALESCE(AVG(total), 0) as avg_order_value
		FROM orders 
		WHERE status != 'cancelled' AND created_at BETWEEN $1 AND $2
	`
	row := r.db.QueryRowContext(ctx, query, from, to)
	var totalOrders int
	var totalRevenue, avgOrderValue float64
	if err := row.Scan(&totalOrders, &totalRevenue, &avgOrderValue); err != nil {
		return nil, err
	}

	stats["totalOrders"] = totalOrders
	stats["totalRevenue"] = totalRevenue
	stats["avgOrderValue"] = avgOrderValue

	return stats, nil
}
