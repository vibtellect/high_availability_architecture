# 🚀 k6 Implementation Plan für High Availability Architecture

## 🎯 **Warum k6 die perfekte Lösung ist**

### **Aktuelle Probleme mit eigenem Load Test Simulator:**
- ❌ Konfigurationsparameter werden nicht korrekt übertragen
- ❌ Auto-Stop Logic funktioniert inkonsistent  
- ❌ Komplexe Custom-Implementation mit Bugs
- ❌ Begrenzte Skalierbarkeit und Features
- ❌ Wartungsaufwand für eigene Lösung

### **k6 Vorteile:**
- ✅ **Grafana Labs Official Tool** - perfekte Integration
- ✅ **Native Prometheus Support** - kein StatsD-Bridge nötig
- ✅ **JavaScript Test Scripts** - developer-friendly
- ✅ **Production-Ready** - millionenfach getestet
- ✅ **Extensive Grafana Dashboards** - sofort einsatzbereit
- ✅ **Professional Load Testing** - alle Load Testing Patterns

---

## 🛠️ **Implementation Plan**

### **Phase 1: k6 Container Setup**
1. **k6 Service hinzufügen zu docker-compose.yml**
2. **Prometheus Remote Write konfigurieren** 
3. **Test-Scripts in JavaScript erstellen**
4. **Grafana Dashboard importieren**

### **Phase 2: API Integration**
1. **Analytics Service API Endpoints anpassen**
2. **k6 Container Management über APIs**
3. **Frontend Integration für k6 Controls**
4. **Real-time Status Monitoring**

### **Phase 3: Migration & Testing**
1. **Parallel Testing** (alter + neuer Load Tester)
2. **Grafana Dashboard Optimierung**
3. **Frontend UI Updates**
4. **Alter Load Test Simulator entfernen**

---

## 📋 **Detailed Implementation**

### **1. Docker Compose Configuration**

```yaml
services:
  # k6 Load Testing Service
  k6:
    image: grafana/k6:latest
    container_name: k6-load-tester
    networks:
      - app-network
    environment:
      - K6_PROMETHEUS_RW_SERVER_URL=http://prometheus:9090/api/v1/write
      - K6_PROMETHEUS_RW_TREND_STATS=p(95),p(99),min,max
    volumes:
      - ./k6-scripts:/scripts
    # Will be controlled via API calls, not auto-start
    command: ["sleep", "infinity"]
    depends_on:
      - prometheus
```

### **2. k6 Test Script Example**

```javascript
// k6-scripts/api-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// Custom metrics
export const errorRate = new Rate('errors');
export const apiResponseTime = new Trend('api_response_time');

export const options = {
  stages: [
    { duration: '30s', target: __ENV.TARGET_VUS || 10 },
    { duration: `${__ENV.DURATION || 60}s`, target: __ENV.TARGET_VUS || 10 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.1'],
  },
};

export default function () {
  const target = __ENV.TARGET_SERVICE || 'product-service';
  const baseUrl = getServiceUrl(target);
  
  // Dynamic service testing based on target
  const response = http.get(`${baseUrl}/health`);
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(response.status !== 200);
  apiResponseTime.add(response.timings.duration);
  
  sleep(1);
}

function getServiceUrl(service) {
  const serviceMap = {
    'product-service': 'http://product-service:8080',
    'user-service': 'http://user-service:8081', 
    'checkout-service': 'http://checkout-service:8082',
    'analytics-service': 'http://analytics-service:8083',
    'all-services': 'http://product-service:8080' // Start with one, expand in script
  };
  return serviceMap[service] || serviceMap['product-service'];
}
```

### **3. Analytics Service API Updates**

```python
# analytics_controller.py - Updated k6 integration

@analytics_bp.route('/load-test/start', methods=['POST'])
@correlation_id_required
@log_function_call()
def start_load_test():
    """Start k6 load test with configuration"""
    try:
        config = request.get_json() or {}
        duration = config.get('duration', 300)
        target_vus = config.get('rps', 10)  # VUs instead of RPS
        target_service = config.get('target', 'product-service')
        
        # Generate unique test ID
        test_id = f"load-test-{int(time.time())}"
        
        # k6 run command with environment variables
        k6_command = [
            'k6', 'run',
            '--out', 'experimental-prometheus-rw',
            '--env', f'DURATION={duration}',
            '--env', f'TARGET_VUS={target_vus}',
            '--env', f'TARGET_SERVICE={target_service}',
            '--env', f'TEST_ID={test_id}',
            '/scripts/api-load-test.js'
        ]
        
        # Execute k6 in container
        docker_command = [
            'docker', 'exec', '-d', 'k6-load-tester'
        ] + k6_command
        
        subprocess.run(docker_command, check=True)
        
        return jsonify({
            'status': 'started',
            'test_id': test_id,
            'configuration': {
                'duration': duration,
                'target_vus': target_vus,
                'target_service': target_service
            }
        })
        
    except Exception as e:
        logger.error(f"Failed to start k6 load test: {str(e)}")
        return jsonify({'error': str(e)}), 500

@analytics_bp.route('/load-test/stop', methods=['POST'])
@correlation_id_required  
@log_function_call()
def stop_load_test():
    """Stop k6 load test"""
    try:
        # Kill any running k6 processes in container
        docker_command = [
            'docker', 'exec', 'k6-load-tester',
            'pkill', '-f', 'k6'
        ]
        
        subprocess.run(docker_command, check=False)  # Don't fail if no process
        
        return jsonify({
            'status': 'stopped',
            'message': 'Load test stopped successfully'
        })
        
    except Exception as e:
        logger.error(f"Failed to stop k6 load test: {str(e)}")
        return jsonify({'error': str(e)}), 500

@analytics_bp.route('/load-test/status', methods=['GET'])
@correlation_id_required
@log_function_call()
def get_load_test_status():
    """Get k6 load test status from Prometheus metrics"""
    try:
        # Query Prometheus for k6 metrics to determine if test is running
        prometheus_query = 'k6_vus'  # Virtual Users metric indicates active test
        
        prometheus_response = requests.get(
            f'http://prometheus:9090/api/v1/query',
            params={'query': prometheus_query}
        )
        
        if prometheus_response.status_code == 200:
            data = prometheus_response.json()
            result = data.get('data', {}).get('result', [])
            
            if result:
                current_vus = float(result[0]['value'][1])
                running = current_vus > 0
            else:
                running = False
                current_vus = 0
            
            return jsonify({
                'running': running,
                'current_vus': current_vus,
                'metrics_available': True
            })
        else:
            return jsonify({
                'running': False,
                'error': 'Could not query Prometheus'
            }), 500
            
    except Exception as e:
        logger.error(f"Failed to get k6 status: {str(e)}")
        return jsonify({'error': str(e)}), 500
```

### **4. Grafana Dashboard Setup**

```bash
# Import k6 Dashboard
# Dashboard ID: 19665 (k6 Prometheus - Recommended)
# Or use custom dashboard optimized for our services
```

### **5. Frontend Integration Updates**

```typescript
// Update HighAvailabilityDashboard.tsx for k6 integration

const handleStartLoadTest = async () => {
  try {
    setLoading(true);
    
    const response = await fetch('/api/v1/analytics/load-test/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        duration: duration,
        rps: targetVUs,  // Now represents Virtual Users
        target: targetService
      }),
    });

    if (response.ok) {
      const data = await response.json();
      setTestId(data.test_id);
      setIsRunning(true);
      
      // Start polling for real-time status
      startStatusPolling();
    }
  } catch (error) {
    console.error('Failed to start load test:', error);
  } finally {
    setLoading(false);
  }
};

// Real-time status updates from Prometheus metrics
const fetchRealTimeMetrics = async () => {
  try {
    // Query Prometheus directly for k6 metrics
    const metricsQueries = [
      'k6_vus',                    // Current VUs
      'k6_http_reqs',              // HTTP requests counter
      'k6_http_req_duration',      // Response times
      'k6_iteration_duration'      // Iteration duration
    ];
    
    // Fetch metrics and update UI
    // Real-time charts powered by actual k6 Prometheus metrics
  } catch (error) {
    console.error('Failed to fetch metrics:', error);
  }
};
```

---

## 🎯 **Migration Benefits**

### **Immediate Improvements:**
- ✅ **Eliminiert alle aktuellen Load Test Bugs**
- ✅ **Professional-grade Load Testing** 
- ✅ **Native Grafana Integration**
- ✅ **Echte Prometheus Metriken**
- ✅ **JavaScript Test Scripts** (developer-friendly)

### **Long-term Benefits:**
- ✅ **Industry Standard Tool** - keine Custom Maintenance  
- ✅ **Skalierbarkeit** - von 1 VU bis zu 100.000+ VUs
- ✅ **Extensive Documentation** und Community Support
- ✅ **Professional Demo-Ready** Setup
- ✅ **CI/CD Integration** möglich

### **Technical Benefits:**
- ✅ **Konfiguration funktioniert garantiert** (JavaScript Environment Variables)
- ✅ **Auto-Stop ist nativ integriert** (stage-based test definition)
- ✅ **Real-time Metrics** via Prometheus Remote Write
- ✅ **Multiple Load Testing Patterns** (stress, spike, soak tests)

---

## 📊 **Expected Results**

Nach der Migration erwarten wir:

1. **🎯 Load Test Configuration:** 100% funktionstüchtig
2. **📈 Grafana Dashboards:** Professionelle k6 Dashboards mit allen Metriken
3. **🔧 Maintenance:** Reduziert auf Test Script Updates (JavaScript)
4. **🚀 Demo-Ready:** Production-grade Load Testing für Präsentationen
5. **⚡ Performance:** Deutlich bessere Performance und Skalierbarkeit

---

## 🚀 **Next Steps**

1. **Approve k6 Migration** ✅
2. **Implement Phase 1** (Container Setup)
3. **Create JavaScript Test Scripts**
4. **Update Analytics Service APIs** 
5. **Import Grafana k6 Dashboard**
6. **Test & Validate**
7. **Remove old Load Test Simulator**

**Estimated Time:** 2-3 hours für komplette Migration
**Risk Level:** Low (k6 ist production-proven)
**Demo Impact:** Dramatically improved (professional load testing) 