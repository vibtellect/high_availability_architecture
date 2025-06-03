# 🚀 Scripts-Übersicht - High Availability E-Commerce Demo

## 📂 **Ordnerstruktur**

```
scripts/
├── README.md                          # 📋 Diese Übersicht
├── start-demo.sh                      # 🚀 Master Demo Starter
├── check-demo-health.sh               # 🩺 System Health Check
├── k8s-demo.sh                        # ☸️ Kubernetes Demo
│
├── chaos/                             # 💥 Chaos Engineering
│   ├── chaos-demo.sh                  # 💥 Basic Chaos Tests
│   └── master-chaos-demo.sh           # 🎭 Interactive Chaos Menu
│
├── infrastructure/                    # ⚙️ Infrastructure Setup
│   ├── populate-demo-data.sh          # 📊 Demo-Daten laden
│   ├── test-demo-data.sh              # ✅ Demo-Daten testen
│   ├── open-dashboards.sh             # 🌐 Dashboard URLs öffnen
│   └── (weitere infrastructure scripts)
│
└── testing/                          # 🧪 Test Scripts
    └── test-infrastructure.sh         # ✅ Infrastructure Tests
```

---

## 🎯 **Quick Start Scripts**

### 🚀 **Master Demo Starter**
```bash
./start-demo.sh
```
**Zweck:** Startet das komplette System in der richtigen Reihenfolge
**Dauer:** ~3 Minuten
**Ergebnis:** Vollständig funktionierendes High Availability E-Commerce System

### 🩺 **System Health Check**
```bash
./check-demo-health.sh
```
**Zweck:** Überprüft alle Services und gibt Status-Report
**Dauer:** ~30 Sekunden
**Verwendung:** Vor und nach Demos, bei Problemen

---

## 💥 **Chaos Engineering Scripts**

### 💥 **Basic Chaos Test**
```bash
./chaos/chaos-demo.sh
```
**Zweck:** Testet System-Resilience mit Service-Ausfällen
**Dauer:** 5-15 Minuten
**Demonstriert:** Graceful Degradation, Auto-Recovery

### 🎭 **Interactive Chaos Menu**
```bash
./chaos/master-chaos-demo.sh
```
**Zweck:** Erweiterte Chaos-Tests mit interaktivem Menü
**Dauer:** 15-30 Minuten
**Demonstriert:** Verschiedene Failure-Szenarien

---

## ☸️ **Kubernetes Demo**

### ☸️ **Auto-Scaling Demo**
```bash
./k8s-demo.sh
```
**Zweck:** Demonstriert Kubernetes Auto-Scaling unter Last
**Dauer:** 10-25 Minuten  
**Voraussetzung:** Minikube installiert

---

## ⚙️ **Infrastructure Scripts**

### 📊 **Demo-Daten Management**
```bash
# Demo-Daten laden
./infrastructure/populate-demo-data.sh

# Demo-Daten testen  
./infrastructure/test-demo-data.sh
```

### 🌐 **Dashboard Helper**
```bash
# Alle Monitoring-URLs öffnen
./infrastructure/open-dashboards.sh
```

---

## 🧪 **Testing Scripts**

### ✅ **Infrastructure Test**
```bash
./testing/test-infrastructure.sh
```
**Zweck:** Testet komplette Infrastructure-Verfügbarkeit
**Verwendung:** Debugging, CI/CD Pipelines

---

## 🎬 **Demo-Flows für verschiedene Zielgruppen**

### 👨‍💼 **Business Stakeholder (15 min)**
```bash
1. ./start-demo.sh                    # System starten
2. ./check-demo-health.sh             # Status prüfen
3. Manual Frontend Demo               # Business Value zeigen
```

### 👩‍💻 **Entwickler (30 min)**
```bash
1. ./start-demo.sh                    # System starten
2. API-Demos im Browser               # Technical Architecture
3. ./infrastructure/open-dashboards.sh # Monitoring zeigen
```

### 🔧 **DevOps/SRE (40 min)**
```bash
1. ./start-demo.sh                    # System starten
2. ./chaos/chaos-demo.sh              # Resilience testen
3. ./check-demo-health.sh             # Recovery verifizieren
```

### ☸️ **Platform Engineers (40 min)**
```bash
1. ./start-demo.sh                    # System starten
2. ./k8s-demo.sh                      # Kubernetes Demo
3. kubectl get pods --watch           # Scaling beobachten
```

---

## 🛠️ **Troubleshooting**

### ❌ **System startet nicht**
```bash
# 1. Health Check
./check-demo-health.sh

# 2. Infrastructure Test
./testing/test-infrastructure.sh

# 3. Docker Status prüfen
docker ps -a
docker-compose logs
```

### ❌ **Services nicht erreichbar**
```bash
# Port-Konflikte prüfen
netstat -tlnp | grep -E "(3001|8080|8081|8082|8083)"

# Services neu starten
docker-compose restart
```

### ❌ **Demo-Daten fehlen**
```bash
# Demo-Daten neu laden
./infrastructure/populate-demo-data.sh

# Demo-Daten testen
./infrastructure/test-demo-data.sh
```

---

## 📋 **Script-Details**

| Script | Zweck | Dauer | Ausgabe | Verwendung |
|--------|--------|--------|---------|------------|
| `start-demo.sh` | Master Starter | 3 min | System Status | Vor jeder Demo |
| `check-demo-health.sh` | Health Check | 30 sec | Status Report | Debugging |
| `chaos-demo.sh` | Basic Chaos | 5-15 min | Resilience Test | DevOps Demos |
| `master-chaos-demo.sh` | Extended Chaos | 15-30 min | Interactive Menu | Advanced Demos |
| `k8s-demo.sh` | Kubernetes | 10-25 min | Scaling Demo | Platform Demos |

---

## 🎯 **Best Practices**

### ✅ **Vor jeder Demo:**
1. `./start-demo.sh` ausführen
2. `./check-demo-health.sh` für Status-Check  
3. Browser-Tabs vorbereiten
4. Terminal-Fenster organisieren

### ✅ **Während der Demo:**
- Scripts kommentieren während Ausführung
- Health-Checks zwischen Bereichen
- Screenshots als Backup bereithalten

### ✅ **Nach der Demo:**
- System für nächste Demo laufen lassen
- oder `docker-compose down` für cleanup

---

📖 **Weitere Dokumentation:** [../README.md](../README.md) 