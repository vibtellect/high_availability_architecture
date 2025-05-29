package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"

	"checkout_service/internal/models"
	"checkout_service/internal/services"
)

type CartHandler struct {
	cartService *services.CartService
	logger      *logrus.Logger
}

func NewCartHandler(cartService *services.CartService, logger *logrus.Logger) *CartHandler {
	return &CartHandler{
		cartService: cartService,
		logger:      logger,
	}
}

// GetCart retrieves a user's cart
// GET /api/v1/checkout/cart/:userId
func (h *CartHandler) GetCart(c *gin.Context) {
	userID := c.Param("userId")
	if userID == "" {
		h.logger.Warn("Missing userId parameter")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "userId parameter is required",
		})
		return
	}

	cart, err := h.cartService.GetCart(c.Request.Context(), userID)
	if err != nil {
		h.logger.WithError(err).WithField("userId", userID).Error("Failed to get cart")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve cart",
		})
		return
	}

	c.JSON(http.StatusOK, cart)
}

// AddToCart adds an item to the user's cart
// POST /api/v1/checkout/cart
func (h *CartHandler) AddToCart(c *gin.Context) {
	var req models.AddToCartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.WithError(err).Warn("Invalid add to cart request")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	cart, err := h.cartService.AddToCart(c.Request.Context(), req.UserID, req.ProductID, req.Quantity)
	if err != nil {
		h.logger.WithError(err).WithFields(logrus.Fields{
			"userId":    req.UserID,
			"productId": req.ProductID,
			"quantity":  req.Quantity,
		}).Error("Failed to add item to cart")
		
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to add item to cart",
		})
		return
	}

	h.logger.WithFields(logrus.Fields{
		"userId":    req.UserID,
		"productId": req.ProductID,
		"quantity":  req.Quantity,
	}).Info("Successfully added item to cart")

	c.JSON(http.StatusOK, cart)
}

// UpdateCartItem updates the quantity of an item in the cart
// PUT /api/v1/checkout/cart/:userId
func (h *CartHandler) UpdateCartItem(c *gin.Context) {
	userID := c.Param("userId")
	if userID == "" {
		h.logger.Warn("Missing userId parameter")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "userId parameter is required",
		})
		return
	}

	var req models.UpdateCartItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.WithError(err).Warn("Invalid update cart item request")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	cart, err := h.cartService.UpdateCartItem(c.Request.Context(), userID, req.ProductID, req.Quantity)
	if err != nil {
		h.logger.WithError(err).WithFields(logrus.Fields{
			"userId":    userID,
			"productId": req.ProductID,
			"quantity":  req.Quantity,
		}).Error("Failed to update cart item")
		
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update cart item",
		})
		return
	}

	h.logger.WithFields(logrus.Fields{
		"userId":    userID,
		"productId": req.ProductID,
		"quantity":  req.Quantity,
	}).Info("Successfully updated cart item")

	c.JSON(http.StatusOK, cart)
}

// RemoveFromCart removes an item from the user's cart
// DELETE /api/v1/checkout/cart/:userId/item/:productId
func (h *CartHandler) RemoveFromCart(c *gin.Context) {
	userID := c.Param("userId")
	productID := c.Param("productId")
	
	if userID == "" || productID == "" {
		h.logger.Warn("Missing userId or productId parameter")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "userId and productId parameters are required",
		})
		return
	}

	cart, err := h.cartService.RemoveFromCart(c.Request.Context(), userID, productID)
	if err != nil {
		h.logger.WithError(err).WithFields(logrus.Fields{
			"userId":    userID,
			"productId": productID,
		}).Error("Failed to remove item from cart")
		
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to remove item from cart",
		})
		return
	}

	h.logger.WithFields(logrus.Fields{
		"userId":    userID,
		"productId": productID,
	}).Info("Successfully removed item from cart")

	c.JSON(http.StatusOK, cart)
}

// ClearCart removes all items from the user's cart
// DELETE /api/v1/checkout/cart/:userId
func (h *CartHandler) ClearCart(c *gin.Context) {
	userID := c.Param("userId")
	if userID == "" {
		h.logger.Warn("Missing userId parameter")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "userId parameter is required",
		})
		return
	}

	err := h.cartService.ClearCart(c.Request.Context(), userID)
	if err != nil {
		h.logger.WithError(err).WithField("userId", userID).Error("Failed to clear cart")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to clear cart",
		})
		return
	}

	h.logger.WithField("userId", userID).Info("Successfully cleared cart")

	c.JSON(http.StatusOK, gin.H{
		"message": "Cart cleared successfully",
		"userId":  userID,
	})
}

// GetCheckoutSummary calculates the checkout summary with taxes and shipping
// GET /api/v1/checkout/summary/:userId
func (h *CartHandler) GetCheckoutSummary(c *gin.Context) {
	userID := c.Param("userId")
	if userID == "" {
		h.logger.Warn("Missing userId parameter")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "userId parameter is required",
		})
		return
	}

	summary, err := h.cartService.GetCheckoutSummary(c.Request.Context(), userID)
	if err != nil {
		h.logger.WithError(err).WithField("userId", userID).Error("Failed to get checkout summary")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to calculate checkout summary",
		})
		return
	}

	c.JSON(http.StatusOK, summary)
} 