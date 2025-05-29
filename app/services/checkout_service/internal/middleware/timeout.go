package middleware

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

// TimeoutConfig holds configuration for the timeout middleware
type TimeoutConfig struct {
	Timeout time.Duration
	Logger  *logrus.Logger
}

// DefaultTimeoutConfig returns a default timeout configuration
func DefaultTimeoutConfig() TimeoutConfig {
	return TimeoutConfig{
		Timeout: 30 * time.Second, // 30 seconds default timeout
		Logger:  logrus.New(),
	}
}

// TimeoutMiddleware creates a middleware that wraps each request with a timeout context
func TimeoutMiddleware(config TimeoutConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Create a context with timeout
		ctx, cancel := context.WithTimeout(c.Request.Context(), config.Timeout)
		defer cancel()

		// Channel to receive the result of the request processing
		done := make(chan struct{})
		panicChan := make(chan interface{}, 1)

		// Replace the request context with our timeout context
		c.Request = c.Request.WithContext(ctx)

		// Process the request in a goroutine
		go func() {
			defer func() {
				if p := recover(); p != nil {
					panicChan <- p
				}
			}()

			c.Next()
			close(done)
		}()

		// Wait for either completion or timeout
		select {
		case p := <-panicChan:
			// Re-panic if the handler panicked
			panic(p)
		case <-done:
			// Request completed successfully
			return
		case <-ctx.Done():
			// Request timed out
			c.Header("Connection", "close")
			c.AbortWithStatusJSON(http.StatusGatewayTimeout, gin.H{
				"error":   "Request timeout",
				"message": "The request took too long to process",
				"timeout": config.Timeout.String(),
			})

			if config.Logger != nil {
				config.Logger.WithFields(logrus.Fields{
					"method":  c.Request.Method,
					"path":    c.Request.URL.Path,
					"timeout": config.Timeout.String(),
				}).Warn("Request timed out")
			}
			return
		}
	}
}

// RequestTimeoutMiddleware creates a timeout middleware with default configuration
func RequestTimeoutMiddleware(timeout time.Duration) gin.HandlerFunc {
	config := TimeoutConfig{
		Timeout: timeout,
		Logger:  logrus.StandardLogger(),
	}
	return TimeoutMiddleware(config)
}

// RequestTimeoutMiddlewareWithLogger creates a timeout middleware with custom logger
func RequestTimeoutMiddlewareWithLogger(timeout time.Duration, logger *logrus.Logger) gin.HandlerFunc {
	config := TimeoutConfig{
		Timeout: timeout,
		Logger:  logger,
	}
	return TimeoutMiddleware(config)
}
