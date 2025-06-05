#!/bin/bash

# Test script for k6 Integration in Analytics Service
# Tests the new k6 load testing API functionality

set -e

ANALYTICS_URL="http://localhost:8083/api/v1/analytics"
TEST_CONFIG='{
  "duration": 30,
  "vus": 5,
  "target": "product-service",
  "type": "baseline"
}'

echo "🚀 Testing k6 Integration in Analytics Service"
echo "=============================================="

# Test 1: Get available scenarios
echo "📋 Test 1: Get available k6 scenarios"
curl -s -X GET "${ANALYTICS_URL}/load-test/scenarios" \
  -H "Content-Type: application/json" \
  -H "X-Correlation-ID: test-scenarios-$(date +%s)" | jq .

echo -e "\n"

# Test 2: Start a k6 load test
echo "🔥 Test 2: Start k6 load test"
START_RESPONSE=$(curl -s -X POST "${ANALYTICS_URL}/load-test/start" \
  -H "Content-Type: application/json" \
  -H "X-Correlation-ID: test-start-$(date +%s)" \
  -d "${TEST_CONFIG}")

echo $START_RESPONSE | jq .

# Extract test ID
TEST_ID=$(echo $START_RESPONSE | jq -r '.test_id // empty')

if [ -n "$TEST_ID" ]; then
  echo "✅ Test started with ID: $TEST_ID"
  
  # Test 3: Monitor test status
  echo -e "\n📊 Test 3: Monitor test status for 15 seconds"
  for i in {1..3}; do
    echo "Status check #$i:"
    curl -s -X GET "${ANALYTICS_URL}/load-test/status" \
      -H "Content-Type: application/json" \
      -H "X-Correlation-ID: test-status-$(date +%s)" | jq .
    sleep 5
  done
  
  # Test 4: Get k6 metrics
  echo -e "\n📈 Test 4: Get k6 metrics from Prometheus"
  curl -s -X GET "${ANALYTICS_URL}/load-test/metrics" \
    -H "Content-Type: application/json" \
    -H "X-Correlation-ID: test-metrics-$(date +%s)" | jq .
  
  # Test 5: Stop the test (optional - test will auto-complete)
  echo -e "\n🛑 Test 5: Stop load test"
  curl -s -X POST "${ANALYTICS_URL}/load-test/stop" \
    -H "Content-Type: application/json" \
    -H "X-Correlation-ID: test-stop-$(date +%s)" | jq .
  
else
  echo "❌ Failed to start test"
fi

echo -e "\n✅ k6 Integration Test Complete!"
echo "Check the Analytics Service logs and Grafana dashboards for detailed results." 