# SNS/SQS Event-Driven Architecture

## 🎯 Überblick

Diese Dokumentation beschreibt die **Event-Driven Architektur** mit **AWS SNS (Simple Notification Service)** und **SQS (Simple Queue Service)**, die in unserem High Availability Microservices System implementiert ist.

## 🏗️ Architektur-Überblick

```
┌─────────────────┐    SNS Topics    ┌─────────────────┐    SQS Queues    ┌─────────────────┐
│   Microservice  │ ───────────────► │   Amazon SNS    │ ───────────────► │   Amazon SQS    │
│   (Publisher)   │                  │   Fan-out       │                  │   (Subscribers) │
└─────────────────┘                  └─────────────────┘                  └─────────────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │  Dead Letter    │
                                    │     Queue       │
                                    │   (Failed Msgs) │
                                    └─────────────────┘
```

### **Event Flow**

1. **Microservice** publiziert Events zu **SNS Topics**
2. **SNS** verteilt Events an alle **SQS Queues** (Fan-out Pattern)
3. **Consumer Services** verarbeiten Events aus ihren **SQS Queues**
4. **Failed Messages** werden an **Dead Letter Queues** weitergeleitet

## 🛠️ Service Integration

### **1. Product Service (Kotlin)**

**Publisher Implementation:**
```kotlin
@Service
class ProductEventPublisher(
    private val snsClient: SnsClient,
    @Value("\${aws.sns.product-topic-arn}") 
    private val topicArn: String
) {
    fun publishProductCreated(product: Product) {
        val event = ProductEvent(
            eventId = UUID.randomUUID().toString(),
            eventType = "PRODUCT_CREATED",
            productId = product.productId,
            timestamp = Instant.now(),
            data = mapOf(
                "name" to product.name,
                "price" to product.price.toString(),
                "category" to product.category.name
            )
        )
        
        publishEvent(event)
    }
    
    private fun publishEvent(event: ProductEvent) {
        val request = PublishRequest.builder()
            .topicArn(topicArn)
            .message(objectMapper.writeValueAsString(event))
            .messageAttributes(mapOf(
                "eventType" to MessageAttributeValue.builder()
                    .dataType("String")
                    .stringValue(event.eventType)
                    .build(),
                "productId" to MessageAttributeValue.builder()
                    .dataType("String") 
                    .stringValue(event.productId)
                    .build()
            ))
            .build()
            
        snsClient.publish(request)
    }
}
```

### **2. User Service (Java)**

**Event Types:**
- `USER_REGISTERED` - Neuer Benutzer erstellt
- `USER_UPDATED` - Benutzerdaten geändert
- `USER_ACTIVATED` - Benutzer aktiviert
- `USER_LOGIN_SUCCESS` - Erfolgreicher Login

### **3. Checkout Service (Go)**

**Publisher Implementation:**
```go
type CheckoutEventPublisher struct {
    snsClient *sns.SNS
    topicArn  string
}

func (p *CheckoutEventPublisher) PublishOrderCreated(order *Order) error {
    event := CheckoutEvent{
        EventID:   uuid.New().String(),
        EventType: "ORDER_CREATED",
        OrderID:   order.ID,
        Timestamp: time.Now(),
        Data: map[string]interface{}{
            "userID":      order.UserID,
            "totalAmount": order.TotalAmount,
            "items":       order.Items,
        },
    }
    
    eventJSON, _ := json.Marshal(event)
    
    _, err := p.snsClient.Publish(&sns.PublishInput{
        TopicArn: aws.String(p.topicArn),
        Message:  aws.String(string(eventJSON)),
        MessageAttributes: map[string]*sns.MessageAttributeValue{
            "eventType": {
                DataType:    aws.String("String"),
                StringValue: aws.String(event.EventType),
            },
        },
    })
    
    return err
}
```

## 📋 Event Schema Standards

### **Standard Event Format**

```json
{
  "eventId": "uuid-v4-string",
  "eventType": "EVENT_TYPE_NAME", 
  "resourceId": "resource-identifier",
  "timestamp": "2025-05-30T08:54:00.392Z",
  "data": {
    "field1": "value1",
    "field2": "value2",
    "metadata": {}
  }
}
```

### **Event Types by Service**

| Service | Event Types | Resource ID |
|---------|-------------|-------------|
| **Product** | `PRODUCT_CREATED`, `PRODUCT_UPDATED`, `PRODUCT_DELETED`, `PRODUCT_INVENTORY_LOW` | `productId` |
| **User** | `USER_REGISTERED`, `USER_UPDATED`, `USER_ACTIVATED`, `USER_LOGIN_SUCCESS` | `userId` |
| **Checkout** | `ORDER_CREATED`, `ORDER_UPDATED`, `ORDER_CANCELLED`, `PAYMENT_PROCESSED` | `orderId` |

### **Message Attributes**

Jedes SNS Event enthält folgende **Message Attributes** für Filtering:

```json
{
  "eventType": {
    "Type": "String",
    "Value": "PRODUCT_CREATED"
  },
  "resourceId": {
    "Type": "String", 
    "Value": "product-uuid"
  },
  "eventId": {
    "Type": "String",
    "Value": "event-uuid"
  }
}
```

## ⚙️ Konfiguration

### **Docker Compose Environment**

```yaml
# Product Service
environment:
  - AWS_SNS_ENDPOINT=http://localstack:4566
  - AWS_REGION=eu-central-1
  - EVENTS_PRODUCT_ENABLED=true
  - LOGGING_LEVEL_COM_PRODUCT_EVENT=DEBUG

# User Service  
environment:
  - AWS_SNS_ENDPOINT=http://localstack:4566
  - EVENTS_USER_ENABLED=true
  - USER_EVENTS_TOPIC_ARN=arn:aws:sns:eu-central-1:000000000000:user-events

# Checkout Service
environment:
  - AWS_ENDPOINT=http://localstack:4566
  - SNS_TOPIC_ARN=arn:aws:sns:eu-central-1:000000000000:checkout-events
  - EVENTS_ENABLED=true
```

### **LocalStack Setup**

```bash
# Automatisches Setup
./scripts/setup-localstack.sh

# Erstellt automatisch:
# - 3 SNS Topics (user-events, product-events, checkout-events)
# - 6 SQS Queues (3 regular + 3 DLQ)
# - SNS-SQS Subscriptions
# - DynamoDB Tables
```

### **Production AWS Setup**

```bash
# Environment Variables für Production
export AWS_REGION=eu-central-1
export PRODUCT_EVENTS_TOPIC_ARN=arn:aws:sns:eu-central-1:123456789012:product-events
export USER_EVENTS_TOPIC_ARN=arn:aws:sns:eu-central-1:123456789012:user-events
export CHECKOUT_EVENTS_TOPIC_ARN=arn:aws:sns:eu-central-1:123456789012:checkout-events
```

## 🧪 Testing Guide

### **1. Quick Integration Test**

```bash
# 1. Services starten
docker-compose up -d localstack product-service

# 2. LocalStack Setup ausführen
./scripts/setup-localstack.sh

# 3. Test Event publizieren
curl -X POST "http://localhost:8080/api/v1/products" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "description": "Testing SNS events",
    "price": 99.99,
    "inventoryCount": 5,
    "category": "ELECTRONICS"
  }'

# 4. Logs prüfen
docker logs product-service --tail=10

# 5. SQS Messages prüfen
docker exec localstack-main awslocal sqs receive-message \
  --queue-url "http://sqs.eu-central-1.localhost.localstack.cloud:4566/000000000000/product-events-queue"
```

### **2. Event Flow Verification**

```bash
# SNS Topics auflisten
docker exec localstack-main awslocal sns list-topics

# SQS Queues auflisten
docker exec localstack-main awslocal sqs list-queues

# Specific Queue Attributes
docker exec localstack-main awslocal sqs get-queue-attributes \
  --queue-url "http://sqs.eu-central-1.localhost.localstack.cloud:4566/000000000000/product-events-queue" \
  --attribute-names All
```

### **3. End-to-End Test Scenarios**

#### **Product Events Test**
```bash
# Create Product → Should trigger PRODUCT_CREATED + PRODUCT_INVENTORY_LOW
curl -X POST "http://localhost:8080/api/v1/products" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Low Stock Item",
    "description": "Testing inventory events", 
    "price": 149.99,
    "inventoryCount": 8,
    "category": "TEST"
  }'

# Expected: 2 events in queue
docker exec localstack-main awslocal sqs receive-message \
  --queue-url "http://sqs.eu-central-1.localhost.localstack.cloud:4566/000000000000/product-events-queue" \
  --max-number-of-messages 5
```

#### **User Events Test**
```bash
# Register User → Should trigger USER_REGISTERED  
curl -X POST "http://localhost:8081/api/v1/users/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'

# Check user events queue
docker exec localstack-main awslocal sqs receive-message \
  --queue-url "http://sqs.eu-central-1.localhost.localstack.cloud:4566/000000000000/user-events-queue"
```

### **4. Performance Testing**

```bash
# Load Test mit mehreren Events
for i in {1..10}; do
  curl -X POST "http://localhost:8080/api/v1/products" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"Bulk Product $i\",
      \"description\": \"Performance test item\",
      \"price\": 99.99,
      \"inventoryCount\": 15,
      \"category\": \"PERFORMANCE_TEST\"
    }" &
done
wait

# Queue Message Count prüfen
docker exec localstack-main awslocal sqs get-queue-attributes \
  --queue-url "http://sqs.eu-central-1.localhost.localstack.cloud:4566/000000000000/product-events-queue" \
  --attribute-names ApproximateNumberOfMessages
```

## 🔧 Error Handling & Retry Logic

### **Retry Configuration**

```properties
# Product Service (application-docker.properties)
events.product.enabled=true
events.retry.max-attempts=3
events.retry.delay-ms=1000

# User Service
events.user.enabled=true  
events.retry.max-attempts=3
events.retry.delay-ms=1000

# Checkout Service (Environment)
EVENTS_ENABLED=true
RETRY_MAX_ATTEMPTS=3
RETRY_DELAY_MS=1000
```

### **Error Handling Patterns**

1. **Exponential Backoff**: 1s → 2s → 4s delays
2. **Circuit Breaker**: Service continues without events after failures
3. **Dead Letter Queues**: Failed messages for manual inspection
4. **Graceful Degradation**: Core functionality unaffected by event failures

### **Monitoring Failed Events**

```bash
# Check Dead Letter Queue
docker exec localstack-main awslocal sqs receive-message \
  --queue-url "http://sqs.eu-central-1.localhost.localstack.cloud:4566/000000000000/product-events-dlq"

# Monitor queue depths
docker exec localstack-main awslocal sqs get-queue-attributes \
  --queue-url "http://sqs.eu-central-1.localhost.localstack.cloud:4566/000000000000/product-events-dlq" \
  --attribute-names ApproximateNumberOfMessages
```

## 🚨 Troubleshooting

### **Common Issues**

#### **1. Events nicht sichtbar in Logs**
```bash
# Check environment variables
docker exec product-service env | grep EVENTS
docker exec product-service env | grep SNS

# Verify logging level
docker logs product-service | grep "ProductEventPublisher"

# Expected: INFO level messages with messageId
```

#### **2. SNS/SQS Resources nicht gefunden**
```bash
# Re-run setup script
./scripts/setup-localstack.sh

# Verify LocalStack health
curl http://localhost:4566/_localstack/health

# Check LocalStack logs
docker logs localstack-main --tail=50
```

#### **3. Container Connectivity Issues**
```bash
# Test internal networking
docker exec product-service curl -f http://localstack:4566/_localstack/health

# Check DNS resolution
docker exec product-service nslookup localstack
```

#### **4. Message Delivery Failures**
```bash
# Check DLQ for failed messages
docker exec localstack-main awslocal sqs receive-message \
  --queue-url "http://sqs.eu-central-1.localhost.localstack.cloud:4566/000000000000/product-events-dlq"

# Verify subscriptions
docker exec localstack-main awslocal sns list-subscriptions-by-topic \
  --topic-arn "arn:aws:sns:eu-central-1:000000000000:product-events"
```

### **Debug Commands**

```bash
# Full system health check
docker-compose ps
docker exec localstack-main awslocal sns list-topics
docker exec localstack-main awslocal sqs list-queues

# Service-specific debugging
docker logs product-service --tail=20
docker logs user-service --tail=20  
docker logs checkout-service --tail=20

# LocalStack resource inspection
docker exec localstack-main awslocal sns get-topic-attributes \
  --topic-arn "arn:aws:sns:eu-central-1:000000000000:product-events"
```

## 📊 Monitoring & Metrics

### **Log Patterns to Monitor**

```bash
# Successful Event Publishing (Product Service)
# Expected: "Published event PRODUCT_CREATED for product {id} with messageId: {messageId}"

# Retry Attempts  
# Expected: "Retrying event publication, attempt 2/3"

# Circuit Breaker Activation
# Expected: "Event publishing disabled due to consecutive failures"
```

### **Key Metrics**

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| **Events Published/min** | Rate of successful event publishing | < 50% of expected |
| **Retry Rate** | Percentage of events requiring retries | > 10% |
| **DLQ Message Count** | Failed events in dead letter queues | > 0 |
| **Queue Depth** | Messages waiting in SQS queues | > 1000 |

### **Health Check Endpoints**

```bash
# Service Health
curl http://localhost:8080/actuator/health  # Product Service
curl http://localhost:8081/actuator/health  # User Service
curl http://localhost:8082/health           # Checkout Service

# LocalStack Health  
curl http://localhost:4566/_localstack/health
```

## 🔐 Security Considerations

### **LocalStack (Development)**
- Uses dummy credentials (`test/test`)
- No network isolation required
- Debug logging safe to enable

### **Production AWS**
- Use **IAM Roles** for EC2/ECS instances
- **Least privilege** principle for SNS/SQS permissions
- **VPC Endpoints** for private subnet communication
- **Encryption at rest** and **in transit**

### **Required IAM Permissions**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish"
      ],
      "Resource": [
        "arn:aws:sns:*:*:product-events",
        "arn:aws:sns:*:*:user-events", 
        "arn:aws:sns:*:*:checkout-events"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage"
      ],
      "Resource": [
        "arn:aws:sqs:*:*:*-events-queue",
        "arn:aws:sqs:*:*:*-events-dlq"
      ]
    }
  ]
}
```

## 🔄 Evolution & Best Practices

### **Event Versioning**
- Include `eventVersion` field for backward compatibility
- Use semantic versioning (`v1.0`, `v1.1`, `v2.0`)
- Maintain multiple event consumers during transitions

### **Schema Evolution**
- **Additive changes**: Safe (new optional fields)
- **Breaking changes**: Require version bumps
- **Deprecation strategy**: 6-month support for old versions

### **Performance Optimization**
- **Batch publishing**: Group related events
- **Message deduplication**: Use idempotency keys
- **Resource tagging**: For cost allocation and monitoring
- **Queue partitioning**: For high-throughput scenarios

---

## 📚 Related Documentation

- [EVENT_DRIVEN_SETUP.md](EVENT_DRIVEN_SETUP.md) - Detailed setup guide
- [API.md](API.md) - Service API documentation
- [DEVELOPMENT.md](DEVELOPMENT.md) - Development workflows
- Service-specific READMEs in each service directory 