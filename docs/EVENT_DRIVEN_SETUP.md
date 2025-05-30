# Event-driven Architecture Setup

## 🎯 Überblick

Das User Service wurde für eine **event-driven Architektur** mit **AWS SNS/SQS** erweitert und unterstützt sowohl **LocalStack** (development) als auch **AWS** (production).

## 🏗️ Architektur

```
User Service --> SNS Topic (user-events) --> SQS Queue --> Other Services
              └─> Product Service
              └─> Checkout Service  
              └─> Email Service (future)
```

## 🚀 Quick Start

### 1. **LocalStack Setup (Development)**

```bash
# 1. Container starten
docker-compose up -d localstack

# 2. LocalStack initialisieren  
./scripts/setup-localstack.sh

# 3. User Service starten (mit Docker-Profil)
cd app/services/user_service
./gradlew bootRun --args='--spring.profiles.active=docker'
```

### 2. **Production Setup (AWS)**

```bash
# 1. Environment-Variablen setzen
export SPRING_PROFILES_ACTIVE=prod
export AWS_REGION=eu-central-1
export USER_EVENTS_TOPIC_ARN=arn:aws:sns:eu-central-1:123456789012:user-events
export JWT_SECRET=your-production-secret

# 2. Service starten
./gradlew bootRun
```

## 📋 Profile-Konfiguration

### **Local Profile** (`application-local.properties`)
- **LocalStack Endpoints**: `http://localhost:4566`
- **Test Credentials**: `test/test`
- **Debug Logging**: Aktiviert
- **Topic ARN**: `arn:aws:sns:eu-central-1:000000000000:user-events`

### **Docker Profile** (`application-docker.properties`)  
- **LocalStack Endpoints**: `http://localstack:4566` (Docker-intern)
- **Container-optimiert**: Graceful shutdown
- **Test Credentials**: `test/test`

### **Production Profile** (`application-prod.properties`)
- **AWS Endpoints**: Standard AWS
- **IAM Roles**: Verwendet EC2/ECS Roles
- **Environment Variables**: Für sensible Daten
- **INFO Logging**: Optimiert für Production

## 🎯 Event Types

Der **UserEventPublisher** publiziert folgende Events:

| Event Type | Beschreibung | Trigger |
|------------|-------------|---------|
| `USER_REGISTERED` | Neuer User erstellt | `POST /api/v1/users/register` |
| `USER_UPDATED` | User-Daten geändert | `PUT /api/v1/users/{id}` |
| `USER_ACTIVATED` | User aktiviert | `POST /api/v1/users/{id}/activate` |
| `USER_DEACTIVATED` | User deaktiviert | `POST /api/v1/users/{id}/deactivate` |
| `USER_DELETED` | User gelöscht | `DELETE /api/v1/users/{id}` |
| `USER_LOGIN_SUCCESS` | Erfolgreicher Login | `POST /api/v1/users/login` |
| `USER_LOGIN_FAILED` | Fehlgeschlagener Login | `POST /api/v1/users/login` |

## 🔧 Event Message Format

```json
{
  "eventId": "uuid-here",
  "eventType": "USER_REGISTERED", 
  "userId": "user-123",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "email": "user@example.com",
    "username": "john_doe",
    "firstName": "John",
    "lastName": "Doe",
    "role": "USER",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### **SNS Message Attributes**
- `eventType`: Event-Typ für Filtering
- `userId`: User-ID für Routing  
- `eventId`: Eindeutige Event-ID

## 🧪 Testing

### **1. Event Publishing testen**

```bash
# User registrieren (triggert USER_REGISTERED event)
curl -X POST http://localhost:8081/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'

# Event in SQS Queue prüfen
aws --endpoint-url=http://localhost:4566 sqs receive-message \
  --queue-url http://localhost:4566/000000000000/user-events-queue
```

### **2. LocalStack Resources prüfen**

```bash
# SNS Topics auflisten
aws --endpoint-url=http://localhost:4566 sns list-topics

# SQS Queues auflisten  
aws --endpoint-url=http://localhost:4566 sqs list-queues

# Message Attribute prüfen
aws --endpoint-url=http://localhost:4566 sqs get-queue-attributes \
  --queue-url http://localhost:4566/000000000000/user-events-queue \
  --attribute-names All
```

## ⚡ Retry & Error Handling

### **Retry-Konfiguration**
```properties
events.retry.max-attempts=3      # Max. Wiederholungen
events.retry.delay-ms=1000       # Delay zwischen Versuchen (exponential backoff)
```

### **Error Handling**
- **Retry Logic**: Exponential backoff (1s, 2s, 4s)
- **Dead Letter Queue**: Für failed messages
- **Conditional Publishing**: `events.user.enabled=true/false`
- **Graceful Degradation**: Service funktioniert ohne Events

## 🔐 AWS Production Setup

### **1. IAM Role für EC2/ECS**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem", 
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:sns:eu-central-1:*:user-events",
        "arn:aws:dynamodb:eu-central-1:*:table/users*"
      ]
    }
  ]
}
```

### **2. Environment Variables**

```bash
# Required for production
export SPRING_PROFILES_ACTIVE=prod
export AWS_REGION=eu-central-1
export USER_EVENTS_TOPIC_ARN=arn:aws:sns:eu-central-1:123456789012:user-events
export JWT_SECRET=your-strong-production-secret

# Optional overrides
export EVENTS_ENABLED=true
export EVENTS_RETRY_ATTEMPTS=5
export JWT_EXPIRATION=3600000
```

## 📊 Monitoring

### **1. CloudWatch Metrics**
- SNS: `NumberOfMessagesPublished`, `NumberOfNotificationsFailed`
- SQS: `NumberOfMessagesSent`, `ApproximateNumberOfMessages`
- DynamoDB: `ConsumedReadCapacityUnits`, `ConsumedWriteCapacityUnits`

### **2. Application Metrics** 
```bash
# Prometheus metrics verfügbar
curl http://localhost:8081/actuator/prometheus | grep sns
curl http://localhost:8081/actuator/prometheus | grep user_events
```

### **3. Logs**
```bash
# Event publishing logs
docker-compose logs user-service | grep "Published event"

# Error logs  
docker-compose logs user-service | grep "Failed to publish"
```

## 🔧 Troubleshooting

### **Common Issues**

| Problem | Lösung |
|---------|--------|
| SNS Topic nicht gefunden | `./scripts/setup-localstack.sh` ausführen |
| Connection refused (4566) | LocalStack Container prüfen: `docker-compose ps` |
| AWS credentials error | Profile-Konfiguration prüfen |
| Events nicht publiziert | `events.user.enabled=true` prüfen |

### **Debug Commands**

```bash
# LocalStack health check
curl http://localhost:4566/_localstack/health

# SNS topic messages
aws --endpoint-url=http://localhost:4566 logs describe-log-streams \
  --log-group-name /aws/sns/eu-central-1/000000000000/user-events

# Service health  
curl http://localhost:8081/actuator/health
```

## 🚀 Next Steps

1. **Product Service erweitern** mit Event consumption
2. **Email Service** für Notifications hinzufügen  
3. **Event Sourcing** für Audit Trail implementieren
4. **Saga Pattern** für distributed transactions
5. **CloudWatch Alarms** für monitoring einrichten

## 📚 References

- [AWS SNS Documentation](https://docs.aws.amazon.com/sns/)
- [AWS SQS Documentation](https://docs.aws.amazon.com/sqs/)
- [LocalStack Documentation](https://docs.localstack.cloud/)
- [Spring Cloud AWS](https://docs.awspring.io/spring-cloud-aws/docs/current/reference/html/) 