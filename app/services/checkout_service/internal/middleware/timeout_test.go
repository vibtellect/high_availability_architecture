package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
)

func TestTimeoutMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		timeout        time.Duration
		handlerDelay   time.Duration
		expectedStatus int
		expectTimeout  bool
	}{
		{
			name:           "Request completes within timeout",
			timeout:        100 * time.Millisecond,
			handlerDelay:   50 * time.Millisecond,
			expectedStatus: http.StatusOK,
			expectTimeout:  false,
		},
		{
			name:           "Request times out",
			timeout:        50 * time.Millisecond,
			handlerDelay:   100 * time.Millisecond,
			expectedStatus: http.StatusGatewayTimeout,
			expectTimeout:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create a router with timeout middleware
			router := gin.New()

			config := TimeoutConfig{
				Timeout: tt.timeout,
				Logger:  logrus.New(),
			}
			router.Use(TimeoutMiddleware(config))

			// Add a test handler that can delay
			router.GET("/test", func(c *gin.Context) {
				// Simulate some work
				select {
				case <-time.After(tt.handlerDelay):
					c.JSON(http.StatusOK, gin.H{"message": "success"})
				case <-c.Request.Context().Done():
					// Context was cancelled
					return
				}
			})

			// Create a test request
			w := httptest.NewRecorder()
			req, _ := http.NewRequest("GET", "/test", nil)

			// Execute the request
			router.ServeHTTP(w, req)

			// Check the response
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectTimeout {
				assert.Contains(t, w.Body.String(), "Request timeout")
				assert.Contains(t, w.Body.String(), "timeout")
			} else {
				assert.Contains(t, w.Body.String(), "success")
			}
		})
	}
}

func TestRequestTimeoutMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(RequestTimeoutMiddleware(50 * time.Millisecond))

	router.GET("/fast", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "fast"})
	})

	router.GET("/slow", func(c *gin.Context) {
		time.Sleep(100 * time.Millisecond)
		c.JSON(http.StatusOK, gin.H{"message": "slow"})
	})

	// Test fast endpoint
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/fast", nil)
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "fast")

	// Test slow endpoint (should timeout)
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/slow", nil)
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusGatewayTimeout, w.Code)
	assert.Contains(t, w.Body.String(), "Request timeout")
}

func TestRequestTimeoutMiddlewareWithLogger(t *testing.T) {
	gin.SetMode(gin.TestMode)

	logger := logrus.New()
	logger.SetLevel(logrus.WarnLevel)

	router := gin.New()
	router.Use(RequestTimeoutMiddlewareWithLogger(50*time.Millisecond, logger))

	router.GET("/timeout", func(c *gin.Context) {
		time.Sleep(100 * time.Millisecond)
		c.JSON(http.StatusOK, gin.H{"message": "should not reach here"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/timeout", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusGatewayTimeout, w.Code)
	assert.Contains(t, w.Body.String(), "Request timeout")
}

func TestDefaultTimeoutConfig(t *testing.T) {
	config := DefaultTimeoutConfig()

	assert.Equal(t, 30*time.Second, config.Timeout)
	assert.NotNil(t, config.Logger)
}

func TestTimeoutMiddleware_ContextCancellation(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()

	config := TimeoutConfig{
		Timeout: 100 * time.Millisecond,
		Logger:  logrus.New(),
	}
	router.Use(TimeoutMiddleware(config))

	// Handler that checks context cancellation
	router.GET("/context-check", func(c *gin.Context) {
		select {
		case <-time.After(50 * time.Millisecond):
			// Check if context is cancelled
			if err := c.Request.Context().Err(); err != nil {
				c.JSON(http.StatusRequestTimeout, gin.H{"error": "context cancelled"})
				return
			}
			c.JSON(http.StatusOK, gin.H{"message": "context ok"})
		case <-c.Request.Context().Done():
			// Context was cancelled
			return
		}
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/context-check", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "context ok")
}

func TestTimeoutMiddleware_PanicHandling(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()

	config := TimeoutConfig{
		Timeout: 100 * time.Millisecond,
		Logger:  logrus.New(),
	}
	router.Use(TimeoutMiddleware(config))

	// Handler that panics
	router.GET("/panic", func(c *gin.Context) {
		panic("test panic")
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/panic", nil)

	// Should not panic at the test level
	assert.Panics(t, func() {
		router.ServeHTTP(w, req)
	})
}
