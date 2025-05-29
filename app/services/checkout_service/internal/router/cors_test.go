package router

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"

	"github.com/vibtellect/high_availability_architecture/app/services/checkout_service/internal/config"
)

func TestIsOriginAllowed(t *testing.T) {
	tests := []struct {
		name           string
		origin         string
		allowedOrigins []string
		expected       bool
	}{
		{
			name:           "Origin in allowed list",
			origin:         "https://example.com",
			allowedOrigins: []string{"https://example.com", "https://api.example.com"},
			expected:       true,
		},
		{
			name:           "Origin not in allowed list",
			origin:         "https://malicious.com",
			allowedOrigins: []string{"https://example.com", "https://api.example.com"},
			expected:       false,
		},
		{
			name:           "Wildcard allows any origin",
			origin:         "https://anything.com",
			allowedOrigins: []string{"*"},
			expected:       true,
		},
		{
			name:           "Empty origin list",
			origin:         "https://example.com",
			allowedOrigins: []string{},
			expected:       false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isOriginAllowed(tt.origin, tt.allowedOrigins)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestContainsWildcard(t *testing.T) {
	tests := []struct {
		name           string
		allowedOrigins []string
		expected       bool
	}{
		{
			name:           "Contains wildcard",
			allowedOrigins: []string{"*"},
			expected:       true,
		},
		{
			name:           "Contains wildcard among others",
			allowedOrigins: []string{"https://example.com", "*", "https://api.example.com"},
			expected:       true,
		},
		{
			name:           "No wildcard",
			allowedOrigins: []string{"https://example.com", "https://api.example.com"},
			expected:       false,
		},
		{
			name:           "Empty list",
			allowedOrigins: []string{},
			expected:       false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := containsWildcard(tt.allowedOrigins)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestCORSMiddleware_Development(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name                string
		corsAllowedOrigins  []string
		requestOrigin       string
		expectedAllowOrigin string
	}{
		{
			name:                "Default development - no CORS env set",
			corsAllowedOrigins:  nil,
			requestOrigin:       "https://localhost:3000",
			expectedAllowOrigin: "*",
		},
		{
			name:                "Specific origins in development",
			corsAllowedOrigins:  []string{"https://localhost:3000", "http://localhost:8080"},
			requestOrigin:       "https://localhost:3000",
			expectedAllowOrigin: "https://localhost:3000",
		},
		{
			name:                "Wildcard in development",
			corsAllowedOrigins:  []string{"*"},
			requestOrigin:       "https://anydomain.com",
			expectedAllowOrigin: "*",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg := &config.Config{
				Environment:        config.Development,
				CORSAllowedOrigins: tt.corsAllowedOrigins,
				ServiceName:        "checkout-service",
				ServiceVersion:     "1.0.0",
				RequestTimeout:     30 * time.Second,
			}

			routerConfig := &RouterConfig{
				Config:     cfg,
				Logger:     logrus.New(),
				IsTestMode: false,
			}
			router := SetupRouter(routerConfig)

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("GET", "/health", nil)
			if tt.requestOrigin != "" {
				req.Header.Set("Origin", tt.requestOrigin)
			}

			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedAllowOrigin, w.Header().Get("Access-Control-Allow-Origin"))
			if tt.expectedAllowOrigin != "" {
				assert.Equal(t, "GET, POST, PUT, DELETE, OPTIONS", w.Header().Get("Access-Control-Allow-Methods"))
				assert.Equal(t, "Content-Type, Authorization, X-Requested-With", w.Header().Get("Access-Control-Allow-Headers"))
			}
		})
	}
}

func TestCORSMiddleware_Production(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name                string
		corsAllowedOrigins  []string
		requestOrigin       string
		expectedAllowOrigin string
		expectWarningLog    bool
	}{
		{
			name:                "Allowed origin in production",
			corsAllowedOrigins:  []string{"https://yourdomain.com", "https://api.yourdomain.com"},
			requestOrigin:       "https://yourdomain.com",
			expectedAllowOrigin: "https://yourdomain.com",
			expectWarningLog:    false,
		},
		{
			name:                "Disallowed origin in production",
			corsAllowedOrigins:  []string{"https://yourdomain.com", "https://api.yourdomain.com"},
			requestOrigin:       "https://malicious.com",
			expectedAllowOrigin: "",
			expectWarningLog:    true,
		},
		{
			name:                "No CORS config in production - uses defaults",
			corsAllowedOrigins:  nil,
			requestOrigin:       "https://yourdomain.com",
			expectedAllowOrigin: "https://yourdomain.com",
			expectWarningLog:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg := &config.Config{
				Environment:        config.Production,
				CORSAllowedOrigins: tt.corsAllowedOrigins,
				ServiceName:        "checkout-service",
				ServiceVersion:     "1.0.0",
				RequestTimeout:     30 * time.Second,
			}

			routerConfig := &RouterConfig{
				Config:     cfg,
				Logger:     logrus.New(),
				IsTestMode: false,
			}
			router := SetupRouter(routerConfig)

			w := httptest.NewRecorder()
			req, _ := http.NewRequest("GET", "/health", nil)
			if tt.requestOrigin != "" {
				req.Header.Set("Origin", tt.requestOrigin)
			}

			router.ServeHTTP(w, req)

			if tt.expectedAllowOrigin != "" {
				assert.Equal(t, tt.expectedAllowOrigin, w.Header().Get("Access-Control-Allow-Origin"))
				assert.Equal(t, "GET, POST, PUT, DELETE, OPTIONS", w.Header().Get("Access-Control-Allow-Methods"))
				assert.Equal(t, "Content-Type, Authorization, X-Requested-With", w.Header().Get("Access-Control-Allow-Headers"))
				assert.Equal(t, "86400", w.Header().Get("Access-Control-Max-Age"))
			} else {
				assert.Empty(t, w.Header().Get("Access-Control-Allow-Origin"))
			}
		})
	}
}

func TestCORSMiddleware_PreflightRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)

	cfg := &config.Config{
		Environment:    config.Development,
		ServiceName:    "checkout-service",
		ServiceVersion: "1.0.0",
		RequestTimeout: 30 * time.Second,
	}

	routerConfig := &RouterConfig{
		Config:     cfg,
		Logger:     logrus.New(),
		IsTestMode: false,
	}
	router := SetupRouter(routerConfig)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("OPTIONS", "/api/v1/checkout/hello", nil)
	req.Header.Set("Origin", "https://localhost:3000")

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNoContent, w.Code)
	assert.Equal(t, "*", w.Header().Get("Access-Control-Allow-Origin"))
	assert.Equal(t, "GET, POST, PUT, DELETE, OPTIONS", w.Header().Get("Access-Control-Allow-Methods"))
	assert.Equal(t, "Content-Type, Authorization, X-Requested-With", w.Header().Get("Access-Control-Allow-Headers"))
}
