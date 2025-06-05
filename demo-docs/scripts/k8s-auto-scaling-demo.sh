#!/bin/bash

# Kubernetes Auto-Scaling Demo with k6 Load Testing
# Shows automatic scaling from 1 to 10 instances under load

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="default"
DEMO_DURATION="600"  # 10 minutes
MONITORING_INTERVAL="10"
GRAFANA_URL="http://localhost:3000"
GRAFANA_DASHBOARD_ID="auto-scaling-demo"

echo -e "${BLUE}🚀 Kubernetes Auto-Scaling Demo with k6 Load Testing${NC}"
echo -e "${BLUE}=====================================================${NC}"
echo ""

# Function to display a separator
separator() {
    echo -e "${PURPLE}=================================================${NC}"
}

# Function to check if kubectl is available and cluster is reachable
check_prerequisites() {
    echo -e "${YELLOW}🔍 Checking prerequisites...${NC}"
    
    if ! command -v kubectl &> /dev/null; then
        echo -e "${RED}❌ kubectl is not installed or not in PATH${NC}"
        exit 1
    fi
    
    if ! kubectl cluster-info &> /dev/null; then
        echo -e "${RED}❌ Cannot connect to Kubernetes cluster${NC}"
        echo "Please ensure your cluster is running and kubectl is configured"
        exit 1
    fi
    
    if ! kubectl get ns default &> /dev/null; then
        echo -e "${RED}❌ Cannot access default namespace${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
    echo ""
}

# Function to show current cluster status
show_cluster_status() {
    echo -e "${YELLOW}📊 Current Cluster Status${NC}"
    echo "Nodes:"
    kubectl get nodes -o wide || true
    echo ""
    echo "Pods in default namespace:"
    kubectl get pods -n $NAMESPACE | head -20 || true
    echo ""
}

# Function to deploy the demo applications
deploy_demo() {
    echo -e "${YELLOW}🚀 Deploying Demo Application...${NC}"
    
    # Deploy Product Service Demo with HPA
    echo "Deploying Product Service with HPA..."
    kubectl apply -f demo-docs/05-kubernetes/k8s/demo/product-service-demo.yaml -n $NAMESPACE
    
    # Deploy k6 Load Test Job resources
    echo "Deploying k6 Load Test Job..."
    kubectl apply -f demo-docs/05-kubernetes/k8s/demo/k6-load-test-job.yaml -n $NAMESPACE
    
    # Wait for deployment to be ready
    echo "Waiting for Product Service to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/product-service-demo -n $NAMESPACE
    
    echo -e "${GREEN}✅ Demo application deployed successfully${NC}"
    echo ""
}

# Function to show initial state
show_initial_state() {
    echo -e "${YELLOW}📋 Initial State (Before Load Test)${NC}"
    echo "Product Service Pods:"
    kubectl get pods -l app=product-service,version=demo -n $NAMESPACE
    echo ""
    echo "HPA Status:"
    kubectl get hpa product-service-demo-hpa -n $NAMESPACE
    echo ""
    echo "Service Details:"
    kubectl get svc product-service-demo -n $NAMESPACE
    echo ""
}

# Function to monitor HPA in real-time
monitor_hpa() {
    local duration=$1
    local end_time=$((SECONDS + duration))
    
    echo -e "${YELLOW}📊 Monitoring HPA Auto-Scaling (${duration}s)...${NC}"
    echo "Time | Replicas | CPU% | Memory% | Targets"
    echo "-----|----------|------|---------|--------"
    
    while [ $SECONDS -lt $end_time ]; do
        local hpa_info=$(kubectl get hpa product-service-demo-hpa -n $NAMESPACE --no-headers 2>/dev/null || echo "N/A N/A N/A N/A")
        local pod_count=$(kubectl get pods -l app=product-service,version=demo -n $NAMESPACE --no-headers 2>/dev/null | wc -l)
        local timestamp=$(date '+%H:%M:%S')
        
        echo "$timestamp | $pod_count | $hpa_info"
        sleep $MONITORING_INTERVAL
    done
}

# Function to show real-time pod scaling
monitor_pods() {
    echo -e "${YELLOW}🔄 Real-time Pod Scaling Monitor${NC}"
    kubectl get pods -l app=product-service,version=demo -n $NAMESPACE -w --no-headers &
    local watch_pid=$!
    
    sleep 30  # Monitor for 30 seconds
    kill $watch_pid 2>/dev/null || true
    echo ""
}

# Function to run the k6 load test
run_load_test() {
    echo -e "${YELLOW}⚡ Starting k6 Load Test for Auto-Scaling...${NC}"
    
    # Delete any existing k6 jobs
    kubectl delete job k6-auto-scaling-test -n $NAMESPACE 2>/dev/null || true
    sleep 5
    
    # Create and start the load test job
    kubectl create job k6-auto-scaling-test --from=cronjob/k6-load-test -n $NAMESPACE 2>/dev/null || \
    kubectl apply -f demo-docs/05-kubernetes/k8s/demo/k6-load-test-job.yaml -n $NAMESPACE
    
    echo "k6 Load Test Job started. Monitoring scaling behavior..."
    echo ""
    
    # Monitor the load test progress
    local duration=0
    local max_wait=600  # 10 minutes max
    
    while [ $duration -lt $max_wait ]; do
        local job_status=$(kubectl get job k6-auto-scaling-test -n $NAMESPACE -o jsonpath='{.status.conditions[0].type}' 2>/dev/null || echo "Running")
        
        if [ "$job_status" = "Complete" ]; then
            echo -e "${GREEN}✅ k6 Load Test completed successfully${NC}"
            break
        elif [ "$job_status" = "Failed" ]; then
            echo -e "${RED}❌ k6 Load Test failed${NC}"
            kubectl logs job/k6-auto-scaling-test -n $NAMESPACE || true
            break
        fi
        
        sleep 10
        duration=$((duration + 10))
        echo "Load test running... (${duration}s elapsed)"
    done
    
    echo ""
}

# Function to show final scaling results
show_scaling_results() {
    echo -e "${YELLOW}📈 Auto-Scaling Results${NC}"
    echo "Final Pod Count:"
    kubectl get pods -l app=product-service,version=demo -n $NAMESPACE
    echo ""
    echo "Final HPA Status:"
    kubectl describe hpa product-service-demo-hpa -n $NAMESPACE | tail -20
    echo ""
    echo "HPA Events:"
    kubectl get events -n $NAMESPACE --field-selector involvedObject.name=product-service-demo-hpa --sort-by='.lastTimestamp' | tail -10
    echo ""
}

# Function to show k6 test results
show_load_test_results() {
    echo -e "${YELLOW}📊 k6 Load Test Results${NC}"
    echo "k6 Job Status:"
    kubectl get job k6-auto-scaling-test -n $NAMESPACE
    echo ""
    echo "k6 Test Logs (last 50 lines):"
    kubectl logs job/k6-auto-scaling-test -n $NAMESPACE --tail=50 || echo "No logs available"
    echo ""
}

# Function to open monitoring dashboards
open_dashboards() {
    echo -e "${YELLOW}📱 Opening Monitoring Dashboards...${NC}"
    
    # Check if Grafana is accessible
    if curl -s $GRAFANA_URL/api/health >/dev/null 2>&1; then
        echo "Opening Grafana dashboards:"
        echo "• Auto-Scaling Overview: $GRAFANA_URL/d/auto-scaling-demo"
        echo "• Kubernetes Overview: $GRAFANA_URL/d/k8s-cluster-overview"
        echo "• k6 Load Test Metrics: $GRAFANA_URL/d/k6-load-testing"
        
        # Try to open in browser (Linux)
        if command -v xdg-open >/dev/null 2>&1; then
            xdg-open "$GRAFANA_URL/d/auto-scaling-demo" 2>/dev/null &
        fi
    else
        echo -e "${YELLOW}⚠️  Grafana not accessible at $GRAFANA_URL${NC}"
        echo "Make sure Grafana is running and accessible"
    fi
    echo ""
}

# Function to cleanup demo resources
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up demo resources...${NC}"
    
    # Delete k6 job
    kubectl delete job k6-auto-scaling-test -n $NAMESPACE 2>/dev/null || true
    
    # Optionally delete demo deployment (ask user)
    read -p "Do you want to delete the demo deployment? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kubectl delete -f demo-docs/05-kubernetes/k8s/demo/product-service-demo.yaml -n $NAMESPACE 2>/dev/null || true
        kubectl delete -f demo-docs/05-kubernetes/k8s/demo/k6-load-test-job.yaml -n $NAMESPACE 2>/dev/null || true
        echo -e "${GREEN}✅ Demo resources cleaned up${NC}"
    else
        echo "Demo deployment kept for further testing"
    fi
    echo ""
}

# Function to display demo summary
show_demo_summary() {
    separator
    echo -e "${CYAN}🎯 Kubernetes Auto-Scaling Demo Summary${NC}"
    echo -e "${CYAN}=======================================${NC}"
    echo ""
    echo -e "${GREEN}What you just saw:${NC}"
    echo "• 🚀 Automatic pod scaling from 1 to up to 10 instances"
    echo "• ⚡ k6 load testing triggering HPA scaling decisions"
    echo "• 📊 Real-time monitoring of CPU/Memory metrics"
    echo "• 🔄 Fast scale-up and controlled scale-down behavior"
    echo "• 📈 Prometheus metrics collection and Grafana visualization"
    echo ""
    echo -e "${BLUE}Key Technologies Demonstrated:${NC}"
    echo "• Kubernetes Horizontal Pod Autoscaler (HPA)"
    echo "• k6 Load Testing with Prometheus output"
    echo "• Resource-based scaling (CPU & Memory)"
    echo "• Spring Boot metrics and health endpoints"
    echo ""
    echo -e "${PURPLE}Demo completed at $(date)${NC}"
    separator
}

# Main demo flow
main() {
    check_prerequisites
    show_cluster_status
    
    separator
    deploy_demo
    show_initial_state
    
    separator
    echo -e "${GREEN}🎬 Starting Auto-Scaling Demo!${NC}"
    echo "This demo will:"
    echo "1. Run k6 load test against the product service"
    echo "2. Monitor automatic pod scaling (1 → 10 instances)"
    echo "3. Show real-time metrics and scaling events"
    echo ""
    
    read -p "Press Enter to start the demo..." -r
    
    # Start monitoring in background
    monitor_hpa $DEMO_DURATION &
    local monitor_pid=$!
    
    # Run load test
    run_load_test
    
    # Stop monitoring
    kill $monitor_pid 2>/dev/null || true
    
    separator
    show_scaling_results
    show_load_test_results
    
    separator
    open_dashboards
    
    separator
    show_demo_summary
    
    # Cleanup option
    cleanup
}

# Handle script interruption
trap 'echo -e "\n${YELLOW}Demo interrupted. Cleaning up...${NC}"; cleanup; exit 1' INT TERM

# Run the demo
main "$@" 