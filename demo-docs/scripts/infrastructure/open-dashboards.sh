#!/bin/bash

# 🌐 Demo Dashboard Opener
# Öffnet alle relevanten URLs für Live-Demos

echo "🌐 Opening Demo Dashboards..."
echo "============================"

# Function to open URL based on OS
function open_url() {
    local url=$1
    local description=$2
    
    echo "🔗 Opening $description: $url"
    
    # Detect OS and use appropriate command
    if command -v xdg-open >/dev/null 2>&1; then
        # Linux
        xdg-open "$url" >/dev/null 2>&1 &
    elif command -v open >/dev/null 2>&1; then
        # macOS
        open "$url"
    elif command -v start >/dev/null 2>&1; then
        # Windows
        start "$url"
    else
        echo "⚠️  Please open manually: $url"
    fi
    
    sleep 1  # Small delay between opens
}

# Check if services are running
echo "🔍 Checking service availability..."

# Main Demo URLs
open_url "http://localhost:3001" "Frontend Application"
open_url "http://localhost:3000" "Grafana Monitoring (admin/admin)"
open_url "http://localhost:16686" "Jaeger Tracing"
open_url "http://localhost:9090" "Prometheus Metrics"

echo
echo "✅ All demo dashboards opened!"
echo
echo "📋 Demo URLs Summary:"
echo "  🎨 Frontend:   http://localhost:3001"
echo "  📊 Grafana:    http://localhost:3000  (admin/admin)"
echo "  🔍 Jaeger:     http://localhost:16686"
echo "  📈 Prometheus: http://localhost:9090"
echo
echo "💡 Tip: Arrange browser windows side-by-side for best demo experience!" 