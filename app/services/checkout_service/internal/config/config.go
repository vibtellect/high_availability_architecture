package config

import (
	"os"
	"strings"
	"time"

	"github.com/sirupsen/logrus"
)

// Environment represents the application environment
type Environment string

const (
	Development Environment = "development"
	Production  Environment = "production"
	Testing     Environment = "testing"
)

// Config holds all application configuration
type Config struct {
	// Environment settings
	Environment Environment
	Port        string

	// Logging
	LogLevel string

	// Request handling
	RequestTimeout time.Duration

	// CORS settings
	CORSAllowedOrigins []string

	// Database
	DynamoDBRegion   string
	DynamoDBEndpoint string // For local development

	// Service info
	ServiceName    string
	ServiceVersion string
}

// LoadConfig loads configuration from environment variables
func LoadConfig() *Config {
	config := &Config{
		// Default values
		Environment:    Development,
		Port:           "8082",
		LogLevel:       "info",
		RequestTimeout: 30 * time.Second,
		ServiceName:    "checkout-service",
		ServiceVersion: "1.0.0",
		DynamoDBRegion: "us-west-2",
	}

	// Load environment
	if env := os.Getenv("APP_ENV"); env != "" {
		config.Environment = Environment(strings.ToLower(env))
	} else if env := os.Getenv("GO_ENV"); env != "" {
		switch strings.ToLower(env) {
		case "production", "prod":
			config.Environment = Production
		case "testing", "test":
			config.Environment = Testing
		default:
			config.Environment = Development
		}
	} else if ginMode := os.Getenv("GIN_MODE"); ginMode == "release" {
		config.Environment = Production
	}

	// Load port
	if port := os.Getenv("PORT"); port != "" {
		config.Port = port
	}

	// Load log level
	if logLevel := os.Getenv("LOG_LEVEL"); logLevel != "" {
		config.LogLevel = strings.ToLower(logLevel)
	}

	// Load request timeout
	if timeoutStr := os.Getenv("REQUEST_TIMEOUT"); timeoutStr != "" {
		if timeout, err := time.ParseDuration(timeoutStr); err == nil {
			config.RequestTimeout = timeout
		}
	}

	// Load CORS origins
	if corsOrigins := os.Getenv("CORS_ALLOWED_ORIGINS"); corsOrigins != "" {
		config.CORSAllowedOrigins = parseAllowedOrigins(corsOrigins)
	}

	// Load DynamoDB settings
	if region := os.Getenv("DYNAMODB_REGION"); region != "" {
		config.DynamoDBRegion = region
	}
	if endpoint := os.Getenv("DYNAMODB_ENDPOINT"); endpoint != "" {
		config.DynamoDBEndpoint = endpoint
	}

	// Load service info
	if name := os.Getenv("SERVICE_NAME"); name != "" {
		config.ServiceName = name
	}
	if version := os.Getenv("SERVICE_VERSION"); version != "" {
		config.ServiceVersion = version
	}

	return config
}

// IsProduction returns true if running in production environment
func (c *Config) IsProduction() bool {
	return c.Environment == Production
}

// IsDevelopment returns true if running in development environment
func (c *Config) IsDevelopment() bool {
	return c.Environment == Development
}

// IsTesting returns true if running in testing environment
func (c *Config) IsTesting() bool {
	return c.Environment == Testing
}

// GetLogLevel returns the appropriate logrus log level
func (c *Config) GetLogLevel() logrus.Level {
	switch strings.ToLower(c.LogLevel) {
	case "debug":
		return logrus.DebugLevel
	case "warn", "warning":
		return logrus.WarnLevel
	case "error":
		return logrus.ErrorLevel
	case "fatal":
		return logrus.FatalLevel
	case "panic":
		return logrus.PanicLevel
	default:
		return logrus.InfoLevel
	}
}

// GetCORSOrigins returns the allowed CORS origins for the current environment
func (c *Config) GetCORSOrigins() []string {
	if len(c.CORSAllowedOrigins) > 0 {
		return c.CORSAllowedOrigins
	}

	// Default origins based on environment
	switch c.Environment {
	case Production:
		return []string{"https://yourdomain.com", "https://www.yourdomain.com"}
	case Development:
		return []string{"*"}
	case Testing:
		return []string{"http://localhost:3000", "http://localhost:8080"}
	default:
		return []string{"*"}
	}
}

// parseAllowedOrigins parses comma-separated origins from environment variable
func parseAllowedOrigins(origins string) []string {
	if origins == "" {
		return nil
	}

	parsed := make([]string, 0)
	for _, origin := range strings.Split(origins, ",") {
		trimmed := strings.TrimSpace(origin)
		if trimmed != "" {
			parsed = append(parsed, trimmed)
		}
	}
	return parsed
}

// Validate validates the configuration
func (c *Config) Validate() error {
	// Add any configuration validation logic here
	if c.Port == "" {
		c.Port = "8082"
	}

	if c.RequestTimeout <= 0 {
		c.RequestTimeout = 30 * time.Second
	}

	return nil
}

// GetDatabaseConfig returns database-specific configuration
func (c *Config) GetDatabaseConfig() map[string]interface{} {
	dbConfig := map[string]interface{}{
		"region": c.DynamoDBRegion,
	}

	if c.DynamoDBEndpoint != "" {
		dbConfig["endpoint"] = c.DynamoDBEndpoint
	}

	return dbConfig
}

// PrintConfig logs the current configuration (without sensitive data)
func (c *Config) PrintConfig(logger *logrus.Logger) {
	logger.WithFields(logrus.Fields{
		"environment":     string(c.Environment),
		"port":            c.Port,
		"log_level":       c.LogLevel,
		"request_timeout": c.RequestTimeout.String(),
		"cors_origins":    c.GetCORSOrigins(),
		"service_name":    c.ServiceName,
		"service_version": c.ServiceVersion,
		"dynamodb_region": c.DynamoDBRegion,
	}).Info("Application configuration loaded")
}
