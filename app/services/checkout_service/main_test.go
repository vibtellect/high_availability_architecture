package main

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func setupRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.Default()

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"service": "checkout-service",
			"version": "1.0.0",
		})
	})

	// Hello World endpoint
	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Hello World from Checkout Service!",
			"service": "checkout-service",
			"tech":    "Go 1.21 + Gin Framework",
		})
	})

	// API v1 routes group
	v1 := router.Group("/api/v1")
	{
		checkout := v1.Group("/checkout")
		{
			checkout.GET("/hello", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{
					"message": "Hello from Checkout API!",
					"status":  "ready",
				})
			})
		}
	}

	return router
}

func TestHealthEndpoint(t *testing.T) {
	router := setupRouter()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/health", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "healthy")
	assert.Contains(t, w.Body.String(), "checkout-service")
}

func TestHelloWorldEndpoint(t *testing.T) {
	router := setupRouter()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "Hello World from Checkout Service!")
	assert.Contains(t, w.Body.String(), "Go 1.21 + Gin Framework")
}

func TestCheckoutHelloEndpoint(t *testing.T) {
	router := setupRouter()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/checkout/hello", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "Hello from Checkout API!")
	assert.Contains(t, w.Body.String(), "ready")
} 