# Docker Setup für High Availability Architecture

## 🐳 **Lokale Entwicklung mit Docker**

Diese Docker Compose Konfiguration ermöglicht es dir, den Product Service zusammen mit LocalStack (AWS Services) lokal zu entwickeln und zu testen.

## **Voraussetzungen**

- Docker & Docker Compose installiert
- AWS CLI installiert (für DynamoDB Setup)

## **Services**

### **LocalStack** 
- **Port:** 4566 (Haupt-Port), 8000 (DynamoDB Kompatibilität)
- **Services:** DynamoDB, SNS, SQS, S3, Lambda
- **Persistenz:** Daten werden in `./localstack-data` gespeichert

### **Product Service**
- **Port:** 8080
- **Profile:** `docker`
- **DynamoDB:** Verbindet sich automatisch mit LocalStack

## **🚀 Schnellstart**

### **1. LocalStack starten**
```bash
# Nur LocalStack starten
docker-compose up localstack -d

# Warten bis LocalStack bereit ist (ca. 30 Sekunden)
docker-compose logs -f localstack
```

### **2. DynamoDB Tabellen initialisieren**
```bash
# DynamoDB Tabellen und Test-Daten erstellen
./scripts/init-dynamodb.sh
```

### **3. Product Service starten**
```bash
# Service bauen und starten
docker-compose up product-service --build

# Oder im Hintergrund
docker-compose up -d --build
```

### **4. Alles zusammen starten**
```bash
# Alle Services auf einmal
docker-compose up -d --build

# DynamoDB initialisieren (nach dem Start)
./scripts/init-dynamodb.sh
```

## **🧪 Testen**

### **Health Check**
```bash
curl http://localhost:8080/actuator/health
```

### **API Endpoints testen**
```bash
# Alle Produkte abrufen
curl http://localhost:8080/api/v1/products

# Spezifisches Produkt
curl http://localhost:8080/api/v1/products/test-product-1

# Neues Produkt erstellen
curl -X POST http://localhost:8080/api/v1/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Docker Test Product",
    "description": "Created via Docker",
    "price": 99.99,
    "inventoryCount": 5,
    "category": "Test"
  }'
```

### **DynamoDB direkt testen**
```bash
# Tabellen auflisten
aws dynamodb list-tables \
  --endpoint-url http://localhost:4566 \
  --region eu-central-1

# Alle Items in Products Tabelle
aws dynamodb scan \
  --table-name Products \
  --endpoint-url http://localhost:4566 \
  --region eu-central-1
```

## **🔧 Entwicklung**

### **Logs anschauen**
```bash
# Alle Services
docker-compose logs -f

# Nur Product Service
docker-compose logs -f product-service

# Nur LocalStack
docker-compose logs -f localstack
```

### **Service neu bauen**
```bash
# Nach Code-Änderungen
docker-compose up product-service --build
```

### **Daten zurücksetzen**
```bash
# LocalStack Daten löschen
docker-compose down
rm -rf localstack-data
docker-compose up -d localstack

# DynamoDB neu initialisieren
./scripts/init-dynamodb.sh
```

## **🛠 Troubleshooting**

### **LocalStack startet nicht**
```bash
# Container Status prüfen
docker-compose ps

# LocalStack Logs prüfen
docker-compose logs localstack
```

### **Product Service kann nicht zu DynamoDB verbinden**
```bash
# LocalStack Health Check
curl http://localhost:4566/_localstack/health

# Netzwerk prüfen
docker network ls
docker network inspect high_availability_architecture_microservices-network
```

### **Port bereits belegt**
```bash
# Ports prüfen
netstat -tulpn | grep :8080
netstat -tulpn | grep :4566

# Services stoppen
docker-compose down
```

## **📁 Datei-Struktur**

```
.
├── docker-compose.yml              # Haupt-Compose Datei
├── localstack-data/               # LocalStack Persistenz (auto-erstellt)
├── scripts/
│   └── init-dynamodb.sh          # DynamoDB Setup Script
└── app/services/product_service/
    ├── Dockerfile                 # Product Service Image
    └── src/main/resources/
        └── application-docker.properties  # Docker Config
```

## **🔄 Für später: Weitere Services**

Diese Docker Compose Konfiguration ist vorbereitet für:
- **User Service** (Port 8081)
- **Order Service** (Port 8082) 
- **API Gateway** (Port 8090)
- **Message Queues** (SQS/SNS via LocalStack)

Einfach weitere Services in `docker-compose.yml` hinzufügen! 