# Documentation

This directory contains all project documentation for the High Availability Microservices Architecture.

## 📚 Documentation Structure

| File | Description |
|------|-------------|
| [SETUP.md](SETUP.md) | **Complete setup guide** - Installation, configuration, and deployment |
| [API.md](API.md) | **API documentation** - All service endpoints with examples |
| [DEVELOPMENT.md](DEVELOPMENT.md) | **Development guide** - Local development setup and contribution guidelines |
| [SNS_SQS_ARCHITECTURE.md](SNS_SQS_ARCHITECTURE.md) | **Event-driven architecture** - SNS/SQS implementation, testing, and troubleshooting |
| [EVENT_DRIVEN_SETUP.md](EVENT_DRIVEN_SETUP.md) | **Event setup guide** - Detailed LocalStack and AWS configuration |

## 🚀 Quick Start

1. **New to the project?** Start with [SETUP.md](SETUP.md)
2. **Want to use the APIs?** Check [API.md](API.md)  
3. **Contributing code?** Read [DEVELOPMENT.md](DEVELOPMENT.md)
4. **Working with events?** See [SNS_SQS_ARCHITECTURE.md](SNS_SQS_ARCHITECTURE.md)

## 🎯 Architecture Overview

This project implements a **High Availability Microservices Architecture** with:

- **3 Microservices**: Product Service (Kotlin), User Service (Java), Checkout Service (Go)
- **Event-driven Communication**: AWS SNS/SQS with LocalStack for development
- **Load Balancing**: NGINX as API Gateway
- **Monitoring**: Grafana + Prometheus stack
- **Caching**: Redis for performance optimization
- **Database**: DynamoDB for scalable data storage

## 🔗 Related Documentation

- **Service-specific docs** are located in each service directory:
  - `app/services/product_service/README.md`
  - `app/services/user_service/README.md`
  - `app/services/checkout_service/docs/`

- **Infrastructure docs** are in:
  - `infrastructure/README.md`
  - `scripts/README.md`

## 📝 Documentation Standards

- Use clear, actionable headings
- Include code examples for all procedures
- Test all commands before documenting
- Update docs when making changes
- Keep examples up-to-date

## 🤝 Contributing to Documentation

When updating documentation:

1. Keep it concise but complete
2. Test all examples
3. Use consistent formatting
4. Update the main README.md if structure changes
5. Follow markdown best practices 