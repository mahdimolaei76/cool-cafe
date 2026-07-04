package repository

import (
	"context"
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

	// Generate order number
	order.OrderNumber = r.generateOrderNumber()

	// Insert order
	orderQuery := `
		INSERT INTO orders (order_number, customer_first_name, customer_last_name, customer_phone, 
			subtotal, discount, total, notes, status, order_type, payment_method, cashier_id, cashier_name)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING id, created_at, updated_at
	`
	err = tx.QueryRowContext(ctx, orderQuery,
		order.OrderNumber, order.CustomerFirstName, order.CustomerLastName, order.CustomerPhone,
		order.Subtotal, order.Discount, order.Total, order.Notes, order.Status,
		order.OrderType, order.PaymentMethod, order.CashierID, order.CashierName,
	).Scan(&order.ID, &order.CreatedAt, &order.UpdatedAt)
	if err != nil {
		return err
	}

	// Insert order items
	itemQuery := `
		INSERT INTO order_items (order_id, menu_item_id, name, price, quantity, subtotal)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at
	`
	for i := range order.Items {
		item := &order.Items[i]
		item.OrderID = order.ID
		err = tx.QueryRowContext(ctx, itemQuery,
			item.OrderID, item.MenuItemID, item.Name, item.Price, item.Quantity, item.Subtotal,
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

	// Update order status
	updateQuery := `UPDATE orders SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`
	if _, err = tx.ExecContext(ctx, updateQuery, id, status); err != nil {
		return err
	}

	// Add timeline entry
	timelineQuery := `INSERT INTO order_timeline (order_id, status, note) VALUES ($1, $2, $3)`
	if _, err = tx.ExecContext(ctx, timelineQuery, id, status, note); err != nil {
		return err
	}

	return tx.Commit()
}

func (r *OrderRepository) loadOrderDetails(ctx context.Context, order *domain.Order) error {
	// Load items
	itemsQuery := `SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at`
	if err := r.db.SelectContext(ctx, &order.Items, itemsQuery, order.ID); err != nil {
		return err
	}

	// Load timeline
	timelineQuery := `SELECT * FROM order_timeline WHERE order_id = $1 ORDER BY created_at`
	if err := r.db.SelectContext(ctx, &order.Timeline, timelineQuery, order.ID); err != nil {
		return err
	}

	return nil
}

func (r *OrderRepository) generateOrderNumber() string {
	now := time.Now()
	return fmt.Sprintf("COOL-%s-%s", now.Format("060102"), uuid.New().String()[:4])
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
