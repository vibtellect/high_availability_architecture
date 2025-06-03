import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// Custom metrics for detailed monitoring
export const errorRate = new Rate('errors');
export const apiResponseTime = new Trend('api_response_time');
export const requestCounter = new Counter('total_requests');

// Test configuration via environment variables
export const options = {
  stages: [
    // Ramp-up phase
    { duration: '10s', target: __ENV.TARGET_VUS || 5 },
    // Main test phase
    { duration: `${__ENV.DURATION || 60}s`, target: __ENV.TARGET_VUS || 5 },
    // Ramp-down phase  
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must be below 500ms
    http_req_failed: ['rate<0.1'],    // Error rate must be below 10%
    errors: ['rate<0.1'],             // Custom error rate
  },
  tags: {
    test_id: __ENV.TEST_ID || 'default',
    target_service: __ENV.TARGET_SERVICE || 'all-services',
  },
};

// Service configuration
const services = {
  'product-service': {
    baseUrl: 'http://product-service:8080',
    endpoints: ['/actuator/health', '/api/v1/products', '/api/v1/products/health'],
    weight: 0.4,
  },
  'user-service': {
    baseUrl: 'http://user-service:8081', 
    endpoints: ['/actuator/health', '/api/v1/users/health', '/api/v1/auth/health'],
    weight: 0.3,
  },
  'checkout-service': {
    baseUrl: 'http://checkout-service:8082',
    endpoints: ['/health', '/api/v1/checkout/health'],
    weight: 0.2,
  },
  'analytics-service': {
    baseUrl: 'http://analytics-service:8083',
    endpoints: ['/health', '/api/v1/analytics/health'],
    weight: 0.1,
  },
};

// Determine which services to test based on TARGET_SERVICE
function getTargetServices() {
  const target = __ENV.TARGET_SERVICE || 'all-services';
  
  if (target === 'all-services') {
    return Object.keys(services);
  } else if (services[target]) {
    return [target];
  } else {
    console.warn(`Unknown target service: ${target}, defaulting to all services`);
    return Object.keys(services);
  }
}

// Load test scenario
export default function () {
  const targetServices = getTargetServices();
  
  // Select random service based on weights
  const selectedService = selectWeightedService(targetServices);
  const service = services[selectedService];
  
  // Select random endpoint
  const endpoint = service.endpoints[Math.floor(Math.random() * service.endpoints.length)];
  const url = `${service.baseUrl}${endpoint}`;
  
  // Execute request with headers
  const response = http.get(url, {
    headers: {
      'User-Agent': 'k6-load-test',
      'Accept': 'application/json',
      'X-Test-ID': __ENV.TEST_ID || 'k6-test',
    },
    timeout: '30s',
  });

  // Performance checks
  const checkResult = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'response time < 1s': (r) => r.timings.duration < 1000,
    'content is not empty': (r) => r.body && r.body.length > 0,
  });

  // Update custom metrics
  errorRate.add(!checkResult);
  apiResponseTime.add(response.timings.duration);
  requestCounter.add(1);

  // Add service-specific tags to metrics
  response.timings.duration && http.setResponseCallback(
    http.expectedStatuses(200, 201, 202, 204)
  );

  // Realistic user behavior - small pause between requests
  sleep(Math.random() * 2 + 0.5); // Random sleep 0.5-2.5s
}

// Weighted service selection for realistic load distribution
function selectWeightedService(targetServices) {
  if (targetServices.length === 1) {
    return targetServices[0];
  }

  const weights = targetServices.map(service => services[service].weight);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const random = Math.random() * totalWeight;
  
  let currentWeight = 0;
  for (let i = 0; i < targetServices.length; i++) {
    currentWeight += weights[i];
    if (random <= currentWeight) {
      return targetServices[i];
    }
  }
  
  return targetServices[0]; // Fallback
}

// Setup function - runs once at the beginning  
export function setup() {
  console.log(`Starting k6 load test:`);
  console.log(`- Test ID: ${__ENV.TEST_ID || 'default'}`);
  console.log(`- Duration: ${__ENV.DURATION || 60}s`);
  console.log(`- Target VUs: ${__ENV.TARGET_VUS || 5}`);
  console.log(`- Target Service: ${__ENV.TARGET_SERVICE || 'all-services'}`);
  console.log(`- Target Services: ${getTargetServices().join(', ')}`);
  
  return {};
}

// Teardown function - runs once at the end
export function teardown(data) {
  console.log('Load test completed successfully');
} 