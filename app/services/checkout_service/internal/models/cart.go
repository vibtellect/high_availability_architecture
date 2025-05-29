package models

import (
	"time"
)

// CartItem represents an item in the shopping cart
type CartItem struct {
	ProductID   string  `json:"productId" dynamodbav:"productId"`
	ProductName string  `json:"productName" dynamodbav:"productName"`
	Price       float64 `json:"price" dynamodbav:"price"`
	Quantity    int     `json:"quantity" dynamodbav:"quantity"`
	Category    string  `json:"category" dynamodbav:"category"`
}

// Cart represents a user's shopping cart
type Cart struct {
	UserID    string     `json:"userId" dynamodbav:"userId"`
	Items     []CartItem `json:"items" dynamodbav:"items"`
	Total     float64    `json:"total" dynamodbav:"total"`
	CreatedAt time.Time  `json:"createdAt" dynamodbav:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt" dynamodbav:"updatedAt"`
}

// AddToCartRequest represents the request to add an item to cart
type AddToCartRequest struct {
	UserID    string `json:"userId" binding:"required"`
	ProductID string `json:"productId" binding:"required"`
	Quantity  int    `json:"quantity" binding:"required,min=1"`
}

// UpdateCartItemRequest represents the request to update cart item quantity
type UpdateCartItemRequest struct {
	ProductID string `json:"productId" binding:"required"`
	Quantity  int    `json:"quantity" binding:"required,min=1"`
}

// RemoveFromCartRequest represents the request to remove an item from cart
type RemoveFromCartRequest struct {
	ProductID string `json:"productId" binding:"required"`
}

// OrderStatus represents the status of an order
type OrderStatus string

const (
	OrderStatusPending   OrderStatus = "pending"
	OrderStatusConfirmed OrderStatus = "confirmed"
	OrderStatusProcessing OrderStatus = "processing"
	OrderStatusShipped   OrderStatus = "shipped"
	OrderStatusDelivered OrderStatus = "delivered"
	OrderStatusCancelled OrderStatus = "cancelled"
)

// PaymentStatus represents the status of payment
type PaymentStatus string

const (
	PaymentStatusPending    PaymentStatus = "pending"
	PaymentStatusCompleted  PaymentStatus = "completed"
	PaymentStatusFailed     PaymentStatus = "failed"
	PaymentStatusRefunded   PaymentStatus = "refunded"
)

// OrderItem represents an item in an order
type OrderItem struct {
	ProductID   string  `json:"productId" dynamodbav:"productId"`
	ProductName string  `json:"productName" dynamodbav:"productName"`
	Price       float64 `json:"price" dynamodbav:"price"`
	Quantity    int     `json:"quantity" dynamodbav:"quantity"`
	Category    string  `json:"category" dynamodbav:"category"`
	Subtotal    float64 `json:"subtotal" dynamodbav:"subtotal"`
}

// Order represents a customer order
type Order struct {
	OrderID       string        `json:"orderId" dynamodbav:"orderId"`
	UserID        string        `json:"userId" dynamodbav:"userId"`
	Items         []OrderItem   `json:"items" dynamodbav:"items"`
	TotalAmount   float64       `json:"totalAmount" dynamodbav:"totalAmount"`
	Status        OrderStatus   `json:"status" dynamodbav:"status"`
	PaymentStatus PaymentStatus `json:"paymentStatus" dynamodbav:"paymentStatus"`
	PaymentMethod string        `json:"paymentMethod" dynamodbav:"paymentMethod"`
	CreatedAt     time.Time     `json:"createdAt" dynamodbav:"createdAt"`
	UpdatedAt     time.Time     `json:"updatedAt" dynamodbav:"updatedAt"`
}

// CreateOrderRequest represents the request to create an order
type CreateOrderRequest struct {
	UserID        string `json:"userId" binding:"required"`
	PaymentMethod string `json:"paymentMethod" binding:"required"`
}

// UpdateOrderStatusRequest represents the request to update order status
type UpdateOrderStatusRequest struct {
	Status OrderStatus `json:"status" binding:"required"`
}

// Product represents product information (from Product Service)
type Product struct {
	ProductID      string    `json:"productId"`
	Name           string    `json:"name"`
	Description    string    `json:"description"`
	Price          float64   `json:"price"`
	InventoryCount int       `json:"inventoryCount"`
	Category       string    `json:"category"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

// User represents basic user information (from User Service)
type User struct {
	UserID    string    `json:"userId"`
	Email     string    `json:"email"`
	Username  string    `json:"username"`
	FirstName string    `json:"firstName"`
	LastName  string    `json:"lastName"`
	Active    bool      `json:"active"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// Event represents an event to be published to SNS/SQS
type Event struct {
	EventType string                 `json:"eventType"`
	Source    string                 `json:"source"`
	Data      map[string]interface{} `json:"data"`
	Timestamp time.Time              `json:"timestamp"`
	UserID    string                 `json:"userId,omitempty"`
	OrderID   string                 `json:"orderId,omitempty"`
}

// CheckoutSummary represents the checkout summary before order creation
type CheckoutSummary struct {
	UserID      string      `json:"userId"`
	Items       []CartItem  `json:"items"`
	Subtotal    float64     `json:"subtotal"`
	Tax         float64     `json:"tax"`
	Shipping    float64     `json:"shipping"`
	Total       float64     `json:"total"`
	CreatedAt   time.Time   `json:"createdAt"`
}
