# 📝 Scripts Referenz - Alle Demo & Management Scripts

*🎯 Zielgruppe: Entwickler, DevOps, Demo-Presenter*

---

## 🚀 **Demo Scripts (Hauptkategorie)**

### **🎬 Master Demo Scripts**
Für Live-Präsentationen und Kunden-Demos.

| **Script** | **Zweck** | **Dauer** | **Zielgruppe** |
|------------|-----------|-----------|----------------|
| `./start-demo.sh` | **Komplettes System starten** | 2 min | Alle |
| `./check-demo-health.sh` | **System-Status prüfen** | 30 sec | Alle |
| `./master-chaos-demo.sh` | **Interaktive Chaos Demo** | 15-30 min | DevOps/SRE |
| `./k8s-demo.sh` | **Kubernetes Auto-Scaling** | 10-25 min | Platform Engineers |

---

## 🔧 **Setup & Management Scripts**

### **⚙️ System Management**
```bash
# System starten
./start-demo.sh                     # Komplettes Demo-Environment
docker-compose up -d                # Nur Basis-Services
docker-compose -f docker-compose.tracing.yml up -d  # + OpenTelemetry

# System stoppen
docker-compose down                 # Services stoppen
docker-compose down -v              # + Volumes löschen

# Status prüfen
./check-demo-health.sh              # Gesamt-Health Check
docker ps                           # Container Status
docker-compose logs -f              # Live Logs
```

### **🗄️ Datenbank Scripts**
```bash
# DynamoDB initialisieren
./scripts/init-dynamodb.sh          # Tabellen + Test-Daten erstellen

# Database Reset
docker-compose down -v && docker-compose up -d localstack
./scripts/init-dynamodb.sh          # Frische DB
```

---

## 💥 **Chaos Engineering Scripts**

### **🔥 Basis Chaos Tests**
```bash
# Einfache Chaos Tests
./chaos-demo.sh                     # Umfassende Chaos Demo
./chaos-demo.sh --quick             # Schnelle Version (5 min)

# Einzelne Tests
./chaos-demo.sh --kill-service product-service
./chaos-demo.sh --stress-test 
./chaos-demo.sh --network-partition
```

### **🎭 Erweiterte Chaos Szenarien**
```bash
# Circuit Breaker Demo
./chaos/circuit-breaker-demo.sh     # Circuit Breaker Patterns

# Network Chaos
./chaos/network-chaos.sh            # Latenz & Packet Loss
./chaos/network-chaos.sh --latency 500ms
./chaos/network-chaos.sh --packet-loss 10%

# Master Demo (interaktiv)
./master-chaos-demo.sh              # Menu-driven Chaos Demo
```

---

## ☸️ **Kubernetes Scripts**

### **🚀 K8s Setup & Demo**
```bash
# Kubernetes Setup
./k8s-demo.sh --setup               # Minikube + Services setup
./k8s-demo.sh --deploy              # Deploy Demo Services  

# Auto-Scaling Demo
./k8s-demo.sh --autoscaling          # HPA Demo
./k8s-demo.sh --load-test            # Load Generator starten

# Cleanup
./k8s-demo.sh --cleanup             # Demo Services entfernen
minikube delete                     # Komplette K8s Umgebung löschen
```

---

## 📊 **Monitoring & Testing Scripts**

### **📈 Performance Testing**
```bash
# Load Testing (Artillery)
cd app/frontend && npm run test:artillery    # Frontend Load Test
cd app/frontend && npm run test:artillery:extended  # Extended Test

# Manual API Testing
curl http://localhost:8080/api/v1/products | jq  # Product Service
curl http://localhost:8081/api/v1/hello           # User Service  
curl http://localhost:8082/health                 # Checkout Service
curl http://localhost:8083/health                 # Analytics Service
```

### **🔍 Monitoring Access**
```bash
# Dashboard URLs (automatisch öffnen)
./scripts/open-dashboards.sh        # Öffnet alle relevanten URLs

# Oder manuell:
# Frontend:  http://localhost:3001
# Grafana:   http://localhost:3000  (admin/admin)
# Jaeger:    http://localhost:16686
# Prometheus: http://localhost:9090
```

---

## 🛠️ **Development Scripts**

### **💻 Frontend Development**
```bash
cd app/frontend

# Development
npm run dev                         # Development Server (Port 3001)
npm run build                       # Production Build
npm run preview                     # Preview Production Build

# Testing  
npm run test                        # Unit Tests
npm run test:artillery              # Load Testing
npm run lint                        # Code Quality
```

### **🔧 Service Development**
```bash
# Service-spezifische Entwicklung
cd app/services/product_service && ./gradlew bootRun    # Kotlin Service
cd app/services/user_service && ./gradlew bootRun       # Java Service
cd app/services/checkout_service && go run main.go      # Go Service
cd app/services/analytics_service && python app.py     # Python Service
```

---

## 📋 **Script Kategorien Übersicht**

### **🎯 Nach Anwendungsfall:**

| **Use Case** | **Scripts** | **Typical Flow** |
|--------------|-------------|------------------|
| **Quick Demo** | `start-demo.sh` → `check-demo-health.sh` | 3 min Demo |
| **Chaos Demo** | `start-demo.sh` → `chaos-demo.sh` | 15 min Demo |
| **K8s Demo** | `k8s-demo.sh --setup` → `k8s-demo.sh --autoscaling` | 25 min Demo |
| **Development** | `docker-compose up -d` → `cd app/frontend && npm run dev` | Dev Setup |
| **Debugging** | `check-demo-health.sh` → `docker-compose logs -f` | Problem Solving |

### **🕐 Nach Zeitaufwand:**

| **Zeit** | **Scripts** | **Beschreibung** |
|----------|-------------|------------------|
| **< 1 min** | `check-demo-health.sh` | System Status |
| **2-3 min** | `start-demo.sh` | System Start |
| **5-10 min** | `chaos-demo.sh --quick` | Basis Chaos Demo |
| **15-20 min** | `chaos-demo.sh` | Vollständige Chaos Demo |
| **25+ min** | `k8s-demo.sh` | Kubernetes Demo |

---

## 🚨 **Troubleshooting Scripts**

### **🔍 Diagnostic Scripts**
```bash
# System Health Check
./check-demo-health.sh              # Umfassender Health Check

# Einzelne Services prüfen
curl http://localhost:8080/health    # Product Service
curl http://localhost:8081/health    # User Service
curl http://localhost:8082/health    # Checkout Service
curl http://localhost:8083/health    # Analytics Service

# Container Status
docker ps | grep -E "(product|user|checkout|analytics)"
docker stats --no-stream | grep -E "(product|user|checkout|analytics)"
```

### **🛠️ Recovery Scripts**
```bash
# Sanfte Lösung
docker-compose restart              # Services neu starten

# Härtere Lösung  
docker-compose down && docker-compose up -d

# Nuclear Option
docker-compose down -v              # Alles löschen
docker system prune -f              # Docker cleanup
./start-demo.sh                     # Neu anfangen
```

---

## 📚 **Script-Erstellung Best Practices**

### **✅ Alle Scripts sollten:**
- Exit codes nutzen (`set -e`)
- Farb-Output für bessere UX
- Help-Options unterstützen (`--help`)
- Idempotent sein (mehrfach ausführbar)
- Logs in readable Format

### **🎯 Demo Script Patterns:**
```bash
#!/bin/bash
set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'  
BLUE='\033[0;34m'
NC='\033[0m' # No Color

function print_header() {
    echo -e "${BLUE}🎬 $1${NC}"
}

function print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}
```

---

**🎯 Benötigen Sie Hilfe bei einem bestimmten Script?**
→ [🛠️ Troubleshooting Guide](02-troubleshooting.md) 