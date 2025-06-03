import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';

// Stress test configuration following k6 examples
export const options = {
  scenarios: {
    stress: {
      executor: 'ramping-vus',
      stages: [
        { duration: '20s', target: 10 },   // Ramp up to normal load
        { duration: '30s', target: 20 },   // Stay at normal load
        { duration: '30s', target: 50 },   // Ramp up to stress load
        { duration: '30s', target: 100 },  // Ramp up to breaking point
        { duration: '60s', target: 100 },  // Stay at breaking point
        { duration: '30s', target: 0 },    // Ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.5'],
  },
};

// Stress test metrics
const stressErrors = new Rate('stress_errors');
const stressRequests = new Counter('stress_requests');

// Service configurations for stress testing
const stressTargets = [
  {
    name: 'product-service',
    endpoints: [
      'http://product-service:8080/actuator/health',
      'http://product-service:8080/api/v1/products'
    ]
  },
  {
    name: 'user-service', 
    endpoints: [
      'http://user-service:8081/actuator/health',
      'http://user-service:8081/api/v1/users/profile'
    ]
  },
  {
    name: 'checkout-service',
    endpoints: [
      'http://checkout-service:8082/health',
      'http://checkout-service:8082/api/checkout/cart'
    ]
  },
  {
    name: 'analytics-service',
    endpoints: [
      'http://analytics-service:8083/health',
      'http://analytics-service:8083/api/analytics/metrics'
    ]
  }
];

export function setup() {
  console.log('💪 Starting Stress Test');
  console.log('Testing system limits and breaking points');
  
  // Test initial connectivity
  stressTargets.forEach(target => {
    const response = http.get(target.endpoints[0], { timeout: '5s' });
    console.log(`🔍 ${target.name}: ${response.status >= 200 && response.status < 400 ? '✅' : '❌'} (${response.status})`);
  });
}

export default function () {
  // Select random service and endpoint
  const target = stressTargets[Math.floor(Math.random() * stressTargets.length)];
  const endpoint = target.endpoints[Math.floor(Math.random() * target.endpoints.length)];
  
  const response = http.get(endpoint, {
    timeout: '15s',
    tags: { 
      test_type: 'stress',
      service: target.name,
      endpoint_type: endpoint.includes('health') ? 'health' : 'api'
    },
  });
  
  const success = check(response, {
    'Status is acceptable for stress test': (r) => r.status >= 200 && r.status < 500,
    'Response time within stress limits': (r) => r.timings.duration < 5000,
  });
  
  stressErrors.add(!success);
  stressRequests.add(1);
  
  if (!success) {
    console.log(`⚠️ Stress failure on ${target.name}: ${response.status} (${response.timings.duration.toFixed(0)}ms)`);
  }
  
  sleep(Math.random() * 1 + 0.5); // Random think time 0.5-1.5s
}

export function teardown() {
  console.log('🏁 Stress Test completed');
  console.log('📊 Review metrics to identify breaking points');
} 