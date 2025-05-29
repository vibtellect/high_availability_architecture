# Checkout Service

A Go-based microservice built with the Gin web framework for handling cart management and order processing.

## Features

- ✅ **Go 1.21+** with **Gin Web Framework**
- ✅ **RESTful API** endpoints
- ✅ **JSON binding** and validation
- ✅ **Structured logging** with logrus
- ✅ **Health checks** and metrics endpoints
- ✅ **CORS middleware** support
- ✅ **Docker containerization** with multi-stage builds
- 🚧 **AWS SDK v2** integration (DynamoDB, SNS, SQS) - Coming soon
- 🚧 **Cart management** - Coming soon
- 🚧 **Order processing** - Coming soon
- 🚧 **Payment integration** - Coming soon

## API Endpoints

### Health & Status
- `GET /health` - Service health check
- `GET /` - Hello World endpoint

### Checkout API (v1)
- `GET /api/v1/checkout/hello` - Checkout API status
- `GET /api/v1/checkout/cart/:userId` - Get user cart (placeholder)
- `POST /api/v1/checkout/cart` - Add to cart (placeholder)
- `POST /api/v1/checkout/order` - Create order (placeholder)

## Development

### Prerequisites
- Go 1.21+
- Docker (for containerization)

### Local Development

```bash
# Navigate to the service directory
cd app/services/checkout_service

# Install dependencies
go mod download

# Run the service
go run main.go

# Run tests
go test -v

# Build binary
go build -o checkout_service main.go
```

### Docker

```bash
# Build Docker image
docker build -t checkout-service .

# Run container
docker run -p 8082:8082 checkout-service
```

### Testing the Service

```bash
# Health check
curl http://localhost:8082/health

# Hello World
curl http://localhost:8082/

# Checkout API
curl http://localhost:8082/api/v1/checkout/hello
```

## Environment Variables

- `PORT` - Server port (default: 8082)
- `GIN_MODE` - Gin mode (debug, release, test)

## Project Structure

```
checkout_service/
├── main.go          # Main application entry point
├── main_test.go     # Basic tests
├── go.mod           # Go module dependencies
├── go.sum           # Go module checksums
├── Dockerfile       # Multi-stage Docker build
├── .gitignore       # Git ignore patterns
└── README.md        # This file
```

## Next Steps

This is a basic "Hello World" implementation. The following features will be implemented according to Task 4:

1. **DynamoDB Integration** - Cart and order data persistence
2. **Cart Management API** - Add, remove, update cart items
3. **Order Processing** - Order creation and tracking
4. **Payment Mock Integration** - Payment processing simulation
5. **Event Publishing** - SNS/SQS event-driven architecture
6. **LocalStack Support** - Local development environment
7. **Comprehensive Testing** - Unit, integration, and API tests

## Technology Stack

- **Language**: Go 1.21+
- **Web Framework**: Gin
- **Logging**: Logrus (structured JSON logging)
- **Cloud**: AWS SDK v2 (DynamoDB, SNS, SQS)
- **Testing**: Go testing package + testify
- **Containerization**: Docker multi-stage builds 