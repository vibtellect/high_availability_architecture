# 🚀 High Availability E-Commerce Platform - Demo Script

## 🎯 Demo-Ziel
Demonstration einer vollständigen High Availability E-Commerce-Architektur mit modernen Cloud-Native-Technologien, Observability, Chaos Engineering und Resilience Testing.

## 📋 Demo-Ablauf (15-20 Minuten)

### **Phase 1: Architektur-Überblick (3 Min)**
1. **Frontend Dashboard öffnen:** http://localhost:3001
   - Zeige moderne React-UI mit Material-UI v7
   - Navigation zum Architecture Dashboard
   - Real-time Metriken und Service Status

2. **Microservices-Architektur erklären:**
   - Product Service (8080) - Spring Boot
   - User Service (8081) - Spring Boot  
   - Checkout Service (8082) - Spring Boot
   - Analytics Service (8083) - Spring Boot
   - Frontend (3001) - React 18 + TypeScript

### **Phase 2: Observability & Monitoring (4 Min)**
1. **Grafana Dashboard:** http://localhost:3000
   - System-Metriken aller Services
   - Database-Performance
   - Response Times & Throughput

2. **Jaeger Tracing:** http://localhost:16686 (wenn implementiert)
   - Distributed Traces zwischen Services
   - Request-Flow Visualisierung
   - Performance Bottleneck Detection

3. **Real-time API Calls:**
   ```bash
   # Live API-Tests zeigen
   curl http://localhost:3001/api/products | jq '. | length'
   curl http://localhost:3001/api/users | jq '. | length'
   ```

### **Phase 3: High Load Testing (5 Min)**
1. **Artillery Load Test starten:**
   ```bash
   cd app/frontend
   npm run artillery:test
   ```
   - Zeige 270+ Requests in 4-5 Minuten
   - Live-Monitoring in Grafana während Load Test
   - Response Times unter Last

2. **Stress Testing:**
   ```bash
   npm run artillery:stress
   ```
   - Extreme Belastung (bis 1000 concurrent users)
   - Breaking Point Detection
   - Service Recovery Monitoring

### **Phase 4: Chaos Engineering (3 Min)**
1. **Service Disruption Simulation:**
   ```bash
   # Service temporär stoppen
   docker stop product-service
   ```
   - Frontend Error Handling zeigen
   - Graceful Degradation
   - Service Restart & Recovery

2. **Database Failover Test:**
   ```bash
   # Database Connection Issues simulieren
   docker pause postgres-db
   docker unpause postgres-db
   ```

### **Phase 5: Auto-Scaling Demo (3 Min)**
1. **Kubernetes Deployment** (wenn implementiert):
   ```bash
   kubectl get pods
   kubectl get hpa
   ```

2. **Container Resource Monitoring:**
   ```bash
   docker stats
   ```
   - CPU/Memory Usage unter Last
   - Container Health Status

### **Phase 6: Security & API Features (2 Min)**
1. **API Rate Limiting Test:**
   ```bash
   # Rapid API Calls
   for i in {1..50}; do curl -s http://localhost:3001/api/products > /dev/null; done
   ```

2. **Health Check Endpoints:**
   ```bash
   curl http://localhost:8080/actuator/health | jq .
   curl http://localhost:8081/actuator/health | jq .
   ```

## 🔧 **Live-Demo Commands Cheat Sheet**

### **System Status:**
```bash
# All Services Status
docker-compose ps

# Frontend Status
curl -I http://localhost:3001

# Backend APIs
curl http://localhost:3001/api/products | jq '. | length'
curl http://localhost:8080/actuator/health | jq .status
```

### **Performance Testing:**
```bash
# Quick Load Test
cd app/frontend && npm run artillery:test

# Stress Test  
npm run artillery:stress

# Custom Artillery Test
artillery quick --count 100 --num 20 http://localhost:3001
```

### **Monitoring URLs:**
- **Frontend:** http://localhost:3001
- **Architecture Dashboard:** http://localhost:3001/architecture
- **Grafana:** http://localhost:3000 (admin/admin)
- **Prometheus:** http://localhost:9090
- **Jaeger:** http://localhost:16686 (wenn konfiguriert)

### **Chaos Engineering:**
```bash
# Service Outage Simulation
docker stop product-service
sleep 30
docker start product-service

# Network Latency Simulation
docker exec -it product-service tc qdisc add dev eth0 root netem delay 500ms

# Memory Pressure
docker exec -it product-service stress --vm 1 --vm-bytes 256M --timeout 60s
```

### **Database Operations:**
```bash
# Connection Test
docker exec -it postgres-db psql -U postgres -c "\l"

# Performance Query
docker exec -it postgres-db psql -U postgres -c "SELECT datname, numbackends, xact_commit, xact_rollback FROM pg_stat_database;"
```

## 📊 **Key Performance Indicators (KPIs) to Highlight:**

### **Availability Metrics:**
- **Uptime:** 99.99%+ während Demo
- **Response Time:** < 100ms für API calls
- **Throughput:** 100+ RPS sustained
- **Error Rate:** < 0.1%

### **Scalability Metrics:**
- **Concurrent Users:** bis zu 1000
- **Database Connections:** Efficient pooling
- **Memory Usage:** < 80% during peak load
- **CPU Usage:** < 70% during normal operation

### **Resilience Metrics:**
- **Recovery Time:** < 30 seconds nach Service restart
- **Graceful Degradation:** Frontend bleibt funktional bei Backend-Ausfällen
- **Circuit Breaker:** Automatic failover in < 5 seconds

## 🎨 **Demo Enhancement Ideas:**

### **Visual Enhancements:**
1. **Real-time Grafana Dashboard** auf zweitem Monitor
2. **Network Topology Visualization** 
3. **Live Log Streaming** mit bunten Terminal outputs
4. **Interactive Artillery Reports** mit HTML output

### **Advanced Features to Demonstrate:**
1. **Blue-Green Deployment** simulation
2. **A/B Testing** capabilities  
3. **Geographic Load Distribution**
4. **CDN Integration** for static assets
5. **API Versioning** strategies

### **Storytelling Elements:**
1. **Business Impact:** "E-Commerce Platform für Black Friday Readiness"
2. **Cost Optimization:** "Auto-scaling spart 60% Infrastructure costs"
3. **Developer Experience:** "Zero-downtime deployments"
4. **Customer Experience:** "Sub-100ms response times globally"

## 🚨 **Contingency Plans:**

### **If Services Don't Start:**
```bash
# Force restart all
docker-compose down -v
docker-compose up -d --force-recreate
```

### **If Load Tests Fail:**
```bash
# Alternative simple load test
ab -n 1000 -c 10 http://localhost:3001/
```

### **If Monitoring Issues:**
```bash
# Check port availability
netstat -tulpn | grep -E "(3001|8080|9090|3000)"
```

---

**💡 Pro-Tip:** Immer ein Backup-Terminal mit allen Commands ready haben und Services 10 Minuten vor Demo testen! 