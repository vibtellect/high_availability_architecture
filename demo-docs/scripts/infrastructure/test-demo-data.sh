#!/bin/bash

# Test Script for Demo Data Verification
# This script checks if all demo data was populated correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Testing Demo Data Population...${NC}"

# Configuration
PRODUCT_SERVICE_URL="http://localhost:8080"
USER_SERVICE_URL="http://localhost:8081"
CHECKOUT_SERVICE_URL="http://localhost:8082"
ANALYTICS_SERVICE_URL="http://localhost:8083"

# Test product service
test_products() {
    echo -e "${YELLOW}Testing Product Service...${NC}"
    
    # Check if products exist
    response=$(curl -s "${PRODUCT_SERVICE_URL}/api/products")
    product_count=$(echo "$response" | jq -r '. | length' 2>/dev/null || echo "0")
    
    if [ "$product_count" -gt "10" ]; then
        echo -e "${GREEN}✅ Product Service: $product_count products found${NC}"
        
        # Test specific product
        macbook=$(echo "$response" | jq -r '.[] | select(.name | contains("MacBook")) | .name' 2>/dev/null || echo "")
        if [ -n "$macbook" ]; then
            echo -e "${GREEN}✅ Found expected product: $macbook${NC}"
        else
            echo -e "${YELLOW}⚠️ MacBook product not found${NC}"
        fi
    else
        echo -e "${RED}❌ Product Service: Only $product_count products found (expected 15+)${NC}"
    fi
}

# Test user service
test_users() {
    echo -e "${YELLOW}Testing User Service...${NC}"
    
    # Test login with demo user
    login_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"email":"max.mustermann@example.com","password":"demo123"}' \
        "${USER_SERVICE_URL}/api/users/login" 2>/dev/null || echo "error")
    
    if echo "$login_response" | grep -q "token\|success\|user" 2>/dev/null; then
        echo -e "${GREEN}✅ User Service: Demo user login successful${NC}"
    else
        echo -e "${RED}❌ User Service: Demo user login failed${NC}"
    fi
}

# Test checkout service
test_orders() {
    echo -e "${YELLOW}Testing Checkout Service...${NC}"
    
    # Check if orders exist
    response=$(curl -s "${CHECKOUT_SERVICE_URL}/api/orders" 2>/dev/null || echo "[]")
    order_count=$(echo "$response" | jq -r '. | length' 2>/dev/null || echo "0")
    
    if [ "$order_count" -gt "3" ]; then
        echo -e "${GREEN}✅ Checkout Service: $order_count orders found${NC}"
    else
        echo -e "${YELLOW}⚠️ Checkout Service: Only $order_count orders found${NC}"
    fi
}

# Test analytics service
test_analytics() {
    echo -e "${YELLOW}Testing Analytics Service...${NC}"
    
    # Check if analytics endpoint responds
    response=$(curl -s "${ANALYTICS_SERVICE_URL}/api/analytics/summary" 2>/dev/null || echo "error")
    
    if [ "$response" != "error" ] && [ "$response" != "" ]; then
        echo -e "${GREEN}✅ Analytics Service: Responding correctly${NC}"
    else
        echo -e "${YELLOW}⚠️ Analytics Service: No response or error${NC}"
    fi
}

# Test frontend integration
test_frontend() {
    echo -e "${YELLOW}Testing Frontend Integration...${NC}"
    
    # Check if frontend is running
    if curl -s "http://localhost:3001" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend: Running on port 3001${NC}"
    else
        echo -e "${YELLOW}⚠️ Frontend: Not running (start with: cd app/frontend && npm run dev)${NC}"
    fi
    
    # Check architecture page
    if curl -s "http://localhost:3001/architecture" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Architecture Dashboard: Accessible${NC}"
    else
        echo -e "${YELLOW}⚠️ Architecture Dashboard: Not accessible${NC}"
    fi
}

# Main test execution
main() {
    echo -e "${BLUE}🎯 Starting Demo Data Verification Tests...${NC}"
    echo ""
    
    test_products
    echo ""
    
    test_users
    echo ""
    
    test_orders
    echo ""
    
    test_analytics
    echo ""
    
    test_frontend
    echo ""
    
    echo -e "${BLUE}📊 Test Summary:${NC}"
    echo -e "${GREEN}Demo data verification completed!${NC}"
    echo ""
    echo -e "${YELLOW}💡 Next Steps:${NC}"
    echo -e "  1. Visit http://localhost:3001 to see the frontend"
    echo -e "  2. Check http://localhost:3001/architecture for system overview"
    echo -e "  3. Browse products and test user functionality"
    echo -e "  4. Try load testing and chaos engineering features"
    echo ""
}

# Check if jq is installed (for JSON parsing)
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠️ jq not found, some tests may be limited${NC}"
    echo -e "${YELLOW}💡 Install with: sudo apt-get install jq${NC}"
    echo ""
fi

# Run tests
main "$@" 