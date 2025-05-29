package db

import (
	"context"
	"time"

	"github.com/vibtellect/high_availability_architecture/app/services/checkout_service/internal/models"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/sirupsen/logrus"
)

const CartTableName = "Carts"

type CartRepository struct {
	client *DynamoDBClient
	logger *logrus.Logger
}

// NewCartRepository creates a new cart repository
func NewCartRepository(client *DynamoDBClient, logger *logrus.Logger) *CartRepository {
	return &CartRepository{
		client: client,
		logger: logger,
	}
}

// GetCart retrieves a cart by user ID
func (r *CartRepository) GetCart(ctx context.Context, userID string) (*models.Cart, error) {
	input := &dynamodb.GetItemInput{
		TableName: aws.String(CartTableName),
		Key: map[string]types.AttributeValue{
			"userId": &types.AttributeValueMemberS{Value: userID},
		},
	}

	result, err := r.client.Client.GetItem(ctx, input)
	if err != nil {
		r.logger.WithError(err).WithField("userId", userID).Error("Failed to get cart from DynamoDB")
		return nil, err
	}

	if result.Item == nil {
		// Return empty cart if not found
		return &models.Cart{
			UserID:    userID,
			Items:     []models.CartItem{},
			Total:     0,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}, nil
	}

	var cart models.Cart
	err = attributevalue.UnmarshalMap(result.Item, &cart)
	if err != nil {
		r.logger.WithError(err).WithField("userId", userID).Error("Failed to unmarshal cart")
		return nil, err
	}

	return &cart, nil
}

// SaveCart saves or updates a cart
func (r *CartRepository) SaveCart(ctx context.Context, cart *models.Cart) error {
	cart.UpdatedAt = time.Now()
	if cart.CreatedAt.IsZero() {
		cart.CreatedAt = time.Now()
	}

	// Calculate total
	cart.Total = 0
	for _, item := range cart.Items {
		cart.Total += item.Price * float64(item.Quantity)
	}

	item, err := attributevalue.MarshalMap(cart)
	if err != nil {
		r.logger.WithError(err).WithField("userId", cart.UserID).Error("Failed to marshal cart")
		return err
	}

	input := &dynamodb.PutItemInput{
		TableName: aws.String(CartTableName),
		Item:      item,
	}

	_, err = r.client.Client.PutItem(ctx, input)
	if err != nil {
		r.logger.WithError(err).WithField("userId", cart.UserID).Error("Failed to save cart to DynamoDB")
		return err
	}

	r.logger.WithFields(logrus.Fields{
		"userId": cart.UserID,
		"items":  len(cart.Items),
		"total":  cart.Total,
	}).Info("Cart saved successfully")

	return nil
}

// DeleteCart deletes a cart by user ID
func (r *CartRepository) DeleteCart(ctx context.Context, userID string) error {
	input := &dynamodb.DeleteItemInput{
		TableName: aws.String(CartTableName),
		Key: map[string]types.AttributeValue{
			"userId": &types.AttributeValueMemberS{Value: userID},
		},
	}

	_, err := r.client.Client.DeleteItem(ctx, input)
	if err != nil {
		r.logger.WithError(err).WithField("userId", userID).Error("Failed to delete cart from DynamoDB")
		return err
	}

	r.logger.WithField("userId", userID).Info("Cart deleted successfully")
	return nil
}

// ClearCart removes all items from a cart but keeps the cart record
func (r *CartRepository) ClearCart(ctx context.Context, userID string) error {
	cart, err := r.GetCart(ctx, userID)
	if err != nil {
		return err
	}

	// preserve original CreatedAt
	cart.Items = []models.CartItem{}
	cart.Total = 0

	return r.SaveCart(ctx, cart)
}
