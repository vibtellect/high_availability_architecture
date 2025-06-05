package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"github.com/vibtellect/high_availability_architecture/app/services/checkout_service/internal/services"
)

// CircuitBreakerHandler handles circuit breaker status endpoints
type CircuitBreakerHandler struct {
	productClient *services.ProductServiceClient
	logger        *logrus.Logger
}

// NewCircuitBreakerHandler creates a new circuit breaker handler
func NewCircuitBreakerHandler(productClient *services.ProductServiceClient, logger *logrus.Logger) *CircuitBreakerHandler {
	return &CircuitBreakerHandler{
		productClient: productClient,
		logger:        logger,
	}
}

// CircuitBreakerStatus represents the status of a circuit breaker
type CircuitBreakerStatus struct {
	Service     string `json:"service"`
	State       string `json:"state"`
	Requests    uint32 `json:"requests"`
	Successes   uint32 `json:"successes"`
	Failures    uint32 `json:"failures"`
	Consecutive uint32 `json:"consecutive_failures"`
}

// GetCircuitBreakerStatus returns the current status of all circuit breakers
func (h *CircuitBreakerHandler) GetCircuitBreakerStatus(c *gin.Context) {
	productCBCounts := h.productClient.GetCircuitBreakerCounts()
	productCBState := h.productClient.GetCircuitBreakerState()

	status := []CircuitBreakerStatus{
		{
			Service:     "product-service",
			State:       productCBState.String(),
			Requests:    productCBCounts.Requests,
			Successes:   productCBCounts.TotalSuccesses,
			Failures:    productCBCounts.TotalFailures,
			Consecutive: productCBCounts.ConsecutiveFailures,
		},
	}

	h.logger.WithFields(logrus.Fields{
		"product_service_state":    productCBState.String(),
		"product_service_requests": productCBCounts.Requests,
		"product_service_failures": productCBCounts.TotalFailures,
	}).Debug("Circuit breaker status requested")

	c.JSON(http.StatusOK, gin.H{
		"circuit_breakers": status,
		"timestamp":        c.GetTime("request_time"),
	})
}

// GetHealthWithCircuitBreaker returns health status including circuit breaker information
func (h *CircuitBreakerHandler) GetHealthWithCircuitBreaker(c *gin.Context) {
	productCBState := h.productClient.GetCircuitBreakerState()
	productCBCounts := h.productClient.GetCircuitBreakerCounts()

	health := gin.H{
		"status": "healthy",
		"circuit_breakers": gin.H{
			"product_service": gin.H{
				"state":                productCBState.String(),
				"requests":             productCBCounts.Requests,
				"failures":             productCBCounts.TotalFailures,
				"consecutive_failures": productCBCounts.ConsecutiveFailures,
				"is_available":         productCBState.String() != "open",
			},
		},
		"timestamp": c.GetTime("request_time"),
	}

	statusCode := http.StatusOK
	if productCBState.String() == "open" {
		health["status"] = "degraded"
		statusCode = http.StatusServiceUnavailable
		h.logger.Warn("Service is in degraded state due to open circuit breakers")
	}

	c.JSON(statusCode, health)
}
