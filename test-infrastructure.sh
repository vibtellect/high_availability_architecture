#!/bin/bash

echo "🚀 Testing High Availability Architecture Infrastructure"
echo "=================================================="

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed"
    exit 1
fi

echo "✅ Docker Compose available"

# Validate docker-compose file
echo "🔍 Validating docker-compose.yml..."
if docker-compose config --quiet; then
    echo "✅ docker-compose.yml is valid"
else
    echo "❌ docker-compose.yml has errors"
    exit 1
fi

# Check required directories
echo "🔍 Checking infrastructure directories..."
required_dirs=(
    "infrastructure/nginx"
    "infrastructure/prometheus"
    "infrastructure/grafana"
    "app/services/product_service"
    "app/services/user_service"
    "app/services/checkout_service"
)

for dir in "${required_dirs[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ $dir exists"
    else
        echo "❌ $dir missing"
        exit 1
    fi
done

# Check for Dockerfiles
echo "🔍 Checking Dockerfiles..."
dockerfiles=(
    "app/services/product_service/Dockerfile"
    "app/services/user_service/Dockerfile"
    "app/services/checkout_service/Dockerfile"
)

for dockerfile in "${dockerfiles[@]}"; do
    if [ -f "$dockerfile" ]; then
        echo "✅ $dockerfile exists"
    else
        echo "❌ $dockerfile missing"
        exit 1
    fi
done

echo ""
echo "🎉 Infrastructure validation completed successfully!"
echo ""
echo "📋 Available Services:"
echo "   • Product Service:    http://localhost:8080"
echo "   • User Service:       http://localhost:8081"
echo "   • Checkout Service:   http://localhost:8082"
echo "   • API Gateway:        http://localhost/"
echo "   • Grafana:           http://localhost:3000"
echo "   • Prometheus:        http://localhost:9090"
echo "   • LocalStack:        http://localhost:4566"
echo ""
echo "🚀 To start all services:"
echo "   docker-compose up -d"
echo ""
echo "📊 To monitor services:"
echo "   docker-compose ps"
echo "   docker-compose logs -f" 