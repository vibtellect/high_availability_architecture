package main

import (
	"context"
	"time"

	"github.com/sirupsen/logrus"

	"github.com/vibtellect/high_availability_architecture/app/services/checkout_service/internal/config"
	"github.com/vibtellect/high_availability_architecture/app/services/checkout_service/internal/db"
	"github.com/vibtellect/high_availability_architecture/app/services/checkout_service/internal/handlers"
	"github.com/vibtellect/high_availability_architecture/app/services/checkout_service/internal/router"
	"github.com/vibtellect/high_availability_architecture/app/services/checkout_service/internal/services"
)

func main() {
	// Load configuration from environment variables
	cfg := config.LoadConfig()

	// Validate configuration
	if err := cfg.Validate(); err != nil {
		logrus.WithError(err).Fatal("Invalid configuration")
	}

	// Initialize logger with configuration
	log := logrus.New()
	log.SetFormatter(&logrus.JSONFormatter{})
	log.SetLevel(cfg.GetLogLevel())

	// Print configuration (without sensitive data)
	cfg.PrintConfig(log)

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

	// Setup router using shared configuration
	routerInstance := router.SetupRouter(&router.RouterConfig{
		Config:       cfg,
		Logger:       log,
		DynamoClient: dynamoClient,
		CartHandler:  cartHandler,
		OrderHandler: orderHandler,
		IsTestMode:   false,
	})

	// Start server
	log.WithFields(logrus.Fields{
		"port":        cfg.Port,
		"service":     cfg.ServiceName,
		"version":     cfg.ServiceVersion,
		"environment": string(cfg.Environment),
	}).Info("Starting Checkout Service server")

	if err := routerInstance.Run(":" + cfg.Port); err != nil {
		log.WithError(err).Fatal("Failed to start server")
	}
}
