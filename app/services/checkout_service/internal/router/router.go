package router

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"

	"github.com/vibtellect/high_availability_architecture/app/services/checkout_service/internal/config"
	"github.com/vibtellect/high_availability_architecture/app/services/checkout_service/internal/db"
	"github.com/vibtellect/high_availability_architecture/app/services/checkout_service/internal/handlers"
	"github.com/vibtellect/high_availability_architecture/app/services/checkout_service/internal/middleware"

	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// RouterConfig holds the configuration and dependencies for router setup
type RouterConfig struct {
	Config       *config.Config
	Logger       *logrus.Logger
	DynamoClient *db.DynamoDBClient
	CartHandler  *handlers.CartHandler
	OrderHandler *handlers.OrderHandler
	IsTestMode   bool
}

// SetupRouter creates and configures the Gin router with all routes
func SetupRouter(routerConfig *RouterConfig) *gin.Engine {
	cfg := routerConfig.Config

	// Set Gin mode based on environment
	if routerConfig.IsTestMode {
		gin.SetMode(gin.TestMode)
	} else if cfg.IsProduction() {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}

	// Create Gin router with default middleware (Logger and Recovery)
	router := gin.Default()

	// Add Prometheus metrics middleware (early in the chain for accurate metrics)
	if routerConfig.Logger != nil {
		router.Use(middleware.PrometheusMiddlewareWithLogger(routerConfig.Logger))
	} else {
		router.Use(middleware.DefaultPrometheusMiddleware())
	}

	// Add request timeout middleware (before other middleware for proper coverage)
	if routerConfig.Logger != nil {
		router.Use(middleware.RequestTimeoutMiddlewareWithLogger(cfg.RequestTimeout, routerConfig.Logger))
	} else {
		router.Use(middleware.RequestTimeoutMiddleware(cfg.RequestTimeout))
	}

	// Add CORS middleware (skip in test mode for simplicity)
	if !routerConfig.IsTestMode {
		router.Use(setupCORSMiddleware(cfg, routerConfig.Logger))
	}

	// Health check endpoint
	router.GET("/health", createHealthHandler(routerConfig))

	// Prometheus metrics endpoint
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// Hello World endpoint
	router.GET("/", createRootHandler(cfg, routerConfig.Logger, routerConfig.IsTestMode))

	// API v1 routes group
	v1 := router.Group("/api/v1")
	{
		// Checkout service endpoints
		checkout := v1.Group("/checkout")
		{
			// Basic hello endpoint
			checkout.GET("/hello", createCheckoutHelloHandler(cfg))

			// Only add full API routes if handlers are provided (not in basic test mode)
			if routerConfig.CartHandler != nil && routerConfig.OrderHandler != nil {
				setupCartRoutes(checkout, routerConfig.CartHandler)
				setupOrderRoutes(checkout, routerConfig.OrderHandler)
			}
		}
	}

	return router
}

// setupCORSMiddleware creates and returns the CORS middleware
func setupCORSMiddleware(cfg *config.Config, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get allowed origins from configuration
		allowedOrigins := cfg.GetCORSOrigins()
		requestOrigin := c.GetHeader("Origin")
		var allowedOrigin string

		if cfg.IsProduction() {
			// In production, be strict about origins
			if isOriginAllowed(requestOrigin, allowedOrigins) {
				allowedOrigin = requestOrigin
			} else {
				// For production, be strict about origins
				if requestOrigin != "" && logger != nil {
					logger.WithFields(logrus.Fields{
						"requestOrigin":  requestOrigin,
						"allowedOrigins": allowedOrigins,
					}).Warn("CORS request from disallowed origin")
				}
				// Don't set Access-Control-Allow-Origin header for disallowed origins
				allowedOrigin = ""
			}
		} else {
			// In development/testing, be more permissive
			if containsWildcard(allowedOrigins) {
				allowedOrigin = "*"
			} else if isOriginAllowed(requestOrigin, allowedOrigins) {
				allowedOrigin = requestOrigin
			} else {
				allowedOrigin = requestOrigin // More permissive in development
			}
		}

		// Set CORS headers only if origin is allowed
		if allowedOrigin != "" {
			c.Header("Access-Control-Allow-Origin", allowedOrigin)
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
			c.Header("Access-Control-Max-Age", "86400") // 24 hours cache for preflight
		}

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// createHealthHandler creates the health check handler
func createHealthHandler(routerConfig *RouterConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		cfg := routerConfig.Config

		if routerConfig.IsTestMode || routerConfig.DynamoClient == nil {
			// Simple health check for tests
			c.JSON(http.StatusOK, gin.H{
				"status":         "healthy",
				"service":        cfg.ServiceName,
				"version":        cfg.ServiceVersion,
				"environment":    string(cfg.Environment),
				"requestTimeout": cfg.RequestTimeout.String(),
			})
			return
		}

		// Full health check with DynamoDB connectivity (already has timeout via middleware)
		healthCtx, healthCancel := context.WithTimeout(c.Request.Context(), 3*time.Second)
		defer healthCancel()

		dbHealthy := true
		if err := routerConfig.DynamoClient.HealthCheck(healthCtx); err != nil {
			if routerConfig.Logger != nil {
				routerConfig.Logger.WithError(err).Warn("DynamoDB health check failed")
			}
			dbHealthy = false
		}

		status := "healthy"
		httpStatus := http.StatusOK
		if !dbHealthy {
			status = "degraded"
			httpStatus = http.StatusServiceUnavailable
		}

		c.JSON(httpStatus, gin.H{
			"status":         status,
			"service":        cfg.ServiceName,
			"version":        cfg.ServiceVersion,
			"environment":    string(cfg.Environment),
			"timestamp":      time.Now().UTC(),
			"requestTimeout": cfg.RequestTimeout.String(),
			"checks": gin.H{
				"database": dbHealthy,
			},
		})
	}
}

// createRootHandler creates the root endpoint handler
func createRootHandler(cfg *config.Config, logger *logrus.Logger, isTestMode bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		if logger != nil && !isTestMode {
			logger.Info("Hello World endpoint called")
		}
		c.JSON(http.StatusOK, gin.H{
			"message":        "Hello World from Checkout Service!",
			"service":        cfg.ServiceName,
			"tech":           "Go 1.21 + Gin Framework",
			"status":         "running",
			"environment":    string(cfg.Environment),
			"requestTimeout": cfg.RequestTimeout.String(),
		})
	}
}

// createCheckoutHelloHandler creates the checkout hello endpoint handler
func createCheckoutHelloHandler(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message":        "Hello from Checkout API!",
			"status":         "ready",
			"version":        cfg.ServiceVersion,
			"environment":    string(cfg.Environment),
			"requestTimeout": cfg.RequestTimeout.String(),
		})
	}
}

// setupCartRoutes sets up cart-related routes
func setupCartRoutes(checkout *gin.RouterGroup, cartHandler *handlers.CartHandler) {
	checkout.GET("/cart/:userId", cartHandler.GetCart)
	checkout.POST("/cart", cartHandler.AddToCart)
	checkout.PUT("/cart/:userId", cartHandler.UpdateCartItem)
	checkout.DELETE("/cart/:userId/item/:productId", cartHandler.RemoveFromCart)
	checkout.DELETE("/cart/:userId", cartHandler.ClearCart)
	checkout.GET("/summary/:userId", cartHandler.GetCheckoutSummary)
}

// setupOrderRoutes sets up order-related routes
func setupOrderRoutes(checkout *gin.RouterGroup, orderHandler *handlers.OrderHandler) {
	checkout.POST("/order", orderHandler.CreateOrder)
	checkout.GET("/order/:orderId", orderHandler.GetOrder)
	checkout.GET("/orders/user/:userId", orderHandler.GetOrdersByUser)
	checkout.PUT("/order/:orderId/status", orderHandler.UpdateOrderStatus)
	checkout.POST("/order/:orderId/cancel", orderHandler.CancelOrder)
	checkout.POST("/order/:orderId/payment", orderHandler.ProcessPayment)
}

// SetupTestRouter creates a router configured for testing (simplified dependencies)
func SetupTestRouter(cfg *config.Config) *gin.Engine {
	return SetupRouter(&RouterConfig{
		Config:     cfg,
		IsTestMode: true,
	})
}

// isOriginAllowed checks if the request origin is in the allowed list
func isOriginAllowed(origin string, allowedOrigins []string) bool {
	for _, allowed := range allowedOrigins {
		if allowed == "*" || allowed == origin {
			return true
		}
	}
	return false
}

// containsWildcard checks if the allowed origins list contains a wildcard
func containsWildcard(allowedOrigins []string) bool {
	for _, origin := range allowedOrigins {
		if origin == "*" {
			return true
		}
	}
	return false
}
