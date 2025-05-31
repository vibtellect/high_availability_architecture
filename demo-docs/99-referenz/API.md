# API Documentation

Complete API reference for all microservices.

## 🌐 API Gateway

All APIs are accessible through the NGINX gateway at **http://localhost/**

## 🛍️ Product Service API

Base URL: `http://localhost/api/v1/products` or direct `http://localhost:8080/api/v1/products`

### Endpoints

#### Get All Products
```bash
GET /api/v1/products
curl http://localhost/api/v1/products
```

#### Get Product by ID
```bash
GET /api/v1/products/{id}
curl http://localhost/api/v1/products/test-product-1
```

#### Create Product
```bash
POST /api/v1/products
curl -X POST http://localhost/api/v1/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Laptop",
    "description": "High-performance laptop",
    "price": 1299.99,
    "inventoryCount": 10,
    "category": "Electronics"
  }'
```

#### Update Product
```bash
PUT /api/v1/products/{id}
curl -X PUT http://localhost/api/v1/products/{id} \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Product",
    "price": 999.99
  }'
```

#### Delete Product
```bash
DELETE /api/v1/products/{id}
curl -X DELETE http://localhost/api/v1/products/{id}
```

## 👤 User Service API

Base URL: `http://localhost/api/v1/auth` or direct `http://localhost:8081/api/v1/auth`

### Authentication Endpoints (Public)

#### Register User
```bash
POST /api/v1/auth/register
curl -X POST http://localhost/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

#### Login User
```bash
POST /api/v1/auth/login
curl -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "usernameOrEmail": "testuser",
    "password": "password123"
  }'
```

#### Get Current User
```bash
GET /api/v1/auth/me
curl -H "Authorization: Bearer {JWT_TOKEN}" \
  http://localhost/api/v1/auth/me
```

#### Validate Token
```bash
POST /api/v1/auth/validate
curl -X POST http://localhost/api/v1/auth/validate \
  -H "Authorization: Bearer {JWT_TOKEN}"
```

### User Management Endpoints (Protected)

#### Get All Users
```bash
GET /api/v1/users
curl -H "Authorization: Bearer {JWT_TOKEN}" \
  http://localhost/api/v1/users
```

#### Get User by ID
```bash
GET /api/v1/users/{userId}
curl -H "Authorization: Bearer {JWT_TOKEN}" \
  http://localhost/api/v1/users/{userId}
```

#### Update User
```bash
PUT /api/v1/users/{userId}
curl -X PUT http://localhost/api/v1/users/{userId} \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Updated",
    "lastName": "Name"
  }'
```

## 🛒 Checkout Service API

Base URL: `http://localhost/api/v1/checkout` or direct `http://localhost:8082/api/v1/checkout`

### Cart Management

#### Get Cart
```bash
GET /api/v1/checkout/cart/{userId}
curl http://localhost/api/v1/checkout/cart/user123
```

#### Add to Cart
```bash
POST /api/v1/checkout/cart
curl -X POST http://localhost/api/v1/checkout/cart \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "productId": "product456",
    "quantity": 2
  }'
```

#### Update Cart Item
```bash
PUT /api/v1/checkout/cart
curl -X PUT http://localhost/api/v1/checkout/cart \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "productId": "product456",
    "quantity": 5
  }'
```

#### Remove from Cart
```bash
DELETE /api/v1/checkout/cart/{userId}/item/{productId}
curl -X DELETE http://localhost/api/v1/checkout/cart/user123/item/product456
```

#### Clear Cart
```bash
DELETE /api/v1/checkout/cart/{userId}
curl -X DELETE http://localhost/api/v1/checkout/cart/user123
```

### Order Management

#### Create Order
```bash
POST /api/v1/checkout/order
curl -X POST http://localhost/api/v1/checkout/order \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "paymentMethod": "credit_card"
  }'
```

#### Get Order
```bash
GET /api/v1/checkout/order/{orderId}
curl http://localhost/api/v1/checkout/order/order123
```

#### Get Orders by User
```bash
GET /api/v1/checkout/orders/user/{userId}
curl http://localhost/api/v1/checkout/orders/user/user123
```

#### Update Order Status
```bash
PUT /api/v1/checkout/order/{orderId}/status
curl -X PUT http://localhost/api/v1/checkout/order/order123/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "confirmed"
  }'
```

#### Cancel Order
```bash
POST /api/v1/checkout/order/{orderId}/cancel
curl -X POST http://localhost/api/v1/checkout/order/order123/cancel
```

#### Process Payment
```bash
POST /api/v1/checkout/order/{orderId}/payment
curl -X POST http://localhost/api/v1/checkout/order/order123/payment
```

## 🔒 Authentication

### JWT Token Usage
Include JWT token in Authorization header for protected endpoints:
```bash
Authorization: Bearer {JWT_TOKEN}
```

### Token Structure
JWT tokens contain:
- `sub`: User ID
- `iat`: Issued at timestamp
- `exp`: Expiration timestamp
- `roles`: User roles

## 📊 Health Checks

### Service Health
```bash
# API Gateway health
curl http://localhost/health

# Individual service health
curl http://localhost:8080/actuator/health  # Product Service
curl http://localhost:8081/actuator/health  # User Service
curl http://localhost:8082/health           # Checkout Service
```

### System Status
```bash
# Check all services
docker-compose ps

# Service logs
docker-compose logs -f service-name
```

## 🚨 Error Responses

All services return consistent error responses:

```json
{
  "error": "Error description",
  "message": "Detailed error message",
  "timestamp": "2024-01-15T10:30:00Z",
  "path": "/api/v1/endpoint"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## 📝 Rate Limiting

Currently no rate limiting is implemented. Consider implementing for production use.

## 🔧 CORS Configuration

CORS is configured to allow:
- All origins in development
- Specific origins in production
- All standard HTTP methods
- Authorization headers 