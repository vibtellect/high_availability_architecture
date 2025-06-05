# Kubernetes Auto-Scaling Demo mit k6 Load Testing

Eine vollständige Demo-Umgebung, die automatische Kubernetes Pod-Skalierung von 1 bis 10 Instanzen unter realistischer k6 Last zeigt.

## 🎯 Demo-Übersicht

**Was Sie sehen werden:**
- 🚀 **Automatische Pod-Skalierung** von 1 → 10 Instanzen
- ⚡ **k6 Load Testing** mit realistischen Lastprofilen
- 📊 **Real-time Monitoring** in Grafana Dashboard
- 🔄 **HPA Behavior** mit schnellem Scale-Up und kontrolliertem Scale-Down
- 📈 **Performance Metrics** während des gesamten Skalierungsprozesses

## 🚀 Quick Start

### Lokales Kubernetes (minikube/kind)

```bash
# 1. Cluster starten und Demo deployen
./demo-docs/scripts/k8s-auto-scaling-demo.sh

# 2. Dashboard öffnen
http://localhost:3000/d/kubernetes-auto-scaling-demo
```

### AWS EKS Deployment

```bash
# 1. EKS Cluster erstellen (falls noch nicht vorhanden)
eksctl create cluster --name ha-demo-cluster --region us-west-2 --nodegroup-name standard-workers --node-type t3.medium --nodes 3 --nodes-min 1 --nodes-max 10 --managed

# 2. Demo auf EKS deployen
kubectl apply -k demo-docs/05-kubernetes/k8s/environments/aws-eks/

# 3. Load Test starten
kubectl apply -f demo-docs/05-kubernetes/k8s/demo/k6-load-test-job.yaml

# 4. Skalierung überwachen
kubectl get hpa -w
```

## 📋 Voraussetzungen

### Lokale Entwicklung
- ✅ **kubectl** konfiguriert und Cluster erreichbar
- ✅ **minikube** oder **kind** für lokales Testing
- ✅ **Docker** für Container Building
- ✅ **k6** für lokale Load Tests (optional)

### AWS Deployment
- ✅ **AWS CLI** konfiguriert
- ✅ **eksctl** für EKS Cluster Management
- ✅ **kubectl** für Kubernetes Operationen
- ✅ **ECR Repository** für Container Images

## 🏗️ Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                     Kubernetes Cluster                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────┐  │
│  │ k6 Load     │    │ Product      │    │ HPA Controller │  │
│  │ Test Job    │───→│ Service      │←───│ (1-10 replicas)│  │
│  │             │    │ (Demo)       │    │                │  │
│  └─────────────┘    └──────────────┘    └────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────┐  │
│  │ Prometheus  │    │ Grafana      │    │ kube-state-    │  │
│  │ (Metrics)   │    │ (Dashboard)  │    │ metrics        │  │
│  └─────────────┘    └──────────────┘    └────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🎬 Demo-Flow

### Phase 1: Initial Setup (1 min)
- Deployment des Product Service mit 1 Replica
- HPA Konfiguration mit aggressiven Thresholds
- Baseline Metrics Collection

### Phase 2: Load Ramp-Up (3 min)
- k6 startet mit 10 VUs
- Steigerung auf 50 VUs → CPU/Memory steigt
- HPA triggert erste Skalierung (1 → 3 Pods)

### Phase 3: Peak Load (2 min)
- k6 erreicht 100 VUs
- Maximale CPU/Memory Auslastung
- HPA skaliert auf 8-10 Pods

### Phase 4: Scale-Down (3 min)
- k6 reduziert Last auf 50 VUs → 0 VUs
- Kontrolliertes Downscaling
- Rückkehr zu 1-2 Pods

## 📊 Monitoring & Dashboards

### Grafana Dashboards
- **Auto-Scaling Overview**: Real-time Pod-Scaling Visualisierung
- **k6 Load Test Metrics**: VUs, Response Times, Error Rates
- **Resource Utilization**: CPU/Memory pro Pod und Gesamt
- **HPA Events**: Scaling-Entscheidungen und Timings

### Key Metrics
```bash
# Pod Count über Zeit
kubectl get pods -l app=product-service,version=demo -w

# HPA Status live
kubectl get hpa product-service-demo-hpa -w

# CPU/Memory Utilization
kubectl top pods -l app=product-service,version=demo
```

## ⚙️ Konfiguration

### HPA Settings (Demo-optimiert)
```yaml
spec:
  minReplicas: 1
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 40  # Aggressive für Demo
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 50  # Aggressive für Demo
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 15   # Sehr schnell
      policies:
      - type: Percent
        value: 200  # Verdoppelung bei Scale-Up
        periodSeconds: 15
    scaleDown:
      stabilizationWindowSeconds: 180  # Langsamer für Demo-Sichtbarkeit
```

### k6 Load Profile
```javascript
scenarios: {
  auto_scaling_test: {
    executor: 'ramping-vus',
    stages: [
      { duration: '1m', target: 10 },   // Warm-up
      { duration: '3m', target: 50 },   // Trigger Scaling
      { duration: '2m', target: 100 },  // Peak Load
      { duration: '2m', target: 50 },   // Sustain
      { duration: '1m', target: 0 },    // Scale Down
    ],
  },
}
```

## 🛠️ Troubleshooting

### Häufige Probleme

**HPA skaliert nicht:**
```bash
# Metrics Server prüfen
kubectl get deployment metrics-server -n kube-system

# HPA Status detailliert
kubectl describe hpa product-service-demo-hpa

# Pod Resource Requests prüfen
kubectl describe pod <pod-name>
```

**k6 Job startet nicht:**
```bash
# Job Status prüfen
kubectl get jobs
kubectl describe job k6-auto-scaling-test

# k6 Logs anzeigen
kubectl logs job/k6-auto-scaling-test
```

**Service nicht erreichbar:**
```bash
# Service Endpoints prüfen
kubectl get endpoints product-service-demo

# Pod Health Status
kubectl get pods -l app=product-service,version=demo
```

### Performance Tuning

**Für schnellere Demo:**
- CPU Target auf 30% reduzieren
- Stabilization Window auf 10s reduzieren
- Memory Limits auf 128Mi für einfacheres Triggering

**Für realistischere Demo:**
- CPU Target auf 60-70% erhöhen
- Stabilization Window auf 60s erhöhen
- Mehr diverse Load Patterns in k6

## 🌐 AWS-Spezifische Anpassungen

### EKS Optimierungen
```yaml
# Node Selector für Instance Types
nodeSelector:
  node.kubernetes.io/instance-type: t3.medium

# EKS-spezifische Annotations
annotations:
  eks.amazonaws.com/fargate-profile: "default"
```

### ECR Integration
```bash
# Image Build und Push
docker build -t $ECR_REGISTRY/product-service:latest .
docker push $ECR_REGISTRY/product-service:latest

# Kustomization für ECR
kubectl apply -k demo-docs/05-kubernetes/k8s/environments/aws-eks/
```

## 📈 Demo-Ergebnisse

**Typische Skalierungs-Timeline:**
- 0:00 - Demo Start: 1 Pod
- 1:30 - Erste Skalierung: 1 → 3 Pods
- 3:00 - Weitere Skalierung: 3 → 6 Pods
- 4:30 - Peak erreicht: 6 → 10 Pods
- 7:00 - Scale-Down beginnt: 10 → 6 Pods
- 9:00 - Demo Ende: 6 → 2 Pods

**Performance Metrics:**
- Response Time: P95 < 2000ms während Skalierung
- Error Rate: < 0.1% während gesamter Demo
- Scaling Zeit: 30-60s für vollständige Pod-Verfügbarkeit

## 🔧 Erweiterte Features

### Multi-Metric HPA
```yaml
# Custom Metrics (beispielhaft)
- type: Pods
  pods:
    metric:
      name: http_requests_per_second
    target:
      type: AverageValue
      averageValue: "1k"
```

### Predictive Scaling
```yaml
# VPA für Memory Prediction
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: product-service-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: product-service-demo
  updatePolicy:
    updateMode: "Auto"
```

## 📚 Weitere Ressourcen

- [Kubernetes HPA Documentation](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [k6 Load Testing Guide](https://k6.io/docs/)
- [AWS EKS Best Practices](https://aws.github.io/aws-eks-best-practices/)
- [Prometheus Monitoring](https://prometheus.io/docs/kubernetes/kubernetes_sd/)

---

**💡 Tipp für Live-Demos:**
Starten Sie die Demo mit `kubectl get pods -w` in einem separaten Terminal, um das Scaling live zu zeigen. Die Grafana Dashboards bieten zusätzliche visuelle Eindrücke für das Publikum. 