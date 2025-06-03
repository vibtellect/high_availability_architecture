import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Counter, Trend, Gauge } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// Custom metrics following k6 examples best practices
export const errorRate = new Rate('errors');
export const successRate = new Rate('success_rate');
export const apiResponseTime = new Trend('api_response_time');
export const requestCounter = new Counter('total_requests');
export const activeUsers = new Gauge('active_users');

// Test configuration based on k6 examples patterns
export const options = {
  scenarios: {
    // Ramping VUs pattern from k6 examples
    ramping_vus: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: parseInt(__ENV.TARGET_VUS || '5') },
        { duration: `${parseInt(__ENV.DURATION || '60')}s`, target: parseInt(__ENV.TARGET_VUS || '5') },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    http_req_failed: ['rate<0.1'],
    errors: ['rate<0.1'],
  },
};

// Service configurations with CORRECT PORTS
const services = {
  'product-service': {
    baseUrl: 'http://product-service:8080',
    healthPath: '/actuator/health',
    apiPaths: ['/api/v1/products', '/api/v1/products/featured']
  },
  'user-service': {
    baseUrl: 'http://user-service:8081', 
    healthPath: '/actuator/health',
    apiPaths: ['/api/v1/users/profile'] // Will get 403 but that's expected
  },
  'checkout-service': {
    baseUrl: 'http://checkout-service:8082',
    healthPath: '/health',
    apiPaths: ['/api/checkout/cart', '/api/checkout/status']
  },
  'analytics-service': {
    baseUrl: 'http://analytics-service:8083', // ✅ CORRECTED FROM 5000 to 8083
    healthPath: '/health',
    apiPaths: ['/api/analytics/metrics', '/api/analytics/events']
  }
};

// Setup function following k6 examples
export function setup() {
  console.log('🚀 k6 Microservices Load Test Starting');
  console.log(`Target Service: ${__ENV.TARGET_SERVICE || 'all-services'}`);
  console.log(`Duration: ${__ENV.DURATION || 60}s`);
  console.log(`VUs: ${__ENV.TARGET_VUS || 5}`);
  
  // Health check all services
  const healthResults = {};
  for (const [serviceName, config] of Object.entries(services)) {
    const response = http.get(`${config.baseUrl}${config.healthPath}`, { timeout: '5s' });
    healthResults[serviceName] = {
      status: response.status,
      healthy: response.status === 200
    };
    console.log(`🔍 ${serviceName}: ${response.status === 200 ? '✅ Healthy' : '❌ Unhealthy'} (${response.status})`);
  }
  
  return { healthResults };
}

// Main test function based on k6 examples patterns
export default function () {
  const targetService = __ENV.TARGET_SERVICE || 'all-services';
  activeUsers.add(1);
  
  if (targetService === 'all-services') {
    // Test all services following k6 examples pattern
    Object.entries(services).forEach(([serviceName, config]) => {
      group(`${serviceName} Tests`, () => {
        testService(serviceName, config);
      });
      sleep(0.5); // Brief pause between services
    });
  } else if (services[targetService]) {
    // Test specific service
    group(`${targetService} Focused Test`, () => {
      testService(targetService, services[targetService]);
    });
  } else {
    console.log(`❌ Unknown service: ${targetService}`);
  }
  
  sleep(1);
}

function testService(serviceName, config) {
  console.log(`🔍 Testing ${serviceName}...`);
  
  // Health check test
  const healthResponse = http.get(`${config.baseUrl}${config.healthPath}`, { timeout: '10s' });
  
  const healthCheck = check(healthResponse, {
    [`${serviceName} health check successful`]: (r) => r.status === 200,
    [`${serviceName} health response time < 1s`]: (r) => r.timings.duration < 1000,
  });
  
  // Record metrics
  requestCounter.add(1);
  apiResponseTime.add(healthResponse.timings.duration);
  errorRate.add(!healthCheck);
  successRate.add(healthCheck);
  
  if (healthResponse.status === 200) {
    console.log(`✅ ${serviceName} health check passed`);
    
    // API endpoint tests
    config.apiPaths.forEach(path => {
      const apiResponse = http.get(`${config.baseUrl}${path}`, { timeout: '10s' });
      
      const apiCheck = check(apiResponse, {
        [`${serviceName}${path} responded`]: (r) => r.status >= 200 && r.status < 500,
        [`${serviceName}${path} response time < 2s`]: (r) => r.timings.duration < 2000,
      });
      
      requestCounter.add(1);
      apiResponseTime.add(apiResponse.timings.duration);
      errorRate.add(!apiCheck);
      successRate.add(apiCheck);
      
      if (apiResponse.status < 400) {
        console.log(`✅ ${serviceName}${path} endpoint accessible`);
      } else {
        console.log(`⚠️ ${serviceName}${path} returned ${apiResponse.status} (may be expected)`);
      }
    });
  } else {
    console.log(`❌ ${serviceName} health check failed: ${healthResponse.status}`);
  }
}

// Summary function following k6 examples
export function handleSummary(data) {
  console.log('📊 Test Summary Generated');
  
  return {
    'summary.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

// Teardown function
export function teardown(data) {
  console.log('🏁 k6 Microservices Load Test Completed');
  console.log(`📈 Total Requests: ${data.healthResults ? 'Setup completed' : 'Setup failed'}`);
} 