# 🚀 Auto-Scaling Demo Guide

This guide provides everything you need to demonstrate the auto-scaling capabilities of our High-Availability architecture.

## 📋 Quick Start

### For Docker Compose (Recommended for Local Demo)
```bash
# Run interactive demo
./demo-docs/scripts/auto-scaling-demo.sh docker

# Or run specific components
./demo-docs/scripts/auto-scaling-demo.sh docker load-test auto-scaling-demo
./demo-docs/scripts/auto-scaling-demo.sh docker monitor
```

### For Kubernetes
```bash
# Ensure your cluster is running with HPA enabled
./demo-docs/scripts/auto-scaling-demo.sh kubernetes
```

## 🎯 Demo Scenarios

### 1. **Auto-Scaling Demo Test** (RECOMMENDED)
- **Duration:** ~17 minutes
- **Pattern:** Gradual increase → Peak load → Scale down
- **Perfect for:** Live presentations and realistic demonstrations

### 2. **Spike Test**
- **Duration:** ~2 minutes  
- **Pattern:** Sudden burst to 100 users
- **Perfect for:** Showing rapid scaling response

### 3. **Stress Test**
- **Duration:** ~9 minutes
- **Pattern:** Sustained high load
- **Perfect for:** Demonstrating stability under pressure

## 📊 What to Monitor During Demo

### Key Metrics to Highlight
1. **Request Rate per Service** - Shows load distribution
2. **Response Times** - Demonstrates performance stability
3. **CPU/Memory Usage** - Triggers for scaling decisions
4. **Replica Count** - Visual proof of scaling
5. **Error Rate** - System reliability under load

### Monitoring URLs
- **Grafana Dashboard:** http://localhost:3000
- **Prometheus Metrics:** http://localhost:9090
- **Service Health:** http://localhost/health

### Dashboard Panels to Watch
- Service Health Status (pie chart)
- Request Rate by Service (time series)
- System Resource Usage (CPU/Memory trends)
- Error Rate by Service (percentage)

## 🎭 Presentation Script

### Phase 1: Baseline (Minutes 0-3)
**What to Say:** "Let's start by observing our baseline performance with normal traffic levels."

**What to Show:**
- Current service status (3 replicas each)
- Stable response times (~100ms)
- Low CPU usage (~20%)
- Minimal request rate

### Phase 2: Load Increase (Minutes 3-9)
**What to Say:** "Now I'll gradually increase the load to simulate peak traffic hours."

**What to Show:**
- Request rate climbing from 10 to 50+ RPS
- Response times staying stable initially
- CPU usage increasing toward 70% threshold
- **Key Moment:** Watch for first scaling event

### Phase 3: Peak Load (Minutes 9-12)
**What to Say:** "At peak load, watch how the system maintains performance through auto-scaling."

**What to Show:**
- Maximum concurrent users (50)
- New replicas being created
- CPU usage stabilizing at healthy levels
- Response times remaining acceptable

### Phase 4: Scale Down (Minutes 12-17)
**What to Say:** "As traffic decreases, the system intelligently scales down to save resources."

**What to Show:**
- Decreasing request rate
- Replica count gradually reducing
- Resource usage returning to baseline
- Cost optimization in action

## 🔧 Technical Details

### Auto-Scaling Triggers
```yaml
# CPU-based scaling
targetCPUUtilizationPercentage: 70

# Memory-based scaling  
targetMemoryUtilizationPercentage: 80

# Custom metrics (advanced)
- type: Pods
  pods:
    metric:
      name: requests_per_second
    target:
      type: AverageValue
      averageValue: "30"
```

### Resource Limits
| Service | CPU Limit | Memory Limit | Min Replicas | Max Replicas |
|---------|-----------|--------------|--------------|--------------|
| Product | 500m      | 512Mi        | 3            | 15           |
| User    | 500m      | 512Mi        | 3            | 12           |
| Checkout| 300m      | 256Mi        | 3            | 10           |
| Analytics| 300m     | 256Mi        | 3            | 8            |

## 🎯 Key Messages for Different Audiences

### For Technical Teams
- "HPA scales based on CPU and memory metrics with custom metric support"
- "Rolling updates ensure zero-downtime scaling"
- "Resource requests and limits prevent resource starvation"
- "Stabilization windows prevent scaling flapping"

### For Business Stakeholders
- "System automatically handles 10x traffic spikes without manual intervention"
- "Consistent user experience maintained regardless of load"
- "Pay-as-you-scale model optimizes infrastructure costs"
- "99.9% uptime through redundancy and intelligent scaling"

### For DevOps Teams
- "Kubernetes-native scaling with Prometheus metrics"
- "Configurable scaling policies per service"
- "Integration with monitoring and alerting systems"
- "Resource governance prevents runaway scaling"

## 📈 Expected Performance Results

### Load Test Results
```
Baseline:     5 users  → ~100ms response time
Peak Load:   50 users  → ~150ms response time  
Scaled:      50 users  → ~120ms response time
```

### Scaling Events
- **Scale Up Trigger:** CPU > 70% for 2 minutes
- **Scale Up Time:** 30-60 seconds for new pods
- **Scale Down Trigger:** CPU < 50% for 5 minutes  
- **Scale Down Time:** 2-3 minutes (gradual)

## 🐛 Troubleshooting

### Common Issues

#### Scaling Not Triggering
```bash
# Check HPA status
kubectl get hpa -n demo

# Verify metrics server
kubectl get --raw /apis/metrics.k8s.io/v1beta1/nodes

# Check resource usage
kubectl top pods -n demo
```

#### Services Not Responding
```bash
# Check service health
curl http://localhost/service/product/health
curl http://localhost/service/user/health
curl http://localhost/service/checkout/health
curl http://localhost/service/analytics/health
```

#### Load Test Failing
```bash
# Verify k6 installation
k6 version

# Check service connectivity
curl http://localhost:8080/actuator/health
curl http://localhost:8081/actuator/health
```

### Demo Environment Issues

#### If Grafana Doesn't Load
1. Check Docker containers: `docker ps | grep grafana`
2. Verify port forwarding: `kubectl get svc -n demo`
3. Wait 30 seconds for services to start

#### If Scaling Seems Slow
- **Expected behavior** in development environments
- Point out production performance characteristics
- Emphasize the algorithm prioritizes stability over speed

## 🎪 Advanced Demo Features

### Real-time Monitoring
```bash
# Watch scaling events live
watch -n 2 'kubectl get hpa,pods -n demo'

# Monitor container resources
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

### Custom Load Patterns
```bash
# Spike test for sudden traffic
./demo-docs/scripts/auto-scaling-demo.sh docker load-test spike

# Stress test for sustained load  
./demo-docs/scripts/auto-scaling-demo.sh docker load-test stress
```

### Multiple Terminal Windows
1. **Terminal 1:** Run the demo script
2. **Terminal 2:** Monitor scaling events
3. **Terminal 3:** Watch real-time metrics
4. **Browser:** Grafana dashboards

## 📚 Additional Resources

### Architecture Documents
- [Kubernetes Production Setup](../05-kubernetes/k8s/production/README.md)
- [Monitoring and Observability](../../infrastructure/grafana/README.md)
- [Load Testing Strategy](../../k6-tests/README.md)

### Presentation Materials
```bash
# Generate presentation script
./demo-docs/scripts/auto-scaling-demo.sh presentation
```

This creates `presentation-script.md` with detailed talking points and technical details.

## 🎖️ Success Criteria

After running the demo, you should have demonstrated:

✅ **Automatic scaling** in response to load increases  
✅ **Performance stability** during traffic spikes  
✅ **Resource optimization** through scale-down  
✅ **Zero-downtime** scaling operations  
✅ **Real-time monitoring** and observability  
✅ **Cost efficiency** through intelligent resource management  

---

**Ready to impress your audience?** Run the demo and watch the magic happen! 🎭✨ 