#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="production"
KUBECTL_TIMEOUT="300s"
KUSTOMIZE_DIR="$(dirname "$0")"

echo -e "${BLUE}🚀 Deploying High-Availability Demo to Production Kubernetes${NC}"
echo "=================================================="

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl is not installed or not in PATH${NC}"
    exit 1
fi

# Check if kustomize is available
if ! command -v kustomize &> /dev/null; then
    echo -e "${RED}❌ kustomize is not installed or not in PATH${NC}"
    echo "You can install it with: kubectl kustomize --help"
    exit 1
fi

# Check Kubernetes cluster connectivity
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}❌ Cannot connect to Kubernetes cluster${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Function to wait for deployment
wait_for_deployment() {
    local deployment_name=$1
    local namespace=$2
    
    echo -e "${YELLOW}⏳ Waiting for deployment ${deployment_name} in namespace ${namespace}...${NC}"
    
    if kubectl wait --for=condition=available deployment/${deployment_name} \
        --namespace=${namespace} --timeout=${KUBECTL_TIMEOUT}; then
        echo -e "${GREEN}✅ Deployment ${deployment_name} is ready${NC}"
    else
        echo -e "${RED}❌ Deployment ${deployment_name} failed to become ready${NC}"
        kubectl describe deployment ${deployment_name} --namespace=${namespace}
        return 1
    fi
}

# Function to wait for StatefulSet
wait_for_statefulset() {
    local statefulset_name=$1
    local namespace=$2
    
    echo -e "${YELLOW}⏳ Waiting for StatefulSet ${statefulset_name} in namespace ${namespace}...${NC}"
    
    if kubectl wait --for=condition=ready pod -l app=${statefulset_name} \
        --namespace=${namespace} --timeout=${KUBECTL_TIMEOUT}; then
        echo -e "${GREEN}✅ StatefulSet ${statefulset_name} is ready${NC}"
    else
        echo -e "${RED}❌ StatefulSet ${statefulset_name} failed to become ready${NC}"
        kubectl describe statefulset ${statefulset_name} --namespace=${namespace} || true
        return 1
    fi
}

# Build and validate manifests
echo -e "${YELLOW}🔧 Building Kubernetes manifests with Kustomize...${NC}"
cd "${KUSTOMIZE_DIR}"

if ! kustomize build . > /tmp/production-manifests.yaml; then
    echo -e "${RED}❌ Failed to build Kustomize manifests${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Manifests built successfully${NC}"

# Validate manifests
echo -e "${YELLOW}🔍 Validating manifests...${NC}"
if ! kubectl apply --dry-run=client -f /tmp/production-manifests.yaml; then
    echo -e "${RED}❌ Manifest validation failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Manifests validated successfully${NC}"

# Ask for confirmation
echo -e "${YELLOW}⚠️  This will deploy to production namespace '${NAMESPACE}'${NC}"
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🛑 Deployment cancelled${NC}"
    exit 0
fi

# Apply manifests
echo -e "${BLUE}🚀 Applying manifests to cluster...${NC}"

# Apply in stages for better dependency management
echo -e "${YELLOW}📦 Stage 1: Core Infrastructure (Namespace, Storage, Secrets)${NC}"
kubectl apply -f /tmp/production-manifests.yaml -l "tier in (namespace,storage,secrets)" || true
sleep 5

echo -e "${YELLOW}📦 Stage 2: Databases${NC}"
kubectl apply -f /tmp/production-manifests.yaml -l "tier=database"
sleep 10

echo -e "${YELLOW}📦 Stage 3: Cache and Infrastructure Services${NC}"
kubectl apply -f /tmp/production-manifests.yaml -l "tier in (cache,infrastructure)"
sleep 10

echo -e "${YELLOW}📦 Stage 4: Microservices${NC}"
kubectl apply -f /tmp/production-manifests.yaml -l "tier=backend"
sleep 5

echo -e "${YELLOW}📦 Stage 5: Monitoring${NC}"
kubectl apply -f /tmp/production-manifests.yaml -l "tier=monitoring"
sleep 5

echo -e "${YELLOW}📦 Stage 6: Networking (Ingress)${NC}"
kubectl apply -f /tmp/production-manifests.yaml -l "tier=networking" || true

echo -e "${GREEN}✅ All manifests applied${NC}"

# Wait for critical services
echo -e "${BLUE}⏳ Waiting for critical services to be ready...${NC}"

# Wait for databases first
wait_for_deployment "postgres" "${NAMESPACE}"
wait_for_deployment "redis" "${NAMESPACE}"

# Wait for infrastructure services
wait_for_deployment "localstack" "${NAMESPACE}"

# Wait for microservices
wait_for_deployment "product-service" "${NAMESPACE}"
wait_for_deployment "user-service" "${NAMESPACE}"
wait_for_deployment "checkout-service" "${NAMESPACE}"
wait_for_deployment "analytics-service" "${NAMESPACE}"

# Wait for monitoring
wait_for_deployment "prometheus" "${NAMESPACE}"
wait_for_deployment "grafana" "${NAMESPACE}"
wait_for_deployment "jaeger" "${NAMESPACE}"

# Show deployment status
echo -e "${BLUE}📊 Deployment Status Summary${NC}"
echo "==============================="
kubectl get all -n ${NAMESPACE}

echo
echo -e "${BLUE}📊 Persistent Volume Claims${NC}"
kubectl get pvc -n ${NAMESPACE}

echo
echo -e "${BLUE}📊 Ingress Resources${NC}"
kubectl get ingress -n ${NAMESPACE}

# Show service URLs (if using LoadBalancer or NodePort)
echo
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo
echo -e "${BLUE}📡 Service Access Information:${NC}"
echo "================================="

# Get ingress information
INGRESS_IP=$(kubectl get ingress ha-demo-ingress -n ${NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "Not available")
if [ "$INGRESS_IP" != "Not available" ] && [ -n "$INGRESS_IP" ]; then
    echo -e "${GREEN}🌐 External IP: ${INGRESS_IP}${NC}"
    echo "   - API: https://api.ha-demo.com"
    echo "   - Grafana: https://grafana.ha-demo.com"
    echo "   - Jaeger: https://jaeger.ha-demo.com"
else
    echo -e "${YELLOW}⚠️  External IP not yet assigned. Check ingress status:${NC}"
    echo "   kubectl get ingress -n ${NAMESPACE}"
fi

# Port forwarding instructions
echo
echo -e "${BLUE}🔧 Port Forwarding (for local access):${NC}"
echo "kubectl port-forward -n ${NAMESPACE} svc/grafana 3000:3000"
echo "kubectl port-forward -n ${NAMESPACE} svc/jaeger 16686:16686"
echo "kubectl port-forward -n ${NAMESPACE} svc/prometheus 9090:9090"

echo
echo -e "${GREEN}✅ Production deployment completed!${NC}"

# Cleanup
rm -f /tmp/production-manifests.yaml

echo -e "${BLUE}💡 Next steps:${NC}"
echo "1. Configure DNS to point to the ingress IP"
echo "2. Update TLS certificates if needed"
echo "3. Monitor the deployment in Grafana"
echo "4. Run load tests to verify auto-scaling" 