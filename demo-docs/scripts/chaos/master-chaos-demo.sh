#!/bin/bash

# 🎭 Master Chaos Engineering Demo
# Komplette Demo-Suite für Customer Presentations

echo "🎭 Master Chaos Engineering Demo"
echo "==============================="
echo "🎯 Comprehensive System Resilience Demonstration"
echo

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

function print_demo_header() {
    echo
    echo -e "${PURPLE}╔══════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║          $1${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════╝${NC}"
    echo
}

function show_demo_menu() {
    echo -e "${BLUE}🎬 Available Chaos Engineering Demos:${NC}"
    echo
    echo "1. 💥 Full Chaos Demo (comprehensive)"
    echo "2. 🔄 Circuit Breaker Patterns"
    echo "3. 🌐 Network Chaos Engineering"
    echo "4. ☸️  Kubernetes Auto-Scaling Demo"
    echo "5. 🔍 Observability + Tracing Demo"
    echo "6. 🎯 Custom Demo Sequence"
    echo "7. ❌ Exit"
    echo
}

function run_demo() {
    local demo_script=$1
    local demo_name=$2
    
    if [ -f "$demo_script" ]; then
        print_demo_header "$demo_name"
        echo -e "${GREEN}🚀 Starting $demo_name...${NC}"
        echo "Press ENTER to continue or Ctrl+C to abort..."
        read
        
        chmod +x "$demo_script"
        bash "$demo_script"
        
        echo
        echo -e "${GREEN}✅ $demo_name completed!${NC}"
        echo "Press ENTER to return to menu..."
        read
    else
        echo -e "${RED}❌ Demo script $demo_script not found!${NC}"
    fi
}

function check_prerequisites() {
    echo -e "${BLUE}🔍 Checking Demo Prerequisites...${NC}"
    
    # Check Docker
    if ! docker ps >/dev/null 2>&1; then
        echo -e "${RED}❌ Docker not running!${NC}"
        return 1
    fi
    echo -e "${GREEN}✅ Docker is running${NC}"
    
    # Check Services
    local services_running=0
    for service in product-service user-service checkout-service analytics-service; do
        if docker ps | grep -q $service; then
            ((services_running++))
        fi
    done
    
    if [ $services_running -eq 4 ]; then
        echo -e "${GREEN}✅ All 4 microservices are running${NC}"
    else
        echo -e "${YELLOW}⚠️  Only $services_running/4 microservices running${NC}"
        echo "🚀 Start with: docker-compose up -d"
    fi
    
    # Check Frontend
    if curl -s http://localhost:3001 >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend available at http://localhost:3001${NC}"
    else
        echo -e "${YELLOW}⚠️  Frontend not responding${NC}"
    fi
    
    # Check Observability
    if curl -s http://localhost:16686 >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Jaeger UI available at http://localhost:16686${NC}"
    else
        echo -e "${YELLOW}⚠️  Jaeger not available${NC}"
    fi
    
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Grafana available at http://localhost:3000${NC}"
    else
        echo -e "${YELLOW}⚠️  Grafana not available${NC}"
    fi
    
    echo
    return 0
}

function custom_demo_sequence() {
    print_demo_header "CUSTOM DEMO SEQUENCE"
    
    echo -e "${BLUE}🎯 Select demos to run in sequence:${NC}"
    echo "Enter demo numbers separated by spaces (e.g., 1 3 4):"
    echo
    echo "1. Full Chaos Demo"
    echo "2. Circuit Breaker Demo"  
    echo "3. Network Chaos Demo"
    echo "4. Kubernetes Demo"
    echo
    read -p "Demo sequence: " demo_sequence
    
    for demo_num in $demo_sequence; do
        case $demo_num in
            1) run_demo "./chaos-demo.sh" "FULL CHAOS DEMO" ;;
            2) run_demo "./chaos/circuit-breaker-demo.sh" "CIRCUIT BREAKER DEMO" ;;
            3) run_demo "./chaos/network-chaos.sh" "NETWORK CHAOS DEMO" ;;
            4) run_demo "./k8s-demo.sh" "KUBERNETES AUTO-SCALING DEMO" ;;
            *) echo -e "${RED}❌ Invalid demo number: $demo_num${NC}" ;;
        esac
    done
}

function show_post_demo_info() {
    echo
    print_demo_header "DEMO COMPLETED - NEXT STEPS"
    
    echo -e "${GREEN}🎯 Key Access Points for Customer:${NC}"
    echo "📊 Frontend Dashboard: http://localhost:3001"
    echo "🏗️  Architecture View: http://localhost:3001/architecture"
    echo "🔍 Distributed Tracing: http://localhost:16686"
    echo "📈 System Metrics: http://localhost:3000"
    echo "📊 Prometheus: http://localhost:9090"
    echo
    
    echo -e "${BLUE}🎬 Demo Highlights to Emphasize:${NC}"
    echo "✅ Zero-downtime during partial failures"
    echo "✅ Auto-recovery without manual intervention"
    echo "✅ Complete observability and tracing"
    echo "✅ Auto-scaling based on real load"
    echo "✅ Production-ready resilience patterns"
    echo
    
    echo -e "${PURPLE}💼 Business Value Summary:${NC}"
    echo "🔹 99.9% uptime even during component failures"
    echo "🔹 MTTR reduced from hours to minutes"
    echo "🔹 Proactive issue detection and resolution"
    echo "🔹 Cost-effective auto-scaling"
    echo "🔹 Enterprise-grade reliability"
    echo
}

# Main Demo Loop
clear
echo -e "${PURPLE}"
cat << "EOF"
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║     🎭 CHAOS ENGINEERING DEMO SUITE 🎭                   ║
    ║                                                           ║
    ║     High Availability E-Commerce Platform                 ║
    ║     System Resilience & Recovery Demonstration            ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

check_prerequisites

while true; do
    echo
    show_demo_menu
    read -p "Select demo option (1-7): " choice
    
    case $choice in
        1) run_demo "./chaos-demo.sh" "COMPREHENSIVE CHAOS DEMO" ;;
        2) run_demo "./chaos/circuit-breaker-demo.sh" "CIRCUIT BREAKER PATTERNS DEMO" ;;
        3) run_demo "./chaos/network-chaos.sh" "NETWORK CHAOS ENGINEERING DEMO" ;;
        4) run_demo "./k8s-demo.sh" "KUBERNETES AUTO-SCALING DEMO" ;;
        5) 
            echo -e "${BLUE}🔍 Opening Observability Tools...${NC}"
            echo "Jaeger UI: http://localhost:16686"
            echo "Grafana: http://localhost:3000"
            echo "Frontend: http://localhost:3001"
            echo "Press ENTER to continue..."
            read
            ;;
        6) custom_demo_sequence ;;
        7) 
            show_post_demo_info
            echo -e "${GREEN}🎭 Thank you for using the Chaos Engineering Demo Suite!${NC}"
            exit 0
            ;;
        *) 
            echo -e "${RED}❌ Invalid option. Please select 1-7.${NC}"
            ;;
    esac
done 