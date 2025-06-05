import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

export let errorRate = new Rate('errors');

export let options = {
  stages: [
    { duration: '10s', target: 1 },   // Ramp up slowly
    { duration: '10s', target: 100 }, // Spike to 100 users
    { duration: '30s', target: 100 }, // Maintain spike
    { duration: '10s', target: 1 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    errors: ['rate<0.1'],              // Error rate under 10%
  },
};

const PRODUCT_URL = __ENV.PRODUCT_URL || 'http://localhost:8080';
const USER_URL = __ENV.USER_URL || 'http://localhost:8081';
const CHECKOUT_URL = __ENV.CHECKOUT_URL || 'http://localhost:8082';

export default function() {
  // Test different services randomly
  const services = [
    { name: 'Product', url: `${PRODUCT_URL}/api/v1/products` },
    { name: 'User', url: `${USER_URL}/api/v1/users` },
    { name: 'Checkout', url: `${CHECKOUT_URL}/health` },
  ];
  
  const service = services[Math.floor(Math.random() * services.length)];
  
  let response = http.get(service.url);
  
  let success = check(response, {
    [`${service.name} - status is 200`]: (r) => r.status === 200,
    [`${service.name} - response time < 2000ms`]: (r) => r.timings.duration < 2000,
  });
  
  errorRate.add(!success);
  
  sleep(Math.random() * 2 + 0.5); // Random sleep between 0.5-2.5s
}
