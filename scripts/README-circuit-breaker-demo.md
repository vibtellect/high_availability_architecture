# Circuit Breaker Demo Scripts

This directory contains comprehensive demo scripts for testing and demonstrating the Circuit Breaker pattern implementation in our high-availability microservices architecture.

## 📋 Overview

The Circuit Breaker pattern protects our services from cascading failures by automatically detecting faults and temporarily stopping requests to failing dependencies. Our implementation includes:

- **Resilience4j** integration in Kotlin/Spring Boot services (Product Service)
- **Go Circuit Breakers** using `github.com/sony/gobreaker` (Checkout Service)
- **Prometheus metrics** for monitoring circuit breaker states
- **Grafana dashboards** for visualization
- **Automatic recovery** mechanisms

## 🎯 Demo Scripts

### 1. Interactive Demo Script (`demo-circuit-breaker.sh`)

**Purpose**: Interactive demonstration of circuit breaker functionality with visual monitoring.

**Features**:
- ✅ Service health checks
- 📊 Load testing with configurable RPS
- 🌪️ Chaos engineering scenarios
- 📈 Real-time metrics monitoring
- 🖥️ Automatic dashboard opening
- 🔄 Recovery verification

**Usage**:
```bash
# Full interactive demo
./scripts/demo-circuit-breaker.sh

# Quick 2-minute demo
./scripts/demo-circuit-breaker.sh --quick

# List available scenarios
./scripts/demo-circuit-breaker.sh --scenarios

# Help
./scripts/demo-circuit-breaker.sh --help
```

**Demo Scenarios**:
1. **Product Service Failure**: Simulates product service downtime affecting checkout
2. **Network Partition**: Simulates network latency between services
3. **Cascade Failure**: Simulates cascading failures across multiple services

### 2. Advanced Testing Tool (`circuit_breaker_tester.py`)

**Purpose**: Precise, programmable testing of circuit breaker functionality with detailed metrics.

**Features**:
- 🔬 Asynchronous load testing
- 📊 Detailed performance metrics
- 🌪️ Chaos engineering automation
- 📈 Prometheus integration
- 💾 JSON result export
- 🎯 Configurable test scenarios

**Requirements**:
```bash
pip install aiohttp asyncio
```

**Usage**:
```bash
# Health check all services
python3 scripts/circuit_breaker_tester.py --test-type health

# Load test checkout service
python3 scripts/circuit_breaker_tester.py --test-type load --service checkout --duration 60 --rps 10

# Chaos test (simulate failures)
python3 scripts/circuit_breaker_tester.py --test-type chaos --duration 120 --rps 5

# Comprehensive benchmark
python3 scripts/circuit_breaker_tester.py --test-type benchmark --service checkout

# Save results to file
python3 scripts/circuit_breaker_tester.py --test-type load --output results.json --verbose
```

## 🏗️ Prerequisites

### Services Running
Ensure all services are running before starting demos:

```bash
# Start infrastructure
docker-compose -f demo-docs/config/docker-compose.observability.yml up -d

# Start microservices
cd app/services/product_service && ./gradlew bootRun &
cd app/services/checkout_service && go run . &
cd app/services/user_service && npm start &
cd app/services/analytics_service && npm start &
```

### Monitoring Stack
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000
- **Circuit Breaker Dashboard**: http://localhost:3000/d/circuit-breaker-monitoring

## 🎮 Demo Flow

### Phase 1: Baseline Establishment
1. **Health Checks**: Verify all services are healthy
2. **Baseline Load**: Generate normal traffic to establish baseline metrics
3. **Dashboard Setup**: Open monitoring dashboards

### Phase 2: Failure Simulation
1. **Service Failure**: Simulate product service downtime
2. **Circuit Breaker Activation**: Observe circuit breakers opening
3. **Error Handling**: See how errors are handled gracefully

### Phase 3: Recovery Testing
1. **Service Recovery**: Restore failed service
2. **Circuit Breaker Recovery**: Watch circuit breakers close
3. **Performance Restoration**: Verify normal performance returns

## 📊 Key Metrics to Observe

### Circuit Breaker States
- **Closed**: Normal operation, requests pass through
- **Open**: Failure detected, requests fail fast
- **Half-Open**: Testing if service has recovered

### Performance Metrics
- **Success Rate**: Percentage of successful requests
- **Response Time**: Average response latency
- **Error Rate**: Rate of 5xx errors
- **Request Rate**: Requests per second

### Prometheus Queries
```promql
# Circuit breaker state
sum(cb:open_state:current)
sum(cb:closed_state:current)
sum(cb:half_open_state:current)

# Error rates
sum(rate(http_requests_total{status=~"5.."}[5m]))

# Response times
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
```

## 🔧 Configuration

### Circuit Breaker Settings

**Product Service (Kotlin/Spring Boot)**:
```properties
# User Service Circuit Breaker
resilience4j.circuitbreaker.instances.userService.failure-rate-threshold=60
resilience4j.circuitbreaker.instances.userService.minimum-number-of-calls=10
resilience4j.circuitbreaker.instances.userService.wait-duration-in-open-state=10s

# Analytics Service Circuit Breaker  
resilience4j.circuitbreaker.instances.analyticsService.failure-rate-threshold=70
resilience4j.circuitbreaker.instances.analyticsService.minimum-number-of-calls=5
resilience4j.circuitbreaker.instances.analyticsService.wait-duration-in-open-state=15s
```

**Checkout Service (Go)**:
```go
// Product Service Circuit Breaker
cb := gobreaker.NewCircuitBreaker(gobreaker.Settings{
    Name:        "ProductService",
    MaxRequests: 3,
    Interval:    time.Second * 10,
    Timeout:     time.Second * 30,
    ReadyToTrip: func(counts gobreaker.Counts) bool {
        return counts.ConsecutiveFailures > 2
    },
})
```

## 🎯 Expected Demo Results

### Normal Operation
- ✅ All circuit breakers in **CLOSED** state
- ✅ High success rates (>95%)
- ✅ Low response times (<100ms)
- ✅ Minimal error rates (<1%)

### During Failure
- ⚠️ Circuit breakers transition to **OPEN** state
- ⚠️ Success rates drop temporarily
- ⚠️ Response times may spike initially
- ⚠️ Error rates increase briefly, then stabilize

### After Recovery
- ✅ Circuit breakers transition to **HALF-OPEN**, then **CLOSED**
- ✅ Success rates return to normal
- ✅ Response times normalize
- ✅ Error rates drop to baseline

## 🐛 Troubleshooting

### Common Issues

**Services Not Responding**:
```bash
# Check service status
curl -f http://localhost:8081/health  # Product Service
curl -f http://localhost:8082/health  # Checkout Service
```

**Circuit Breaker Endpoints Not Available**:
```bash
# Check circuit breaker status
curl http://localhost:8082/api/v1/circuit-breakers
```

**Prometheus Metrics Missing**:
```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets
```

**Grafana Dashboard Not Loading**:
```bash
# Check Grafana status
curl http://localhost:3000/api/health
```

### Debug Mode
Enable verbose logging for detailed troubleshooting:

```bash
# Bash script debug
bash -x scripts/demo-circuit-breaker.sh

# Python script debug
python3 scripts/circuit_breaker_tester.py --verbose
```

## 📚 Additional Resources

### Documentation
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Resilience4j Documentation](https://resilience4j.readme.io/docs/circuitbreaker)
- [Go Circuit Breaker](https://github.com/sony/gobreaker)

### Monitoring
- [Prometheus Circuit Breaker Metrics](http://localhost:9090/targets)
- [Grafana Circuit Breaker Dashboard](http://localhost:3000/d/circuit-breaker-monitoring)
- [Service Overview Dashboard](http://localhost:3000/d/microservices-overview)

## 🎉 Demo Success Criteria

A successful circuit breaker demo should demonstrate:

1. ✅ **Fault Detection**: Circuit breakers open when services fail
2. ✅ **Fast Failure**: Requests fail fast when circuit is open
3. ✅ **Graceful Degradation**: System continues operating with reduced functionality
4. ✅ **Automatic Recovery**: Circuit breakers close when services recover
5. ✅ **Monitoring Integration**: All states visible in Grafana dashboards
6. ✅ **Performance Protection**: Overall system performance is protected during failures

---

**Happy Testing! 🚀**

For questions or issues, check the main project documentation or open an issue in the repository. 