# High Availability Architecture - Docker Setup

This document describes how to run the complete microservices architecture using Docker Compose.

## 🏗️ Architecture Overview

The system consists of the following services:

### Core Services
- **Product Service (Kotlin/Spring Boot)** - Port 8080
- **User Service (Java/Spring Boot)** - Port 8081  
- **Checkout Service (Go/Gin)** - Port 8082

### Infrastructure Services
- **LocalStack** - AWS services simulation (Port 4566)
- **NGINX** - API Gateway & Load Balancer (Port 80)
- **Redis** - Caching (Port 6379)
- **Prometheus** - Metrics collection (Port 9090)
- **Grafana** - Monitoring dashboard (Port 3000)

## 🚀 Quick Start

### Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+
- 8GB+ RAM available for containers

### Start All Services
```bash
# Clone and navigate to project
git clone <repository-url>
cd high_availability_architecture

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service health
docker-compose ps
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (full cleanup)
docker-compose down -v
```

## 🔧 Service Endpoints

### API Gateway (NGINX)
- **Base URL**: http://localhost/
- **Health Check**: http://localhost/health

### Direct Service Access
- **Product Service**: http://localhost:8080/
- **User Service**: http://localhost:8081/
- **Checkout Service**: http://localhost:8082/

### Monitoring & Management
- **Grafana Dashboard**: http://localhost:3000/ (admin/admin123)
- **Prometheus**: http://localhost:9090/
- **LocalStack Dashboard**: http://localhost:4566/

## 📡 API Routes

All APIs are accessible through the NGINX gateway at http://localhost/

### Product Service
```bash
# Get all products
GET /api/v1/products

# Get product by ID
GET /api/v1/products/{id}

# Create product
POST /api/v1/products
```

### User Service
```bash
# Register user
POST /api/v1/auth/register

# Login
POST /api/v1/auth/login

# Get user profile
GET /api/v1/users/profile
```

### Checkout Service
```bash
# Get cart
GET /api/v1/checkout/cart/{userId}

# Add to cart
POST /api/v1/checkout/cart

# Create order
POST /api/v1/checkout/order

# Get order
GET /api/v1/checkout/order/{orderId}
```

## 🗄️ Database Setup

### DynamoDB Tables (LocalStack)
The services automatically create the following tables:
- `Products` - Product catalog
- `Users` - User accounts
- `Carts` - Shopping carts
- `Orders` - Order history

### Table Creation
Tables are auto-created on first service startup. To manually initialize:

```bash
# Access LocalStack
docker-compose exec localstack bash

# List tables
aws --endpoint-url=http://localhost:4566 dynamodb list-tables

# Describe table
aws --endpoint-url=http://localhost:4566 dynamodb describe-table --table-name Products
```

## 🔧 Configuration

### Environment Variables
Key configuration options in `docker-compose.yml`:

```yaml
# Product Service
- AWS_DYNAMODB_ENDPOINT=http://localstack:4566
- AWS_REGION=eu-central-1

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

## 🚨 Troubleshooting

### Common Issues

#### Services Not Starting
```bash
# Check service logs
docker-compose logs service-name

# Restart specific service
docker-compose restart service-name

# Rebuild service
docker-compose up --build service-name
```

#### Port Conflicts
If ports are already in use, modify `docker-compose.yml`:
```yaml
ports:
  - "8080:8080"  # Change first port number
```

#### Memory Issues
```bash
# Check Docker memory usage
docker stats

# Increase Docker memory limit in Docker Desktop
```

#### Database Connection Issues
```bash
# Verify LocalStack is healthy
docker-compose exec localstack curl http://localhost:4566/_localstack/health

# Check DynamoDB tables
docker-compose exec localstack aws --endpoint-url=http://localhost:4566 dynamodb list-tables
```

### Service Health Checks
All services include health checks:

```bash
# Check all service health
docker-compose ps

# Manual health check
curl http://localhost/health           # NGINX
curl http://localhost:8080/actuator/health  # Product Service
curl http://localhost:8081/actuator/health  # User Service
curl http://localhost:8082/health           # Checkout Service
```

## 📊 Monitoring

### Grafana Setup
1. Access: http://localhost:3000/
2. Login: admin/admin123
3. Add Prometheus datasource: http://prometheus:9090
4. Import dashboards from `infrastructure/grafana/dashboards/`

### Prometheus Metrics
- View metrics: http://localhost:9090/
- Service endpoints are auto-discovered
- Custom metrics available for each service

## 🔄 Development Workflow

### Making Changes
```bash
# Rebuild after code changes
docker-compose up --build service-name

# View real-time logs
docker-compose logs -f service-name

# Execute commands in container
docker-compose exec service-name bash
```

### Testing
```bash
# Run tests in container
docker-compose exec product-service ./gradlew test
docker-compose exec user-service ./mvnw test
docker-compose exec checkout-service go test ./...
```

## 🌐 Production Considerations

### Security
- Change default passwords
- Use proper JWT secrets
- Enable HTTPS in NGINX
- Configure proper CORS policies

### Scaling
- Use Docker Swarm or Kubernetes
- Add service replicas in compose file
- Configure external load balancer

### Persistence
- Use external databases (RDS, DocumentDB)
- Configure volume mounting for data persistence
- Set up backup strategies

## 📚 Additional Resources

- [Product Service Documentation](app/services/product_service/README.md)
- [User Service Documentation](app/services/user_service/README.md)
- [Checkout Service Documentation](app/services/checkout_service/API_DOCUMENTATION.md)
- [Infrastructure Documentation](infrastructure/README.md) 