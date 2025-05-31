#!/bin/bash

echo "🚀 Starting High Availability E-Commerce Demo with Full Observability..."

# Start observability infrastructure first
echo "📊 Starting OpenTelemetry Collector & Jaeger..."
docker-compose -f docker-compose.observability.yml up -d

# Wait for observability services to be ready
echo "⏳ Waiting for observability services to start..."
sleep 10

# Start main application with tracing enabled
echo "🏗️ Starting microservices with OpenTelemetry tracing..."
docker-compose -f docker-compose.yml -f docker-compose.tracing.yml up -d

echo "✅ Demo environment starting up..."
echo ""
echo "🌐 Access Points:"
echo "- Frontend: http://localhost:3001"
echo "- Architecture Dashboard: http://localhost:3001/architecture" 
echo "- Grafana: http://localhost:3000 (admin/admin)"
echo "- Prometheus: http://localhost:9090"
echo "- Jaeger UI: http://localhost:16686"
echo "- OpenTelemetry Health: http://localhost:13133"
echo ""
echo "🔍 Distributed Tracing:"
echo "- All 4 microservices are now instrumented with OpenTelemetry"
echo "- Traces will appear in Jaeger UI after making API calls"
echo "- Use Artillery for load testing: cd app/frontend && npm run artillery:test"
echo ""
echo "📊 Analytics Service Health: http://localhost:8083/health"
echo ""
echo "�� Ready for demo!" 