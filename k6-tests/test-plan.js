import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const productServiceDuration = new Trend('product_service_duration');
const userServiceDuration = new Trend('user_service_duration');
const checkoutServiceDuration = new Trend('checkout_service_duration');
const analyticsServiceDuration = new Trend('analytics_service_duration');
const businessTransactionCounter = new Counter('business_transactions');

// Test configuration
export let options = {
  scenarios: {
    // Baseline load test - normal traffic
    baseline_load: {
      executor: 'constant-vus',
      vus: 10,
      duration: '5m',
      tags: { test_type: 'baseline' },
    },
    
    // Spike test - sudden traffic increase
    spike_test: {
      executor: 'ramping-vus',
      startTime: '5m',
      stages: [
        { duration: '30s', target: 50 }, // Spike up
        { duration: '1m', target: 50 },  // Stay high
        { duration: '30s', target: 10 }, // Spike down
      ],
      tags: { test_type: 'spike' },
    },
    
    // Stress test - find breaking point
    stress_test: {
      executor: 'ramping-vus',
      startTime: '7m',
      stages: [
        { duration: '2m', target: 20 },
        { duration: '2m', target: 40 },
        { duration: '2m', target: 60 },
        { duration: '2m', target: 80 },
        { duration: '1m', target: 100 },
        { duration: '2m', target: 0 },
      ],
      tags: { test_type: 'stress' },
    }
  },
  
  thresholds: {
    // Overall system health
    'http_req_duration': ['p(95)<2000'], // 95% of requests under 2s
    'errors': ['rate<0.05'], // Error rate under 5%
    
    // Service-specific thresholds
    'product_service_duration': ['p(95)<1000'],
    'user_service_duration': ['p(95)<800'],
    'checkout_service_duration': ['p(95)<1500'],
    'analytics_service_duration': ['p(95)<500'],
    
    // Business metrics
    'business_transactions': ['count>100'], // At least 100 successful transactions
    
    // Scenario-specific thresholds
    'http_req_duration{test_type:baseline}': ['p(95)<1000'],
    'http_req_duration{test_type:spike}': ['p(95)<3000'],
    'http_req_duration{test_type:stress}': ['p(95)<5000'],
  }
};

// Service configuration
const services = {
  product: {
    baseUrl: 'http://localhost:8080',
    healthEndpoint: '/actuator/health',
    endpoints: {
      getProducts: '/api/v1/products',
      getProduct: (id) => `/api/v1/products/${id}`,
      searchProducts: '/api/v1/products/search'
    }
  },
  user: {
    baseUrl: 'http://localhost:8081',
    healthEndpoint: '/actuator/health',
    endpoints: {
      getProfile: '/api/v1/users/profile',
      updateProfile: '/api/v1/users/profile',
      getUsers: '/api/v1/users'
    }
  },
  checkout: {
    baseUrl: 'http://localhost:8082',
    healthEndpoint: '/health',
    endpoints: {
      createOrder: '/api/v1/orders',
      getOrder: (id) => `/api/v1/orders/${id}`,
      processPayment: '/api/v1/payments/process'
    }
  },
  analytics: {
    baseUrl: 'http://localhost:8083',
    healthEndpoint: '/health',
    endpoints: {
      trackEvent: '/api/v1/analytics/events',
      getDashboard: '/api/v1/analytics/dashboard/metrics',
      getMetrics: '/api/v1/analytics/metrics/load-test'
    }
  }
};

// Test data generators
function generateUser() {
  const userId = Math.floor(Math.random() * 1000) + 1;
  return {
    id: userId,
    email: `user${userId}@test.com`,
    name: `Test User ${userId}`
  };
}

function generateProduct() {
  const productId = Math.floor(Math.random() * 100) + 1;
  return {
    id: productId,
    name: `Product ${productId}`,
    price: Math.floor(Math.random() * 1000) + 10
  };
}

function generateOrder(userId, productId) {
  return {
    userId: userId,
    productId: productId,
    quantity: Math.floor(Math.random() * 5) + 1,
    totalAmount: Math.floor(Math.random() * 500) + 50
  };
}

// Test scenarios
export default function() {
  const user = generateUser();
  const testScenario = Math.random();
  
  if (testScenario < 0.4) {
    // 40% - Product browsing journey
    productBrowsingJourney(user);
  } else if (testScenario < 0.7) {
    // 30% - Full purchase journey
    purchaseJourney(user);
  } else if (testScenario < 0.9) {
    // 20% - User management journey
    userManagementJourney(user);
  } else {
    // 10% - Analytics and monitoring
    analyticsJourney(user);
  }
  
  // Random sleep between 1-3 seconds to simulate user think time
  sleep(Math.random() * 2 + 1);
}

function productBrowsingJourney(user) {
  group('Product Browsing Journey', function() {
    // 1. Check product service health
    let healthRes = http.get(services.product.baseUrl + services.product.healthEndpoint);
    let healthCheck = check(healthRes, {
      'Product service health is 200': (r) => r.status === 200,
    });
    errorRate.add(!healthCheck);
    productServiceDuration.add(healthRes.timings.duration);
    
    // 2. Get products list
    let productsRes = http.get(services.product.baseUrl + services.product.endpoints.getProducts);
    let productsCheck = check(productsRes, {
      'Products list retrieved': (r) => r.status === 200,
      'Products list contains data': (r) => r.body.length > 0,
    });
    errorRate.add(!productsCheck);
    productServiceDuration.add(productsRes.timings.duration);
    
    if (productsCheck) {
      // 3. Get specific product details
      const productId = Math.floor(Math.random() * 10) + 1;
      let productRes = http.get(services.product.baseUrl + services.product.endpoints.getProduct(productId));
      let productCheck = check(productRes, {
        'Product details retrieved': (r) => r.status === 200 || r.status === 404,
      });
      errorRate.add(!productCheck);
      productServiceDuration.add(productRes.timings.duration);
      
      // 4. Search products (optional)
      if (Math.random() < 0.3) {
        let searchRes = http.get(services.product.baseUrl + services.product.endpoints.searchProducts + '?q=test');
        let searchCheck = check(searchRes, {
          'Product search executed': (r) => r.status === 200 || r.status === 404,
        });
        errorRate.add(!searchCheck);
        productServiceDuration.add(searchRes.timings.duration);
      }
    }
  });
}

function purchaseJourney(user) {
  group('Purchase Journey', function() {
    const product = generateProduct();
    const order = generateOrder(user.id, product.id);
    
    // 1. Get user profile
    let userRes = http.get(services.user.baseUrl + services.user.endpoints.getProfile + `?userId=${user.id}`);
    let userCheck = check(userRes, {
      'User profile retrieved': (r) => r.status === 200 || r.status === 404,
    });
    errorRate.add(!userCheck);
    userServiceDuration.add(userRes.timings.duration);
    
    // 2. Get product details
    let productRes = http.get(services.product.baseUrl + services.product.endpoints.getProduct(product.id));
    let productCheck = check(productRes, {
      'Product available for purchase': (r) => r.status === 200 || r.status === 404,
    });
    errorRate.add(!productCheck);
    productServiceDuration.add(productRes.timings.duration);
    
    // 3. Create order
    let orderPayload = JSON.stringify(order);
    let orderRes = http.post(
      services.checkout.baseUrl + services.checkout.endpoints.createOrder,
      orderPayload,
      { headers: { 'Content-Type': 'application/json' } }
    );
    let orderCheck = check(orderRes, {
      'Order created successfully': (r) => r.status === 200 || r.status === 201 || r.status === 404,
    });
    errorRate.add(!orderCheck);
    checkoutServiceDuration.add(orderRes.timings.duration);
    
    if (orderCheck && orderRes.status < 400) {
      businessTransactionCounter.add(1);
      
      // 4. Track analytics event
      let analyticsPayload = JSON.stringify({
        user_id: user.id,
        event_type: 'purchase',
        event_data: {
          product_id: product.id,
          order_value: order.totalAmount
        }
      });
      
      let analyticsRes = http.post(
        services.analytics.baseUrl + services.analytics.endpoints.trackEvent,
        analyticsPayload,
        { headers: { 'Content-Type': 'application/json' } }
      );
      let analyticsCheck = check(analyticsRes, {
        'Purchase event tracked': (r) => r.status === 200 || r.status === 201 || r.status === 404,
      });
      errorRate.add(!analyticsCheck);
      analyticsServiceDuration.add(analyticsRes.timings.duration);
    }
  });
}

function userManagementJourney(user) {
  group('User Management Journey', function() {
    // 1. Check user service health
    let healthRes = http.get(services.user.baseUrl + services.user.healthEndpoint);
    let healthCheck = check(healthRes, {
      'User service health is 200': (r) => r.status === 200,
    });
    errorRate.add(!healthCheck);
    userServiceDuration.add(healthRes.timings.duration);
    
    // 2. Get user profile
    let profileRes = http.get(services.user.baseUrl + services.user.endpoints.getProfile + `?userId=${user.id}`);
    let profileCheck = check(profileRes, {
      'User profile accessible': (r) => r.status === 200 || r.status === 404,
    });
    errorRate.add(!profileCheck);
    userServiceDuration.add(profileRes.timings.duration);
    
    // 3. Update profile (simulate form submission)
    if (Math.random() < 0.5) {
      let updatePayload = JSON.stringify({
        name: user.name + ' Updated',
        email: user.email
      });
      
      let updateRes = http.put(
        services.user.baseUrl + services.user.endpoints.updateProfile,
        updatePayload,
        { headers: { 'Content-Type': 'application/json' } }
      );
      let updateCheck = check(updateRes, {
        'Profile update attempted': (r) => r.status < 500, // Accept various responses
      });
      errorRate.add(!updateCheck);
      userServiceDuration.add(updateRes.timings.duration);
    }
  });
}

function analyticsJourney(user) {
  group('Analytics Journey', function() {
    // 1. Check analytics service health
    let healthRes = http.get(services.analytics.baseUrl + services.analytics.healthEndpoint);
    let healthCheck = check(healthRes, {
      'Analytics service health is 200': (r) => r.status === 200,
    });
    errorRate.add(!healthCheck);
    analyticsServiceDuration.add(healthRes.timings.duration);
    
    // 2. Get dashboard metrics
    let dashboardRes = http.get(services.analytics.baseUrl + services.analytics.endpoints.getDashboard);
    let dashboardCheck = check(dashboardRes, {
      'Dashboard metrics retrieved': (r) => r.status === 200 || r.status === 404,
    });
    errorRate.add(!dashboardCheck);
    analyticsServiceDuration.add(dashboardRes.timings.duration);
    
    // 3. Get load test metrics
    let metricsRes = http.get(services.analytics.baseUrl + services.analytics.endpoints.getMetrics);
    let metricsCheck = check(metricsRes, {
      'Load test metrics retrieved': (r) => r.status === 200 || r.status === 404,
    });
    errorRate.add(!metricsCheck);
    analyticsServiceDuration.add(metricsRes.timings.duration);
    
    // 4. Track page view event
    let eventPayload = JSON.stringify({
      user_id: user.id,
      event_type: 'page_view',
      event_data: {
        page: '/analytics-dashboard',
        timestamp: new Date().toISOString()
      }
    });
    
    let eventRes = http.post(
      services.analytics.baseUrl + services.analytics.endpoints.trackEvent,
      eventPayload,
      { headers: { 'Content-Type': 'application/json' } }
    );
    let eventCheck = check(eventRes, {
      'Analytics event tracked': (r) => r.status === 200 || r.status === 201 || r.status === 404,
    });
    errorRate.add(!eventCheck);
    analyticsServiceDuration.add(eventRes.timings.duration);
  });
}

// Setup function - runs once before test
export function setup() {
  console.log('🚀 Starting comprehensive microservices load test');
  console.log('📊 Services under test:');
  console.log('  - Product Service (port 8080)');
  console.log('  - User Service (port 8081)');  
  console.log('  - Checkout Service (port 8082)');
  console.log('  - Analytics Service (port 8083)');
  console.log('');
  
  // Warm up services
  group('Service Warmup', function() {
    Object.entries(services).forEach(([name, config]) => {
      console.log(`🔥 Warming up ${name} service...`);
      let warmupRes = http.get(config.baseUrl + config.healthEndpoint);
      console.log(`   ${name}: ${warmupRes.status} (${warmupRes.timings.duration}ms)`);
    });
  });
  
  return { timestamp: new Date().toISOString() };
}

// Teardown function - runs once after test
export function teardown(data) {
  console.log('');
  console.log('🏁 Load test completed');
  console.log(`   Started at: ${data.timestamp}`);
  console.log(`   Ended at: ${new Date().toISOString()}`);
  console.log('📈 Check the detailed results above for performance metrics');
}

export function handleSummary(data) {
  console.log('');
  console.log('📊 Test Summary:');
  console.log(`   Total requests: ${data.metrics.http_reqs.count}`);
  console.log(`   Error rate: ${(data.metrics.errors.rate * 100).toFixed(2)}%`);
  console.log(`   Average response time: ${data.metrics.http_req_duration.avg.toFixed(2)}ms`);
  console.log(`   95th percentile: ${data.metrics.http_req_duration['p(95)'].toFixed(2)}ms`);
  console.log(`   Business transactions: ${data.metrics.business_transactions.count || 0}`);
  
  return {
    'stdout': JSON.stringify({
      summary: 'Microservices load test completed',
      total_requests: data.metrics.http_reqs.count,
      error_rate: data.metrics.errors.rate,
      avg_response_time: data.metrics.http_req_duration.avg,
      p95_response_time: data.metrics.http_req_duration['p(95)'],
      business_transactions: data.metrics.business_transactions.count || 0
    }, null, 2)
  };
} 