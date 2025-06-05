import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const serviceHealth = new Trend('service_health_duration');

// Quick test configuration
export let options = {
  vus: 5, // 5 virtual users
  duration: '2m', // 2 minutes
  thresholds: {
    'http_req_duration': ['p(95)<3000'], // 95% under 3s
    'errors': ['rate<0.1'], // Error rate under 10%
    'service_health_duration': ['p(95)<1000'], // Health checks under 1s
  }
};

// Service configuration
const services = {
  product: {
    baseUrl: 'http://localhost:8080',
    healthEndpoint: '/actuator/health',
  },
  user: {
    baseUrl: 'http://localhost:8081',
    healthEndpoint: '/actuator/health',
  },
  checkout: {
    baseUrl: 'http://localhost:8082',
    healthEndpoint: '/health',
  },
  analytics: {
    baseUrl: 'http://localhost:8083',
    healthEndpoint: '/health',
  }
};

export default function() {
  // Randomly select a service to test
  const serviceNames = Object.keys(services);
  const selectedService = serviceNames[Math.floor(Math.random() * serviceNames.length)];
  const service = services[selectedService];
  
  group(`${selectedService.toUpperCase()} Service Health Check`, function() {
    const response = http.get(service.baseUrl + service.healthEndpoint);
    
    const result = check(response, {
      [`${selectedService} service responds`]: (r) => r.status === 200,
      [`${selectedService} response time OK`]: (r) => r.timings.duration < 2000,
    });
    
    errorRate.add(!result);
    serviceHealth.add(response.timings.duration);
    
    // Log service status for debugging
    if (response.status !== 200) {
      console.log(`⚠️ ${selectedService} service issue: ${response.status} - ${response.statusText}`);
    }
  });
  
  // Small delay between requests
  sleep(Math.random() * 2 + 0.5); // 0.5-2.5 seconds
}

export function setup() {
  console.log('🔥 Quick Smoke Test - Service Health Validation');
  console.log('================================================');
  console.log('Testing all microservices for 2 minutes with 5 virtual users');
  console.log('');
  
  // Quick warmup
  Object.entries(services).forEach(([name, config]) => {
    console.log(`🏥 Checking ${name} service...`);
    try {
      const warmupRes = http.get(config.baseUrl + config.healthEndpoint);
      const status = warmupRes.status === 200 ? '✅ HEALTHY' : `❌ ISSUE (${warmupRes.status})`;
      console.log(`   ${name}: ${status} (${warmupRes.timings.duration.toFixed(0)}ms)`);
    } catch (e) {
      console.log(`   ${name}: ❌ CONNECTION ERROR`);
    }
  });
  
  console.log('');
  return { startTime: new Date().toISOString() };
}

export function teardown(data) {
  console.log('');
  console.log('🏁 Quick test completed');
  console.log(`   Duration: ${((Date.now() - new Date(data.startTime)) / 1000).toFixed(0)} seconds`);
}

export function handleSummary(data) {
  const duration = data.state.testRunDurationMs / 1000;
  const totalRequests = data.metrics.http_reqs.count;
  const errorRate = (data.metrics.errors.rate * 100).toFixed(2);
  const avgResponseTime = data.metrics.http_req_duration.avg.toFixed(2);
  
  console.log('');
  console.log('📊 Quick Test Results:');
  console.log('======================');
  console.log(`🔢 Total requests: ${totalRequests}`);
  console.log(`📈 Requests per second: ${(totalRequests / duration).toFixed(2)}`);
  console.log(`❌ Error rate: ${errorRate}%`);
  console.log(`⏱️  Average response time: ${avgResponseTime}ms`);
  console.log(`📊 95th percentile: ${data.metrics.http_req_duration['p(95)'].toFixed(2)}ms`);
  
  // Service health summary
  if (data.metrics.service_health_duration) {
    console.log(`🏥 Health check avg: ${data.metrics.service_health_duration.avg.toFixed(2)}ms`);
  }
  
  // Overall assessment
  const overallHealth = errorRate < 10 && avgResponseTime < 2000;
  console.log('');
  console.log(`🎯 Overall Assessment: ${overallHealth ? '✅ HEALTHY' : '⚠️ NEEDS ATTENTION'}`);
  
  return {
    'stdout': JSON.stringify({
      test_type: 'quick_smoke_test',
      duration_seconds: duration,
      total_requests: totalRequests,
      requests_per_second: totalRequests / duration,
      error_rate_percent: parseFloat(errorRate),
      avg_response_time_ms: parseFloat(avgResponseTime),
      p95_response_time_ms: data.metrics.http_req_duration['p(95)'],
      overall_healthy: overallHealth
    }, null, 2)
  };
} 