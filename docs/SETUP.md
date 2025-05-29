# Setup Guide

Complete setup guide for the High Availability Microservices Architecture.

## 🏗️ Architecture

### Core Services
- **Product Service** (Kotlin/Spring Boot) - Port 8080
- **User Service** (Java/Spring Boot) - Port 8081  
- **Checkout Service** (Go/Gin) - Port 8082

### Infrastructure Services
- **LocalStack** - AWS services simulation (Port 4566)
- **NGINX** - API Gateway & Load Balancer (Port 80)
- **Redis** - Caching (Port 6379)
- **Prometheus** - Metrics collection (Port 9090)
- **Grafana** - Monitoring dashboard (Port 3000)

## 🚀 Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 8GB+ RAM available for containers

## 📦 Installation

### 1. Clone Repository
```bash
git clone <repository-url>
cd high_availability_architecture
```

### 2. Start All Services
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service health
docker-compose ps
```

### 3. Initialize Database
```bash
# Create DynamoDB tables and test data
./scripts/init-dynamodb.sh
```

### 4. Verify Installation
```bash
# Check API Gateway
curl http://localhost/health

# Test Product Service
curl http://localhost/api/v1/products

# Test User Service
curl http://localhost:8081/api/v1/hello
```

## 🔧 Configuration

### Environment Variables
Configure services via environment variables in `docker-compose.yml`:

```yaml
# Global
- APP_ENV=development
- AWS_REGION=eu-central-1
- AWS_DYNAMODB_ENDPOINT=http://localstack:4566

# User Service
- JWT_SECRET=myVerySecretKeyForJWTTokenGenerationThatShouldBeAtLeast256BitsLong
- JWT_EXPIRATION=86400000

# Checkout Service  
- PRODUCT_SERVICE_URL=http://product-service:8080
- USER_SERVICE_URL=http://user-service:8081
```

### Service Dependencies
- All services depend on `localstack` (healthy)
- `checkout-service` depends on `product-service` and `user-service`
- `nginx` depends on all core services

## 🗄️ Database Setup

### DynamoDB Tables
Auto-created tables via LocalStack:
- `Products` - Product catalog
- `Users` - User accounts  
- `Carts` - Shopping carts
- `Orders` - Order history

### Manual Table Management
```bash
# Access LocalStack container
docker-compose exec localstack bash

# List tables
aws --endpoint-url=http://localhost:4566 dynamodb list-tables

# Describe specific table
aws --endpoint-url=http://localhost:4566 dynamodb describe-table --table-name Products
```

## 🚨 Troubleshooting

### Service Issues
```bash
# Check service logs
docker-compose logs service-name

# Restart specific service
docker-compose restart service-name

# Rebuild service
docker-compose up --build service-name
```

### Port Conflicts
If ports are in use, modify `docker-compose.yml`:
```yaml
ports:
  - "8080:8080"  # Change first port number
```

### Database Connection Issues
```bash
# Verify LocalStack health
docker-compose exec localstack curl http://localhost:4566/_localstack/health

# Check DynamoDB tables
docker-compose exec localstack aws --endpoint-url=http://localhost:4566 dynamodb list-tables
```

### Memory Issues
```bash
# Check Docker memory usage
docker stats

# Increase Docker memory in Docker Desktop settings
```

## 🛑 Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (full cleanup)
docker-compose down -v

# Remove all data (reset to fresh state)
docker-compose down -v && rm -rf localstack-data
``` 