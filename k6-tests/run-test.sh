#!/bin/bash

# k6 Load Test Runner for High Availability Architecture
# Usage: ./run-test.sh [test-type] [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
TEST_TYPE="quick"
OUTPUT_FORMAT="stdout"
RESULTS_DIR="./results"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    cat << EOF
🚀 High Availability Architecture - k6 Load Test Runner

Usage: $0 [test-type] [options]

Test Types:
  quick       Quick smoke test (2 minutes, 5 VUs)
  baseline    Baseline load test (5 minutes, 10 VUs)
  stress      Stress test (12 minutes, up to 100 VUs)
  spike       Spike test (7 minutes with traffic spikes)
  full        Full comprehensive test (all scenarios)

Options:
  --output FORMAT    Output format: stdout, json, html (default: stdout)
  --results-dir DIR  Directory for results (default: ./results)
  --no-warmup        Skip service warmup
  --help            Show this help message

Examples:
  $0 quick                    # Quick smoke test
  $0 baseline --output json   # Baseline test with JSON output
  $0 stress --results-dir ./my-results  # Stress test with custom output directory
  $0 full --output html       # Full test with HTML report

Services under test:
  - Product Service (localhost:8080)
  - User Service (localhost:8081)
  - Checkout Service (localhost:8082)
  - Analytics Service (localhost:8083)

EOF
}

# Function to check if services are running
check_services() {
    print_status "Checking service availability..."
    
    services=(
        "Product Service:http://localhost:8080/actuator/health"
        "User Service:http://localhost:8081/actuator/health"
        "Checkout Service:http://localhost:8082/health"
        "Analytics Service:http://localhost:8083/health"
    )
    
    all_healthy=true
    
    for service in "${services[@]}"; do
        name=$(echo $service | cut -d: -f1)
        url=$(echo $service | cut -d: -f2-)
        
        if curl -s --max-time 5 "$url" > /dev/null 2>&1; then
            print_success "$name is healthy"
        else
            print_warning "$name is not responding"
            all_healthy=false
        fi
    done
    
    if [ "$all_healthy" = false ]; then
        print_warning "Some services are not healthy. Test results may include connection errors."
        echo -e "Continue anyway? (y/n): \c"
        read -r response
        if [ "$response" != "y" ] && [ "$response" != "Y" ]; then
            print_error "Test cancelled by user"
            exit 1
        fi
    fi
}

# Function to create results directory
prepare_results_dir() {
    if [ ! -d "$RESULTS_DIR" ]; then
        mkdir -p "$RESULTS_DIR"
        print_status "Created results directory: $RESULTS_DIR"
    fi
}

# Function to run k6 test
run_k6_test() {
    local test_script="$1"
    local output_args="$2"
    
    print_status "Starting k6 load test..."
    print_status "Test type: $TEST_TYPE"
    print_status "Output format: $OUTPUT_FORMAT"
    print_status "Results directory: $RESULTS_DIR"
    echo
    
    # Run k6 with appropriate arguments
    if ! k6 run $output_args "$test_script"; then
        print_error "k6 test failed"
        exit 1
    fi
    
    print_success "k6 test completed successfully"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        quick|baseline|stress|spike|full)
            TEST_TYPE="$1"
            shift
            ;;
        --output)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        --results-dir)
            RESULTS_DIR="$2"
            shift 2
            ;;
        --no-warmup)
            NO_WARMUP=true
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate output format
case $OUTPUT_FORMAT in
    stdout|json|html)
        ;;
    *)
        print_error "Invalid output format: $OUTPUT_FORMAT"
        print_error "Valid formats: stdout, json, html"
        exit 1
        ;;
esac

# Create output arguments based on format
output_args=""
timestamp=$(date +"%Y%m%d_%H%M%S")

case $OUTPUT_FORMAT in
    json)
        prepare_results_dir
        output_args="--out json=$RESULTS_DIR/results_${TEST_TYPE}_${timestamp}.json"
        ;;
    html)
        prepare_results_dir
        output_args="--out json=$RESULTS_DIR/results_${TEST_TYPE}_${timestamp}.json"
        # Note: HTML report would be generated post-processing the JSON
        ;;
esac

# Select test script based on test type
case $TEST_TYPE in
    quick)
        test_script="quick-test.js"
        ;;
    baseline|stress|spike|full)
        test_script="test-plan.js"
        ;;
    *)
        print_error "Invalid test type: $TEST_TYPE"
        exit 1
        ;;
esac

# Check if test script exists
if [ ! -f "$test_script" ]; then
    print_error "Test script not found: $test_script"
    exit 1
fi

# Main execution
echo "🚀 High Availability Architecture - Load Test"
echo "============================================="
echo

# Check services unless disabled
if [ "$NO_WARMUP" != true ]; then
    check_services
    echo
fi

# Set environment variable for test type (if needed by k6 script)
export K6_TEST_TYPE="$TEST_TYPE"

# Run the test
run_k6_test "$test_script" "$output_args"

# Post-processing for HTML output
if [ "$OUTPUT_FORMAT" = "html" ]; then
    print_status "Generating HTML report..."
    # This would require additional tooling to convert JSON to HTML
    print_warning "HTML report generation not implemented yet"
    print_status "JSON results available at: $RESULTS_DIR/results_${TEST_TYPE}_${timestamp}.json"
fi

echo
print_success "Load test completed! 🎉"

if [ "$OUTPUT_FORMAT" = "json" ]; then
    print_status "Results saved to: $RESULTS_DIR/results_${TEST_TYPE}_${timestamp}.json"
fi 