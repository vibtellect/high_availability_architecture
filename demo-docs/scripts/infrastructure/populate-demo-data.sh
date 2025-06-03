#!/bin/bash

# Demo Data Population Script for High Availability E-Commerce Architecture
# This script populates all microservices with realistic demo data

set -e

echo "🚀 Populating High Availability E-Commerce Demo Data..."

# Configuration
PRODUCT_SERVICE_URL="http://localhost:8080"
USER_SERVICE_URL="http://localhost:8081"
CHECKOUT_SERVICE_URL="http://localhost:8082"
ANALYTICS_SERVICE_URL="http://localhost:8083"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Wait for service to be ready
wait_for_service() {
    local service_name=$1
    local service_url=$2
    local max_attempts=30
    local attempt=0

    echo -e "${YELLOW}Waiting for ${service_name} to be ready...${NC}"
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "${service_url}/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ ${service_name} is ready!${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}⏳ Attempt $((attempt + 1))/${max_attempts} - ${service_name} not ready yet...${NC}"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ ${service_name} failed to start within expected time${NC}"
    return 1
}

# Create products
populate_products() {
    echo -e "${BLUE}📦 Populating Product Service...${NC}"
    
    # Product categories and sample data
    declare -a products=(
        '{"name":"MacBook Pro 16\"","description":"Leistungsstarker Laptop für Profis mit M3 Pro Chip","price":2999.00,"category":"Laptops","imageUrl":"https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500","stock":50,"brand":"Apple","sku":"MBP-16-M3"}'
        '{"name":"Dell XPS 13","description":"Ultrabook mit Intel Core i7 und 16GB RAM","price":1499.00,"category":"Laptops","imageUrl":"https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=500","stock":30,"brand":"Dell","sku":"XPS-13-I7"}'
        '{"name":"Gaming Stuhl Pro","description":"Ergonomischer Gaming-Stuhl mit Lendenwirbelstütze","price":299.99,"category":"Möbel","imageUrl":"https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500","stock":25,"brand":"DXRacer","sku":"GC-PRO-001"}'
        '{"name":"iPhone 15 Pro","description":"Neuestes iPhone mit Titanium Design und A17 Pro Chip","price":1199.00,"category":"Smartphones","imageUrl":"https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500","stock":100,"brand":"Apple","sku":"IP-15-PRO-128"}'
        '{"name":"Samsung Galaxy S24","description":"Android Flaggschiff mit AI-Features","price":899.00,"category":"Smartphones","imageUrl":"https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=500","stock":75,"brand":"Samsung","sku":"SGS-24-256"}'
        '{"name":"Sony WH-1000XM5","description":"Noise-Cancelling Kopfhörer der Spitzenklasse","price":349.99,"category":"Audio","imageUrl":"https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500","stock":40,"brand":"Sony","sku":"WH1000XM5"}'
        '{"name":"iPad Air 5","description":"Vielseitiges Tablet für Kreative und Profis","price":679.00,"category":"Tablets","imageUrl":"https://images.unsplash.com/photo-1561154464-82e9adf32764?w=500","stock":60,"brand":"Apple","sku":"IPAD-AIR-5-256"}'
        '{"name":"Microsoft Surface Pro 9","description":"2-in-1 Laptop-Tablet mit Windows 11","price":1299.00,"category":"Tablets","imageUrl":"https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500","stock":35,"brand":"Microsoft","sku":"SURF-PRO-9"}'
        '{"name":"LG OLED C3 55\"","description":"Premium OLED TV mit 4K und Dolby Vision","price":1799.00,"category":"TVs","imageUrl":"https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500","stock":20,"brand":"LG","sku":"OLED55C3"}'
        '{"name":"Nintendo Switch OLED","description":"Handheld-Konsole mit verbessertem Display","price":349.99,"category":"Gaming","imageUrl":"https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=500","stock":80,"brand":"Nintendo","sku":"NSW-OLED-001"}'
        '{"name":"AirPods Pro 2","description":"True Wireless Kopfhörer mit adaptivem Audio","price":279.00,"category":"Audio","imageUrl":"https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=500","stock":90,"brand":"Apple","sku":"APP-2-GEN"}'
        '{"name":"Logitech MX Master 3S","description":"Precision Maus für Profis","price":99.99,"category":"Zubehör","imageUrl":"https://images.unsplash.com/photo-1527814050087-3793815479db?w=500","stock":55,"brand":"Logitech","sku":"MX-MASTER-3S"}'
        '{"name":"Kindle Paperwhite","description":"E-Reader mit hochauflösendem Display","price":139.99,"category":"E-Reader","imageUrl":"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500","stock":70,"brand":"Amazon","sku":"KPW-11-GEN"}'
        '{"name":"Canon EOS R6 Mark II","description":"Vollformat-Spiegellose für Foto und Video","price":2499.00,"category":"Kameras","imageUrl":"https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=500","stock":15,"brand":"Canon","sku":"EOS-R6-MK2"}'
        '{"name":"Samsung Monitor 32\"","description":"4K Monitor mit USB-C für Profis","price":599.00,"category":"Monitore","imageUrl":"https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500","stock":45,"brand":"Samsung","sku":"SAM-MON-32-4K"}'
    )
    
    for product in "${products[@]}"; do
        response=$(curl -s -w "%{http_code}" -X POST \
            -H "Content-Type: application/json" \
            -d "$product" \
            "${PRODUCT_SERVICE_URL}/api/v1/products" \
            -o /tmp/product_response.txt)
        
        if [ "$response" = "200" ] || [ "$response" = "201" ]; then
            product_name=$(echo "$product" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
            echo -e "${GREEN}✅ Created product: ${product_name}${NC}"
        else
            echo -e "${RED}❌ Failed to create product (HTTP: $response)${NC}"
            # Debug: show response content
            echo -e "${YELLOW}Response: $(cat /tmp/product_response.txt)${NC}"
        fi
        sleep 0.1
    done
}

# Create demo users
populate_users() {
    echo -e "${BLUE}👥 Populating User Service...${NC}"
    
    declare -a users=(
        '{"firstName":"Max","lastName":"Mustermann","email":"max.mustermann@example.com","password":"demo123","address":{"street":"Musterstraße 1","city":"Berlin","zipCode":"10115","country":"Germany"},"phone":"+49 30 12345678"}'
        '{"firstName":"Anna","lastName":"Schmidt","email":"anna.schmidt@example.com","password":"demo123","address":{"street":"Hauptstraße 23","city":"München","zipCode":"80331","country":"Germany"},"phone":"+49 89 87654321"}'
        '{"firstName":"Thomas","lastName":"Weber","email":"thomas.weber@example.com","password":"demo123","address":{"street":"Königsallee 45","city":"Düsseldorf","zipCode":"40212","country":"Germany"},"phone":"+49 211 55667788"}'
        '{"firstName":"Sarah","lastName":"Müller","email":"sarah.mueller@example.com","password":"demo123","address":{"street":"Stephansplatz 12","city":"Hamburg","zipCode":"20354","country":"Germany"},"phone":"+49 40 99887766"}'
        '{"firstName":"Michael","lastName":"Fischer","email":"michael.fischer@example.com","password":"demo123","address":{"street":"Marienplatz 8","city":"Stuttgart","zipCode":"70173","country":"Germany"},"phone":"+49 711 44332211"}'
        '{"firstName":"Julia","lastName":"Wagner","email":"julia.wagner@example.com","password":"demo123","address":{"street":"Altstadt 15","city":"Köln","zipCode":"50667","country":"Germany"},"phone":"+49 221 66778899"}'
        '{"firstName":"Daniel","lastName":"Becker","email":"daniel.becker@example.com","password":"demo123","address":{"street":"Unter den Linden 22","city":"Berlin","zipCode":"10117","country":"Germany"},"phone":"+49 30 33445566"}'
        '{"firstName":"Lisa","lastName":"Hofmann","email":"lisa.hofmann@example.com","password":"demo123","address":{"street":"Rathaus Galerien 7","city":"Essen","zipCode":"45127","country":"Germany"},"phone":"+49 201 77889900"}'
    )
    
    for user in "${users[@]}"; do
        response=$(curl -s -w "%{http_code}" -X POST \
            -H "Content-Type: application/json" \
            -d "$user" \
            "${USER_SERVICE_URL}/api/v1/users" \
            -o /tmp/user_response.txt)
        
        if [ "$response" = "200" ] || [ "$response" = "201" ]; then
            user_email=$(echo "$user" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)
            echo -e "${GREEN}✅ Created user: ${user_email}${NC}"
        else
            echo -e "${RED}❌ Failed to create user (HTTP: $response)${NC}"
            # Debug: show response content
            echo -e "${YELLOW}Response: $(cat /tmp/user_response.txt)${NC}"
        fi
        sleep 0.1
    done
}

# Create sample orders
populate_orders() {
    echo -e "${BLUE}🛒 Populating Checkout Service with sample orders...${NC}"
    
    # Simulate some completed orders
    declare -a orders=(
        '{"userId":1,"items":[{"productId":1,"quantity":1,"price":2999.00}],"totalAmount":2999.00,"status":"completed","shippingAddress":{"street":"Musterstraße 1","city":"Berlin","zipCode":"10115","country":"Germany"}}'
        '{"userId":2,"items":[{"productId":4,"quantity":1,"price":1199.00},{"productId":11,"quantity":1,"price":279.00}],"totalAmount":1478.00,"status":"completed","shippingAddress":{"street":"Hauptstraße 23","city":"München","zipCode":"80331","country":"Germany"}}'
        '{"userId":3,"items":[{"productId":6,"quantity":1,"price":349.99}],"totalAmount":349.99,"status":"shipped","shippingAddress":{"street":"Königsallee 45","city":"Düsseldorf","zipCode":"40212","country":"Germany"}}'
        '{"userId":4,"items":[{"productId":9,"quantity":1,"price":1799.00}],"totalAmount":1799.00,"status":"processing","shippingAddress":{"street":"Stephansplatz 12","city":"Hamburg","zipCode":"20354","country":"Germany"}}'
        '{"userId":5,"items":[{"productId":10,"quantity":2,"price":349.99}],"totalAmount":699.98,"status":"completed","shippingAddress":{"street":"Marienplatz 8","city":"Stuttgart","zipCode":"70173","country":"Germany"}}'
    )
    
    for order in "${orders[@]}"; do
        response=$(curl -s -w "%{http_code}" -X POST \
            -H "Content-Type: application/json" \
            -d "$order" \
            "${CHECKOUT_SERVICE_URL}/api/v1/orders" \
            -o /tmp/order_response.txt)
        
        if [ "$response" = "200" ] || [ "$response" = "201" ]; then
            echo -e "${GREEN}✅ Created sample order${NC}"
        else
            echo -e "${RED}❌ Failed to create order (HTTP: $response)${NC}"
            # Debug: show response content
            echo -e "${YELLOW}Response: $(cat /tmp/order_response.txt)${NC}"
        fi
        sleep 0.1
    done
}

# Generate analytics data
populate_analytics() {
    echo -e "${BLUE}📊 Populating Analytics Service...${NC}"
    
    # Generate some analytics events
    declare -a events=(
        '{"eventType":"page_view","userId":1,"metadata":{"page":"/products","timestamp":"'$(date -d '1 hour ago' -Iseconds)'"}}'
        '{"eventType":"product_view","userId":2,"productId":1,"metadata":{"timestamp":"'$(date -d '45 minutes ago' -Iseconds)'"}}'
        '{"eventType":"add_to_cart","userId":3,"productId":4,"metadata":{"quantity":1,"timestamp":"'$(date -d '30 minutes ago' -Iseconds)'"}}'
        '{"eventType":"purchase","userId":1,"orderId":1,"metadata":{"amount":2999.00,"timestamp":"'$(date -d '15 minutes ago' -Iseconds)'"}}'
        '{"eventType":"search","userId":4,"metadata":{"query":"laptop","results":5,"timestamp":"'$(date -d '10 minutes ago' -Iseconds)'"}}'
    )
    
    for event in "${events[@]}"; do
        response=$(curl -s -w "%{http_code}" -X POST \
            -H "Content-Type: application/json" \
            -d "$event" \
            "${ANALYTICS_SERVICE_URL}/api/v1/events" \
            -o /tmp/analytics_response.txt)
        
        if [ "$response" = "200" ] || [ "$response" = "201" ]; then
            echo -e "${GREEN}✅ Created analytics event${NC}"
        else
            echo -e "${YELLOW}⚠️ Analytics service might not be ready yet (HTTP: $response)${NC}"
        fi
        sleep 0.1
    done
}

# Main execution
main() {
    echo -e "${BLUE}🎯 Starting Demo Data Population Process...${NC}"
    
    # Wait for all services to be ready
    echo -e "${YELLOW}Checking service availability...${NC}"
    
    if wait_for_service "Product Service" "$PRODUCT_SERVICE_URL"; then
        populate_products
    else
        echo -e "${RED}❌ Product Service unavailable - skipping product population${NC}"
    fi
    
    if wait_for_service "User Service" "$USER_SERVICE_URL"; then
        populate_users
    else
        echo -e "${RED}❌ User Service unavailable - skipping user population${NC}"
    fi
    
    if wait_for_service "Checkout Service" "$CHECKOUT_SERVICE_URL"; then
        populate_orders
    else
        echo -e "${RED}❌ Checkout Service unavailable - skipping order population${NC}"
    fi
    
    # Analytics service is optional
    if curl -s "${ANALYTICS_SERVICE_URL}/health" > /dev/null 2>&1; then
        populate_analytics
    else
        echo -e "${YELLOW}⚠️ Analytics Service unavailable - skipping analytics population${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}🎉 Demo data population completed!${NC}"
    echo -e "${BLUE}📋 Summary:${NC}"
    echo -e "  - Products: 15 sample products created"
    echo -e "  - Users: 8 demo users created"
    echo -e "  - Orders: 5 sample orders created"
    echo -e "  - Analytics: Event tracking data populated"
    echo ""
    echo -e "${YELLOW}💡 You can now access the frontend at: http://localhost:3001${NC}"
    echo -e "${YELLOW}💡 Architecture dashboard at: http://localhost:3001/architecture${NC}"
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi 