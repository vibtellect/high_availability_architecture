import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Spike test configuration following k6 examples
export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      stages: [
        { duration: '10s', target: 2 },    // Ramp up to 2 users
        { duration: '10s', target: 50 },   // Spike to 50 users
        { duration: '10s', target: 2 },    // Scale down to 2 users
        { duration: '10s', target: 0 },    // Complete ramp-down
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'], // More lenient for spike test
    http_req_failed: ['rate<0.3'],     // Allow higher failure rate during spike
  },
};

// Metrics
const errorRate = new Rate('spike_errors');
const spikeResponseTime = new Trend('spike_response_time');

// Correct service endpoints
const services = [
  'http://product-service:8080/actuator/health',
  'http://user-service:8081/actuator/health', 
  'http://checkout-service:8082/health',
  'http://analytics-service:8083/health'
];

export function setup() {
  console.log('🌪️ Starting Spike Test');
  console.log('Testing system resilience under sudden load changes');
}

export default function () {
  // Random service selection
  const serviceUrl = services[Math.floor(Math.random() * services.length)];
  
  const response = http.get(serviceUrl, {
    timeout: '10s',
    tags: { test_type: 'spike' },
  });
  
  const success = check(response, {
    'Status is successful': (r) => r.status >= 200 && r.status < 400,
    'Response time acceptable for spike': (r) => r.timings.duration < 3000,
  });
  
  errorRate.add(!success);
  spikeResponseTime.add(response.timings.duration);
  
  if (!success) {
    console.log(`❌ Spike test failed for ${serviceUrl}: ${response.status}`);
  }
  
  sleep(Math.random() * 0.5 + 0.2); // Random think time 0.2-0.7s
}

export function teardown() {
  console.log('🏁 Spike Test completed - Check system recovery');
} 