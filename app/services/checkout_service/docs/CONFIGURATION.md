# Configuration Guide

This document explains how to configure the Checkout Service using environment variables and centralized configuration.

## Overview

The Checkout Service uses a centralized configuration system that loads settings from environment variables. All configuration is handled through the `internal/config` package, providing a single source of truth for application settings.

## Primary Environment Variable

### APP_ENV
The primary way to set the environment is using the `APP_ENV` variable:

```bash
# Development (default)
APP_ENV=development

# Production
APP_ENV=production

# Testing
APP_ENV=testing
```

This single variable replaces the need for multiple environment detection variables.

## Compatibility Variables

For backward compatibility, the following variables are still supported:

- `GO_ENV`: Values `production`, `prod` → Production mode
- `GIN_MODE=release` → Production mode

## Configuration Variables

### Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8082` | Server port |
| `SERVICE_NAME` | `checkout-service` | Service identifier |
| `SERVICE_VERSION` | `1.0.0` | Service version |

### Logging Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Log level: `debug`, `info`, `warn`, `error`, `fatal`, `panic` |

### Request Handling

| Variable | Default | Description |
|----------|---------|-------------|
| `REQUEST_TIMEOUT` | `30s` | Request timeout duration (e.g., `30s`, `1m`, `500ms`) |

### CORS Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ALLOWED_ORIGINS` | Environment-based | Comma-separated list of allowed origins |

Default CORS origins by environment:
- **Development**: `*` (wildcard - all origins allowed)
- **Testing**: `http://localhost:3000,http://localhost:8080`
- **Production**: `https://yourdomain.com,https://www.yourdomain.com`

### Database Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DYNAMODB_REGION` | `us-west-2` | AWS DynamoDB region |
| `DYNAMODB_ENDPOINT` | (empty) | Custom DynamoDB endpoint (for local development) |

## Environment-Specific Examples

### Development Environment

```bash
APP_ENV=development
LOG_LEVEL=debug
CORS_ALLOWED_ORIGINS=*
PORT=8082
```

### Testing Environment

```bash
APP_ENV=testing
LOG_LEVEL=warn
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
REQUEST_TIMEOUT=10s
```

### Production Environment

```bash
APP_ENV=production
LOG_LEVEL=info
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
REQUEST_TIMEOUT=15s
DYNAMODB_REGION=us-east-1
```

## Configuration Loading Process

1. Default values are set in the configuration struct
2. Environment variables override defaults if present
3. Configuration is validated for required fields and sensible values
4. Invalid configurations cause startup failure with clear error messages

## Usage in Code

The configuration is loaded once at startup and shared across the application:

```go
// Load configuration
cfg := config.LoadConfig()

// Validate configuration
if err := cfg.Validate(); err != nil {
    log.Fatal("Invalid configuration:", err)
}

// Use configuration
if cfg.IsProduction() {
    // Production-specific logic
}

corsOrigins := cfg.GetCORSOrigins()
```

## Benefits

1. **Single Source of Truth**: All configuration in one place
2. **Environment Detection**: Simple `APP_ENV` variable
3. **Type Safety**: Strong typing for all configuration values
4. **Validation**: Configuration validation at startup
5. **Defaults**: Sensible defaults for all environments
6. **Documentation**: Self-documenting configuration structure

## Migration from Old System

If you're migrating from the old system where environment detection was scattered in the code:

1. Set `APP_ENV` instead of multiple environment variables
2. Remove hardcoded environment checks from your code
3. Use `cfg.IsProduction()`, `cfg.IsDevelopment()`, etc.
4. Access configuration through the config struct instead of direct `os.Getenv()` calls

## Security Considerations

- **Production**: Never use wildcard (`*`) for CORS origins
- **Environment Variables**: Keep sensitive values in environment variables, not in code
- **Validation**: All configuration is validated at startup to prevent misconfigurations
- **Logging**: Configuration is logged at startup (without sensitive values) 