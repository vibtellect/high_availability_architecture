package services

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"checkout_service/internal/db"
	"checkout_service/internal/models"

	"github.com/sirupsen/logrus"
)

type CartService struct {
	cartRepo       *db.CartRepository
	logger         *logrus.Logger
	productBaseURL string
}

// NewCartService creates a new cart service
func NewCartService(cartRepo *db.CartRepository, logger *logrus.Logger) *CartService {
	productBaseURL := os.Getenv("PRODUCT_SERVICE_URL")
	if productBaseURL == "" {
		productBaseURL = "http://localhost:8080" // Default for local development
	}

	return &CartService{
		cartRepo:       cartRepo,
		logger:         logger,
		productBaseURL: productBaseURL,
	}
}

// GetCart retrieves a cart by user ID
func (s *CartService) GetCart(ctx context.Context, userID string) (*models.Cart, error) {
	return s.cartRepo.GetCart(ctx, userID)
}

// AddToCart adds an item to the cart
func (s *CartService) AddToCart(ctx context.Context, userID, productID string, quantity int) (*models.Cart, error) {
	// Validate product exists and get details
	product, err := s.getProductDetails(productID)
	if err != nil {
		s.logger.WithError(err).WithField("productId", productID).Error("Failed to get product details")
		return nil, fmt.Errorf("product not found or service unavailable")
	}

	// Check inventory
	if product.InventoryCount < quantity {
		return nil, fmt.Errorf("insufficient inventory. Available: %d, Requested: %d", product.InventoryCount, quantity)
	}

	// Get existing cart
	cart, err := s.cartRepo.GetCart(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Check if item already exists in cart
	itemExists := false
	for i := range cart.Items {
		if cart.Items[i].ProductID == productID {
			cart.Items[i].Quantity += quantity
			itemExists = true
			break
		}
	}

	// Add new item if not exists
	if !itemExists {
		cartItem := models.CartItem{
			ProductID:   product.ProductID,
			ProductName: product.Name,
			Price:       product.Price,
			Quantity:    quantity,
			Category:    product.Category,
		}
		cart.Items = append(cart.Items, cartItem)
	}

	// Save cart
	err = s.cartRepo.SaveCart(ctx, cart)
	if err != nil {
		return nil, err
	}

	s.logger.WithFields(logrus.Fields{
		"userId":    userID,
		"productId": productID,
		"quantity":  quantity,
		"total":     cart.Total,
	}).Info("Item added to cart")

	return cart, nil
}

// UpdateCartItem updates the quantity of an item in the cart
func (s *CartService) UpdateCartItem(ctx context.Context, userID string, productID string, quantity int) (*models.Cart, error) {
	cart, err := s.cartRepo.GetCart(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Find and update item
	itemFound := false
	for i := range cart.Items {
		if cart.Items[i].ProductID == productID {
			cart.Items[i].Quantity = quantity
			itemFound = true
			break
		}
	}

	if !itemFound {
		return nil, fmt.Errorf("product not found in cart")
	}

	// Save cart
	err = s.cartRepo.SaveCart(ctx, cart)
	if err != nil {
		return nil, err
	}

	s.logger.WithFields(logrus.Fields{
		"userId":    userID,
		"productId": productID,
		"quantity":  quantity,
	}).Info("Cart item updated")

	return cart, nil
}

// RemoveFromCart removes an item from the cart
func (s *CartService) RemoveFromCart(ctx context.Context, userID string, productID string) (*models.Cart, error) {
	cart, err := s.cartRepo.GetCart(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Find and remove item
	itemFound := false
	for i := range cart.Items {
		if cart.Items[i].ProductID == productID {
			cart.Items = append(cart.Items[:i], cart.Items[i+1:]...)
			itemFound = true
			break
		}
	}

	if !itemFound {
		return nil, fmt.Errorf("product not found in cart")
	}

	// Save cart
	err = s.cartRepo.SaveCart(ctx, cart)
	if err != nil {
		return nil, err
	}

	s.logger.WithFields(logrus.Fields{
		"userId":    userID,
		"productId": productID,
	}).Info("Item removed from cart")

	return cart, nil
}

// ClearCart removes all items from the cart
func (s *CartService) ClearCart(ctx context.Context, userID string) error {
	err := s.cartRepo.ClearCart(ctx, userID)
	if err != nil {
		return err
	}

	s.logger.WithField("userId", userID).Info("Cart cleared")
	return nil
}

// GetCheckoutSummary calculates the checkout summary
func (s *CartService) GetCheckoutSummary(ctx context.Context, userID string) (*models.CheckoutSummary, error) {
	cart, err := s.cartRepo.GetCart(ctx, userID)
	if err != nil {
		return nil, err
	}

	if len(cart.Items) == 0 {
		return nil, fmt.Errorf("cart is empty")
	}

	subtotal := cart.Total
	tax := subtotal * 0.08     // 8% tax rate
	shipping := 5.99           // Fixed shipping rate
	total := subtotal + tax + shipping

	summary := &models.CheckoutSummary{
		UserID:    userID,
		Items:     cart.Items,
		Subtotal:  subtotal,
		Tax:       tax,
		Shipping:  shipping,
		Total:     total,
		CreatedAt: cart.CreatedAt,
	}

	return summary, nil
}

// getProductDetails fetches product details from product service
func (s *CartService) getProductDetails(productID string) (*models.Product, error) {
	url := fmt.Sprintf("%s/api/v1/products/%s", s.productBaseURL, productID)
	
	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to call product service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, fmt.Errorf("product not found")
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("product service returned status: %d", resp.StatusCode)
	}

	var product models.Product
	err = json.NewDecoder(resp.Body).Decode(&product)
	if err != nil {
		return nil, fmt.Errorf("failed to decode product response: %w", err)
	}

	return &product, nil
} 