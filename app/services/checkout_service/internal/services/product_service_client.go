package services

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/sirupsen/logrus"
	"github.com/sony/gobreaker"
	"github.com/vibtellect/high_availability_architecture/app/services/checkout_service/internal/middleware"
)

// Product represents a product from the Product Service
type Product struct {
	ProductID   string  `json:"productId"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Category    string  `json:"category"`
	StockCount  int     `json:"stockCount"`
}

// ProductServiceClient handles communication with the Product Service
type ProductServiceClient struct {
	baseURL        string
	client         *http.Client
	circuitBreaker *gobreaker.CircuitBreaker
	logger         *logrus.Logger
	metrics        *middleware.CircuitBreakerMetrics
}

// NewProductServiceClient creates a new Product Service client with circuit breaker
func NewProductServiceClient(baseURL string, logger *logrus.Logger) *ProductServiceClient {
	metrics := middleware.NewCircuitBreakerMetrics(logger)

	// Circuit breaker settings
	settings := gobreaker.Settings{
		Name:        "ProductService",
		MaxRequests: 3,
		Interval:    10 * time.Second,
		Timeout:     20 * time.Second,
		ReadyToTrip: func(counts gobreaker.Counts) bool {
			failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
			return counts.Requests >= 3 && failureRatio >= 0.6
		},
		OnStateChange: func(name string, from gobreaker.State, to gobreaker.State) {
			logger.WithFields(logrus.Fields{
				"service":    name,
				"from_state": from.String(),
				"to_state":   to.String(),
			}).Info("Circuit breaker state changed")

			// Record state transition in metrics
			metrics.RecordStateTransition(name, "checkout-service", "product-service", from, to)
		},
	}

	cb := gobreaker.NewCircuitBreaker(settings)

	client := &ProductServiceClient{
		baseURL: baseURL,
		client: &http.Client{
			Timeout: 5 * time.Second,
		},
		circuitBreaker: cb,
		logger:         logger,
		metrics:        metrics,
	}

	// Initialize metrics with current state
	client.updateMetrics()

	return client
}

// ValidateProduct validates if a product exists and has sufficient stock
func (psc *ProductServiceClient) ValidateProduct(ctx context.Context, productID string, quantity int) (bool, *Product, error) {
	start := time.Now()

	// Record the request attempt
	psc.metrics.RecordRequest("ProductService", "checkout-service", "product-service")

	result, err := psc.circuitBreaker.Execute(func() (interface{}, error) {
		return psc.doValidateProduct(ctx, productID, quantity)
	})

	duration := time.Since(start).Seconds()

	if err != nil {
		// Record failure metrics
		psc.metrics.RecordFailure("ProductService", "checkout-service", "product-service", duration)

		psc.logger.WithFields(logrus.Fields{
			"product_id": productID,
			"quantity":   quantity,
			"error":      err.Error(),
			"duration":   duration,
		}).Error("Product validation failed")

		// Fallback: assume product is valid but with limited stock
		return psc.fallbackValidation(productID, quantity), nil, err
	}

	// Record success metrics
	psc.metrics.RecordSuccess("ProductService", "checkout-service", "product-service", duration)

	validationResult := result.(ValidationResult)

	psc.logger.WithFields(logrus.Fields{
		"product_id": productID,
		"quantity":   quantity,
		"is_valid":   validationResult.IsValid,
		"duration":   duration,
	}).Debug("Product validation completed successfully")

	return validationResult.IsValid, validationResult.Product, nil
}

// ValidationResult holds the result of product validation
type ValidationResult struct {
	IsValid bool
	Product *Product
}

// doValidateProduct performs the actual HTTP request to validate product
func (psc *ProductServiceClient) doValidateProduct(ctx context.Context, productID string, quantity int) (ValidationResult, error) {
	url := fmt.Sprintf("%s/api/v1/products/%s", psc.baseURL, productID)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return ValidationResult{}, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "checkout-service/1.0")

	resp, err := psc.client.Do(req)
	if err != nil {
		return ValidationResult{}, fmt.Errorf("failed to make request to product service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		psc.logger.WithField("product_id", productID).Warn("Product not found")
		return ValidationResult{IsValid: false, Product: nil}, nil
	}

	if resp.StatusCode != http.StatusOK {
		return ValidationResult{}, fmt.Errorf("product service returned status %d", resp.StatusCode)
	}

	var product Product
	if err := json.NewDecoder(resp.Body).Decode(&product); err != nil {
		return ValidationResult{}, fmt.Errorf("failed to decode product response: %w", err)
	}

	// Check if sufficient stock is available
	isValid := product.StockCount >= quantity
	if !isValid {
		psc.logger.WithFields(logrus.Fields{
			"product_id": productID,
			"requested":  quantity,
			"available":  product.StockCount,
		}).Warn("Insufficient stock for product")
	}

	return ValidationResult{
		IsValid: isValid,
		Product: &product,
	}, nil
}

// fallbackValidation provides a fallback when the Product Service is unavailable
func (psc *ProductServiceClient) fallbackValidation(productID string, quantity int) bool {
	// Simple fallback logic: allow small quantities, reject large ones
	fallbackResult := quantity <= 5

	psc.logger.WithFields(logrus.Fields{
		"product_id": productID,
		"quantity":   quantity,
		"fallback":   fallbackResult,
	}).Warn("Using fallback validation due to Product Service unavailability")

	return fallbackResult
}

// GetCircuitBreakerState returns the current state of the circuit breaker
func (psc *ProductServiceClient) GetCircuitBreakerState() gobreaker.State {
	return psc.circuitBreaker.State()
}

// GetCircuitBreakerCounts returns the current counts of the circuit breaker
func (psc *ProductServiceClient) GetCircuitBreakerCounts() gobreaker.Counts {
	return psc.circuitBreaker.Counts()
}

// updateMetrics updates the circuit breaker metrics
func (psc *ProductServiceClient) updateMetrics() {
	psc.metrics.RecordState("ProductService", "checkout-service", "product-service", psc.circuitBreaker.State())
}

// UpdateMetrics provides external access to update metrics (for periodic updates)
func (psc *ProductServiceClient) UpdateMetrics() {
	psc.updateMetrics()
}
