# Development Guide

Local development setup and guidelines for contributors.

## 🛠️ Prerequisites

- **Docker & Docker Compose** (Latest versions)
- **Git** (Version control)
- **Your preferred IDE** (VS Code, IntelliJ, etc.)

### Language-Specific Requirements

- **Java**: JDK 21+ for User Service
- **Kotlin**: JDK 21+ for Product Service  
- **Go**: Go 1.21+ for Checkout Service

## 🚀 Local Development Setup

### 1. Clone and Start Infrastructure
```bash
# Clone repository
git clone <repository-url>
cd high_availability_architecture

# Start only infrastructure services
docker-compose up localstack redis nginx -d

# Initialize database
./scripts/init-dynamodb.sh
```

### 2. Service Development

#### Product Service (Kotlin)
```bash
cd app/services/product_service

# Run locally
./gradlew bootRun

# Run tests
./gradlew test

# Build
./gradlew build
```

#### User Service (Java)
```bash
cd app/services/user_service

# Run locally  
./gradlew bootRun

# Run tests
./gradlew test

# Build
./gradlew build
```

#### Checkout Service (Go)
```bash
cd app/services/checkout_service

# Install dependencies
go mod download

# Run locally
APP_ENV=development go run main.go

# Run tests
go test ./...

# Build
go build -o checkout_service main.go
```

### 3. Full Docker Development
```bash
# Start all services
docker-compose up -d --build

# View specific service logs
docker-compose logs -f service-name

# Rebuild specific service
docker-compose up --build service-name
```

## 🏗️ Project Structure

```
high_availability_architecture/
├── docs/                           # 📚 Documentation
│   ├── SETUP.md                   # Setup guide
│   ├── API.md                     # API documentation
│   └── DEVELOPMENT.md             # This file
├── app/services/                  # 🏗️ Microservices
│   ├── product_service/           # Kotlin/Spring Boot
│   ├── user_service/              # Java/Spring Boot
│   └── checkout_service/          # Go/Gin
├── infrastructure/                # 🔧 Infrastructure configs
├── scripts/                       # 📜 Helper scripts
├── docker-compose.yml            # 🐳 Container orchestration
└── README.md                      # 📖 Main documentation
```

## 🔧 Configuration

### Environment Variables

#### Development Configuration
```bash
# Global
APP_ENV=development
AWS_REGION=eu-central-1
AWS_DYNAMODB_ENDPOINT=http://localhost:4566

# Service-specific (see individual service docs)
```

#### IDE Configuration
Each service includes IDE-specific configuration files:
- `.vscode/` - VS Code settings
- `.idea/` - IntelliJ settings

### Service Ports
- **API Gateway**: 80
- **Product Service**: 8080
- **User Service**: 8081
- **Checkout Service**: 8082
- **LocalStack**: 4566
- **Grafana**: 3000
- **Prometheus**: 9090

## 🧪 Testing

### Unit Tests
```bash
# Product Service
cd app/services/product_service && ./gradlew test

# User Service  
cd app/services/user_service && ./gradlew test

# Checkout Service
cd app/services/checkout_service && go test ./...
```

### Integration Tests
```bash
# Start test environment
docker-compose up -d

# Run integration tests
./scripts/run-integration-tests.sh
```

### API Testing
```bash
# Test Product Service
curl http://localhost:8080/api/v1/products

# Test User Service
curl http://localhost:8081/api/v1/hello

# Test Checkout Service
curl http://localhost:8082/health
```

## 📝 Code Standards

### Go (Checkout Service)
- Follow [Go Code Review Guidelines](https://github.com/golang/go/wiki/CodeReviewComments)
- Use `gofmt` for formatting
- Run `golint` and `go vet`
- Minimum 80% test coverage

### Java/Kotlin (User/Product Services)
- Follow [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html)
- Use Gradle for dependency management
- Follow Spring Boot best practices
- Minimum 80% test coverage

### General Guidelines
- **Commit Messages**: Use [Conventional Commits](https://www.conventionalcommits.org/)
- **Branch Naming**: `feature/feature-name`, `bugfix/bug-name`, `hotfix/hotfix-name`
- **Documentation**: Update docs for any API changes
- **Testing**: All new features must include tests

## 🔄 Development Workflow

### 1. Create Feature Branch
```bash
git checkout -b feature/new-feature
```

### 2. Develop & Test Locally
```bash
# Make changes
# Run tests
# Test manually
```

### 3. Create Commits
```bash
git add .
git commit -m "feat(service): add new feature

- Detailed description
- List of changes"
```

### 4. Push & Create PR
```bash
git push origin feature/new-feature
# Create Pull Request on GitHub
```

## 🐛 Debugging

### Service Logs
```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f product-service

# Follow logs in real-time
docker-compose logs -f --tail=100 checkout-service
```

### Database Debugging
```bash
# Access LocalStack
docker-compose exec localstack bash

# Check DynamoDB tables
aws --endpoint-url=http://localhost:4566 dynamodb list-tables

# Scan table content
aws --endpoint-url=http://localhost:4566 dynamodb scan --table-name Products
```

### Service Debugging
```bash
# Check service health
curl http://localhost:8080/actuator/health

# Check service info
curl http://localhost:8080/actuator/info

# Check metrics
curl http://localhost:9090  # Prometheus
```

## 📊 Monitoring

### Local Monitoring Stack
- **Grafana**: http://localhost:3000 (admin/admin123)
- **Prometheus**: http://localhost:9090
- **Service Health**: `/actuator/health` endpoints

### Metrics Collection
Services automatically expose metrics via:
- Spring Boot Actuator (Java/Kotlin services)
- Custom health endpoints (Go service)

## 🚨 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using the port
lsof -i :8080

# Kill process
kill -9 <PID>
```

#### Docker Issues
```bash
# Clean Docker system
docker system prune -f

# Remove all containers
docker-compose down -v

# Rebuild everything
docker-compose up --build -d
```

#### Database Connection Issues
```bash
# Verify LocalStack
curl http://localhost:4566/_localstack/health

# Restart LocalStack
docker-compose restart localstack
```

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes
4. **Add** tests for new functionality
5. **Update** documentation if needed
6. **Submit** a pull request

### Pull Request Guidelines
- Include clear description of changes
- Reference any related issues
- Ensure all tests pass
- Update documentation if needed
- Follow coding standards

## 📚 Additional Resources

- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [Go Documentation](https://golang.org/doc/)
- [Docker Documentation](https://docs.docker.com/)
- [AWS LocalStack](https://docs.localstack.cloud/) 