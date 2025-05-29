# Checkout Service Architecture

This document provides an overview of the Checkout Service architecture and project structure.

## Project Structure

```
app/services/checkout_service/
├── main.go                          # Application entry point
├── go.mod                           # Go module definition
├── go.sum                           # Go module checksums
├── env.example                      # Environment configuration example
├── docs/                            # Documentation
│   ├── ARCHITECTURE.md              # This file - architecture overview
│   ├── CONFIGURATION.md             # Configuration guide
│   └── CORS_CONFIGURATION.md        # CORS-specific documentation
├── internal/                        # Private application code
│   ├── config/                      # Centralized configuration
│   │   └── config.go                # Configuration loading and validation
│   ├── router/                      # HTTP routing and middleware
│   │   ├── router.go                # Router setup and CORS middleware
│   │   ├── router_test.go           # Router tests
│   │   └── cors_test.go             # CORS-specific tests
│   ├── handlers/                    # HTTP request handlers
│   │   ├── cart_handler.go          # Cart management endpoints
│   │   └── order_handler.go         # Order processing endpoints
│   ├── services/                    # Business logic layer
│   │   ├── cart_service.go          # Cart business logic
│   │   └── order_service.go         # Order business logic
│   ├── db/                          # Database layer
│   │   ├── dynamodb.go              # DynamoDB client
│   │   ├── cart_repository.go       # Cart data access
│   │   └── order_repository.go      # Order data access
│   ├── models/                      # Data models
│   │   ├── cart.go                  # Cart data structures
│   │   └── order.go                 # Order data structures
│   └── middleware/                  # HTTP middleware
│       ├── timeout.go               # Request timeout middleware
│       └── timeout_test.go          # Timeout middleware tests
└── Dockerfile                       # Container configuration
```

## Architecture Principles

### 1. Layered Architecture
- **Handler Layer**: HTTP request/response handling
- **Service Layer**: Business logic and orchestration
- **Repository Layer**: Data access abstraction
- **Model Layer**: Data structures and types

### 2. Dependency Injection
- Configuration is loaded once and injected into components
- Database clients are initialized and passed to repositories
- Services receive their dependencies through constructors

### 3. Environment-Aware Configuration
- Single `APP_ENV` variable controls environment behavior
- Environment-specific defaults for security settings
- Centralized configuration validation

### 4. Clean Separation of Concerns
- Router package handles HTTP routing and middleware
- Config package manages all application configuration
- Each layer has clearly defined responsibilities

## Key Components

### Configuration (`internal/config`)
- Centralized configuration loading from environment variables
- Environment detection and validation
- Type-safe configuration access
- Default values for all environments

### Router (`internal/router`)
- HTTP route definition and middleware setup
- Environment-aware CORS configuration
- Request timeout middleware integration
- Health check endpoints

### Security Features
- Environment-aware CORS policies
- Request timeout protection
- Structured logging with security context
- Input validation and sanitization

### Testing Strategy
- Unit tests for each component
- Router-level integration tests
- CORS behavior verification across environments
- Mock-friendly dependency injection

## Environment Behavior

### Development
- Permissive CORS (wildcard allowed)
- Debug-level logging
- Extended timeouts for debugging

### Testing
- Restricted CORS to localhost origins
- Warning-level logging to reduce noise
- Shorter timeouts for faster test execution

### Production
- Strict CORS with explicit allowed origins
- Info-level logging for performance
- Conservative timeouts for security

## Security Considerations

1. **CORS Security**: Environment-aware origin restrictions
2. **Request Timeouts**: Protection against slow/hanging requests
3. **Input Validation**: Structured validation at handler level
4. **Logging**: Security-conscious logging without sensitive data
5. **Configuration**: Validation prevents misconfigurations

## Deployment

The service is designed for containerized deployment with:
- Environment variable configuration
- Health check endpoints
- Structured logging for monitoring
- Graceful error handling
- Database connection management

## Future Enhancements

- Rate limiting middleware
- Authentication/authorization middleware
- Request tracing and metrics
- Circuit breaker patterns
- Cache integration 