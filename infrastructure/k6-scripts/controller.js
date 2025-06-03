import http from 'k6/http';
import { check } from 'k6';

// Controller script following k6 examples pattern
export const options = {
  vus: 1,
  duration: '1s',
};

export default function () {
  // This is a minimal controller script that can be used to trigger other tests
  const testType = __ENV.TEST_TYPE || 'load';
  const duration = __ENV.DURATION || '60';
  const vus = __ENV.TARGET_VUS || '5';
  const targetService = __ENV.TARGET_SERVICE || 'all-services';
  
  console.log(`🎯 k6 Controller: ${testType} test for ${duration}s with ${vus} VUs targeting ${targetService}`);
  
  // Basic health check to verify k6 is working
  const response = http.get('http://prometheus:9090/-/healthy', { timeout: '5s' });
  
  check(response, {
    'Prometheus is healthy': (r) => r.status === 200,
  });
  
  return {
    testType,
    duration,
    vus,
    targetService,
    timestamp: new Date().toISOString(),
  };
} 