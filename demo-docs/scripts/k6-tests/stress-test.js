import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

export let errorRate = new Rate('errors');
export let requests = new Counter('requests');

export let options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users for 5 minutes
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
};

const PRODUCT_URL = __ENV.PRODUCT_URL || 'http://localhost:8080';
const USER_URL = __ENV.USER_URL || 'http://localhost:8081';
const CHECKOUT_URL = __ENV.CHECKOUT_URL || 'http://localhost:8082';

export default function() {
  requests.add(1);
  
  // Simulate realistic user behavior
  let responses = http.batch([
    ['GET', `${PRODUCT_URL}/api/v1/products`],
    ['GET', `${USER_URL}/health`],
    ['GET', `${CHECKOUT_URL}/health`],
  ]);
  
  responses.forEach((response, index) => {
    let success = check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 1000ms': (r) => r.timings.duration < 1000,
    });
    
    errorRate.add(!success);
  });
  
  sleep(1); // 1 second between iterations
}
