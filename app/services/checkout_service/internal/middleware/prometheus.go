package middleware

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/sirupsen/logrus"
)

var (
	// HTTP request duration in seconds
	httpDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "gin_request_duration_seconds",
			Help:    "The HTTP request latencies in seconds.",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "path", "status"},
	)

	// HTTP request total count
	httpRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "gin_requests_total",
			Help: "The total number of HTTP requests.",
		},
		[]string{"method", "path", "status"},
	)

	// HTTP response size in bytes
	httpResponseSize = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "gin_response_size_bytes",
			Help:    "The HTTP response sizes in bytes.",
			Buckets: []float64{200, 500, 900, 1500, 5000, 10000, 25000, 50000, 100000},
		},
		[]string{"method", "path", "status"},
	)
)

// PrometheusConfig holds configuration for the Prometheus middleware
type PrometheusConfig struct {
	Logger *logrus.Logger
}

// PrometheusMiddleware creates a middleware that collects Prometheus metrics for HTTP requests
func PrometheusMiddleware(config PrometheusConfig) gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		start := time.Now()

		// Process the request
		c.Next()

		// Calculate duration
		duration := time.Since(start)

		// Get response info
		status := strconv.Itoa(c.Writer.Status())
		method := c.Request.Method
		path := c.FullPath()

		// Use route pattern if available, otherwise use raw path
		if path == "" {
			path = c.Request.URL.Path
		}

		// Skip metrics endpoint to avoid noise
		if path == "/metrics" {
			return
		}

		// Record metrics
		httpDuration.WithLabelValues(method, path, status).Observe(duration.Seconds())
		httpRequestsTotal.WithLabelValues(method, path, status).Inc()
		httpResponseSize.WithLabelValues(method, path, status).Observe(float64(c.Writer.Size()))

		// Log metrics collection if debug logging is enabled
		if config.Logger != nil && config.Logger.IsLevelEnabled(logrus.DebugLevel) {
			config.Logger.WithFields(logrus.Fields{
				"method":   method,
				"path":     path,
				"status":   status,
				"duration": duration.String(),
				"size":     c.Writer.Size(),
			}).Debug("HTTP request metrics recorded")
		}
	})
}

// DefaultPrometheusMiddleware creates a Prometheus middleware with default configuration
func DefaultPrometheusMiddleware() gin.HandlerFunc {
	return PrometheusMiddleware(PrometheusConfig{
		Logger: logrus.StandardLogger(),
	})
}

// PrometheusMiddlewareWithLogger creates a Prometheus middleware with custom logger
func PrometheusMiddlewareWithLogger(logger *logrus.Logger) gin.HandlerFunc {
	return PrometheusMiddleware(PrometheusConfig{
		Logger: logger,
	})
}
