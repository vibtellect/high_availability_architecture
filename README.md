# High Availability Microservices Architecture

A comprehensive e-commerce microservices architecture demonstrating modern software engineering practices with polyglot programming and cloud-native patterns.

## 🏗️ Architecture Overview

This project implements a distributed microservices architecture with:

### Services
- **Product Service** (Kotlin/Spring Boot) - Port 8080
- **User Service** (Java/Spring Boot) - Port 8081  
- **Checkout Service** (Go/Gin) - Port 8082

### Infrastructure
- **LocalStack** - AWS services simulation
- **NGINX** - API Gateway & Load Balancer
- **Redis** - Caching
- **Prometheus** - Metrics
- **Grafana** - Monitoring

## 🚀 Quick Start

```bash
# Start all services
docker-compose up -d

# Initialize data
./scripts/init-dynamodb.sh

# Access services
curl http://localhost/api/v1/products
```

## 📚 Documentation

- **[Setup Guide](docs/SETUP.md)** - Complete installation and configuration
- **[API Documentation](docs/API.md)** - Service endpoints and usage examples
- **[Development Guide](docs/DEVELOPMENT.md)** - Local development setup

## 🔧 Configuration

Key environment variables:
- `APP_ENV` - Application environment (development/production)
- `AWS_DYNAMODB_ENDPOINT` - DynamoDB endpoint
- `JWT_SECRET` - JWT signing secret

See individual service documentation for detailed configuration options.

## 🧪 Testing

```bash
# Run all tests
docker-compose run --rm test-all

# Check service health
curl http://localhost/health
```

## 📊 Monitoring

- **Grafana**: http://localhost:3000 (admin/admin123)
- **Prometheus**: http://localhost:9090

## 🤝 Contributing

Please read our [Development Guide](docs/DEVELOPMENT.md) for contribution guidelines.
