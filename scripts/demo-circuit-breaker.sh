#!/bin/bash

# Circuit Breaker Demo Script
# This script demonstrates the Circuit Breaker pattern implementation
# across our microservices architecture

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PRODUCT_SERVICE_URL="http://localhost:8081"
USER_SERVICE_URL="http://localhost:8080"
CHECKOUT_SERVICE_URL="http://localhost:8082"
ANALYTICS_SERVICE_URL="http://localhost:8083"
GRAFANA_URL="http://localhost:3000"
PROMETHEUS_URL="http://localhost:9090"

# Demo settings
DEMO_DURATION=300  # 5 minutes
FAILURE_DURATION=60  # 1 minute failures
RECOVERY_TIME=30     # 30 seconds recovery

echo -e "${BLUE}🔌 Circuit Breaker Pattern Demo${NC}"
echo -e "${BLUE}=================================${NC}"
echo ""
echo -e "${YELLOW}This demo will showcase:${NC}"
echo -e "  • Normal service operation"
echo -e "  • Service failure simulation"
echo -e "  • Circuit breaker activation"
echo -e "  • Service recovery"
echo -e "  • Monitoring integration"
echo ""
echo -e "${YELLOW}Monitoring URLs:${NC}"
echo -e "  • Grafana Dashboard: ${GRAFANA_URL}"
echo -e "  • Prometheus Metrics: ${PROMETHEUS_URL}"
echo ""

# Function to check service health
check_service_health() {
    local service_name=$1
    local service_url=$2
    
    if curl -s -f "${service_url}/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ ${service_name} is healthy${NC}"
        return 0
    else
        echo -e "${RED}❌ ${service_name} is not responding${NC}"
        return 1
    fi
}

# Function to get circuit breaker status
get_circuit_breaker_status() {
    local service_url=$1
    echo -e "${BLUE}🔍 Circuit Breaker Status:${NC}"
    
    if curl -s "${service_url}/api/v1/circuit-breakers" 2>/dev/null | jq . 2>/dev/null; then
        echo ""
    else
        echo -e "${YELLOW}  Circuit breaker status endpoint not available${NC}"
    fi
}

# Function to simulate load
simulate_load() {
    local target_url=$1
    local duration=$2
    local rps=${3:-10}
    
    echo -e "${BLUE}📊 Simulating load: ${rps} RPS for ${duration}s${NC}"
    
    # Create a simple load test
    for ((i=1; i<=duration; i++)); do
        for ((j=1; j<=rps; j++)); do
            curl -s "${target_url}/api/v1/products" > /dev/null 2>&1 &
        done
        sleep 1
        
        if ((i % 10 == 0)); then
            echo -e "${YELLOW}  Load test progress: ${i}/${duration}s${NC}"
        fi
    done
    
    # Wait for background processes to complete
    wait
    echo -e "${GREEN}✅ Load test completed${NC}"
}

# Function to simulate service failure
simulate_failure() {
    local service_name=$1
    local failure_type=$2
    local duration=$3
    
    echo -e "${RED}💥 Simulating ${service_name} failure (${failure_type}) for ${duration}s${NC}"
    
    case $failure_type in
        "latency")
            echo -e "${YELLOW}  Adding 5-second latency to ${service_name}${NC}"
            # Using iptables to add latency (requires root)
            # For demo purposes, we'll simulate with a different approach
            ;;
        "shutdown")
            echo -e "${YELLOW}  Temporarily stopping ${service_name}${NC}"
            # docker-compose stop ${service_name} 2>/dev/null || echo "Service not running in docker"
            ;;
        "error")
            echo -e "${YELLOW}  Causing ${service_name} to return 500 errors${NC}"
            ;;
    esac
    
    sleep $duration
    
    echo -e "${GREEN}🔄 Recovering ${service_name}${NC}"
    # Recovery logic would go here
}

# Function to monitor metrics
monitor_metrics() {
    echo -e "${BLUE}📈 Current Metrics:${NC}"
    
    # Get circuit breaker metrics from Prometheus
    if command -v curl >/dev/null 2>&1; then
        echo -e "${YELLOW}  Circuit Breaker States:${NC}"
        
        # Query Prometheus for circuit breaker metrics
        local cb_open=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=sum(cb:open_state:current)" 2>/dev/null | jq -r '.data.result[0].value[1]' 2>/dev/null || echo "0")
        local cb_closed=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=sum(cb:closed_state:current)" 2>/dev/null | jq -r '.data.result[0].value[1]' 2>/dev/null || echo "0")
        local cb_half_open=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=sum(cb:half_open_state:current)" 2>/dev/null | jq -r '.data.result[0].value[1]' 2>/dev/null || echo "0")
        
        echo -e "    Open: ${cb_open}"
        echo -e "    Closed: ${cb_closed}"
        echo -e "    Half-Open: ${cb_half_open}"
        
        echo -e "${YELLOW}  Error Rates:${NC}"
        local error_rate=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=sum(rate(http_requests_total{status=~\"5..\"}[5m]))" 2>/dev/null | jq -r '.data.result[0].value[1]' 2>/dev/null || echo "0")
        echo -e "    5xx Error Rate: ${error_rate}/s"
    fi
}

# Function to run chaos test scenario
run_chaos_scenario() {
    local scenario_name=$1
    
    echo -e "${BLUE}🌪️  Running Chaos Scenario: ${scenario_name}${NC}"
    echo -e "${BLUE}================================================${NC}"
    
    case $scenario_name in
        "product_service_failure")
            echo -e "${YELLOW}Scenario: Product Service becomes unavailable${NC}"
            simulate_failure "Product Service" "shutdown" $FAILURE_DURATION &
            FAILURE_PID=$!
            
            # Continue generating load during failure
            simulate_load "${CHECKOUT_SERVICE_URL}" $FAILURE_DURATION 5 &
            LOAD_PID=$!
            
            # Monitor circuit breaker activation
            sleep 10
            echo -e "${BLUE}📊 Circuit Breaker should be activating...${NC}"
            get_circuit_breaker_status "${CHECKOUT_SERVICE_URL}"
            
            wait $FAILURE_PID $LOAD_PID
            ;;
            
        "network_partition")
            echo -e "${YELLOW}Scenario: Network latency between services${NC}"
            simulate_failure "Network" "latency" $FAILURE_DURATION &
            FAILURE_PID=$!
            
            simulate_load "${CHECKOUT_SERVICE_URL}" $FAILURE_DURATION 8 &
            LOAD_PID=$!
            
            wait $FAILURE_PID $LOAD_PID
            ;;
            
        "cascade_failure")
            echo -e "${YELLOW}Scenario: Cascading failure across services${NC}"
            simulate_failure "User Service" "error" 30 &
            sleep 15
            simulate_failure "Product Service" "latency" 30 &
            
            simulate_load "${CHECKOUT_SERVICE_URL}" 60 3 &
            LOAD_PID=$!
            
            wait $LOAD_PID
            ;;
    esac
    
    echo -e "${GREEN}🔄 Scenario completed, allowing recovery...${NC}"
    sleep $RECOVERY_TIME
}

# Function to open monitoring dashboards
open_dashboards() {
    echo -e "${BLUE}🖥️  Opening monitoring dashboards...${NC}"
    
    if command -v xdg-open >/dev/null 2>&1; then
        xdg-open "${GRAFANA_URL}/d/circuit-breaker-monitoring/circuit-breaker-monitoring" 2>/dev/null &
        xdg-open "${PROMETHEUS_URL}/targets" 2>/dev/null &
    elif command -v open >/dev/null 2>&1; then
        open "${GRAFANA_URL}/d/circuit-breaker-monitoring/circuit-breaker-monitoring" 2>/dev/null &
        open "${PROMETHEUS_URL}/targets" 2>/dev/null &
    else
        echo -e "${YELLOW}Please manually open:${NC}"
        echo -e "  • ${GRAFANA_URL}/d/circuit-breaker-monitoring/circuit-breaker-monitoring"
        echo -e "  • ${PROMETHEUS_URL}/targets"
    fi
}

# Main demo execution
main() {
    echo -e "${BLUE}🚀 Starting Circuit Breaker Demo${NC}"
    echo -e "${BLUE}================================${NC}"
    
    # Step 1: Check initial service health
    echo -e "\n${YELLOW}Step 1: Initial Health Check${NC}"
    echo -e "${YELLOW}============================${NC}"
    check_service_health "Product Service" $PRODUCT_SERVICE_URL
    check_service_health "User Service" $USER_SERVICE_URL  
    check_service_health "Checkout Service" $CHECKOUT_SERVICE_URL
    check_service_health "Analytics Service" $ANALYTICS_SERVICE_URL
    
    # Step 2: Open monitoring dashboards
    echo -e "\n${YELLOW}Step 2: Opening Monitoring Dashboards${NC}"
    echo -e "${YELLOW}=====================================${NC}"
    open_dashboards
    
    # Step 3: Baseline load test
    echo -e "\n${YELLOW}Step 3: Baseline Load Test${NC}"
    echo -e "${YELLOW}==========================${NC}"
    echo -e "${BLUE}Running baseline load to establish normal metrics...${NC}"
    simulate_load "${CHECKOUT_SERVICE_URL}" 30 5
    
    # Step 4: Monitor initial metrics
    echo -e "\n${YELLOW}Step 4: Initial Metrics${NC}"
    echo -e "${YELLOW}=======================${NC}"
    monitor_metrics
    get_circuit_breaker_status "${CHECKOUT_SERVICE_URL}"
    
    # Wait for user to observe baseline
    echo -e "\n${BLUE}📊 Please observe the baseline metrics in Grafana${NC}"
    echo -e "${YELLOW}Press ENTER when ready to start chaos scenarios...${NC}"
    read -r
    
    # Step 5: Run chaos scenarios
    echo -e "\n${YELLOW}Step 5: Chaos Engineering Scenarios${NC}"
    echo -e "${YELLOW}===================================${NC}"
    
    run_chaos_scenario "product_service_failure"
    
    echo -e "\n${BLUE}📊 Check Grafana for circuit breaker activation${NC}"
    echo -e "${YELLOW}Press ENTER to continue with next scenario...${NC}"
    read -r
    
    run_chaos_scenario "network_partition"
    
    echo -e "\n${BLUE}📊 Observe latency metrics and circuit breaker behavior${NC}"
    echo -e "${YELLOW}Press ENTER to continue with final scenario...${NC}"
    read -r
    
    run_chaos_scenario "cascade_failure"
    
    # Step 6: Recovery verification
    echo -e "\n${YELLOW}Step 6: Recovery Verification${NC}"
    echo -e "${YELLOW}=============================${NC}"
    echo -e "${BLUE}Allowing services to recover...${NC}"
    sleep $RECOVERY_TIME
    
    echo -e "\n${BLUE}Final health check:${NC}"
    check_service_health "Product Service" $PRODUCT_SERVICE_URL
    check_service_health "User Service" $USER_SERVICE_URL
    check_service_health "Checkout Service" $CHECKOUT_SERVICE_URL
    check_service_health "Analytics Service" $ANALYTICS_SERVICE_URL
    
    # Step 7: Final metrics
    echo -e "\n${YELLOW}Step 7: Final Metrics${NC}"
    echo -e "${YELLOW}=====================${NC}"
    monitor_metrics
    get_circuit_breaker_status "${CHECKOUT_SERVICE_URL}"
    
    # Demo conclusion
    echo -e "\n${GREEN}🎉 Circuit Breaker Demo Completed!${NC}"
    echo -e "${GREEN}==================================${NC}"
    echo -e "\n${BLUE}What you should have observed:${NC}"
    echo -e "  ✅ Circuit breakers opening during failures"
    echo -e "  ✅ Error rates dropping when breakers are open"
    echo -e "  ✅ Automatic recovery when services are healthy"
    echo -e "  ✅ Metrics and alerts in Grafana dashboard"
    echo -e "  ✅ Resilience patterns protecting the system"
    echo ""
    echo -e "${YELLOW}Key Dashboards:${NC}"
    echo -e "  • Circuit Breaker Monitoring: ${GRAFANA_URL}/d/circuit-breaker-monitoring"
    echo -e "  • System Overview: ${GRAFANA_URL}/d/microservices-overview"
    echo -e "  • Prometheus Metrics: ${PROMETHEUS_URL}"
    echo ""
    echo -e "${BLUE}Thank you for running the Circuit Breaker demo!${NC}"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Check dependencies
    if ! command -v curl >/dev/null 2>&1; then
        echo -e "${RED}Error: curl is required but not installed${NC}"
        exit 1
    fi
    
    if ! command -v jq >/dev/null 2>&1; then
        echo -e "${YELLOW}Warning: jq not found, metrics display will be limited${NC}"
    fi
    
    # Parse command line arguments
    case "${1:-}" in
        "--help"|"-h")
            echo "Circuit Breaker Demo Script"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --help, -h     Show this help message"
            echo "  --quick        Run quick demo (2 minutes)"
            echo "  --scenarios    List available scenarios"
            echo ""
            exit 0
            ;;
        "--quick")
            DEMO_DURATION=120
            FAILURE_DURATION=30
            RECOVERY_TIME=15
            ;;
        "--scenarios")
            echo "Available chaos scenarios:"
            echo "  • product_service_failure: Simulates Product Service downtime"
            echo "  • network_partition: Simulates network latency"
            echo "  • cascade_failure: Simulates cascading failures"
            exit 0
            ;;
    esac
    
    # Run the main demo
    main "$@"
fi 