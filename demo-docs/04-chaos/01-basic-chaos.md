# 💥 Basic Chaos Engineering Demo

*⏱️ Dauer: 5-10 Minuten | 🎯 Zielgruppe: DevOps, SRE, Platform Engineers*

---

## 🎯 **Demo-Ziel**

Zeigen wie das System auf **Service-Ausfälle reagiert** und sich **selbst heilt**. Perfect für **Resilience-Demonstrationen** gegenüber Operations-Teams.

### **🔥 Was demonstrieren wir?**
- ✅ **Service Failure Recovery** - Automatische Neu-Starts
- ✅ **Load Balancer Behavior** - Traffic-Umleitung  
- ✅ **Monitoring Response** - Alert-System in Action
- ✅ **Business Continuity** - E-Commerce funktioniert weiter

---

## 🚀 **Demo Script (5 Minuten)**

### **Schritt 1: Baseline etablieren (60 sec)**

```bash
# 1. System Status zeigen
./check-demo-health.sh

# 2. Live Traffic generieren
# Terminal 1: Continuous API Calls
while true; do 
    curl -s http://localhost:8080/api/v1/products >/dev/null
    echo "$(date): Product API called"
    sleep 2
done
```

**Demo-Aussage:** *"Hier sehen Sie das System im normalen Betrieb - alle Services antworten schnell und zuverlässig."*

---

### **Schritt 2: Chaos einführen (90 sec)**

```bash
# Service bewusst "töten"
docker kill $(docker ps -q -f name=product-service)

# Sofort Monitoring prüfen
echo "🔍 Checking system response..."
curl -w "Response Time: %{time_total}s\n" http://localhost/api/v1/products
```

**Demo-Aussage:** *"Jetzt simulieren wir einen kritischen Service-Ausfall - das kann in Production durch Hardware-Probleme, Memory-Leaks oder Deployment-Fehler passieren."*

---

### **Schritt 3: Recovery beobachten (90 sec)**

```bash
# Auto-Recovery verfolgen
echo "⏱️  Watching auto-recovery..."
for i in {1..30}; do
    STATUS=$(docker ps -q -f name=product-service | wc -l)
    if [ $STATUS -eq 1 ]; then
        echo "✅ Service recovered after ${i}0 seconds!"
        break
    fi
    echo "⏳ Recovery attempt $i..."
    sleep 10
done
```

**Demo-Aussage:** *"Docker Compose erkennt den Ausfall automatisch und startet einen neuen Container. Das ist Self-Healing in Aktion!"*

---

### **Schritt 4: System Verification (60 sec)**

```bash
# Final Health Check
./check-demo-health.sh

# Performance Test nach Recovery
curl -w "Recovery Response Time: %{time_total}s\n" http://localhost:8080/api/v1/products
```

**Demo-Aussage:** *"Das System ist vollständig wiederhergestellt - und das alles ohne manuellen Eingriff!"*

---

## 🎬 **Advanced Chaos Scenarios**

### **🌐 Network Partition Simulation**
```bash
# Network delay hinzufügen
./chaos/network-chaos.sh --latency 1000ms

# Impact messen
time curl http://localhost:8080/api/v1/products

# Recovery
./chaos/network-chaos.sh --reset
```

### **💾 Database Chaos**
```bash
# LocalStack "töten"
docker kill $(docker ps -q -f name=localstack)

# Services beobachten - sollten graceful degradation zeigen
curl http://localhost:8080/health
```

### **🔄 Circuit Breaker Demo**
```bash
# Circuit Breaker auslösen
./chaos/circuit-breaker-demo.sh

# Fallback-Behavior demonstrieren
curl http://localhost:8080/api/v1/products
```

---

## 📊 **Monitoring während Chaos**

### **🎯 Was in Grafana beobachten:**
1. **Service Health Metrics** → Services gehen von Grün auf Rot
2. **Response Time Spike** → Latenz steigt während Ausfall
3. **Request Success Rate** → Error Rate steigt kurzzeitig
4. **Recovery Metrics** → Alles normalisiert sich automatisch

### **🔍 Was in Jaeger tracken:**
1. **Failed Traces** → Requests die durch Ausfall fehlschlagen
2. **Retry Patterns** → Load Balancer versucht Backups
3. **Recovery Traces** → Neue Container verarbeiten Requests

---

## 🤔 **Typische Demo-Fragen & Antworten**

**Q: "Wie lange dauert die Recovery in Production?"**  
**A:** *"In Kubernetes mit Health Checks: 10-30 Sekunden. Mit unserem Setup hier: 30-60 Sekunden."*

**Q: "Was passiert mit laufenden Requests?"**  
**A:** *"Der Load Balancer erkennt den Ausfall und routet neue Requests zu gesunden Instanzen. Laufende Requests können verloren gehen, daher sollten Clients Retry-Logic haben."*

**Q: "Wie verhindert man Cascade Failures?"**  
**A:** *"Circuit Breaker Pattern, Timeouts, Bulkhead Pattern und Rate Limiting. Das sehen wir in der nächsten Demo."*

**Q: "Funktioniert das auch bei Database-Ausfällen?"**  
**A:** *"Ja, mit Read-Replicas und Connection Pooling. Wollen Sie das live sehen?"*

---

## 🎯 **Demo-Varianten nach Zielgruppe**

### **👨‍💼 Management Demo (3 min):**
- Nur Service Kill + Auto-Recovery zeigen
- **Focus:** "System heilt sich selbst = weniger Nacht-Einsätze"

### **🔧 Technical Deep Dive (10 min):**
- Alle Chaos-Szenarien durchgehen
- **Focus:** Monitoring, Metriken, Recovery-Patterns

### **☁️ Production Readiness (15 min):**
- Advanced Scenarios + AWS EKS Integration
- **Focus:** Production-grade Resilience Patterns

---

## 💡 **Pro-Demo-Tipps**

### **🎬 Presentation Flow:**
1. **"So funktioniert es normal"** → Baseline
2. **"Das passiert bei Ausfällen"** → Chaos  
3. **"So heilt es sich selbst"** → Recovery
4. **"Zurück zum normalen Betrieb"** → Verification

### **🗣️ Sprache für Impact:**
- ✅ **"Automatische Wiederherstellung"** statt "Container Restart"
- ✅ **"Self-Healing System"** statt "Docker Compose Restart Policy"  
- ✅ **"Zero Manual Intervention"** statt "Läuft von alleine"

### **⏰ Timing Tricks:**
- **Baseline** schnell abhandeln - alle kennen "normalen" Betrieb
- **Chaos** langsam erklären - das ist der spannende Teil
- **Recovery** live verfolgen - das ist der Wow-Moment

---

**🔥 Ready für die nächste Stufe?**  
→ [🌐 Network Chaos Engineering](02-network-chaos.md) - Latenz, Packet Loss & Partitions 