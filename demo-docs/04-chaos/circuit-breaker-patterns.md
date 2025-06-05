# Circuit Breaker Pattern Implementation

> **Demo-Integration**: Implementierung und Demonstration des Circuit Breaker Patterns zur Erhöhung der Systemresilienz

## 🎯 Übersicht

Das Circuit Breaker Pattern ist ein kritisches Resilienz-Muster, das verhindert, dass Ausfälle in einem Service zu Kaskadierungsfehlern im gesamten System führen. Diese Implementierung zeigt praktische Anwendung in einer Microservices-Architektur.

## 🏗️ Architektur

### Service-Integration
```
┌─────────────────┐    Circuit Breaker    ┌─────────────────┐
│   Checkout      │ ─────────────────────► │   Product       │
│   Service       │                        │   Service       │
│   (Go)          │                        │   (Kotlin)      │
└─────────────────┘                        └─────────────────┘
        │                                           │
        └── Circuit Breaker States:                 │
            • CLOSED (Normal)                       │
            • OPEN (Fast-fail)                      │
            • HALF_OPEN (Testing)                   │
                                                    │
┌─────────────────────────────────────────────────┘
│ Monitoring Integration:
├── Prometheus Metrics
├── Grafana Dashboards  
└── Real-time Alerts
```

### Implementierte Pattern
- **Resilience4j Integration** (JVM Services)
- **Go Circuit Breaker** (Native Implementation)
- **Metrics & Monitoring** (Prometheus/Grafana)
- **Chaos Engineering** (Automated Testing)

## 🚀 Demo-Ausführung

### Vorbereitung
```bash
# 1. Python Dependencies installieren (einmalig)
cd demo-docs/scripts/chaos
pip3 install -r requirements.txt

# 2. Scripts ausführbar machen
chmod +x circuit-breaker-demo.sh
```

### Schnellstart
```bash
# 1. Basis Demo starten
cd demo-docs/scripts/chaos
./circuit-breaker-demo.sh

# 2. Erweiterte Tests
python3 circuit_breaker_tester.py --test-type chaos --duration 120

# 3. Monitoring öffnen
open http://localhost:3000/d/circuit-breaker-monitoring
```

### Verfügbare Demo-Modi

#### 🔄 **Interactive Demo**
```bash
./circuit-breaker-demo.sh
```
- 7-stufiger interaktiver Prozess
- Automatische Dashboard-Öffnung
- Real-time Monitoring Integration
- Benutzergeführte Chaos-Szenarien

#### ⚡ **Quick Demo** 
```bash
./circuit-breaker-demo.sh --quick
```
- 2-Minuten kompakte Version
- Für Zeitkritische Präsentationen

#### 🔬 **Advanced Testing**
```bash
# Health Check aller Services
python3 circuit_breaker_tester.py --test-type health

# Load Testing
python3 circuit_breaker_tester.py --test-type load --service checkout --duration 60 --rps 10

# Chaos Engineering
python3 circuit_breaker_tester.py --test-type chaos --duration 120 --output results.json

# Performance Benchmark
python3 circuit_breaker_tester.py --test-type benchmark --service checkout
```

## 📊 Monitoring & Observability

### Grafana Dashboards
- **Circuit Breaker Overview**: Zustandsübersicht aller Breaker
- **Real-time Monitoring**: Live-Metriken und Zustandsübergänge  
- **Failure Tracking**: Error-Raten und Recovery-Zeiten
- **Service Dependency Map**: Abhängigkeitsverfolgung

### Prometheus Metriken
```prometheus
# Circuit Breaker Zustände
cb:open_state:current
cb:closed_state:current  
cb:half_open_state:current

# Performance Metriken
cb:success_rate:5m
cb:failure_rate:5m
cb:response_time:histogram

# Alert Metriken
cb:state_transition_total
cb:failure_threshold_exceeded
```

### Automated Alerts
- Circuit Breaker State Changes
- High Failure Rates (>50%)
- Response Time Degradation
- Service Recovery Events

## 🌪️ Chaos Engineering Szenarien

### 1. Product Service Failure
```yaml
Szenario: Product Service wird unverfügbar
Dauer: 60 Sekunden
Erwartung: 
  - Checkout Service Circuit Breaker öffnet sich
  - Error Rate sinkt durch Fast-Fail
  - Automatische Recovery nach Service-Wiederherstellung
```

### 2. Network Partition
```yaml
Szenario: Netzwerk-Latenz zwischen Services
Dauer: 60 Sekunden  
Erwartung:
  - Timeout-basierte Circuit Breaker Aktivierung
  - Graduelle Wiederherstellung
  - Latency-Metriken in Grafana
```

### 3. Cascade Failure
```yaml
Szenario: Kaskadierende Ausfälle über mehrere Services
Dauer: 90 Sekunden
Erwartung:
  - Mehrere Circuit Breaker aktivieren
  - System bleibt funktionsfähig
  - Isolierung der Ausfälle
```

## 💻 Technische Implementation

### Go Service (Checkout)
```go
// Circuit Breaker Integration
type CircuitBreakerMetrics struct {
    stateGauge      prometheus.GaugeVec
    requestsCounter prometheus.CounterVec
    latencyHisto    prometheus.HistogramVec
}

// Automatische Metriken-Updates
func (m *CircuitBreakerMetrics) UpdateState(name string, state circuitbreaker.State) {
    m.stateGauge.WithLabelValues(name, string(state)).Set(1)
}
```

### Kotlin Service (Product)
```kotlin
// Resilience4j Configuration
@Component
class CircuitBreakerConfig {
    @Bean
    fun circuitBreakerRegistry(): CircuitBreakerRegistry {
        return CircuitBreakerRegistry.ofDefaults()
    }
}

// Automatic Metrics Export
@EventListener
fun onCircuitBreakerEvent(event: CircuitBreakerEvent) {
    meterRegistry.counter("circuit.breaker.events", 
        "name", event.circuitBreakerName,
        "type", event.eventType.name
    ).increment()
}
```

### Prometheus Integration
```yaml
# Recording Rules für Circuit Breaker
groups:
  - name: circuit_breaker
    rules:
      - record: cb:open_state:current
        expr: |
          sum by (service, circuit_breaker) (
            circuit_breaker_state{state="open"}
          )
      
      - record: cb:success_rate:5m
        expr: |
          rate(circuit_breaker_calls_total{outcome="success"}[5m]) /
          rate(circuit_breaker_calls_total[5m]) * 100
```

## 🎯 Demo-Erfolgskriterien

### ✅ **Zu beobachtende Verhaltensweisen**

1. **Normal Operation**
   - Circuit Breaker Status: CLOSED
   - Success Rate: >95%
   - Response Time: <100ms

2. **Failure Detection**
   - Automatische Erkennung nach 5 Fehlschlägen
   - Circuit Breaker Status: OPEN
   - Error Rate sinkt drastisch (Fast-Fail)

3. **Recovery Testing**
   - Circuit Breaker Status: HALF_OPEN
   - Graduelle Anfragen zur Verfügbarkeitsprüfung
   - Bei Erfolg: Status zurück zu CLOSED

4. **Monitoring Integration**
   - Real-time Dashboard Updates
   - Prometheus Metriken verfügbar
   - Alerts werden ausgelöst

### 📈 **Metriken zur Validierung**

```bash
# Überprüfung der Circuit Breaker Metriken
curl -s "http://localhost:9090/api/v1/query?query=cb:open_state:current" | jq

# Success Rate Monitoring  
curl -s "http://localhost:9090/api/v1/query?query=cb:success_rate:5m" | jq

# Response Time Tracking
curl -s "http://localhost:9090/api/v1/query?query=cb:response_time:avg" | jq
```

## 🔧 Troubleshooting

### Häufige Probleme

#### Circuit Breaker öffnet sich nicht
```bash
# Prüfe Service Verbindungen
python3 circuit_breaker_tester.py --test-type health

# Prüfe Prometheus Metriken
curl http://localhost:9090/api/v1/label/__name__/values | grep circuit
```

#### Monitoring nicht verfügbar  
```bash
# Prüfe Container Status
docker-compose ps

# Restart Observability Stack
docker-compose restart prometheus grafana
```

#### Services nicht erreichbar
```bash
# Service Health Check
for port in 8080 8081 8082 8083; do
  curl -s http://localhost:$port/health || echo "Port $port not available"
done
```

#### Python Dependencies fehlen
```bash
# Installiere Requirements
pip3 install -r requirements.txt

# Oder global installieren
sudo pip3 install aiohttp
```

## 📚 Weiterführende Ressourcen

### Dokumentation
- [Resilience4j Circuit Breaker](https://resilience4j.readme.io/docs/circuitbreaker)
- [Go Circuit Breaker Patterns](https://github.com/sony/gobreaker)
- [Prometheus Monitoring](https://prometheus.io/docs/practices/rules/)

### Demo-Integration
- **Basis-Demo**: `./circuit-breaker-demo.sh`
- **Advanced Testing**: `circuit_breaker_tester.py`
- **Monitoring**: Grafana Dashboard Circuit Breaker Monitoring
- **Dokumentation**: Diese Datei + README in `/scripts/`

---

**💡 Tipp**: Starte mit der Basis-Demo für einen Überblick und verwende die erweiterten Tools für detaillierte Analyse und Performance-Tests. 