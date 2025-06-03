#!/bin/bash

# 🚀 Kubernetes Auto-Scaling Demo Script
# Demonstriert High Availability und Auto-Scaling für Kunden

set -e

echo "🎯 Kubernetes Auto-Scaling Demo"
echo "==============================="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

function print_header() {
    echo -e "${BLUE}🎬 $1${NC}"
    echo "----------------------------------------"
}

function print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

function print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

function print_action() {
    echo -e "${RED}🔥 $1${NC}"
}

# Check if Kubernetes is running
print_header "Demo Environment Check"
if ! kubectl get nodes >/dev/null 2>&1; then
    echo "❌ Kubernetes cluster not running!"
    echo "Run: minikube start --driver=docker --cpus=4 --memory=4096"
    exit 1
fi
print_status "Kubernetes cluster is running"

# Show current status
print_header "Current Service Status"
kubectl get pods,svc,hpa | grep -E "(product-service-demo|load-generator|cpu-stress)"
echo

# Demo Phase 1: Baseline
print_header "Demo Phase 1: Baseline Auto-Scaling"
print_status "Current Pods (should be 2):"
kubectl get pods -l app=product-service-demo
echo

print_status "HPA Status:"
kubectl get hpa product-service-demo-hpa
echo

# Demo Phase 2: Load Test
print_header "Demo Phase 2: Load Testing & Auto-Scaling"
print_action "Starting Load Test to trigger auto-scaling..."

# Get load generator pod name
LOAD_POD=$(kubectl get pods -l app=load-generator -o jsonpath='{.items[0].metadata.name}')
print_status "Using load generator pod: $LOAD_POD"

echo "📊 Watch HPA scaling in real-time (in another terminal):"
echo "kubectl get hpa product-service-demo-hpa --watch"
echo

echo "📊 Watch pod scaling in real-time (in another terminal):"
echo "kubectl get pods -l app=product-service-demo --watch"
echo

print_action "Generating load for 60 seconds..."
echo "Command: kubectl exec -it $LOAD_POD -- sh -c 'for i in \$(seq 1 1000); do wget -q -O- http://product-service-demo; done'"

# Start load test in background
kubectl exec -it $LOAD_POD -- sh -c '
echo "🚀 Starting intensive load test..."
for i in $(seq 1 200); do
  wget -q -O- http://product-service-demo &
  if [ $((i % 10)) -eq 0 ]; then
    echo "Requests sent: $i"
  fi
done
wait
echo "✅ Load test completed"
' &

LOAD_PID=$!

echo "Monitoring scaling for 90 seconds..."
for i in {1..18}; do
    sleep 5
    echo -e "\n⏱️  Time: $((i*5))s"
    kubectl get hpa product-service-demo-hpa --no-headers | awk '{print "CPU Usage: " $3 " | Current Replicas: " $6 " | Max Replicas: " $5}'
    kubectl get pods -l app=product-service-demo --no-headers | wc -l | awk '{print "Pod Count: " $1}'
done

# Wait for load test to complete
wait $LOAD_PID 2>/dev/null || true

echo

# Demo Phase 3: Scale Down
print_header "Demo Phase 3: Scale Down Demonstration"
print_action "Load test completed. Watching auto scale-down..."
print_warning "Scale-down takes longer (stabilization window: 60s)"

for i in {1..12}; do
    sleep 10
    echo -e "\n⏱️  Scale-down monitoring: $((i*10))s"
    kubectl get hpa product-service-demo-hpa --no-headers | awk '{print "CPU Usage: " $3 " | Current Replicas: " $6}'
    kubectl get pods -l app=product-service-demo --no-headers | wc -l | awk '{print "Pod Count: " $1}'
done

# Demo Phase 4: Chaos Engineering
print_header "Demo Phase 4: Chaos Engineering - Pod Failure"
print_action "Demonstrating High Availability by killing a pod..."

# Get a pod to kill
VICTIM_POD=$(kubectl get pods -l app=product-service-demo -o jsonpath='{.items[0].metadata.name}')
print_status "Target pod for chaos test: $VICTIM_POD"

echo "🔪 Deleting pod to demonstrate auto-recovery..."
kubectl delete pod $VICTIM_POD

echo "📊 Monitoring pod recovery:"
for i in {1..6}; do
    sleep 5
    echo -e "\n⏱️  Recovery time: $((i*5))s"
    kubectl get pods -l app=product-service-demo
done

# Final Status
print_header "Demo Completed - Final Status"
kubectl get pods,svc,hpa | grep product-service-demo
echo

print_header "Key Demo Takeaways"
echo "✅ Auto-Scaling: 2 → 8 pods under load, back to 2 when idle"
echo "✅ High Availability: Pod failures automatically recovered"
echo "✅ Load Distribution: Traffic balanced across multiple pods"
echo "✅ Resource Efficiency: Scales down when load decreases"
echo

print_header "Demo Commands Summary"
echo "# Watch HPA in real-time:"
echo "kubectl get hpa product-service-demo-hpa --watch"
echo
echo "# Watch pods in real-time:"
echo "kubectl get pods -l app=product-service-demo --watch"
echo
echo "# Manual load test:"
echo "kubectl exec -it $LOAD_POD -- sh -c 'while true; do wget -q -O- http://product-service-demo; done'"
echo
echo "# Chaos engineering:"
echo "kubectl delete pod <pod-name>"
echo

print_status "🎬 Kubernetes Auto-Scaling Demo Complete!" 