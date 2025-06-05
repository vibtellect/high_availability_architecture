import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend, Gauge } from 'k6/metrics';

// Custom metrics for monitoring
export let errorRate = new Rate('errors');
export let requests = new Counter('total_requests');
export let successfulRequests = new Counter('successful_requests');
export let responseTime = new Trend('response_time');

// Load test configuration with stages for auto-scaling demo
export let options = {
  stages: [
    // Phase 1: Baseline (should NOT trigger scaling)
    { duration: '1m', target: 5 },    // 5 concurrent users
    { duration: '2m', target: 5 },    // Maintain baseline
    
    // Phase 2: Gradual increase (should trigger scaling)
    { duration: '2m', target: 15 },   // Increase to 15 users
    { duration: '2m', target: 25 },   // Increase to 25 users  
    { duration: '2m', target: 40 },   // Increase to 40 users (should definitely scale)
    
    // Phase 3: Peak load (demonstrate scaled performance)
    { duration: '3m', target: 50 },   // Peak at 50 users
    
    // Phase 4: Scale down test
    { duration: '2m', target: 20 },   // Reduce load
    { duration: '2m', target: 5 },    // Back to baseline
    { duration: '1m', target: 0 },    // Complete ramp down
  ],
  
  // Performance thresholds
  thresholds: {
    http_req_duration: [
      'p(50)<500',     // 50% of requests under 500ms
      'p(95)<2000',    // 95% of requests under 2s
      'p(99)<5000',    // 99% of requests under 5s
    ],
    errors: ['rate<0.05'],              // Error rate under 5%
    successful_requests: ['count>100'], // At least 100 successful requests
  },
  
  // Additional options
  noConnectionReuse: false,
  userAgent: 'k6-auto-scaling-demo/1.0',
};

// Environment variables for service URLs
const BASE_URLS = {
  PRODUCT: __ENV.PRODUCT_URL || 'http://localhost:8080',
  USER: __ENV.USER_URL || 'http://localhost:8081', 
  CHECKOUT: __ENV.CHECKOUT_URL || 'http://localhost:8082',
  ANALYTICS: __ENV.ANALYTICS_URL || 'http://localhost:8083',
};

// Simulated user data for testing
const TEST_USERS = [
  { id: 1, name: 'Alice Johnson', email: 'alice@demo.com' },
  { id: 2, name: 'Bob Smith', email: 'bob@demo.com' },
  { id: 3, name: 'Carol Williams', email: 'carol@demo.com' },
  { id: 4, name: 'David Brown', email: 'david@demo.com' },
  { id: 5, name: 'Eve Davis', email: 'eve@demo.com' },
];

const PRODUCT_CATEGORIES = ['electronics', 'books', 'clothing', 'home', 'sports'];

// Realistic user journey simulation
export default function() {
  requests.add(1);
  
  const user = TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];
  const startTime = Date.now();
  
  // Simulate realistic user behavior with multiple service calls
  try {
    // 1. Browse products (Product Service)
    let productsResponse = http.get(`${BASE_URLS.PRODUCT}/api/v1/products`, {
      headers: { 'User-Agent': 'k6-auto-scaling-demo' },
      tags: { service: 'product', operation: 'list_products' },
    });
    
    let productsSuccess = check(productsResponse, {
      'Products - status is 200': (r) => r.status === 200,
      'Products - response time < 2000ms': (r) => r.timings.duration < 2000,
      'Products - has content': (r) => r.body.length > 0,
    });
    
    if (productsSuccess) {
      successfulRequests.add(1);
    } else {
      errorRate.add(1);
    }
    
    sleep(Math.random() * 2 + 0.5); // Simulate user reading time
    
    // 2. User authentication/profile (User Service)
    let userResponse = http.get(`${BASE_URLS.USER}/api/v1/users/${user.id}`, {
      headers: { 
        'User-Agent': 'k6-auto-scaling-demo',
        'Authorization': `Bearer demo-token-${user.id}`,
      },
      tags: { service: 'user', operation: 'get_profile' },
    });
    
    let userSuccess = check(userResponse, {
      'User - status is 200 or 404': (r) => [200, 404].includes(r.status),
      'User - response time < 1500ms': (r) => r.timings.duration < 1500,
    });
    
    if (userSuccess) {
      successfulRequests.add(1);
    } else {
      errorRate.add(1);
    }
    
    sleep(Math.random() * 1 + 0.3); // Quick profile check
    
    // 3. Add to cart and checkout (Checkout Service)
    let checkoutData = {
      userId: user.id,
      items: [
        {
          productId: Math.floor(Math.random() * 100) + 1,
          quantity: Math.floor(Math.random() * 3) + 1,
          price: Math.floor(Math.random() * 10000) + 999, // $9.99 to $109.98
        }
      ],
      totalAmount: Math.floor(Math.random() * 15000) + 2000, // $20.00 to $170.00
    };
    
    let checkoutResponse = http.post(`${BASE_URLS.CHECKOUT}/api/v1/orders`, 
      JSON.stringify(checkoutData), 
      {
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'k6-auto-scaling-demo',
          'Authorization': `Bearer demo-token-${user.id}`,
        },
        tags: { service: 'checkout', operation: 'create_order' },
      }
    );
    
    let checkoutSuccess = check(checkoutResponse, {
      'Checkout - status is 200 or 201': (r) => [200, 201].includes(r.status),
      'Checkout - response time < 3000ms': (r) => r.timings.duration < 3000,
    });
    
    if (checkoutSuccess) {
      successfulRequests.add(1);
    } else {
      errorRate.add(1);
    }
    
    sleep(Math.random() * 1.5 + 0.5); // Simulate order processing time
    
    // 4. Analytics tracking (Analytics Service)
    let analyticsData = {
      userId: user.id,
      event: 'purchase_completed',
      timestamp: new Date().toISOString(),
      metadata: {
        category: PRODUCT_CATEGORIES[Math.floor(Math.random() * PRODUCT_CATEGORIES.length)],
        value: checkoutData.totalAmount,
        sessionId: `session-${__VU}-${__ITER}`,
      }
    };
    
    let analyticsResponse = http.post(`${BASE_URLS.ANALYTICS}/api/v1/events`, 
      JSON.stringify(analyticsData), 
      {
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'k6-auto-scaling-demo',
        },
        tags: { service: 'analytics', operation: 'track_event' },
      }
    );
    
    let analyticsSuccess = check(analyticsResponse, {
      'Analytics - status is 200 or 202': (r) => [200, 202].includes(r.status),
      'Analytics - response time < 2000ms': (r) => r.timings.duration < 2000,
    });
    
    if (analyticsSuccess) {
      successfulRequests.add(1);
    } else {
      errorRate.add(1);
    }
    
    // Record overall journey response time
    const totalTime = Date.now() - startTime;
    responseTime.add(totalTime);
    
  } catch (error) {
    console.error(`Error in user journey: ${error}`);
    errorRate.add(1);
  }
  
  // Realistic think time between user sessions
  sleep(Math.random() * 3 + 1); // 1-4 seconds between iterations
}

// Setup function - runs once before the test
export function setup() {
  console.log('🚀 Starting Auto-Scaling Demo Load Test');
  console.log('==========================================');
  console.log(`Product Service: ${BASE_URLS.PRODUCT}`);
  console.log(`User Service: ${BASE_URLS.USER}`);
  console.log(`Checkout Service: ${BASE_URLS.CHECKOUT}`);
  console.log(`Analytics Service: ${BASE_URLS.ANALYTICS}`);
  console.log('');
  console.log('📊 Watch these metrics during the test:');
  console.log('  - Request Rate per Service');
  console.log('  - Response Times');
  console.log('  - CPU/Memory Usage');
  console.log('  - Pod/Container Scaling Events');
  console.log('');
  
  // Health check all services before starting
  const healthChecks = [
    { name: 'Product', url: `${BASE_URLS.PRODUCT}/health` },
    { name: 'User', url: `${BASE_URLS.USER}/health` },
    { name: 'Checkout', url: `${BASE_URLS.CHECKOUT}/health` },
    { name: 'Analytics', url: `${BASE_URLS.ANALYTICS}/health` },
  ];
  
  console.log('🔍 Pre-test health checks:');
  healthChecks.forEach(service => {
    try {
      let response = http.get(service.url, { timeout: '5s' });
      console.log(`  ${service.name}: ${response.status === 200 ? '✅ Healthy' : '❌ Unhealthy'}`);
    } catch (error) {
      console.log(`  ${service.name}: ❌ Unreachable`);
    }
  });
  
  console.log('');
  return { timestamp: new Date().toISOString() };
}

// Teardown function - runs once after the test
export function teardown(data) {
  console.log('');
  console.log('🏁 Auto-Scaling Demo Load Test Completed');
  console.log('=========================================');
  console.log(`Started at: ${data.timestamp}`);
  console.log(`Finished at: ${new Date().toISOString()}`);
  console.log('');
  console.log('📈 Key Observations to Check:');
  console.log('  - Did services scale up during peak load?');
  console.log('  - Did response times remain stable?');
  console.log('  - Did services scale down after load reduction?');
  console.log('  - Were there any error spikes during scaling?');
  console.log('');
  console.log('🎯 Next Steps:');
  console.log('  - Review Grafana dashboards for scaling events');
  console.log('  - Check Kubernetes HPA status (if applicable)');
  console.log('  - Analyze Prometheus metrics for performance patterns');
} 