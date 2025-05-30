package models

import (
	"time"

	"github.com/google/uuid"
)

// CheckoutEventType represents the type of checkout events
type CheckoutEventType string

const (
	// Cart Events
	CartEventItemAdded   CheckoutEventType = "CART_ITEM_ADDED"
	CartEventItemUpdated CheckoutEventType = "CART_ITEM_UPDATED"
	CartEventItemRemoved CheckoutEventType = "CART_ITEM_REMOVED"
	CartEventCleared     CheckoutEventType = "CART_CLEARED"

	// Order Events
	OrderEventCreated    CheckoutEventType = "ORDER_CREATED"
	OrderEventConfirmed  CheckoutEventType = "ORDER_CONFIRMED"
	OrderEventProcessing CheckoutEventType = "ORDER_PROCESSING"
	OrderEventShipped    CheckoutEventType = "ORDER_SHIPPED"
	OrderEventDelivered  CheckoutEventType = "ORDER_DELIVERED"
	OrderEventCancelled  CheckoutEventType = "ORDER_CANCELLED"

	// Payment Events
	PaymentEventInitiated CheckoutEventType = "PAYMENT_INITIATED"
	PaymentEventCompleted CheckoutEventType = "PAYMENT_COMPLETED"
	PaymentEventFailed    CheckoutEventType = "PAYMENT_FAILED"
	PaymentEventRefunded  CheckoutEventType = "PAYMENT_REFUNDED"

	// Checkout Events
	CheckoutEventStarted   CheckoutEventType = "CHECKOUT_STARTED"
	CheckoutEventCompleted CheckoutEventType = "CHECKOUT_COMPLETED"
	CheckoutEventAbandoned CheckoutEventType = "CHECKOUT_ABANDONED"
)

// CheckoutEvent represents a specific checkout-related event
type CheckoutEvent struct {
	EventID   string                 `json:"eventId"`
	EventType CheckoutEventType      `json:"eventType"`
	Source    string                 `json:"source"`
	Timestamp time.Time              `json:"timestamp"`
	UserID    string                 `json:"userId,omitempty"`
	OrderID   string                 `json:"orderId,omitempty"`
	Data      map[string]interface{} `json:"data"`
}

// NewCheckoutEvent creates a new checkout event
func NewCheckoutEvent(eventType CheckoutEventType, userID string, data map[string]interface{}) *CheckoutEvent {
	// Initialize data to empty map if nil to ensure JSON output is {} instead of null
	if data == nil {
		data = make(map[string]interface{})
	}

	return &CheckoutEvent{
		EventID:   uuid.New().String(),
		EventType: eventType,
		Source:    "checkout-service",
		Timestamp: time.Now().UTC(),
		UserID:    userID,
		Data:      data,
	}
}

// NewOrderEvent creates a new order-related event
func NewOrderEvent(eventType CheckoutEventType, userID, orderID string, data map[string]interface{}) *CheckoutEvent {
	// Initialize data to empty map if nil to ensure JSON output is {} instead of null
	if data == nil {
		data = make(map[string]interface{})
	}

	event := NewCheckoutEvent(eventType, userID, data)
	event.OrderID = orderID
	return event
}

// GetEventCategory returns the category of the event (cart, order, payment, checkout)
func (e *CheckoutEvent) GetEventCategory() string {
	switch e.EventType {
	case CartEventItemAdded, CartEventItemUpdated, CartEventItemRemoved, CartEventCleared:
		return "cart"
	case OrderEventCreated, OrderEventConfirmed, OrderEventProcessing, OrderEventShipped, OrderEventDelivered, OrderEventCancelled:
		return "order"
	case PaymentEventInitiated, PaymentEventCompleted, PaymentEventFailed, PaymentEventRefunded:
		return "payment"
	case CheckoutEventStarted, CheckoutEventCompleted, CheckoutEventAbandoned:
		return "checkout"
	default:
		return "unknown"
	}
}

// IsOrderEvent returns true if the event is order-related
func (e *CheckoutEvent) IsOrderEvent() bool {
	return e.GetEventCategory() == "order"
}

// IsCartEvent returns true if the event is cart-related
func (e *CheckoutEvent) IsCartEvent() bool {
	return e.GetEventCategory() == "cart"
}

// IsPaymentEvent returns true if the event is payment-related
func (e *CheckoutEvent) IsPaymentEvent() bool {
	return e.GetEventCategory() == "payment"
}

// IsCheckoutEvent returns true if the event is checkout flow-related
func (e *CheckoutEvent) IsCheckoutEvent() bool {
	return e.GetEventCategory() == "checkout"
}
