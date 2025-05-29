package main

import (
	"context"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"

	"checkout_service/internal/db"
	"checkout_service/internal/handlers"
	"checkout_service/internal/services"
)

func main() {
	// Initialize logger
	log := logrus.New()
	log.SetFormatter(&logrus.JSONFormatter{})
	log.SetLevel(logrus.InfoLevel)

	// Set Gin mode based on environment
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.DebugMode)
	}

	// Initialize DynamoDB client
	dynamoClient, err := db.NewDynamoDBClient(log)
	if err != nil {
		log.WithError(err).Fatal("Failed to initialize DynamoDB client")
	}

	// Test DynamoDB connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	if err := dynamoClient.HealthCheck(ctx); err != nil {
		log.WithError(err).Warn("DynamoDB health check failed, but continuing startup")
	} else {
		log.Info("DynamoDB connection established successfully")
	}

	// Initialize repositories
	cartRepo := db.NewCartRepository(dynamoClient, log)
	orderRepo := db.NewOrderRepository(dynamoClient, log)

	// Initialize services
	cartService := services.NewCartService(cartRepo, log)
	orderService := services.NewOrderService(orderRepo, cartRepo, cartService, log)

	// Initialize handlers
	cartHandler := handlers.NewCartHandler(cartService, log)
	orderHandler := handlers.NewOrderHandler(orderService, log)

	// Create Gin router with default middleware (Logger and Recovery)
	router := gin.Default()

// Add CORS middleware
     router.Use(func(c *gin.Context) {
        allowedOrigins := os.Getenv("CORS_ALLOWED_ORIGINS")
        if allowedOrigins == "" {
            allowedOrigins = "*" // Default for development
        }
        c.Header("Access-Control-Allow-Origin", allowedOrigins)
         c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
         c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		
		c.Next()
	})

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		// Test DynamoDB connectivity
		healthCtx, healthCancel := context.WithTimeout(c.Request.Context(), 3*time.Second)
		defer healthCancel()
		
		dbHealthy := true
		if err := dynamoClient.HealthCheck(healthCtx); err != nil {
			log.WithError(err).Warn("DynamoDB health check failed")
			dbHealthy = false
		}

		status := "healthy"
		httpStatus := http.StatusOK
		if !dbHealthy {
			status = "degraded"
			httpStatus = http.StatusServiceUnavailable
		}

		c.JSON(httpStatus, gin.H{
			"status":    status,
			"service":   "checkout-service",
			"version":   "1.0.0",
			"timestamp": time.Now().UTC(),
			"checks": gin.H{
				"database": dbHealthy,
			},
		})
	})

	// Hello World endpoint
	router.GET("/", func(c *gin.Context) {
		log.Info("Hello World endpoint called")
		c.JSON(http.StatusOK, gin.H{
			"message": "Hello World from Checkout Service!",
			"service": "checkout-service",
			"tech":    "Go 1.21 + Gin Framework",
			"status":  "running",
		})
	})

	// API v1 routes group
	v1 := router.Group("/api/v1")
	{
		// Checkout service endpoints
		checkout := v1.Group("/checkout")
		{
			// Basic hello endpoint
			checkout.GET("/hello", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{
					"message": "Hello from Checkout API!",
					"status":  "ready",
					"version": "1.0.0",
				})
			})

			// Cart endpoints
			checkout.GET("/cart/:userId", cartHandler.GetCart)
			checkout.POST("/cart", cartHandler.AddToCart)
			checkout.PUT("/cart/:userId", cartHandler.UpdateCartItem)
			checkout.DELETE("/cart/:userId/item/:productId", cartHandler.RemoveFromCart)
			checkout.DELETE("/cart/:userId", cartHandler.ClearCart)
			checkout.GET("/summary/:userId", cartHandler.GetCheckoutSummary)

			// Order endpoints
			checkout.POST("/order", orderHandler.CreateOrder)
			checkout.GET("/order/:orderId", orderHandler.GetOrder)
			checkout.GET("/orders/user/:userId", orderHandler.GetOrdersByUser)
			checkout.PUT("/order/:orderId/status", orderHandler.UpdateOrderStatus)
			checkout.POST("/order/:orderId/cancel", orderHandler.CancelOrder)
			checkout.POST("/order/:orderId/payment", orderHandler.ProcessPayment)
		}
	}

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}

	log.WithFields(logrus.Fields{
		"port":    port,
		"service": "checkout-service",
		"version": "1.0.0",
	}).Info("Starting Checkout Service server")
	
	if err := router.Run(":" + port); err != nil {
		log.WithError(err).Fatal("Failed to start server")
	}
} 