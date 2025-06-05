package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/vibtellect/high_availability_architecture/app/services/checkout_service/internal/db"
	"github.com/vibtellect/high_availability_architecture/app/services/checkout_service/internal/models"

	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
)

// Error definitions
var (
	ErrOrderNotFound           = errors.New("order not found")
	ErrOrderNotCancellable     = errors.New("order cannot be cancelled in current status")
	ErrPaymentAlreadyProcessed = errors.New("payment already processed")
	ErrCartEmpty               = errors.New("cannot create order: cart is empty")
	ErrInvalidStatusTransition = errors.New("invalid status transition")
)

type OrderService struct {
	orderRepo      *db.OrderRepository
	cartRepo       *db.CartRepository
	cartService    *CartService
	eventPublisher *EventPublisher
	productClient  *ProductServiceClient
	logger         *logrus.Logger
}

// NewOrderService creates a new order service
func NewOrderService(orderRepo *db.OrderRepository, cartRepo *db.CartRepository, cartService *CartService, eventPublisher *EventPublisher, productClient *ProductServiceClient, logger *logrus.Logger) *OrderService {
	return &OrderService{
		orderRepo:      orderRepo,
		cartRepo:       cartRepo,
		cartService:    cartService,
		eventPublisher: eventPublisher,
		productClient:  productClient,
		logger:         logger,
	}
}

// CreateOrder creates a new order from the user's cart
func (s *OrderService) CreateOrder(ctx context.Context, userID, paymentMethod string) (*models.Order, error) {
	// Get cart contents
	cart, err := s.cartRepo.GetCart(ctx, userID)
	if err != nil {
		return nil, err
	}

	if len(cart.Items) == 0 {
		return nil, ErrCartEmpty
	}

	// Validate all products in cart using Product Service with Circuit Breaker
	var orderItems []models.OrderItem
	var validationErrors []string

	for _, cartItem := range cart.Items {
		// Validate product availability and stock (with circuit breaker)
		isValid, product, validationErr := s.productClient.ValidateProduct(ctx, cartItem.ProductID, cartItem.Quantity)

		if validationErr != nil {
			s.logger.WithFields(logrus.Fields{
				"product_id": cartItem.ProductID,
				"quantity":   cartItem.Quantity,
				"error":      validationErr.Error(),
			}).Warn("Product validation failed, using fallback")
			// Continue with fallback validation result
		}

		if !isValid {
			validationErrors = append(validationErrors, fmt.Sprintf("Product %s: insufficient stock (requested: %d)", cartItem.ProductID, cartItem.Quantity))
			continue
		}

		// Use validated product info if available, otherwise use cart item info
		productName := cartItem.ProductName
		productPrice := cartItem.Price
		productCategory := cartItem.Category

		if product != nil {
			productName = product.Name
			productPrice = product.Price
			productCategory = product.Category

			s.logger.WithFields(logrus.Fields{
				"product_id": cartItem.ProductID,
				"validated":  true,
				"stock":      product.StockCount,
			}).Info("Product validation successful")
		}

		orderItem := models.OrderItem{
			ProductID:   cartItem.ProductID,
			ProductName: productName,
			Price:       productPrice,
			Quantity:    cartItem.Quantity,
			Category:    productCategory,
			Subtotal:    productPrice * float64(cartItem.Quantity),
		}
		orderItems = append(orderItems, orderItem)
	}

	// If any products failed validation, return error
	if len(validationErrors) > 0 {
		return nil, fmt.Errorf("product validation failed: %v", validationErrors)
	}

	// If no valid items remain after validation, return error
	if len(orderItems) == 0 {
		return nil, fmt.Errorf("no valid products remaining after validation")
	}

	// Create order
	order := &models.Order{
		OrderID:       generateOrderID(), // Add UUID generation
		UserID:        userID,
		Items:         orderItems,
		TotalAmount:   calculateTotal(orderItems), // Add total calculation
		Status:        models.OrderStatusPending,
		PaymentStatus: models.PaymentStatusPending,
		PaymentMethod: paymentMethod,
	}

	// Save order
	err = s.orderRepo.CreateOrder(ctx, order)
	if err != nil {
		return nil, err
	}

	// Publish order created event
	if publishErr := s.eventPublisher.PublishOrderCreated(ctx, order); publishErr != nil {
		s.logger.WithError(publishErr).Error("Failed to publish order created event")
	}

	// Clear cart after successful order creation
	err = s.cartRepo.ClearCart(ctx, userID)
	if err != nil {
		s.logger.WithError(err).WithField("userId", userID).Warn("Failed to clear cart after order creation")
	}

	s.logger.WithFields(logrus.Fields{
		"orderId":             order.OrderID,
		"userId":              order.UserID,
		"totalAmount":         order.TotalAmount,
		"itemCount":           len(order.Items),
		"validationUsed":      true,
		"circuitBreakerState": s.productClient.GetCircuitBreakerState().String(),
	}).Info("Order created successfully with product validation")

	return order, nil
}

// GetOrder retrieves an order by ID
func (s *OrderService) GetOrder(ctx context.Context, orderID string) (*models.Order, error) {
	order, err := s.orderRepo.GetOrder(ctx, orderID)
	if err != nil {
		return nil, err
	}

	if order == nil {
		return nil, ErrOrderNotFound
	}

	return order, nil
}

// GetOrdersByUser retrieves all orders for a user
func (s *OrderService) GetOrdersByUser(ctx context.Context, userID string) ([]models.Order, error) {
	return s.orderRepo.GetOrdersByUser(ctx, userID)
}

// UpdateOrderStatus updates the status of an order
func (s *OrderService) UpdateOrderStatus(ctx context.Context, orderID string, status models.OrderStatus) (*models.Order, error) {
	// Verify order exists
	existingOrder, err := s.orderRepo.GetOrder(ctx, orderID)
	if err != nil {
		return nil, err
	}

	if existingOrder == nil {
		return nil, ErrOrderNotFound
	}

	// Validate status transition
	if !s.isValidStatusTransition(existingOrder.Status, status) {
		return nil, fmt.Errorf("%w: from %s to %s", ErrInvalidStatusTransition, existingOrder.Status, status)
	}

	// Update status
	err = s.orderRepo.UpdateOrderStatus(ctx, orderID, status)
	if err != nil {
		return nil, err
	}

	// Get updated order to return
	updatedOrder, err := s.orderRepo.GetOrder(ctx, orderID)
	if err != nil {
		return nil, err
	}

	// Publish order status updated event
	if publishErr := s.eventPublisher.PublishOrderStatusUpdated(ctx, updatedOrder, existingOrder.Status); publishErr != nil {
		s.logger.WithError(publishErr).Error("Failed to publish order status updated event")
	}

	s.logger.WithFields(logrus.Fields{
		"orderId":   orderID,
		"oldStatus": existingOrder.Status,
		"newStatus": status,
	}).Info("Order status updated")

	return updatedOrder, nil
}

// UpdatePaymentStatus updates the payment status of an order
func (s *OrderService) UpdatePaymentStatus(ctx context.Context, orderID string, paymentStatus models.PaymentStatus) error {
	// Verify order exists
	existingOrder, err := s.orderRepo.GetOrder(ctx, orderID)
	if err != nil {
		return err
	}

	if existingOrder == nil {
		return ErrOrderNotFound
	}

	// Update payment status
	err = s.orderRepo.UpdatePaymentStatus(ctx, orderID, paymentStatus)
	if err != nil {
		return err
	}

	// Get updated order for payment event publishing (after payment status update)
	updatedOrder, err := s.orderRepo.GetOrder(ctx, orderID)
	if err != nil {
		s.logger.WithError(err).Error("Failed to get updated order for payment event publishing")
	} else {
		// Publish payment status updated event
		if publishErr := s.eventPublisher.PublishPaymentStatusUpdated(ctx, updatedOrder, existingOrder.PaymentStatus); publishErr != nil {
			s.logger.WithError(publishErr).Error("Failed to publish payment status updated event")
		}
	}

	// Auto-update order status based on payment status
	if paymentStatus == models.PaymentStatusCompleted && existingOrder.Status == models.OrderStatusPending {
		err = s.orderRepo.UpdateOrderStatus(ctx, orderID, models.OrderStatusConfirmed)
		if err != nil {
			s.logger.WithError(err).Error("Failed to auto-update order status")
		} else {
			// Get the LATEST order state after status update for accurate event publishing
			finalUpdatedOrder, err := s.orderRepo.GetOrder(ctx, orderID)
			if err != nil {
				s.logger.WithError(err).Error("Failed to get final updated order for auto status event publishing")
			} else {
				// Publish order status updated event with the current, accurate order data
				if publishErr := s.eventPublisher.PublishOrderStatusUpdated(ctx, finalUpdatedOrder, existingOrder.Status); publishErr != nil {
					s.logger.WithError(publishErr).Error("Failed to publish auto order status updated event")
				}
			}
		}
	}

	s.logger.WithFields(logrus.Fields{
		"orderId":          orderID,
		"oldPaymentStatus": existingOrder.PaymentStatus,
		"newPaymentStatus": paymentStatus,
	}).Info("Payment status updated")

	return nil
}

// CancelOrder cancels an order
func (s *OrderService) CancelOrder(ctx context.Context, orderID string) (*models.Order, error) {
	// Verify order exists and can be cancelled
	existingOrder, err := s.orderRepo.GetOrder(ctx, orderID)
	if err != nil {
		return nil, err
	}

	if existingOrder == nil {
		return nil, ErrOrderNotFound
	}

	if !s.canCancelOrder(existingOrder.Status) {
		return nil, ErrOrderNotCancellable
	}

	// Update status to cancelled
	err = s.orderRepo.UpdateOrderStatus(ctx, orderID, models.OrderStatusCancelled)
	if err != nil {
		return nil, err
	}

	s.logger.WithFields(logrus.Fields{
		"orderId":   orderID,
		"userId":    existingOrder.UserID,
		"oldStatus": existingOrder.Status,
	}).Info("Order cancelled")

	// Get updated order to return
	updatedOrder, err := s.orderRepo.GetOrder(ctx, orderID)
	if err != nil {
		return nil, err
	}

	return updatedOrder, nil
}

// ProcessPayment simulates payment processing
func (s *OrderService) ProcessPayment(ctx context.Context, orderID string) (*models.Order, error) {
	// Verify order exists
	existingOrder, err := s.orderRepo.GetOrder(ctx, orderID)
	if err != nil {
		return nil, err
	}

	if existingOrder == nil {
		return nil, ErrOrderNotFound
	}

	if existingOrder.PaymentStatus != models.PaymentStatusPending {
		return nil, ErrPaymentAlreadyProcessed
	}

	// Simulate payment processing delay
	time.Sleep(100 * time.Millisecond)

	// For demo purposes, randomly succeed/fail payment (90% success rate)
	// In real implementation, this would integrate with payment gateway
	success := true // Simplified for demo

	if success {
		err = s.UpdatePaymentStatus(ctx, orderID, models.PaymentStatusCompleted)
	} else {
		err = s.UpdatePaymentStatus(ctx, orderID, models.PaymentStatusFailed)
	}

	if err != nil {
		return nil, err
	}

	// Get updated order to return
	updatedOrder, err := s.orderRepo.GetOrder(ctx, orderID)
	if err != nil {
		return nil, err
	}

	return updatedOrder, nil
}

// isValidStatusTransition validates if a status transition is allowed
func (s *OrderService) isValidStatusTransition(currentStatus, newStatus models.OrderStatus) bool {
	transitions := map[models.OrderStatus][]models.OrderStatus{
		models.OrderStatusPending: {
			models.OrderStatusConfirmed,
			models.OrderStatusCancelled,
		},
		models.OrderStatusConfirmed: {
			models.OrderStatusProcessing,
			models.OrderStatusCancelled,
		},
		models.OrderStatusProcessing: {
			models.OrderStatusShipped,
			models.OrderStatusCancelled,
		},
		models.OrderStatusShipped: {
			models.OrderStatusDelivered,
		},
		models.OrderStatusDelivered: {}, // Final state
		models.OrderStatusCancelled: {}, // Final state
	}

	allowedTransitions, exists := transitions[currentStatus]
	if !exists {
		return false
	}

	for _, allowed := range allowedTransitions {
		if allowed == newStatus {
			return true
		}
	}

	return false
}

// canCancelOrder checks if an order can be cancelled
func (s *OrderService) canCancelOrder(status models.OrderStatus) bool {
	cancellableStatuses := []models.OrderStatus{
		models.OrderStatusPending,
		models.OrderStatusConfirmed,
		models.OrderStatusProcessing,
	}

	for _, cancellable := range cancellableStatuses {
		if status == cancellable {
			return true
		}
	}

	return false
}

// generateOrderID creates a new UUID for order ID
func generateOrderID() string {
	return uuid.New().String()
}

// calculateTotal calculates the total amount from order items
func calculateTotal(items []models.OrderItem) float64 {
	total := 0.0
	for _, item := range items {
		total += item.Subtotal
	}
	return total
}
