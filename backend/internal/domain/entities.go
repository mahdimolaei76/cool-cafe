package domain

import (
	"encoding/json"
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
	SortOrder   int        `db:"sort_order" json:"order"`
	CreatedAt   time.Time  `db:"created_at" json:"createdAt"`
	UpdatedAt   time.Time  `db:"updated_at" json:"updatedAt"`
	Category    *Category  `db:"-" json:"category,omitempty"`
}

// Order represents a customer order
type Order struct {
	ID                uuid.UUID  `db:"id" json:"id"`
	OrderNumber       string     `db:"order_number" json:"orderNumber"`
	TrackingCode      string     `db:"tracking_code" json:"trackingCode"`
	CustomerFirstName string     `db:"customer_first_name" json:"customerFirstName"`
	CustomerLastName  string     `db:"customer_last_name" json:"customerLastName"`
	CustomerPhone     string     `db:"customer_phone" json:"customerPhone"`
	Subtotal          int64      `db:"subtotal" json:"subtotal"`
	Discount          int64      `db:"discount" json:"discount"`
	ServiceCharge     int64      `db:"service_charge" json:"serviceCharge"`
	// PriceOverride: when set, overrides the calculated total (subtotal - discount + service_charge)
	// with a manually entered amount. NULL = use calculated total.
	PriceOverride     *int64     `db:"price_override" json:"priceOverride,omitempty"`
	Total             int64      `db:"total" json:"total"`
	Notes             string     `db:"notes" json:"notes"`
	Status            string     `db:"status" json:"status"`
	OrderType         string     `db:"order_type" json:"orderType"`
	// IsTakeaway marks this as a takeaway (بیرون‌بر) order
	IsTakeaway        bool       `db:"is_takeaway" json:"isTakeaway"`
	PaymentMethod     string     `db:"payment_method" json:"paymentMethod"`
	PaidByCredit      bool       `db:"paid_by_credit" json:"paidByCredit"`
	IsPaid            bool       `db:"is_paid" json:"isPaid"`
	CashierID         *uuid.UUID `db:"cashier_id" json:"cashierId,omitempty"`
	CashierName       string     `db:"cashier_name" json:"cashier"`
	CreatedAt         time.Time  `db:"created_at" json:"createdAt"`
	UpdatedAt         time.Time  `db:"updated_at" json:"updatedAt"`
	DeliveredAt       *time.Time `db:"delivered_at" json:"deliveredAt,omitempty"`
	Items             []OrderItem          `db:"-" json:"items"`
	Timeline          []OrderTimeline      `db:"-" json:"timeline"`
	PaymentEvents     []OrderPaymentEvent  `db:"-" json:"paymentEvents"`
}

// OrderPaymentEvent is one entry in the per-order payment log — shown
// alongside the status timeline but with distinct styling.
type OrderPaymentEvent struct {
	ID        uuid.UUID `db:"id" json:"id"`
	OrderID   uuid.UUID `db:"order_id" json:"orderId"`
	Kind      string    `db:"kind" json:"kind"`  // price_override | payment_method | paid | service_charge
	OldValue  string    `db:"old_value" json:"oldValue"`
	NewValue  string    `db:"new_value" json:"newValue"`
	Note      string    `db:"note" json:"note,omitempty"`
	Cashier   string    `db:"cashier" json:"cashier,omitempty"`
	CreatedAt time.Time `db:"created_at" json:"createdAt"`
}

// Customer represents a café customer managed from the admin panel
// (مدیریت مشتری‌ها). Customers are matched to orders by phone number.
// CreditBalance can be positive (customer has pre-paid credit) or
// negative (customer owes money / بدهی); it may only be toggled between
// credit-enabled/disabled while the balance is exactly 0.
type Customer struct {
	ID            uuid.UUID `db:"id" json:"id"`
	Phone         string    `db:"phone" json:"phone"`
	FirstName     string    `db:"first_name" json:"firstName"`
	LastName      string    `db:"last_name" json:"lastName"`
	CreditEnabled bool      `db:"credit_enabled" json:"creditEnabled"`
	CreditBalance int64     `db:"credit_balance" json:"creditBalance"`
	CreatedAt     time.Time `db:"created_at" json:"createdAt"`
	UpdatedAt     time.Time `db:"updated_at" json:"updatedAt"`
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
	ServiceCharge   int64      `db:"service_charge" json:"serviceCharge"`
	Notes           string     `db:"notes" json:"notes,omitempty"`
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

// Payment method constants. Credit ("اعتباری") is a payment method like
// any other now (rather than only a side "paid_by_credit" flag) — the
// flag is still kept in sync (PaidByCredit = PaymentMethod == credit)
// for backward-compatible reporting/filtering.
const (
	PaymentMethodCash   = "cash"
	PaymentMethodCard   = "card"
	PaymentMethodOnline = "online"
	PaymentMethodCredit = "credit"
	PaymentMethodOther  = "other"
)

// Credit history entry kinds (تاریخچه حساب اعتباری).
const (
	CreditHistoryIncrease    = "increase"     // افزایش اعتبار
	CreditHistoryPurchase    = "purchase"     // خرید جدید (دستی)
	CreditHistorySettle      = "settle"       // تسویه حساب کامل
	CreditHistoryOrderCharge = "order_charge" // کسر بابت تحویل سفارش پرداخت‌اعتباری
)

// CreditHistory is one entry in a customer's credit-account timeline —
// shown merged with their order history. OrderID is nil for manual
// adjustments (افزایش/خرید دستی/تسویه) and set for entries generated by
// delivering a credit-paid order.
type CreditHistory struct {
	ID           uuid.UUID  `db:"id" json:"id"`
	CustomerID   uuid.UUID  `db:"customer_id" json:"customerId"`
	OrderID      *uuid.UUID `db:"order_id" json:"orderId,omitempty"`
	Kind         string     `db:"kind" json:"kind"`
	Amount       int64      `db:"amount" json:"amount"`
	BalanceAfter int64      `db:"balance_after" json:"balanceAfter"`
	Note         string     `db:"note" json:"note,omitempty"`
	CreatedAt    time.Time  `db:"created_at" json:"createdAt"`
}

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
	ID                  int             `db:"id" json:"-"`
	Name                string          `db:"name" json:"name"`
	Phone               string          `db:"phone" json:"phone"`
	Email               string          `db:"email" json:"email"`
	Address             string          `db:"address" json:"address"`
	WorkingHours        string          `db:"working_hours" json:"workingHours"`
	AboutText           string          `db:"about_text" json:"aboutText"`
	FooterIcons         json.RawMessage `db:"footer_icons" json:"footerIcons"`
	TakeawayFeeEnabled  bool            `db:"takeaway_fee_enabled" json:"takeawayFeeEnabled"`
	TakeawayFee         int64           `db:"takeaway_fee" json:"takeawayFee"`
	UpdatedAt           time.Time       `db:"updated_at" json:"updatedAt"`
}

// FooterIcon is one entry of the (max 5) dynamic bottom-nav icon links
// configured from the settings page (item 8). Icon is a lucide-react icon
// name (e.g. "Instagram"), looked up client-side.
type FooterIcon struct {
	Icon string `json:"icon"`
	Link string `json:"link"`
}
