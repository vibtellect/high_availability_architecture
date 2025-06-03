# 🛠️ Troubleshooting Guide - Demo Probleme schnell lösen

*🎯 Für Demo-Durchführer: Häufige Probleme und sofortige Lösungen*

---

## 🚨 **Kritische Probleme (Demo-Stopper)**

### **Problem: Services starten nicht**
```bash
# Symptom: docker-compose ps zeigt "Exit 1" oder "Restarting"
# Lösung:
docker-compose down
docker system prune -f
docker-compose up -d

# Warten bis alle Services healthy sind
sleep 30 && docker-compose ps
```

**Wenn immer noch Probleme:**
```bash
# Einzelne Services debuggen
docker-compose logs analytics-service
docker-compose logs product-service 
docker-compose logs user-service
docker-compose logs checkout-service
```

### **Problem: Frontend lädt nicht (404 Errors)**
```bash
# Check 1: Frontend Process läuft?
ps aux | grep -E "(node|npm)" | grep -v grep

# Check 2: Proxy Config testen
curl -s http://localhost:3001/api/v1/analytics/health

# Lösung: Frontend neu starten
cd app/frontend
npm run dev
```

### **Problem: Grafana zeigt "No Data"**
```bash
# Check 1: Load Test läuft?
curl -s http://localhost:8083/api/v1/analytics/metrics/load-test | jq

# Check 2: Prometheus Targets
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[].health'

# Lösung: Load Test starten
curl -X POST http://localhost:8083/api/v1/analytics/load-test/start
```

---

## ⚡ **Schnelle Fixes (30 Sekunden)**

| **Problem** | **Schnelle Lösung** | **Command** |
|-------------|---------------------|-------------|
| Services not healthy | Neustart aller Services | `docker-compose restart` |
| Frontend API Errors | Proxy Config refresh | `cd app/frontend && npm run dev` |
| Grafana Login Problem | Standard Credentials | `admin / admin` |
| Missing Load Test Data | Load Test aktivieren | `curl -X POST localhost:8083/api/v1/analytics/load-test/start` |
| Chaos API not found | Analytics Service check | `docker-compose restart analytics-service` |

---

## 🔍 **System Status prüfen**

### **Kompletter Health Check**
```bash
#!/bin/bash
echo "=== Demo Health Check ==="

# 1. Docker Services
echo "1. Docker Services:"
docker-compose ps | grep -E "(Up|healthy)" | wc -l
echo "   Expected: 6 (4 services + prometheus + grafana)"

# 2. Frontend
echo "2. Frontend:"
curl -s http://localhost:3001/ > /dev/null && echo "   ✅ Frontend UP" || echo "   ❌ Frontend DOWN"

# 3. APIs
echo "3. Backend APIs:"
curl -s http://localhost:8083/api/v1/analytics/health > /dev/null && echo "   ✅ Analytics API UP" || echo "   ❌ Analytics API DOWN"

# 4. Load Test
echo "4. Load Test:"
LOAD_TEST=$(curl -s http://localhost:8083/api/v1/analytics/metrics/load-test | jq -r '.metrics.requests_per_second')
if [ "$LOAD_TEST" -gt "10" ]; then
    echo "   ✅ Load Test Active ($LOAD_TEST RPS)"
else
    echo "   ❌ Load Test Inactive"
fi

# 5. Grafana Data
echo "5. Grafana:"
curl -s http://localhost:3000/api/health > /dev/null && echo "   ✅ Grafana UP" || echo "   ❌ Grafana DOWN"

echo "=== Health Check Complete ==="
```

### **Demo-Ready Checklist**
```bash
# Save this as check-demo-ready.sh
#!/bin/bash
echo "🎯 Demo Readiness Check"

ISSUES=0

# Frontend Check
if ! curl -s http://localhost:3001/ha-dashboard > /dev/null; then
    echo "❌ Frontend Dashboard not accessible"
    ISSUES=$((ISSUES + 1))
else
    echo "✅ Frontend Dashboard OK"
fi

# Services Health
HEALTHY_SERVICES=$(docker-compose ps | grep -c "healthy")
if [ "$HEALTHY_SERVICES" -lt "4" ]; then
    echo "❌ Only $HEALTHY_SERVICES/4 services healthy"
    ISSUES=$((ISSUES + 1))
else
    echo "✅ All 4 services healthy"
fi

# Live Data
RPS=$(curl -s http://localhost:8083/api/v1/analytics/metrics/load-test | jq -r '.metrics.requests_per_second // 0')
if [ "$RPS" -lt "30" ]; then
    echo "❌ Load test too low: $RPS RPS"
    ISSUES=$((ISSUES + 1))
else
    echo "✅ Load test active: $RPS RPS"
fi

# Grafana Access
if ! curl -s http://localhost:3000/api/health > /dev/null; then
    echo "❌ Grafana not accessible"
    ISSUES=$((ISSUES + 1))
else
    echo "✅ Grafana accessible"
fi

if [ "$ISSUES" -eq "0" ]; then
    echo ""
    echo "🎉 Demo is READY! All systems green."
    echo "🌐 Open these tabs:"
    echo "   - Frontend: http://localhost:3001/ha-dashboard"
    echo "   - Grafana:  http://localhost:3000"
else
    echo ""
    echo "⚠️  Demo has $ISSUES issues. Fix before starting!"
fi
```

---

## 📱 **Browser & UI Probleme**

### **Frontend Dashboard Fehler**
| **Fehler** | **Ursache** | **Lösung** |
|------------|-------------|------------|
| "Cannot read properties of undefined" | API Response fehlerhaft | Frontend restart + API check |
| 404 auf /ha-dashboard | React Router Problem | `npm run dev` neu starten |
| API calls fehlschlagen | Proxy Config | Vite config prüfen, Services restart |
| White Screen | JS Error | Browser Console öffnen, Fehler beheben |

### **Grafana Dashboard Probleme**
| **Problem** | **Lösung** |
|-------------|------------|
| "No Data" in Dashboards | Load Test starten, Prometheus targets prüfen |
| "datasource prometheus was not found" | Grafana restart: `docker-compose restart grafana` |
| Login funktioniert nicht | Standard: `admin/admin` |
| Dashboard lädt nicht | Browser cache leeren |

---

## 🎭 **Demo-Spezifische Fixes**

### **Während der Demo**
```bash
# Backup Commands bereithalten:

# 1. System-Recovery (90 sec)
docker-compose down && docker-compose up -d

# 2. Frontend-Recovery (30 sec)
cd app/frontend && npm run dev

# 3. Load-Test restart (10 sec)
curl -X POST http://localhost:8083/api/v1/analytics/load-test/start

# 4. Service einzeln neustarten
docker-compose restart analytics-service
```

### **Präsentations-Tipps**
- **Screenshots bereithalten** für kritische Momente
- **Browser-Bookmarks** für alle wichtigen URLs
- **Terminal-Fenster** mit prepared commands
- **Backup-Slides** falls alles offline geht

---

## 🚀 **Kompletter System-Reset**

**Wenn alles kaputt ist (2-3 Minuten):**
```bash
#!/bin/bash
echo "🔄 Full System Reset"

# 1. Stop everything
docker-compose down
pkill -f "npm"
pkill -f "vite"

# 2. Clean docker
docker system prune -f

# 3. Restart infrastructure
docker-compose up -d

# 4. Wait for services
echo "Waiting for services to start..."
sleep 60

# 5. Start frontend
cd app/frontend
npm run dev &

# 6. Start load test
sleep 30
curl -X POST http://localhost:8083/api/v1/analytics/load-test/start

echo "✅ Reset complete. Check: http://localhost:3001/ha-dashboard"
```

---

## 📞 **Notfall-Plan**

### **Wenn Demo-System komplett ausfällt:**
1. **Screenshots zeigen** statt Live-Demo
2. **Statische Demo** über Powerpoint
3. **Video-Recording** abspielen
4. **Erklärung:** "Das zeigt wie wichtig High Availability ist!"

### **Prepared Statements:**
- *"Sie sehen hier, wie wichtig robuste Systeme sind..."*
- *"In Production haben wir Redundanz - das ist nur die Demo-Umgebung..."*
- *"Genau solche Situationen vermeiden wir mit unserem HA-System..."*

---

## 🎯 **Vorbeugende Maßnahmen**

### **Vor jeder Demo (5 min):**
```bash
# 1. System-Check
./check-demo-ready.sh

# 2. Browser vorbereiten
# - Bookmarks setzen
# - Cache leeren
# - Tabs öffnen

# 3. Terminal vorbereiten
# - Commands copy-pasten
# - Windows/Screens arrangieren

# 4. Backup vorbereiten
# - Screenshots in Präsentation
# - Video als Fallback
```

**💡 Demo-Erfolg = Preparation + Backup Plans + Gelassenheit bei Problemen** 