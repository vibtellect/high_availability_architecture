package handlers

import (
	"context"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"

	"github.com/vibtellect/high_availability_architecture/app/services/checkout_service/internal/models"
	"github.com/vibtellect/high_availability_architecture/app/services/checkout_service/internal/services"
)

type OrderHandler struct {
	orderService *services.OrderService
	logger       *logrus.Logger
}

func NewOrderHandler(orderService *services.OrderService, logger *logrus.Logger) *OrderHandler {
	return &OrderHandler{
		orderService: orderService,
		logger:       logger,
	}
}

// CreateOrder creates a new order from the user's cart
// POST /api/v1/checkout/order
func (h *OrderHandler) CreateOrder(c *gin.Context) {
	// Check if context is already cancelled
	if err := c.Request.Context().Err(); err != nil {
		h.logger.WithError(err).Warn("Request context cancelled before processing")
		c.JSON(http.StatusRequestTimeout, gin.H{
			"error":   "Request cancelled",
			"details": err.Error(),
		})
		return
	}

	var req models.CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.WithError(err).Warn("Invalid create order request")
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	order, err := h.orderService.CreateOrder(c.Request.Context(), req.UserID, req.PaymentMethod)
	if err != nil {
		// Check if it's a context cancellation error
		if err == context.Canceled || err == context.DeadlineExceeded {
			h.logger.WithError(err).WithFields(logrus.Fields{
				"userId":        req.UserID,
				"paymentMethod": req.PaymentMethod,
			}).Warn("Create order request timed out or was cancelled")
			c.JSON(http.StatusRequestTimeout, gin.H{
				"error":   "Request timeout",
				"message": "The order creation request took too long to process",
			})
			return
		}

		h.logger.WithError(err).WithFields(logrus.Fields{
			"userId":        req.UserID,
			"paymentMethod": req.PaymentMethod,
		}).Error("Failed to create order")

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create order",
		})
		return
	}

	h.logger.WithFields(logrus.Fields{
		"orderId":       order.OrderID,
		"userId":        req.UserID,
		"paymentMethod": req.PaymentMethod,
		"totalAmount":   order.TotalAmount,
	}).Info("Successfully created order")

	c.JSON(http.StatusCreated, order)
}

// GetOrder retrieves an order by ID
// GET /api/v1/checkout/order/:orderId
func (h *OrderHandler) GetOrder(c *gin.Context) {
	// Check if context is already cancelled
	if err := c.Request.Context().Err(); err != nil {
		h.logger.WithError(err).Warn("Request context cancelled before processing")
		c.JSON(http.StatusRequestTimeout, gin.H{
			"error":   "Request cancelled",
			"details": err.Error(),
		})
		return
	}

	orderID := c.Param("orderId")
	if orderID == "" {
		h.logger.Warn("Missing orderId parameter")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "orderId parameter is required",
		})
		return
	}

	order, err := h.orderService.GetOrder(c.Request.Context(), orderID)
	if err != nil {
		// Check if it's a context cancellation error
		if err == context.Canceled || err == context.DeadlineExceeded {
			h.logger.WithError(err).WithField("orderId", orderID).Warn("Get order request timed out or was cancelled")
			c.JSON(http.StatusRequestTimeout, gin.H{
				"error":   "Request timeout",
				"message": "The order retrieval request took too long to process",
			})
			return
		}

		h.logger.WithError(err).WithField("orderId", orderID).Error("Failed to get order")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve order",
		})
		return
	}

	if order == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Order not found",
		})
		return
	}

	c.JSON(http.StatusOK, order)
}

// GetOrdersByUser retrieves all orders for a specific user
// GET /api/v1/checkout/orders/user/:userId
func (h *OrderHandler) GetOrdersByUser(c *gin.Context) {
	// Check if context is already cancelled
	if err := c.Request.Context().Err(); err != nil {
		h.logger.WithError(err).Warn("Request context cancelled before processing")
		c.JSON(http.StatusRequestTimeout, gin.H{
			"error":   "Request cancelled",
			"details": err.Error(),
		})
		return
	}

	userID := c.Param("userId")
	if userID == "" {
		h.logger.Warn("Missing userId parameter")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "userId parameter is required",
		})
		return
	}

	orders, err := h.orderService.GetOrdersByUser(c.Request.Context(), userID)
	if err != nil {
		// Check if it's a context cancellation error
		if err == context.Canceled || err == context.DeadlineExceeded {
			h.logger.WithError(err).WithField("userId", userID).Warn("Get orders by user request timed out or was cancelled")
			c.JSON(http.StatusRequestTimeout, gin.H{
				"error":   "Request timeout",
				"message": "The user orders retrieval request took too long to process",
			})
			return
		}

		h.logger.WithError(err).WithField("userId", userID).Error("Failed to get orders for user")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve user orders",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"orders": orders,
		"count":  len(orders),
	})
}

// UpdateOrderStatus updates the status of an order
// PUT /api/v1/checkout/order/:orderId/status
func (h *OrderHandler) UpdateOrderStatus(c *gin.Context) {
	// Check if context is already cancelled
	if err := c.Request.Context().Err(); err != nil {
		h.logger.WithError(err).Warn("Request context cancelled before processing")
		c.JSON(http.StatusRequestTimeout, gin.H{
			"error":   "Request cancelled",
			"details": err.Error(),
		})
		return
	}

	orderID := c.Param("orderId")
	if orderID == "" {
		h.logger.Warn("Missing orderId parameter")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "orderId parameter is required",
		})
		return
	}

	var req models.UpdateOrderStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.WithError(err).Warn("Invalid update order status request")
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	order, err := h.orderService.UpdateOrderStatus(c.Request.Context(), orderID, req.Status)
	if err != nil {
		// Check if it's a context cancellation error
		if err == context.Canceled || err == context.DeadlineExceeded {
			h.logger.WithError(err).WithFields(logrus.Fields{
				"orderId": orderID,
				"status":  req.Status,
			}).Warn("Update order status request timed out or was cancelled")
			c.JSON(http.StatusRequestTimeout, gin.H{
				"error":   "Request timeout",
				"message": "The order status update request took too long to process",
			})
			return
		}

		h.logger.WithError(err).WithFields(logrus.Fields{
			"orderId": orderID,
			"status":  req.Status,
		}).Error("Failed to update order status")

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update order status",
		})
		return
	}

	if order == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Order not found",
		})
		return
	}

	h.logger.WithFields(logrus.Fields{
		"orderId": orderID,
		"status":  req.Status,
	}).Info("Successfully updated order status")

	c.JSON(http.StatusOK, order)
}

// CancelOrder cancels an order if it's in a cancellable state
// POST /api/v1/checkout/order/:orderId/cancel
func (h *OrderHandler) CancelOrder(c *gin.Context) {
	// Check if context is already cancelled
	if err := c.Request.Context().Err(); err != nil {
		h.logger.WithError(err).Warn("Request context cancelled before processing")
		c.JSON(http.StatusRequestTimeout, gin.H{
			"error":   "Request cancelled",
			"details": err.Error(),
		})
		return
	}

	orderID := c.Param("orderId")
	if orderID == "" {
		h.logger.Warn("Missing orderId parameter")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "orderId parameter is required",
		})
		return
	}

	order, err := h.orderService.CancelOrder(c.Request.Context(), orderID)
	if err != nil {
		// Check if it's a context cancellation error
		if err == context.Canceled || err == context.DeadlineExceeded {
			h.logger.WithError(err).WithField("orderId", orderID).Warn("Cancel order request timed out or was cancelled")
			c.JSON(http.StatusRequestTimeout, gin.H{
				"error":   "Request timeout",
				"message": "The order cancellation request took too long to process",
			})
			return
		}

		h.logger.WithError(err).WithField("orderId", orderID).Error("Failed to cancel order")

		// Check if it's a validation error (order cannot be cancelled)
		// Check if it's a validation error (order cannot be cancelled)
		if errors.Is(err, services.ErrOrderNotCancellable) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Order cannot be cancelled in its current status",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to cancel order",
		})
		return
	}

	if order == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Order not found",
		})
		return
	}

	h.logger.WithField("orderId", orderID).Info("Successfully cancelled order")

	c.JSON(http.StatusOK, order)
}

// ProcessPayment processes payment for an order (mock implementation)
// POST /api/v1/checkout/order/:orderId/payment
func (h *OrderHandler) ProcessPayment(c *gin.Context) {
	// Check if context is already cancelled
	if err := c.Request.Context().Err(); err != nil {
		h.logger.WithError(err).Warn("Request context cancelled before processing")
		c.JSON(http.StatusRequestTimeout, gin.H{
			"error":   "Request cancelled",
			"details": err.Error(),
		})
		return
	}

	orderID := c.Param("orderId")
	if orderID == "" {
		h.logger.Warn("Missing orderId parameter")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "orderId parameter is required",
		})
		return
	}

	order, err := h.orderService.ProcessPayment(c.Request.Context(), orderID)
	if err != nil {
		// Check if it's a context cancellation error
		if err == context.Canceled || err == context.DeadlineExceeded {
			h.logger.WithError(err).WithField("orderId", orderID).Warn("Process payment request timed out or was cancelled")
			c.JSON(http.StatusRequestTimeout, gin.H{
				"error":   "Request timeout",
				"message": "The payment processing request took too long to process",
			})
			return
		}

		h.logger.WithError(err).WithField("orderId", orderID).Error("Failed to process payment")

		// Check for specific error types
		if errors.Is(err, services.ErrOrderNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Order not found",
			})
			return
		}

		if errors.Is(err, services.ErrPaymentAlreadyProcessed) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Payment has already been processed for this order",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Payment processing failed",
		})
		return
	}

	h.logger.WithFields(logrus.Fields{
		"orderId":       orderID,
		"paymentStatus": order.PaymentStatus,
	}).Info("Successfully processed payment")

	c.JSON(http.StatusOK, order)
}
