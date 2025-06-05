import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Gauge } from 'k6/metrics';

// Custom metrics for demo visualization
export let requests = new Counter('total_requests');
export let errorRate = new Rate('errors');
export let activeUsers = new Gauge('load_test_concurrent_users');

export let options = {
  stages: [
    // Phase 1: Baseline (2 minutes)
    { duration: '30s', target: 5 },    // Ramp up to 5 users
    { duration: '60s', target: 5 },    // Maintain baseline
    
    // Phase 2: Gradual increase (4 minutes)
    { duration: '60s', target: 15 },   // Increase to 15 users
    { duration: '60s', target: 25 },   // Increase to 25 users  
    { duration: '60s', target: 40 },   // Increase to 40 users (should scale)
    
    // Phase 3: Peak load (3 minutes)
    { duration: '180s', target: 50 },  // Peak at 50 users
    
    // Phase 4: Scale down (4 minutes)
    { duration: '60s', target: 30 },   // Reduce load
    { duration: '60s', target: 15 },   // Further reduction
    { duration: '60s', target: 5 },    // Back to baseline
    { duration: '30s', target: 0 },    // Complete ramp down
  ],
  
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    errors: ['rate<0.1'],
  },
};

// Mock endpoints that return predictable responses
const MOCK_ENDPOINTS = [
  'https://httpbin.org/status/200',
  'https://httpbin.org/delay/0.1',
  'https://jsonplaceholder.typicode.com/posts/1',
  'https://httpbin.org/json',
];

export default function() {
  // Update active users metric for monitoring
  activeUsers.set(__VU);
  requests.add(1);
  
  // Select random endpoint
  const endpoint = MOCK_ENDPOINTS[Math.floor(Math.random() * MOCK_ENDPOINTS.length)];
  
  let response = http.get(endpoint, {
    headers: { 'User-Agent': 'k6-auto-scaling-demo-mock' },
    timeout: '10s',
  });
  
  let success = check(response, {
    'Status is 200': (r) => r.status === 200,
    'Response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  
  errorRate.add(!success);
  
  // Simulate user think time
  sleep(Math.random() * 2 + 0.5);
}

export function setup() {
  console.log('🎭 Running AUTO-SCALING DEMO with mock endpoints');
  console.log('📊 This demo shows scaling behavior patterns');
  console.log('🔄 Watch the load pattern: Baseline → Gradual Increase → Peak → Scale Down');
  console.log('');
  return { startTime: new Date().toISOString() };
}

export function teardown(data) {
  console.log('');
  console.log('🏁 Auto-scaling demo completed!');
  console.log(`⏱️  Duration: ${new Date().toISOString()} (started: ${data.startTime})`);
  console.log('📈 Check your monitoring dashboard to see the scaling patterns');
} 