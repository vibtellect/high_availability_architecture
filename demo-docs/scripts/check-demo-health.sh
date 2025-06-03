#!/bin/bash

# 🔍 Demo Health Check Script
# Prüft alle kritischen Services für Demo-Bereitschaft

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

function print_header() {
    echo -e "${BLUE}🔍 $1${NC}"
    echo "----------------------------------------"
}

function print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

function print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

function print_error() {
    echo -e "${RED}❌ $1${NC}"
}

function check_service() {
    local service_name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "🔍 $service_name... "
    
    response=$(curl -s -w "%{http_code}" -o /tmp/response.txt "$url" 2>/dev/null || echo "000")
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FAILED ($response)${NC}"
        return 1
    fi
}

function check_port() {
    local service=$1
    local port=$2
    
    echo -n "🔌 $service (Port $port)... "
    
    if nc -z localhost $port 2>/dev/null; then
        echo -e "${GREEN}✅ OPEN${NC}"
        return 0
    else
        echo -e "${RED}❌ CLOSED${NC}"
        return 1
    fi
}

echo "🎯 Demo Health Check"
echo "==================="
echo

# 1. Docker Check
print_header "Docker Environment"
if docker version >/dev/null 2>&1; then
    print_status "Docker is running"
    CONTAINER_COUNT=$(docker ps | grep -E "(product|user|checkout|analytics|grafana|prometheus|jaeger)" | wc -l)
    echo "📦 Active containers: $CONTAINER_COUNT"
else
    print_error "Docker is not running!"
    exit 1
fi

echo

# 2. Core Services Check
print_header "Core Microservices"
check_service "Product Service" "http://localhost:8080/health" || FAILED=1
check_service "User Service" "http://localhost:8081/health" || FAILED=1
check_service "Checkout Service" "http://localhost:8082/health" || FAILED=1
check_service "Analytics Service" "http://localhost:8083/health" || FAILED=1

echo

# 3. Infrastructure Services
print_header "Infrastructure Services"
check_port "NGINX Load Balancer" 80 || FAILED=1
check_port "Redis Cache" 6379 || FAILED=1
check_port "LocalStack (AWS)" 4566 || FAILED=1

echo

# 4. Monitoring Stack
print_header "Monitoring & Observability"
check_port "Prometheus" 9090 || FAILED=1
check_port "Grafana" 3000 || FAILED=1
check_port "Jaeger" 16686 || FAILED=1
check_port "OpenTelemetry Collector" 4317 || FAILED=1

echo

# 5. Frontend
print_header "Frontend Application"
check_port "React Frontend" 3001 || FRONTEND_DOWN=1

echo

# 6. API Gateway Tests
print_header "API Gateway (NGINX)"
check_service "Load Balancer Health" "http://localhost/health" || FAILED=1

echo

# 7. Database Connectivity
print_header "Database Connectivity"
echo -n "🗄️  DynamoDB via LocalStack... "
if curl -s http://localhost:4566/_localstack/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ CONNECTED${NC}"
else
    echo -e "${RED}❌ NO CONNECTION${NC}"
    FAILED=1
fi

echo

# 8. Performance Check
print_header "Performance Check"
echo -n "⚡ API Response Time... "
start_time=$(date +%s%N)
curl -s http://localhost:8080/api/v1/products >/dev/null 2>&1
end_time=$(date +%s%N)
duration=$(( (end_time - start_time) / 1000000 ))

if [ $duration -lt 1000 ]; then
    echo -e "${GREEN}✅ ${duration}ms (Excellent)${NC}"
elif [ $duration -lt 2000 ]; then
    echo -e "${YELLOW}⚠️  ${duration}ms (Good)${NC}"
else
    echo -e "${RED}❌ ${duration}ms (Slow)${NC}"
fi

echo

# Summary
print_header "Demo Readiness Summary"

if [ -z "$FAILED" ]; then
    print_status "All core services are healthy ✨"
    
    if [ -z "$FRONTEND_DOWN" ]; then
        print_status "Frontend is ready for demo 🎬"
        echo
        echo -e "${BLUE}🚀 Demo URLs:${NC}"
        echo "  Frontend:   http://localhost:3001"
        echo "  Grafana:    http://localhost:3000  (admin/admin)"
        echo "  Jaeger:     http://localhost:16686"
        echo "  Prometheus: http://localhost:9090"
        echo
        print_status "SYSTEM IS DEMO-READY! 🎉"
    else
        print_warning "Core services ready, but frontend needs to be started"
        echo
        echo "To start frontend:"
        echo "  cd app/frontend && npm run dev"
    fi
else
    print_error "Some services are not healthy!"
    echo
    echo "To fix issues:"
    echo "  1. Check logs: docker-compose logs -f"
    echo "  2. Restart services: docker-compose restart"
    echo "  3. Full restart: docker-compose down && docker-compose up -d"
    echo "  4. Re-run health check: ./check-demo-health.sh"
    exit 1
fi 