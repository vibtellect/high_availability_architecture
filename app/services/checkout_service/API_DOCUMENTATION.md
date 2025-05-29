# Checkout Service API Documentation

The Checkout Service is a Go-based microservice that handles shopping cart management and order processing for the high availability architecture project.

## Base URL
- Local Development: `http://localhost:8082`
- Production: `https://api.yourdomain.com` (when deployed)

## Service Information

### Technology Stack
- **Language**: Go 1.21+
- **Framework**: Gin Web Framework
- **Database**: DynamoDB (via AWS SDK v2)
- **Architecture**: Clean Architecture with Repository Pattern
- **Deployment**: Docker + LocalStack (development), AWS (production)

### Service Dependencies
- **Product Service**: For product validation and inventory checks
- **User Service**: For user validation (future enhancement)
- **DynamoDB**: For data persistence
- **SNS/SQS**: For event publishing (future enhancement)

## Health Check Endpoints

### Check Service Health
**GET** `/health`

Returns the health status of the checkout service and its dependencies.

**Response:**
```json
{
  "status": "healthy",
  "service": "checkout-service",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00Z",
  "checks": {
    "database": true
  }
}
```

**Status Codes:**
- `200`: Service is healthy
- `503`: Service is degraded (database connectivity issues)

### Hello World
**GET** `/`

Basic service information endpoint.

**Response:**
```json
{
  "message": "Hello World from Checkout Service!",
  "service": "checkout-service",
  "tech": "Go 1.21 + Gin Framework",
  "status": "running"
}
```

## Cart Management API

### Get User Cart
**GET** `/api/v1/checkout/cart/{userId}`

Retrieves the shopping cart for a specific user.

**Parameters:**
- `userId` (path): User ID

**Response:**
```json
{
  "userId": "user123",
  "items": [
    {
      "productId": "prod456",
      "productName": "Example Product",
      "price": 29.99,
      "quantity": 2,
      "category": "electronics"
    }
  ],
  "total": 59.98,
  "createdAt": "2024-01-15T09:00:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### Add Item to Cart
**POST** `/api/v1/checkout/cart`

Adds an item to the user's shopping cart.

**Request Body:**
```json
{
  "userId": "user123",
  "productId": "prod456",
  "quantity": 1
}
```

**Response:**
```json
{
  "userId": "user123",
  "items": [
    {
      "productId": "prod456",
      "productName": "Example Product",
      "price": 29.99,
      "quantity": 1,
      "category": "electronics"
    }
  ],
  "total": 29.99,
  "createdAt": "2024-01-15T09:00:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Status Codes:**
- `200`: Item added successfully
- `400`: Invalid request format
- `500`: Server error (product not found, insufficient inventory, etc.)

### Update Cart Item Quantity
**PUT** `/api/v1/checkout/cart/{userId}`

Updates the quantity of a specific item in the cart.

**Parameters:**
- `userId` (path): User ID

**Request Body:**
```json
{
  "productId": "prod456",
  "quantity": 3
}
```

**Response:**
```json
{
  "userId": "user123",
  "items": [
    {
      "productId": "prod456",
      "productName": "Example Product",
      "price": 29.99,
      "quantity": 3,
      "category": "electronics"
    }
  ],
  "total": 89.97,
  "createdAt": "2024-01-15T09:00:00Z",
  "updatedAt": "2024-01-15T10:35:00Z"
}
```

### Remove Item from Cart
**DELETE** `/api/v1/checkout/cart/{userId}/item/{productId}`

Removes a specific item from the user's cart.

**Parameters:**
- `userId` (path): User ID
- `productId` (path): Product ID to remove

**Response:**
```json
{
  "userId": "user123",
  "items": [],
  "total": 0,
  "createdAt": "2024-01-15T09:00:00Z",
  "updatedAt": "2024-01-15T10:40:00Z"
}
```

### Clear Cart
**DELETE** `/api/v1/checkout/cart/{userId}`

Removes all items from the user's cart.

**Parameters:**
- `userId` (path): User ID

**Response:**
```json
{
  "message": "Cart cleared successfully",
  "userId": "user123"
}
```

### Get Checkout Summary
**GET** `/api/v1/checkout/summary/{userId}`

Calculates checkout summary with taxes and shipping.

**Parameters:**
- `userId` (path): User ID

**Response:**
```json
{
  "userId": "user123",
  "items": [
    {
      "productId": "prod456",
      "productName": "Example Product",
      "price": 29.99,
      "quantity": 2,
      "category": "electronics"
    }
  ],
  "subtotal": 59.98,
  "tax": 4.80,
  "shipping": 5.99,
  "total": 70.77,
  "createdAt": "2024-01-15T09:00:00Z"
}
```

## Order Management API

### Create Order
**POST** `/api/v1/checkout/order`

Creates a new order from the user's cart contents.

**Request Body:**
```json
{
  "userId": "user123",
  "paymentMethod": "credit_card"
}
```

**Response:**
```json
{
  "orderId": "order-uuid-here",
  "userId": "user123",
  "items": [
    {
      "productId": "prod456",
      "productName": "Example Product",
      "price": 29.99,
      "quantity": 2,
      "category": "electronics",
      "subtotal": 59.98
    }
  ],
  "totalAmount": 59.98,
  "status": "pending",
  "paymentStatus": "pending",
  "paymentMethod": "credit_card",
  "createdAt": "2024-01-15T10:45:00Z",
  "updatedAt": "2024-01-15T10:45:00Z"
}
```

**Status Codes:**
- `201`: Order created successfully
- `400`: Invalid request or empty cart
- `500`: Server error

### Get Order by ID
**GET** `/api/v1/checkout/order/{orderId}`

Retrieves a specific order by its ID.

**Parameters:**
- `orderId` (path): Order ID

**Response:**
```json
{
  "orderId": "order-uuid-here",
  "userId": "user123",
  "items": [
    {
      "productId": "prod456",
      "productName": "Example Product",
      "price": 29.99,
      "quantity": 2,
      "category": "electronics",
      "subtotal": 59.98
    }
  ],
  "totalAmount": 59.98,
  "status": "confirmed",
  "paymentStatus": "completed",
  "paymentMethod": "credit_card",
  "createdAt": "2024-01-15T10:45:00Z",
  "updatedAt": "2024-01-15T10:50:00Z"
}
```

**Status Codes:**
- `200`: Order found
- `404`: Order not found
- `500`: Server error

### Get Orders by User
**GET** `/api/v1/checkout/orders/user/{userId}`

Retrieves all orders for a specific user.

**Parameters:**
- `userId` (path): User ID

**Response:**
```json
{
  "orders": [
    {
      "orderId": "order-uuid-here",
      "userId": "user123",
      "items": [...],
      "totalAmount": 59.98,
      "status": "delivered",
      "paymentStatus": "completed",
      "paymentMethod": "credit_card",
      "createdAt": "2024-01-15T10:45:00Z",
      "updatedAt": "2024-01-16T14:30:00Z"
    }
  ],
  "count": 1
}
```

### Update Order Status
**PUT** `/api/v1/checkout/order/{orderId}/status`

Updates the status of an existing order.

**Parameters:**
- `orderId` (path): Order ID

**Request Body:**
```json
{
  "status": "shipped"
}
```

**Valid Status Values:**
- `pending` → `confirmed`, `cancelled`
- `confirmed` → `processing`, `cancelled`
- `processing` → `shipped`, `cancelled`
- `shipped` → `delivered`
- `delivered` (final state)
- `cancelled` (final state)

**Response:**
```json
{
  "orderId": "order-uuid-here",
  "userId": "user123",
  "items": [...],
  "totalAmount": 59.98,
  "status": "shipped",
  "paymentStatus": "completed",
  "paymentMethod": "credit_card",
  "createdAt": "2024-01-15T10:45:00Z",
  "updatedAt": "2024-01-16T08:30:00Z"
}
```

### Cancel Order
**POST** `/api/v1/checkout/order/{orderId}/cancel`

Cancels an order if it's in a cancellable state.

**Parameters:**
- `orderId` (path): Order ID

**Response:**
```json
{
  "orderId": "order-uuid-here",
  "userId": "user123",
  "items": [...],
  "totalAmount": 59.98,
  "status": "cancelled",
  "paymentStatus": "pending",
  "paymentMethod": "credit_card",
  "createdAt": "2024-01-15T10:45:00Z",
  "updatedAt": "2024-01-15T11:00:00Z"
}
```

**Cancellable States:**
- `pending`
- `confirmed`
- `processing`

**Status Codes:**
- `200`: Order cancelled successfully
- `400`: Order cannot be cancelled in current state
- `404`: Order not found
- `500`: Server error

### Process Payment
**POST** `/api/v1/checkout/order/{orderId}/payment`

Processes payment for an order (mock implementation).

**Parameters:**
- `orderId` (path): Order ID

**Response:**
```json
{
  "orderId": "order-uuid-here",
  "userId": "user123",
  "items": [...],
  "totalAmount": 59.98,
  "status": "confirmed",
  "paymentStatus": "completed",
  "paymentMethod": "credit_card",
  "createdAt": "2024-01-15T10:45:00Z",
  "updatedAt": "2024-01-15T10:47:00Z"
}
```

**Status Codes:**
- `200`: Payment processed successfully
- `400`: Payment already processed
- `404`: Order not found
- `500`: Payment processing failed

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

Or with additional details:

```json
{
  "error": "Invalid request format",
  "details": "Validation error details"
}
```

## Environment Variables

- `PORT`: Server port (default: 8082)
- `GIN_MODE`: Gin mode (debug, release)
- `AWS_REGION`: AWS region (default: eu-central-1)
- `AWS_DYNAMODB_ENDPOINT`: DynamoDB endpoint (for LocalStack)
- `PRODUCT_SERVICE_URL`: Product service base URL (default: http://localhost:8080)

## Data Models

### Cart
```go
type Cart struct {
    UserID    string     `json:"userId"`
    Items     []CartItem `json:"items"`
    Total     float64    `json:"total"`
    CreatedAt time.Time  `json:"createdAt"`
    UpdatedAt time.Time  `json:"updatedAt"`
}
```

### CartItem
```go
type CartItem struct {
    ProductID   string  `json:"productId"`
    ProductName string  `json:"productName"`
    Price       float64 `json:"price"`
    Quantity    int     `json:"quantity"`
    Category    string  `json:"category"`
}
```

### Order
```go
type Order struct {
    OrderID       string        `json:"orderId"`
    UserID        string        `json:"userId"`
    Items         []OrderItem   `json:"items"`
    TotalAmount   float64       `json:"totalAmount"`
    Status        OrderStatus   `json:"status"`
    PaymentStatus PaymentStatus `json:"paymentStatus"`
    PaymentMethod string        `json:"paymentMethod"`
    CreatedAt     time.Time     `json:"createdAt"`
    UpdatedAt     time.Time     `json:"updatedAt"`
}
```

### OrderItem
```go
type OrderItem struct {
    ProductID   string  `json:"productId"`
    ProductName string  `json:"productName"`
    Price       float64 `json:"price"`
    Quantity    int     `json:"quantity"`
    Category    string  `json:"category"`
    Subtotal    float64 `json:"subtotal"`
}
```

## Future Enhancements

1. **Event-Driven Architecture**: Integration with SNS/SQS for order events
2. **User Validation**: Integration with User Service for user validation
3. **Inventory Management**: Real-time inventory updates
4. **Payment Gateway**: Integration with real payment processors
5. **Analytics**: Order and cart analytics events
6. **Caching**: Redis integration for cart caching
7. **Rate Limiting**: API rate limiting implementation
8. **Authentication**: JWT-based authentication
9. **Webhooks**: Order status change webhooks
10. **Metrics**: Prometheus metrics collection 