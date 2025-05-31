# Demo Data Documentation

Diese Dokumentation beschreibt die Demo-Daten, die automatisch beim Start der High Availability E-Commerce Architektur geladen werden.

## 🎯 Überblick

Das System wird automatisch mit realistischen Demo-Daten befüllt, um die Funktionalität aller Microservices zu demonstrieren und Load Testing sowie Chaos Engineering zu ermöglichen.

## 📦 Automatische Daten-Population

### Start-Prozess
```bash
# Startet alle Services und befüllt automatisch Demo-Daten
./start-backend-services.sh
```

### Manueller Daten-Import
```bash
# Nur Demo-Daten laden (Services müssen bereits laufen)
./scripts/populate-demo-data.sh
```

## 🛍️ Produkte (15 Artikel)

### Kategorien:
- **Laptops**: MacBook Pro 16", Dell XPS 13
- **Smartphones**: iPhone 15 Pro, Samsung Galaxy S24
- **Audio**: Sony WH-1000XM5, AirPods Pro 2
- **Tablets**: iPad Air 5, Microsoft Surface Pro 9
- **TVs**: LG OLED C3 55"
- **Gaming**: Nintendo Switch OLED
- **Zubehör**: Logitech MX Master 3S
- **E-Reader**: Kindle Paperwhite
- **Kameras**: Canon EOS R6 Mark II
- **Monitore**: Samsung Monitor 32"
- **Möbel**: Gaming Stuhl Pro

### Produkt-Eigenschaften:
- Realistische deutsche Beschreibungen
- Marken: Apple, Samsung, Sony, Dell, LG, Nintendo, etc.
- Preisbereich: €99.99 - €2999.00
- Lagerbestände: 15-100 Stück
- SKU-Codes für Tracking
- Kategorisierung für Filter

## 👥 Demo-Benutzer (8 Personen)

### Benutzer-Daten:
- **Max Mustermann** (Berlin) - max.mustermann@example.com
- **Anna Schmidt** (München) - anna.schmidt@example.com
- **Thomas Weber** (Düsseldorf) - thomas.weber@example.com
- **Sarah Müller** (Hamburg) - sarah.mueller@example.com
- **Michael Fischer** (Stuttgart) - michael.fischer@example.com
- **Julia Wagner** (Köln) - julia.wagner@example.com
- **Daniel Becker** (Berlin) - daniel.becker@example.com
- **Lisa Hofmann** (Essen) - lisa.hofmann@example.com

### Login-Daten:
- **Passwort für alle**: `demo123`
- Deutsche Adressen mit Postleitzahlen
- Telefonnummern im deutschen Format

## 🛒 Beispiel-Bestellungen (5 Orders)

### Order-Status:
- **Completed**: Abgeschlossene Bestellungen
- **Shipped**: Versendete Bestellungen
- **Processing**: Bestellungen in Bearbeitung

### Bestellungen:
1. Max: MacBook Pro 16" (€2999.00) - ✅ Completed
2. Anna: iPhone 15 Pro + AirPods Pro 2 (€1478.00) - ✅ Completed
3. Thomas: Sony Kopfhörer (€349.99) - 🚚 Shipped
4. Sarah: LG OLED TV (€1799.00) - ⏳ Processing
5. Michael: 2x Nintendo Switch (€699.98) - ✅ Completed

## 📊 Analytics-Daten

### Event-Typen:
- **page_view**: Seitenaufrufe
- **product_view**: Produktansichten
- **add_to_cart**: Warenkorb-Hinzufügungen
- **purchase**: Käufe
- **search**: Suchvorgänge

### Zeitbasierte Daten:
- Events der letzten Stunde simuliert
- Realistische User-Journey-Patterns
- Conversion-Tracking

## 🎮 Demo-Features

### Frontend-Integration:
- Produkte werden automatisch auf der Homepage angezeigt
- User-Accounts können für Login verwendet werden
- Warenkorb-Funktionalität mit echten Produkten
- Checkout-Prozess mit Demo-Daten

### Load Testing:
- Vorkonfigurierte Test-Szenarien
- Realistische Produktdaten für Tests
- User-basierte Load-Patterns

### Chaos Engineering:
- Services mit Daten für robuste Tests
- Fehlersimulation mit echten Transaktionen
- Recovery-Testing mit populated data

## 🔄 Daten-Reset

### Kompletter Reset:
```bash
# Alle Container und Daten löschen
docker-compose down --volumes --remove-orphans

# Neustart mit frischen Daten
./start-backend-services.sh
```

### Nur Daten neu laden:
```bash
# Services müssen laufen
./scripts/populate-demo-data.sh
```

## 📝 Anpassungen

### Eigene Produkte hinzufügen:
Bearbeite `scripts/populate-demo-data.sh` und erweitere das `products` Array:

```bash
'{"name":"Neues Produkt","description":"Beschreibung","price":199.99,"category":"Kategorie","imageUrl":"/images/bild.jpg","stock":10,"brand":"Marke","sku":"SKU-CODE"}'
```

### Neue Benutzer:
Erweitere das `users` Array in der gleichen Datei.

### Zusätzliche Bestellungen:
Erweitere das `orders` Array für mehr Test-Transaktionen.

## 🌐 Service-Integration

### Product Service (Port 8080):
- GET `/api/products` - Alle Produkte
- POST `/api/products` - Neues Produkt erstellen
- GET `/api/products/{id}` - Einzelnes Produkt

### User Service (Port 8081):
- POST `/api/users/register` - Registrierung
- POST `/api/users/login` - Anmeldung
- GET `/api/users/{id}` - Benutzerprofil

### Checkout Service (Port 8082):
- POST `/api/orders` - Neue Bestellung
- GET `/api/orders/{id}` - Bestelldetails
- PUT `/api/orders/{id}/status` - Status-Update

### Analytics Service (Port 8083):
- POST `/api/events` - Event tracking
- GET `/api/analytics/summary` - Analytics-Übersicht

## 🚀 Nächste Schritte

1. **Frontend starten**: `cd app/frontend && npm run dev`
2. **Architecture Dashboard**: http://localhost:3001/architecture
3. **Load Tests durchführen**: Über das Dashboard oder API
4. **Monitoring prüfen**: Grafana, Jaeger, Prometheus
5. **Chaos Tests**: Fehlertoleranz testen

## 📞 Support

Bei Problemen mit der Demo-Daten-Population:

1. Logs prüfen: `docker-compose logs [service-name]`
2. Health-Checks: `curl http://localhost:8080/health`
3. Services neustarten: `docker-compose restart [service-name]`
4. Kompletter Neustart: `./start-backend-services.sh` 