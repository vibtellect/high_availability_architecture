# CORS Configuration Guide

This document explains how to configure Cross-Origin Resource Sharing (CORS) for the Checkout Service.

## Overview

The Checkout Service implements environment-aware CORS security that automatically adjusts behavior based on whether the application is running in development or production mode.

## Environment Detection

The service determines if it's running in production based on these environment variables:

- `GO_ENV=production` or `GO_ENV=prod`
- `GIN_MODE=release`

If either of these conditions is true, the service operates in **production mode** with strict CORS policies. Otherwise, it operates in **development mode** with more permissive settings.

## Configuration

### Environment Variables

Set allowed origins using the `CORS_ALLOWED_ORIGINS` environment variable:

```bash
# Single origin
CORS_ALLOWED_ORIGINS=https://yourdomain.com

# Multiple origins (comma-separated)
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com,https://admin.yourdomain.com

# Wildcard (development only)
CORS_ALLOWED_ORIGINS=*
```

### Development Mode

In development mode, the service behavior is:

- **Default**: If `CORS_ALLOWED_ORIGINS` is not set, allows all origins (`*`)
- **Configured**: If `CORS_ALLOWED_ORIGINS` is set, it validates origins but is more permissive
- **Wildcard**: If `CORS_ALLOWED_ORIGINS=*`, allows all origins
- **Logging**: Minimal CORS-related logging

### Production Mode

In production mode, the service behavior is:

- **Default**: If `CORS_ALLOWED_ORIGINS` is not set, uses secure defaults (`https://yourdomain.com,https://www.yourdomain.com`)
- **Validation**: Strictly validates request origins against the allowed list
- **Rejection**: Disallowed origins receive no CORS headers (request is blocked)
- **Logging**: Logs warnings for disallowed origin attempts
- **No Wildcard**: The `*` wildcard is not recommended and should be avoided

## CORS Headers

When a request is approved, the following headers are set:

```
Access-Control-Allow-Origin: <allowed-origin>
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
Access-Control-Max-Age: 86400 (24 hours cache for preflight)
```

## Examples

### Development Setup

```bash
# Allow all origins (default)
# No CORS_ALLOWED_ORIGINS needed

# Or allow specific development origins
export CORS_ALLOWED_ORIGINS="http://localhost:3000,http://localhost:8080"
```

### Production Setup

```bash
# Set production environment
export GO_ENV=production
export GIN_MODE=release

# Configure allowed origins
export CORS_ALLOWED_ORIGINS="https://yourdomain.com,https://api.yourdomain.com"
```

### Docker Environment

For containerized deployments, use a `.env` file or pass environment variables:

```dockerfile
ENV GO_ENV=production
ENV CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
```

## Security Considerations

### Production Best Practices

1. **Never use `*` in production** - Always specify exact origins
2. **Use HTTPS origins only** - Avoid HTTP in production
3. **Minimize origins** - Only include domains that actually need access
4. **Monitor logs** - Watch for warnings about disallowed origins

### Common Issues

1. **Missing CORS headers**: Check that your frontend origin is in the allowed list
2. **Preflight failures**: Ensure your frontend is using supported HTTP methods
3. **Environment detection**: Verify `GO_ENV` or `GIN_MODE` is set correctly for production

## Testing CORS Configuration

The service includes comprehensive tests for CORS behavior. Run them with:

```bash
go test -v ./... -run "TestCORS"
```

### Manual Testing

Test CORS with curl:

```bash
# Test preflight request
curl -X OPTIONS \
  -H "Origin: https://yourdomain.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  http://localhost:8082/api/v1/checkout/hello

# Test actual request
curl -X GET \
  -H "Origin: https://yourdomain.com" \
  http://localhost:8082/api/v1/checkout/hello
```

## Troubleshooting

### Check Current Configuration

The service logs its environment detection and CORS decisions. Look for:

- `"CORS_ALLOWED_ORIGINS not configured for production"` - Set the environment variable
- `"CORS request from disallowed origin"` - Add the origin to your allowed list

### Verify Environment

Check if the service detects production mode correctly:

```bash
# Check environment variables
echo $GO_ENV
echo $GIN_MODE
echo $CORS_ALLOWED_ORIGINS
```

### Common Solutions

1. **CORS errors in development**: Ensure `GO_ENV` is not set to `production`
2. **CORS errors in production**: Add your frontend domain to `CORS_ALLOWED_ORIGINS`
3. **Unexpected behavior**: Clear environment variables and restart the service 