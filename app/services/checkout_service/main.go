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

	// Initialize AWS configuration (SNS/SQS)
	awsConfig, err := config.NewAWSConfig(log)
	if err != nil {
		log.WithError(err).Fatal("Failed to initialize AWS configuration")
	}

	// Initialize event publisher
	eventPublisher := services.NewEventPublisher(awsConfig, cfg, log)

	// Test SNS connectivity
	if err := eventPublisher.HealthCheck(ctx); err != nil {
		log.WithError(err).Warn("SNS health check failed, but continuing startup")
	} else {
		log.Info("SNS connection established successfully")
	}

	// Initialize repositories
	cartRepo := db.NewCartRepository(dynamoClient, log)
	orderRepo := db.NewOrderRepository(dynamoClient, log)

	// Initialize Product Service client with circuit breaker
	productServiceURL := "http://product-service:8080" // Default URL, can be made configurable
	productClient := services.NewProductServiceClient(productServiceURL, log)

	// Initialize services with event publisher and product client
	cartService := services.NewCartService(cartRepo, eventPublisher, log)
	orderService := services.NewOrderService(orderRepo, cartRepo, cartService, eventPublisher, productClient, log)

	// Initialize handlers
	cartHandler := handlers.NewCartHandler(cartService, log)
	orderHandler := handlers.NewOrderHandler(orderService, log)
	circuitBreakerHandler := handlers.NewCircuitBreakerHandler(productClient, log)

	// Setup router using shared configuration
	routerInstance := router.SetupRouter(&router.RouterConfig{
		Config:                cfg,
		Logger:                log,
		DynamoClient:          dynamoClient,
		CartHandler:           cartHandler,
		OrderHandler:          orderHandler,
		CircuitBreakerHandler: circuitBreakerHandler,
		IsTestMode:            false,
	})

	// Start metrics updater for circuit breakers
	metricsUpdater := services.NewMetricsUpdater(productClient, log)
	metricsCtx, metricsCancel := context.WithCancel(context.Background())
	defer metricsCancel()
	metricsUpdater.Start(metricsCtx, 30*time.Second) // Update every 30 seconds

	// Start server
	log.WithFields(logrus.Fields{
		"port":        cfg.Port,
		"service":     cfg.ServiceName,
		"version":     cfg.ServiceVersion,
		"environment": string(cfg.Environment),
	}).Info("Starting Checkout Service server with Circuit Breaker monitoring")

	if err := routerInstance.Run(":" + cfg.Port); err != nil {
		log.WithError(err).Fatal("Failed to start server")
	}
}
