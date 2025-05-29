package db

import (
	"context"
	"time"

	"checkout_service/internal/models"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
)

const OrderTableName = "Orders"

type OrderRepository struct {
	client *DynamoDBClient
	logger *logrus.Logger
}

// NewOrderRepository creates a new order repository
func NewOrderRepository(client *DynamoDBClient, logger *logrus.Logger) *OrderRepository {
	return &OrderRepository{
		client: client,
		logger: logger,
	}
}

// CreateOrder creates a new order
func (r *OrderRepository) CreateOrder(ctx context.Context, order *models.Order) error {
	// Generate order ID if not provided
	if order.OrderID == "" {
		order.OrderID = uuid.New().String()
	}

	// Set timestamps
	order.CreatedAt = time.Now()
	order.UpdatedAt = time.Now()

	// Set default status if not provided
	if order.Status == "" {
		order.Status = models.OrderStatusPending
	}
	if order.PaymentStatus == "" {
		order.PaymentStatus = models.PaymentStatusPending
	}

	// Calculate total amount
	order.TotalAmount = 0
	for i := range order.Items {
		order.Items[i].Subtotal = order.Items[i].Price * float64(order.Items[i].Quantity)
		order.TotalAmount += order.Items[i].Subtotal
	}

	item, err := attributevalue.MarshalMap(order)
	if err != nil {
		r.logger.WithError(err).WithField("orderId", order.OrderID).Error("Failed to marshal order")
		return err
	}

	input := &dynamodb.PutItemInput{
		TableName: aws.String(OrderTableName),
		Item:      item,
	}

	_, err = r.client.Client.PutItem(ctx, input)
	if err != nil {
		r.logger.WithError(err).WithField("orderId", order.OrderID).Error("Failed to create order in DynamoDB")
		return err
	}

	r.logger.WithFields(logrus.Fields{
		"orderId":     order.OrderID,
		"userId":      order.UserID,
		"totalAmount": order.TotalAmount,
		"status":      order.Status,
	}).Info("Order created successfully")

	return nil
}

// GetOrder retrieves an order by order ID
func (r *OrderRepository) GetOrder(ctx context.Context, orderID string) (*models.Order, error) {
	input := &dynamodb.GetItemInput{
		TableName: aws.String(OrderTableName),
		Key: map[string]types.AttributeValue{
			"orderId": &types.AttributeValueMemberS{Value: orderID},
		},
	}

	result, err := r.client.Client.GetItem(ctx, input)
	if err != nil {
		r.logger.WithError(err).WithField("orderId", orderID).Error("Failed to get order from DynamoDB")
		return nil, err
	}

	if result.Item == nil {
		return nil, nil // Order not found
	}

	var order models.Order
	err = attributevalue.UnmarshalMap(result.Item, &order)
	if err != nil {
		r.logger.WithError(err).WithField("orderId", orderID).Error("Failed to unmarshal order")
		return nil, err
	}

	return &order, nil
}

// GetOrdersByUser retrieves all orders for a specific user
func (r *OrderRepository) GetOrdersByUser(ctx context.Context, userID string) ([]models.Order, error) {
	input := &dynamodb.ScanInput{
		TableName: aws.String(OrderTableName),
		FilterExpression: aws.String("userId = :userId"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":userId": &types.AttributeValueMemberS{Value: userID},
		},
	}

	result, err := r.client.Client.Scan(ctx, input)
	if err != nil {
		r.logger.WithError(err).WithField("userId", userID).Error("Failed to get orders by user from DynamoDB")
		return nil, err
	}

	var orders []models.Order
	for _, item := range result.Items {
		var order models.Order
		err = attributevalue.UnmarshalMap(item, &order)
		if err != nil {
			r.logger.WithError(err).WithField("userId", userID).Error("Failed to unmarshal order")
			continue
		}
		orders = append(orders, order)
	}

	r.logger.WithFields(logrus.Fields{
		"userId":     userID,
		"orderCount": len(orders),
	}).Info("Retrieved orders for user")

	return orders, nil
}

// UpdateOrderStatus updates the status of an order
func (r *OrderRepository) UpdateOrderStatus(ctx context.Context, orderID string, status models.OrderStatus) error {
	input := &dynamodb.UpdateItemInput{
		TableName: aws.String(OrderTableName),
		Key: map[string]types.AttributeValue{
			"orderId": &types.AttributeValueMemberS{Value: orderID},
		},
		UpdateExpression: aws.String("SET #status = :status, updatedAt = :updatedAt"),
		ExpressionAttributeNames: map[string]string{
			"#status": "status",
		},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":status":    &types.AttributeValueMemberS{Value: string(status)},
			":updatedAt": &types.AttributeValueMemberS{Value: time.Now().Format(time.RFC3339)},
		},
	}

	_, err := r.client.Client.UpdateItem(ctx, input)
	if err != nil {
		r.logger.WithError(err).WithFields(logrus.Fields{
			"orderId": orderID,
			"status":  status,
		}).Error("Failed to update order status in DynamoDB")
		return err
	}

	r.logger.WithFields(logrus.Fields{
		"orderId": orderID,
		"status":  status,
	}).Info("Order status updated successfully")

	return nil
}

// UpdatePaymentStatus updates the payment status of an order
func (r *OrderRepository) UpdatePaymentStatus(ctx context.Context, orderID string, paymentStatus models.PaymentStatus) error {
	input := &dynamodb.UpdateItemInput{
		TableName: aws.String(OrderTableName),
		Key: map[string]types.AttributeValue{
			"orderId": &types.AttributeValueMemberS{Value: orderID},
		},
		UpdateExpression: aws.String("SET paymentStatus = :paymentStatus, updatedAt = :updatedAt"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":paymentStatus": &types.AttributeValueMemberS{Value: string(paymentStatus)},
			":updatedAt":     &types.AttributeValueMemberS{Value: time.Now().Format(time.RFC3339)},
		},
	}

	_, err := r.client.Client.UpdateItem(ctx, input)
	if err != nil {
		r.logger.WithError(err).WithFields(logrus.Fields{
			"orderId":       orderID,
			"paymentStatus": paymentStatus,
		}).Error("Failed to update payment status in DynamoDB")
		return err
	}

	r.logger.WithFields(logrus.Fields{
		"orderId":       orderID,
		"paymentStatus": paymentStatus,
	}).Info("Payment status updated successfully")

	return nil
}

// DeleteOrder deletes an order by order ID
func (r *OrderRepository) DeleteOrder(ctx context.Context, orderID string) error {
	input := &dynamodb.DeleteItemInput{
		TableName: aws.String(OrderTableName),
		Key: map[string]types.AttributeValue{
			"orderId": &types.AttributeValueMemberS{Value: orderID},
		},
	}

	_, err := r.client.Client.DeleteItem(ctx, input)
	if err != nil {
		r.logger.WithError(err).WithField("orderId", orderID).Error("Failed to delete order from DynamoDB")
		return err
	}

	r.logger.WithField("orderId", orderID).Info("Order deleted successfully")
	return nil
} 