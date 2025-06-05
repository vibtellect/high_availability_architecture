# Production Kubernetes Deployment

Dieses Verzeichnis enthält alle notwendigen Kubernetes-Manifests für das Deployment der High-Availability-Demo in einer Production-Umgebung.

## 🏗️ Architektur Übersicht

```
┌─────────────────────────────────────────────────────────────┐
│                         INGRESS                             │
│            (NGINX + TLS Termination)                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
              ┌───────▼───────┐
              │   Services    │
              │ LoadBalancer  │
              └───────┬───────┘
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
┌───▼───┐       ┌────▼────┐       ┌────▼────┐
│Product│       │  User   │       │Checkout │
│Service│       │ Service │       │ Service │
│(3 Rep)│       │(3 Rep)  │       │(3 Rep)  │
└───┬───┘       └────┬────┘       └────┬────┘
    │                │                 │
    └─────────────┬──┼──┬──────────────┘
                  │  │  │
              ┌───▼──▼──▼───┐
              │  Analytics  │
              │   Service   │
              │  (3 Rep)    │
              └─────┬───────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
    ┌───▼───┐   ┌───▼───┐   ┌───▼───┐
    │Postgres│   │ Redis │   │LocalSt│
    │  +PV   │   │ +PV   │   │ +PV   │
    └───────┘   └───────┘   └───────┘
```

## 📦 Komponenten

### **Microservices**
- **Product Service** (Kotlin/Spring Boot): 3 Replicas mit HPA (3-15 Pods)
- **User Service** (Java/Spring Boot): 3 Replicas mit HPA (3-12 Pods)
- **Checkout Service** (Go): 3 Replicas mit HPA (3-10 Pods)
- **Analytics Service** (Python/Flask): 3 Replicas mit HPA (3-8 Pods)

### **Databases & Storage**
- **PostgreSQL**: Single Instance mit 50Gi Fast-SSD Persistent Volume
- **Redis**: Single Instance mit 20Gi Fast-SSD Persistent Volume
- **LocalStack**: AWS Services Emulation mit 10Gi Standard Storage

### **Observability Stack**
- **Prometheus**: Metrics Collection mit 50Gi Fast-SSD Storage
- **Grafana**: Dashboards mit 10Gi Standard Storage
- **Jaeger**: Distributed Tracing

### **Storage Classes**
- **fast-ssd**: GP3 SSD mit 3000 IOPS für Datenbanken
- **standard-storage**: GP3 Standard für Logs und Backups

## 🚀 Deployment

### Voraussetzungen

1. **Kubernetes Cluster** (Version 1.25+)
2. **kubectl** installiert und konfiguriert
3. **kustomize** installiert
4. **NGINX Ingress Controller** im Cluster
5. **cert-manager** für TLS-Zertifikate (optional)

### Quick Start

```bash
# Repository klonen
cd demo-docs/05-kubernetes/k8s/production

# Secrets anpassen (WICHTIG!)
cp secrets.yaml secrets-production.yaml
# Bearbeite secrets-production.yaml mit echten Production-Werten

# Deployment starten
./deploy-production.sh
```

### Manuelles Deployment

```bash
# 1. Manifests generieren
kustomize build . > production-manifests.yaml

# 2. Manifests validieren
kubectl apply --dry-run=client -f production-manifests.yaml

# 3. Production Namespace erstellen
kubectl apply -f namespace.yaml

# 4. Storage und Secrets erstellen
kubectl apply -f persistent-storage.yaml -f secrets.yaml

# 5. Datenbanken deployen
kubectl apply -f postgres.yaml -f redis.yaml

# 6. Services deployen
kubectl apply -f product-service.yaml -f user-service.yaml
kubectl apply -f checkout-service.yaml -f analytics-service.yaml

# 7. Observability deployen
kubectl apply -f observability.yaml

# 8. Ingress konfigurieren
kubectl apply -f ingress.yaml
```

## 🔐 Sicherheit

### Secrets Management

**WICHTIG**: Vor dem Production-Deployment müssen alle Secrets aktualisiert werden:

```bash
# PostgreSQL Credentials
echo -n "production-password" | base64
echo -n "jdbc:postgresql://postgres:5432/production_db" | base64

# JWT Secret (256-bit minimum)
openssl rand -base64 32

# Redis Password
openssl rand -base64 24

# AWS Credentials (echte Werte für Production)
echo -n "AKIAIOSFODNN7EXAMPLE" | base64
echo -n "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" | base64
```

### Security Context

Alle Services laufen mit:
- `runAsNonRoot: true`
- `runAsUser: 1000`
- `fsGroup: 1000`

### Network Policies (TODO)

```yaml
# Beispiel für Network Policy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-netpol
spec:
  podSelector:
    matchLabels:
      tier: backend
  policyTypes:
  - Ingress
  - Egress
```

## 📊 Monitoring & Observability

### Zugriff auf Monitoring Tools

**Mit Ingress** (nach DNS-Konfiguration):
- Grafana: https://grafana.ha-demo.com
- Jaeger: https://jaeger.ha-demo.com
- Prometheus: https://prometheus.internal.ha-demo.com (nur intern)

**Mit Port-Forwarding**:
```bash
kubectl port-forward -n production svc/grafana 3000:3000
kubectl port-forward -n production svc/jaeger 16686:16686
kubectl port-forward -n production svc/prometheus 9090:9090
```

### Dashboards

- **HA Architecture Overview**: Vollständige System-Übersicht
- **Service Health**: Individual Service Monitoring
- **Infrastructure**: Database und Cache Monitoring
- **Performance**: Response Times und Throughput

### Alerts (TODO)

```yaml
# Beispiel für PrometheusRule
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: ha-demo-alerts
spec:
  groups:
  - name: ha-demo
    rules:
    - alert: HighErrorRate
      expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
      for: 5m
```

## 🔄 Auto-Scaling

### Horizontal Pod Autoscaler (HPA)

Alle Services haben HPA konfiguriert:

```yaml
# Beispiel Scaling-Verhalten
minReplicas: 3
maxReplicas: 15
metrics:
- type: Resource
  resource:
    name: cpu
    target:
      type: Utilization
      averageUtilization: 70
- type: Resource
  resource:
    name: memory
    target:
      type: Utilization
      averageUtilization: 80
```

### Load Testing

```bash
# k6 Load Test für Auto-Scaling
k6 run --vus 50 --duration 10m /path/to/load-test.js
```

## 💾 Storage Management

### Persistent Volumes

| Service | Size | Storage Class | Access Mode |
|---------|------|---------------|-------------|
| PostgreSQL | 50Gi | fast-ssd | ReadWriteOnce |
| Redis | 20Gi | fast-ssd | ReadWriteOnce |
| Prometheus | 50Gi | fast-ssd | ReadWriteOnce |
| Grafana | 10Gi | standard-storage | ReadWriteOnce |
| LocalStack | 10Gi | standard-storage | ReadWriteOnce |

### Backup Strategie

```bash
# PostgreSQL Backup
kubectl exec -n production postgres-xxx -- pg_dump -U postgres database > backup.sql

# Redis Backup
kubectl exec -n production redis-xxx -- redis-cli BGSAVE
```

## 🌐 Networking

### Ingress Configuration

```yaml
# Domain Mapping
api.ha-demo.com      → API Services
grafana.ha-demo.com  → Grafana Dashboard
jaeger.ha-demo.com   → Jaeger UI
```

### TLS Configuration

```bash
# Let's Encrypt Zertifikat (mit cert-manager)
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@ha-demo.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

## 🔧 Troubleshooting

### Häufige Probleme

**1. Pods starten nicht**
```bash
kubectl describe pod -n production <pod-name>
kubectl logs -n production <pod-name> --previous
```

**2. Persistent Volumes nicht verfügbar**
```bash
kubectl get pv
kubectl get pvc -n production
kubectl describe pvc -n production <pvc-name>
```

**3. Services nicht erreichbar**
```bash
kubectl get svc -n production
kubectl get endpoints -n production
kubectl port-forward -n production svc/<service-name> 8080:80
```

**4. Ingress funktioniert nicht**
```bash
kubectl get ingress -n production
kubectl describe ingress -n production ha-demo-ingress
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

### Debug Commands

```bash
# Cluster Status
kubectl cluster-info
kubectl get nodes
kubectl top nodes

# Production Namespace Overview
kubectl get all -n production
kubectl get pvc -n production
kubectl get secrets -n production

# Resource Usage
kubectl top pods -n production
kubectl top nodes
```

## 📈 Performance Tuning

### Resource Requests/Limits

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---------|-------------|-----------|----------------|--------------|
| Product Service | 250m | 1000m | 512Mi | 1Gi |
| User Service | 250m | 1000m | 512Mi | 1Gi |
| Checkout Service | 100m | 500m | 256Mi | 512Mi |
| Analytics Service | 250m | 750m | 512Mi | 1Gi |

### JVM Tuning (Java Services)

```yaml
env:
- name: JVM_OPTS
  value: "-Xms256m -Xmx512m -XX:+UseG1GC -XX:MaxGCPauseMillis=200"
```

## 🔄 Updates & Rollbacks

### Rolling Updates

```bash
# Update Image
kubectl set image deployment/product-service product-service=product-service:1.1.0 -n production

# Rollback
kubectl rollout undo deployment/product-service -n production

# Status prüfen
kubectl rollout status deployment/product-service -n production
```

### Blue-Green Deployment (Advanced)

```bash
# Siehe Argo Rollouts oder Flagger für erweiterte Deployment-Strategien
```

## 📋 Maintenance

### Regelmäßige Aufgaben

1. **Backup Verification** (täglich)
2. **Security Updates** (wöchentlich)
3. **Resource Usage Review** (wöchentlich)
4. **Log Cleanup** (monatlich)

### Health Checks

```bash
# Service Health Check Script
#!/bin/bash
services=("product-service" "user-service" "checkout-service" "analytics-service")
for service in "${services[@]}"; do
  kubectl get deployment $service -n production -o jsonpath='{.status.readyReplicas}'
done
```

---

## 📞 Support

Bei Problemen:
1. Prüfe die Logs: `kubectl logs -n production <pod-name>`
2. Prüfe Events: `kubectl get events -n production --sort-by='.lastTimestamp'`
3. Prüfe Prometheus Metrics für Service Health
4. Kontaktiere das DevOps Team

---
**Version**: 1.0.0  
**Letzte Aktualisierung**: $(date +%Y-%m-%d)  
**Maintainer**: DevOps Team 