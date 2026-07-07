package domain

import (
	"time"

	"github.com/google/uuid"
)

// User represents a system user
type User struct {
	ID           uuid.UUID `db:"id" json:"id"`
	Username     string    `db:"username" json:"username"`
	PasswordHash string    `db:"password_hash" json:"-"`
	Name         string    `db:"name" json:"name"`
	Role         string    `db:"role" json:"role"`
	IsActive     bool      `db:"is_active" json:"isActive"`
	CreatedAt    time.Time `db:"created_at" json:"createdAt"`
	UpdatedAt    time.Time `db:"updated_at" json:"updatedAt"`
}

// Category represents a menu category
type Category struct {
	ID        uuid.UUID `db:"id" json:"id"`
	Name      string    `db:"name" json:"name"`
	Slug      string    `db:"slug" json:"slug"`
	Icon      string    `db:"icon" json:"icon"`
	SortOrder int       `db:"sort_order" json:"order"`
	IsActive  bool      `db:"is_active" json:"isActive"`
	CreatedAt time.Time `db:"created_at" json:"createdAt"`
	UpdatedAt time.Time `db:"updated_at" json:"updatedAt"`
}

// MenuItem represents a menu item
type MenuItem struct {
	ID          uuid.UUID  `db:"id" json:"id"`
	Name        string     `db:"name" json:"name"`
	Description string     `db:"description" json:"description"`
	Price       int64      `db:"price" json:"price"`
	// PriceType is "fixed" (Price is used as-is) or "variable" (no fixed
	// price — the amount is entered by a cashier per order instead).
	PriceType   string     `db:"price_type" json:"priceType"`
	PriceLabel  string     `db:"price_label" json:"priceLabel,omitempty"`
	CategoryID  *uuid.UUID `db:"category_id" json:"categoryId,omitempty"`
	ImageURL    string     `db:"image_url" json:"image"`
	IsAvailable bool       `db:"is_available" json:"isAvailable"`
	IsFeatured  bool       `db:"is_featured" json:"isFeatured"`
	CreatedAt   time.Time  `db:"created_at" json:"createdAt"`
	UpdatedAt   time.Time  `db:"updated_at" json:"updatedAt"`
	Category    *Category  `db:"-" json:"category,omitempty"`
}

// Order represents a customer order
type Order struct {
	ID                uuid.UUID       `db:"id" json:"id"`
	OrderNumber       string          `db:"order_number" json:"orderNumber"`
	TrackingCode      string          `db:"tracking_code" json:"trackingCode"`
	CustomerFirstName string          `db:"customer_first_name" json:"customerFirstName"`
	CustomerLastName  string          `db:"customer_last_name" json:"customerLastName"`
	CustomerPhone     string          `db:"customer_phone" json:"customerPhone"`
	Subtotal          int64           `db:"subtotal" json:"subtotal"`
	Discount          int64           `db:"discount" json:"discount"`
	Total             int64           `db:"total" json:"total"`
	Notes             string          `db:"notes" json:"notes"`
	Status            string          `db:"status" json:"status"`
	OrderType         string          `db:"order_type" json:"orderType"`
	PaymentMethod     string          `db:"payment_method" json:"paymentMethod"`
	CashierID         *uuid.UUID      `db:"cashier_id" json:"cashierId,omitempty"`
	CashierName       string          `db:"cashier_name" json:"cashier"`
	CreatedAt         time.Time       `db:"created_at" json:"createdAt"`
	UpdatedAt         time.Time       `db:"updated_at" json:"updatedAt"`
	Items             []OrderItem     `db:"-" json:"items"`
	Timeline          []OrderTimeline `db:"-" json:"timeline"`
}

// OrderItem represents an item in an order
type OrderItem struct {
	ID              uuid.UUID  `db:"id" json:"id"`
	OrderID         uuid.UUID  `db:"order_id" json:"orderId"`
	MenuItemID      *uuid.UUID `db:"menu_item_id" json:"menuItemId,omitempty"`
	Name            string     `db:"name" json:"name"`
	Price           int64      `db:"price" json:"price"`
	Quantity        int        `db:"quantity" json:"quantity"`
	Subtotal        int64      `db:"subtotal" json:"subtotal"`
	Notes           string     `db:"notes" json:"notes,omitempty"`
	// IsPriceVariable/PriceConfirmed/PriceLabel support items whose price
	// isn't fixed (e.g. "قیمت بازار"): the cashier fills in Price later,
	// and until PriceConfirmed is true this line is excluded from the
	// order's subtotal/total rather than silently counted as free.
	IsPriceVariable bool       `db:"is_price_variable" json:"isPriceVariable"`
	PriceConfirmed  bool       `db:"price_confirmed" json:"priceConfirmed"`
	PriceLabel      string     `db:"price_label" json:"priceLabel,omitempty"`
	CreatedAt       time.Time  `db:"created_at" json:"createdAt"`
}

// OrderTimeline represents a status change in order history
type OrderTimeline struct {
	ID        uuid.UUID `db:"id" json:"id"`
	OrderID   uuid.UUID `db:"order_id" json:"orderId"`
	Status    string    `db:"status" json:"status"`
	Note      string    `db:"note" json:"note,omitempty"`
	CreatedAt time.Time `db:"created_at" json:"timestamp"`
}

// Order status constants
const (
	OrderStatusPending   = "pending"
	OrderStatusPreparing = "preparing"
	OrderStatusReady     = "ready"
	OrderStatusDelivered = "delivered"
	OrderStatusCancelled = "cancelled"
)

// Order type constants
const (
	OrderTypeInPerson = "in-person"
	OrderTypeOnline   = "online"
)

// Payment method constants
const (
	PaymentMethodCash  = "cash"
	PaymentMethodCard  = "card"
	PaymentMethodOther = "other"
)

// User role constants
const (
	RoleAdmin   = "admin"
	RoleCashier = "cashier"
)

// Settings represents the café's general settings. It's a singleton row
// (there's only ever one row in the settings table) rather than
// per-user, since it describes the café itself (shown on the public
// menu sidebar as well as the admin settings page).
type Settings struct {
	ID        int       `db:"id" json:"-"`
	Name      string    `db:"name" json:"name"`
	Phone     string    `db:"phone" json:"phone"`
	Email     string    `db:"email" json:"email"`
	Address   string    `db:"address" json:"address"`
	UpdatedAt time.Time `db:"updated_at" json:"updatedAt"`
}
