#!/bin/bash

# High Availability E-Commerce Architecture - Complete Infrastructure Startup
# This script starts all backend services, monitoring, and populates demo data

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting High Availability E-Commerce Architecture...${NC}"

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_COMPOSE_FILE="docker-compose.yml"

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Docker is running${NC}"
}

# Check if docker-compose file exists
check_compose_file() {
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        echo -e "${RED}❌ docker-compose.yml not found in current directory${NC}"
        echo -e "${YELLOW}💡 Please run this script from the project root directory${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Found docker-compose.yml${NC}"
}

# Clean up any existing containers
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up existing containers...${NC}"
    docker-compose down --volumes --remove-orphans 2>/dev/null || true
    
    # Remove any orphaned containers
    docker ps -a --filter "name=ha-" -q | xargs -r docker rm -f 2>/dev/null || true
    
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Start infrastructure services first
start_infrastructure() {
    echo -e "${BLUE}🔧 Starting infrastructure services...${NC}"
    
    # Start LocalStack (AWS services mock)
    echo -e "${YELLOW}Starting LocalStack (AWS Services Mock)...${NC}"
    docker-compose up -d localstack
    
    # Start Redis
    echo -e "${YELLOW}Starting Redis Cache...${NC}"
    docker-compose up -d redis
    
    # Wait for infrastructure to be ready
    echo -e "${YELLOW}Waiting for infrastructure to initialize...${NC}"
    sleep 10
    
    echo -e "${GREEN}✅ Infrastructure services started${NC}"
}

# Start microservices
start_microservices() {
    echo -e "${BLUE}🎯 Starting microservices...${NC}"
    
    # Start all microservices
    docker-compose up -d product-service user-service checkout-service analytics-service
    
    # Start NGINX load balancer
    echo -e "${YELLOW}Starting NGINX Load Balancer...${NC}"
    docker-compose up -d nginx
    
    echo -e "${GREEN}✅ Microservices started${NC}"
}

# Start monitoring stack
start_monitoring() {
    echo -e "${BLUE}📊 Starting monitoring stack...${NC}"
    
    # Start Prometheus
    echo -e "${YELLOW}Starting Prometheus...${NC}"
    docker-compose up -d prometheus
    
    # Start Grafana
    echo -e "${YELLOW}Starting Grafana...${NC}"
    docker-compose up -d grafana
    
    # Start Jaeger
    echo -e "${YELLOW}Starting Jaeger Tracing...${NC}"
    docker-compose up -d jaeger
    
    echo -e "${GREEN}✅ Monitoring stack started${NC}"
}

# Wait for service to be healthy
wait_for_service() {
    local service_name=$1
    local health_url=$2
    local max_attempts=60
    local attempt=0

    echo -e "${YELLOW}Waiting for ${service_name} to be healthy...${NC}"
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "$health_url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ ${service_name} is healthy!${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}⏳ Attempt $((attempt + 1))/${max_attempts} - ${service_name} not ready yet...${NC}"
        sleep 3
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ ${service_name} failed to become healthy within expected time${NC}"
    return 1
}

# Health check all services
health_check() {
    echo -e "${BLUE}🏥 Performing health checks...${NC}"
    
    local all_healthy=true
    
    # Check core services
    if ! wait_for_service "Product Service" "http://localhost:8080/health"; then
        all_healthy=false
    fi
    
    if ! wait_for_service "User Service" "http://localhost:8081/health"; then
        all_healthy=false
    fi
    
    if ! wait_for_service "Checkout Service" "http://localhost:8082/health"; then
        all_healthy=false
    fi
    
    if ! wait_for_service "Analytics Service" "http://localhost:8083/health"; then
        all_healthy=false
    fi
    
    # Check monitoring services
    if curl -s "http://localhost:9090/-/healthy" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Prometheus is healthy!${NC}"
    else
        echo -e "${YELLOW}⚠️ Prometheus health check failed${NC}"
    fi
    
    if curl -s "http://localhost:3000/api/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Grafana is healthy!${NC}"
    else
        echo -e "${YELLOW}⚠️ Grafana health check failed${NC}"
    fi
    
    if curl -s "http://localhost:16686/" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Jaeger is healthy!${NC}"
    else
        echo -e "${YELLOW}⚠️ Jaeger health check failed${NC}"
    fi
    
    if $all_healthy; then
        echo -e "${GREEN}🎉 All core services are healthy!${NC}"
        return 0
    else
        echo -e "${RED}❌ Some services failed health checks${NC}"
        return 1
    fi
}

# Populate demo data
populate_demo_data() {
    echo -e "${BLUE}📦 Populating demo data...${NC}"
    
    # Make the populate script executable
    chmod +x "${SCRIPT_DIR}/scripts/populate-demo-data.sh"
    
    # Run the populate script
    if "${SCRIPT_DIR}/scripts/populate-demo-data.sh"; then
        echo -e "${GREEN}✅ Demo data populated successfully!${NC}"
    else
        echo -e "${YELLOW}⚠️ Demo data population had some issues, but services are running${NC}"
    fi
}

# Display service information
show_service_info() {
    echo ""
    echo -e "${BLUE}🎯 High Availability E-Commerce Architecture is ready!${NC}"
    echo ""
    echo -e "${GREEN}📋 Service URLs:${NC}"
    echo -e "  🛍️  Frontend Application:     http://localhost:3001"
    echo -e "  🏗️  Architecture Dashboard:   http://localhost:3001/architecture"
    echo -e "  📦 Product Service:          http://localhost:8080"
    echo -e "  👥 User Service:             http://localhost:8081"
    echo -e "  🛒 Checkout Service:         http://localhost:8082"
    echo -e "  📊 Analytics Service:        http://localhost:8083"
    echo ""
    echo -e "${GREEN}📊 Monitoring Tools:${NC}"
    echo -e "  📈 Grafana Dashboards:       http://localhost:3000 (admin/admin)"
    echo -e "  🔍 Jaeger Tracing:          http://localhost:16686"
    echo -e "  📊 Prometheus Metrics:       http://localhost:9090"
    echo ""
    echo -e "${GREEN}🎮 Demo Features Available:${NC}"
    echo -e "  • 15 sample products loaded"
    echo -e "  • 8 demo users created"
    echo -e "  • Sample orders and analytics data"
    echo -e "  • Load testing capabilities"
    echo -e "  • Chaos engineering tools"
    echo -e "  • Real-time monitoring"
    echo ""
    echo -e "${YELLOW}💡 Next Steps:${NC}"
    echo -e "  1. Open http://localhost:3001 to access the frontend"
    echo -e "  2. Navigate to Architecture page to see system overview"
    echo -e "  3. Try running load tests and chaos experiments"
    echo -e "  4. Monitor system behavior in Grafana dashboards"
    echo ""
    echo -e "${BLUE}🔧 Useful Commands:${NC}"
    echo -e "  • View logs:           docker-compose logs -f [service-name]"
    echo -e "  • Stop all services:   docker-compose down"
    echo -e "  • Restart service:     docker-compose restart [service-name]"
    echo -e "  • Scale service:       docker-compose up -d --scale product-service=3"
    echo ""
}

# Main execution
main() {
    echo -e "${BLUE}🎬 Starting High Availability E-Commerce Demo Environment...${NC}"
    
    # Pre-flight checks
    check_docker
    check_compose_file
    
    # Clean start
    cleanup
    
    # Start services in order
    start_infrastructure
    start_microservices
    start_monitoring
    
    # Verify everything is working
    if health_check; then
        # Populate with demo data
        populate_demo_data
        
        # Show information
        show_service_info
        
        echo -e "${GREEN}🚀 Startup completed successfully!${NC}"
        exit 0
    else
        echo -e "${RED}❌ Some services failed to start properly${NC}"
        echo -e "${YELLOW}💡 Check logs with: docker-compose logs${NC}"
        exit 1
    fi
}

# Handle interruption
trap 'echo -e "\n${YELLOW}🛑 Startup interrupted${NC}"; exit 1' INT

# Run main function
main "$@" 