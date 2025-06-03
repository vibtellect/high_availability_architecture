#!/bin/bash

# k6 Test Runner Script - Based on k6 Examples Best Practices
# Usage: ./run-test.sh [test-type] [duration] [vus] [target-service]

set -e

# Configuration
TEST_TYPE=${1:-load}
DURATION=${2:-60}
VUS=${3:-5}
TARGET_SERVICE=${4:-all-services}
TEST_ID="test-$(date +%s)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting k6 Load Test${NC}"
echo -e "${YELLOW}Configuration:${NC}"
echo -e "  - Test Type: ${TEST_TYPE}"
echo -e "  - Duration: ${DURATION}s"
echo -e "  - Virtual Users: ${VUS}"
echo -e "  - Target Service: ${TARGET_SERVICE}"
echo -e "  - Test ID: ${TEST_ID}"
echo ""

# Determine script to run
case ${TEST_TYPE} in
  "load")
    SCRIPT="/scripts/microservices-load-test.js"
    ;;
  "stress")
    SCRIPT="/scripts/stress-test.js"
    ;;
  "spike")
    SCRIPT="/scripts/spike-test.js"
    ;;
  "basic")
    SCRIPT="/scripts/api-load-test.js"
    ;;
  *)
    echo -e "${RED}❌ Unknown test type: ${TEST_TYPE}${NC}"
    echo -e "${YELLOW}Available types: load, stress, spike, basic${NC}"
    exit 1
    ;;
esac

# Check if script exists
if [ ! -f "${SCRIPT}" ]; then
  echo -e "${RED}❌ Test script not found: ${SCRIPT}${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Running k6 test: ${SCRIPT}${NC}"

# Run k6 test with environment variables
exec k6 run \
  --out experimental-prometheus-rw \
  --tag test_id=${TEST_ID} \
  --tag test_type=${TEST_TYPE} \
  --env TEST_ID=${TEST_ID} \
  --env DURATION=${DURATION} \
  --env TARGET_VUS=${VUS} \
  --env TARGET_SERVICE=${TARGET_SERVICE} \
  --env TEST_TYPE=${TEST_TYPE} \
  --summary-export=/tmp/test-summary.json \
  --console-output=/tmp/test-console.log \
  ${SCRIPT} 