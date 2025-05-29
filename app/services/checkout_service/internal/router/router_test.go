package router

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"

	"github.com/vibtellect/high_availability_architecture/app/services/checkout_service/internal/config"
)

func TestSetupTestRouter(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Create test configuration with proper timeout
	cfg := &config.Config{
		Environment:    config.Testing,
		ServiceName:    "checkout-service",
		ServiceVersion: "1.0.0",
		RequestTimeout: 30 * time.Second, // Set proper timeout for tests
	}

	router := SetupTestRouter(cfg)

	// Test that router is created
	assert.NotNil(t, router)

	// Test health endpoint
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/health", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "healthy")
	assert.Contains(t, w.Body.String(), "checkout-service")
}

func TestHealthEndpoint(t *testing.T) {
	gin.SetMode(gin.TestMode)

	cfg := &config.Config{
		Environment:    config.Testing,
		ServiceName:    "checkout-service",
		ServiceVersion: "1.0.0",
		RequestTimeout: 30 * time.Second,
	}

	router := SetupTestRouter(cfg)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/health", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"status":"healthy"`)
	assert.Contains(t, w.Body.String(), `"service":"checkout-service"`)
	assert.Contains(t, w.Body.String(), `"environment":"testing"`)
}

func TestRootEndpoint(t *testing.T) {
	gin.SetMode(gin.TestMode)

	cfg := &config.Config{
		Environment:    config.Development,
		ServiceName:    "checkout-service",
		ServiceVersion: "1.0.0",
		RequestTimeout: 30 * time.Second,
	}

	router := SetupTestRouter(cfg)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "Hello World from Checkout Service!")
	assert.Contains(t, w.Body.String(), `"environment":"development"`)
}

func TestCheckoutHelloEndpoint(t *testing.T) {
	gin.SetMode(gin.TestMode)

	cfg := &config.Config{
		Environment:    config.Development,
		ServiceName:    "checkout-service",
		ServiceVersion: "1.0.0",
		RequestTimeout: 30 * time.Second,
	}

	router := SetupTestRouter(cfg)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/checkout/hello", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "Hello from Checkout API!")
	assert.Contains(t, w.Body.String(), `"environment":"development"`)
}
