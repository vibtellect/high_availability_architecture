# 🏗️ High Availability E-Commerce Architecture

Eine **produktionsreife Microservices-Architektur** für E-Commerce mit **Monitoring**, **Chaos Engineering** und **Auto-Scaling** - optimiert für **Live-Demos** und **reale Szenarien**.

---

## 🚀 **Quick Start (3 Minuten)**

```bash
# 1. System starten
./start-demo.sh

# 2. Health Check
./check-demo-health.sh

# 3. Frontend öffnen
# http://localhost:3001
```

**🎯 Das war's!** Das komplette High Availability System läuft jetzt.

---

## 📂 **Demo-Dokumentation**

**📖 Komplette Demo-Dokumentation:** [demo-docs/README.md](demo-docs/README.md)

### 🎬 **Demo-Flows**
- **👨‍💼 Business (15 min):** [Grundlagen](demo-docs/01-grundlagen/)
- **👩‍💻 Entwickler (30 min):** [Services](demo-docs/02-services/)  
- **🔧 DevOps (40 min):** [Chaos Engineering](demo-docs/04-chaos/)
- **☸️ Platform (40 min):** [Kubernetes](demo-docs/05-kubernetes/)

### 📝 **Scripts-Übersicht**
- **🚀 Demo Scripts:** [demo-docs/scripts/README.md](demo-docs/scripts/README.md)
- **💥 Chaos Tests:** [demo-docs/scripts/chaos/](demo-docs/scripts/chaos/)
- **⚙️ Infrastructure:** [demo-docs/scripts/infrastructure/](demo-docs/scripts/infrastructure/)

---

## 🌐 **System-URLs**

| Service | URL | Beschreibung |
|---------|-----|--------------|
| **🛒 Frontend** | http://localhost:3001 | React E-Commerce Shop |
| **🏗️ Architecture Dashboard** | http://localhost:3001/architecture | System-Übersicht & Tests |
| **📊 Grafana** | http://localhost:3000 | Monitoring (admin/admin) |
| **🔍 Jaeger** | http://localhost:16686 | Distributed Tracing |
| **📈 Prometheus** | http://localhost:9090 | Metrics Collection |

---

## 🎯 **Quick Demo Commands**

### 🚀 **Basic Demo**
```bash
./start-demo.sh              # System starten (3 min)
./check-demo-health.sh       # Status prüfen (30 sec)
```

### 💥 **Chaos Engineering Demo**
```bash
./chaos-demo.sh              # Basic Chaos Tests (5-15 min)
./master-chaos-demo.sh       # Interactive Chaos Menu (15-30 min)
```

### ☸️ **Kubernetes Demo**
```bash
./k8s-demo.sh                # Auto-Scaling Demo (10-25 min)
```

---

## 🏗️ **Architektur-Übersicht**

### 🔧 **Microservices**
- **🛍️ Product Service** (Port 8080) - Produktkatalog
- **👤 User Service** (Port 8081) - Benutzerverwaltung & Auth
- **🛒 Checkout Service** (Port 8082) - Bestellprozess
- **📊 Analytics Service** (Port 8083) - Event Analytics

### 🌐 **Infrastructure**
- **🔀 NGINX** (Port 80) - API Gateway & Load Balancer
- **🍃 MongoDB** - Produktdatenbank
- **🔴 Redis** - Session & Cache Store
- **☁️ LocalStack** - AWS Services (DynamoDB, SQS, SNS)

### 📊 **Monitoring Stack**
- **📈 Prometheus** - Metrics Collection
- **📊 Grafana** - Dashboards & Alerting
- **🔍 Jaeger** - Distributed Tracing
- **📋 Custom Health Checks** - Service Monitoring

---

## 💥 **Chaos Engineering Features**

- **🔥 Service Failure Simulation**
- **🌐 Network Latency/Partition Tests**
- **🔄 Circuit Breaker Pattern Testing**
- **📊 Real-time Resilience Monitoring**
- **🎭 Interactive Test Scenarios**

---

## ☸️ **Kubernetes Integration**

- **📈 Horizontal Pod Autoscaler (HPA)**
- **💾 Persistent Volume Claims**
- **🔍 Service Discovery**
- **🔄 Rolling Updates**
- **🛡️ Health Checks & Self-Healing**

---

## 🧪 **Demo-Daten**

Das System wird automatisch mit **realistischen deutschen E-Commerce-Daten** gefüllt:

- **📱 15 Produkte** (MacBook, iPhone, Gaming Equipment, etc.)
- **👥 8 Demo-Benutzer** mit deutschen Adressen
- **📦 5 Beispiel-Bestellungen** mit verschiedenen Status
- **📊 Analytics Events** für realistische User Journeys

**📖 Details:** [Demo-Daten Dokumentation](demo-docs/01-grundlagen/demo-data.md)

---

## 🛠️ **Troubleshooting**

### ❌ **System startet nicht**
```bash
# Health Check ausführen
./check-demo-health.sh

# Infrastructure testen
./demo-docs/scripts/testing/test-infrastructure.sh

# Docker Status prüfen
docker ps -a
docker-compose logs
```

### ❌ **Port-Konflikte**
```bash
# Verwendete Ports prüfen
netstat -tlnp | grep -E "(3001|8080|8081|8082|8083|3000|16686|9090)"

# Konflikte lösen
sudo lsof -ti:3001 | xargs kill -9  # Beispiel für Port 3001
```

### ❌ **Services nicht erreichbar**
```bash
# Services neu starten
docker-compose restart

# CORS-Probleme beheben
docker-compose restart nginx
```

**📖 Ausführliches Troubleshooting:** [demo-docs/99-referenz/02-troubleshooting.md](demo-docs/99-referenz/02-troubleshooting.md)

---

## 📚 **Dokumentations-Struktur**

```
demo-docs/
├── 01-grundlagen/           # 📚 System-Grundlagen (5 min)
├── 02-services/             # 🔧 Microservices Details (10 min)
├── 03-observability/        # 🔍 Monitoring & Tracing (15 min)
├── 04-chaos/                # 💥 Chaos Engineering (20 min)
├── 05-kubernetes/           # ☸️ Container Orchestration (25 min)
├── 06-aws/                  # ☁️ Cloud Deployment (30 min)
├── 99-referenz/             # 📖 API & Troubleshooting
├── scripts/                 # 🚀 Alle Demo-Scripts
└── config/                  # ⚙️ Konfigurationsdateien
```

---

## 🎯 **Zielgruppen-spezifische Einstiege**

| **Rolle** | **Einstieg** | **Dauer** | **Fokus** |
|-----------|--------------|-----------|-----------|
| **👨‍💼 Business Stakeholder** | [System-Überblick](demo-docs/01-grundlagen/01-system-ueberblick.md) | 15 min | ROI & Business Value |
| **👩‍💻 Software Developer** | [Service Architecture](demo-docs/02-services/01-service-architecture.md) | 30 min | Technical Deep Dive |
| **🔧 DevOps Engineer** | [Chaos Engineering](demo-docs/04-chaos/01-basic-chaos.md) | 40 min | Resilience & Reliability |
| **☸️ Platform Engineer** | [Kubernetes Setup](demo-docs/05-kubernetes/01-k8s-setup.md) | 40 min | Orchestration & Scaling |
| **☁️ Cloud Architect** | [AWS Deployment](demo-docs/06-aws/01-aws-setup.md) | 60 min | Production Deployment |

---

## 🚀 **Nächste Schritte**

1. **🎬 Erste Demo starten:** [Quick Start Guide](demo-docs/01-grundlagen/02-quick-start.md)
2. **📖 Dokumentation erkunden:** [Demo-Docs Übersicht](demo-docs/README.md)  
3. **💥 Chaos Engineering testen:** [Chaos Guide](demo-docs/04-chaos/chaos-engineering-guide.md)
4. **☸️ Kubernetes ausprobieren:** [K8s Demo](demo-docs/05-kubernetes/01-k8s-setup.md)

---

**🎯 Demo-optimiert | 🔄 Produktionsreif | 🛡️ Chaos-getestet | ☸️ Kubernetes-ready**
