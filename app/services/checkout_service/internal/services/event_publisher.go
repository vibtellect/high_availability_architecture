package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/sns"
	"github.com/aws/aws-sdk-go-v2/service/sns/types"
	"github.com/sirupsen/logrus"

	"github.com/vibtellect/high_availability_architecture/app/services/checkout_service/internal/config"
	"github.com/vibtellect/high_availability_architecture/app/services/checkout_service/internal/models"
)

// EventPublisher handles publishing events to SNS
type EventPublisher struct {
	snsClient        *sns.Client
	topicARN         string
	maxRetryAttempts int
	retryDelay       time.Duration
	logger           *logrus.Logger
	enabled          bool
}

// NewEventPublisher creates a new event publisher
func NewEventPublisher(awsConfig *config.AWSConfig, cfg *config.Config, logger *logrus.Logger) *EventPublisher {
	return &EventPublisher{
		snsClient:        awsConfig.SNSClient,
		topicARN:         awsConfig.TopicARN,
		maxRetryAttempts: cfg.MaxRetryAttempts,
		retryDelay:       cfg.RetryDelay,
		logger:           logger,
		enabled:          cfg.EventsEnabled,
	}
}

// PublishEvent publishes a checkout event to SNS
func (ep *EventPublisher) PublishEvent(ctx context.Context, event *models.CheckoutEvent) error {
	if !ep.enabled {
		ep.logger.Debug("Event publishing is disabled, skipping event")
		return nil
	}

	eventJSON, err := json.Marshal(event)
	if err != nil {
		ep.logger.WithError(err).WithField("eventId", event.EventID).Error("Failed to marshal event")
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	var lastError error
	for attempt := 1; attempt <= ep.maxRetryAttempts; attempt++ {
		err := ep.publishEventToSNS(ctx, event, string(eventJSON))
		if err == nil {
			ep.logger.WithFields(logrus.Fields{
				"eventId":   event.EventID,
				"eventType": event.EventType,
				"userID":    event.UserID,
				"orderID":   event.OrderID,
				"category":  event.GetEventCategory(),
			}).Info("Event published successfully")
			return nil
		}

		lastError = err
		if attempt < ep.maxRetryAttempts {
			ep.logger.WithError(err).WithFields(logrus.Fields{
				"eventId":     event.EventID,
				"attempt":     attempt,
				"maxAttempts": ep.maxRetryAttempts,
			}).Warn("Failed to publish event, retrying")

			// Exponential backoff
			delay := time.Duration(attempt) * ep.retryDelay
			time.Sleep(delay)
		}
	}

	ep.logger.WithError(lastError).WithFields(logrus.Fields{
		"eventId":  event.EventID,
		"attempts": ep.maxRetryAttempts,
	}).Error("Failed to publish event after all retries")

	return fmt.Errorf("failed to publish event after %d attempts: %w", ep.maxRetryAttempts, lastError)
}

// publishEventToSNS publishes a single event to SNS
func (ep *EventPublisher) publishEventToSNS(ctx context.Context, event *models.CheckoutEvent, eventJSON string) error {
	// Create message attributes
	messageAttributes := map[string]types.MessageAttributeValue{
		"eventType": {
			DataType:    aws.String("String"),
			StringValue: aws.String(string(event.EventType)),
		},
		"source": {
			DataType:    aws.String("String"),
			StringValue: aws.String(event.Source),
		},
		"eventCategory": {
			DataType:    aws.String("String"),
			StringValue: aws.String(event.GetEventCategory()),
		},
		"eventId": {
			DataType:    aws.String("String"),
			StringValue: aws.String(event.EventID),
		},
	}

	// Add optional attributes
	if event.UserID != "" {
		messageAttributes["userID"] = types.MessageAttributeValue{
			DataType:    aws.String("String"),
			StringValue: aws.String(event.UserID),
		}
	}

	if event.OrderID != "" {
		messageAttributes["orderID"] = types.MessageAttributeValue{
			DataType:    aws.String("String"),
			StringValue: aws.String(event.OrderID),
		}
	}

	// Publish to SNS
	input := &sns.PublishInput{
		TopicArn:          aws.String(ep.topicARN),
		Message:           aws.String(eventJSON),
		MessageAttributes: messageAttributes,
	}

	result, err := ep.snsClient.Publish(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to publish to SNS: %w", err)
	}

	ep.logger.WithFields(logrus.Fields{
		"messageId": aws.ToString(result.MessageId),
		"eventId":   event.EventID,
	}).Debug("Event published to SNS")

	return nil
}

// PublishCartItemAdded publishes a cart item added event
func (ep *EventPublisher) PublishCartItemAdded(ctx context.Context, userID string, item *models.CartItem, totalItems int) error {
	event := models.NewCheckoutEvent(models.CartEventItemAdded, userID, map[string]interface{}{
		"productId":   item.ProductID,
		"productName": item.ProductName,
		"price":       item.Price,
		"quantity":    item.Quantity,
		"category":    item.Category,
		"totalItems":  totalItems,
	})
	return ep.PublishEvent(ctx, event)
}

// PublishCartItemUpdated publishes a cart item updated event
func (ep *EventPublisher) PublishCartItemUpdated(ctx context.Context, userID string, item *models.CartItem, oldQuantity, totalItems int) error {
	event := models.NewCheckoutEvent(models.CartEventItemUpdated, userID, map[string]interface{}{
		"productId":   item.ProductID,
		"productName": item.ProductName,
		"price":       item.Price,
		"quantity":    item.Quantity,
		"oldQuantity": oldQuantity,
		"category":    item.Category,
		"totalItems":  totalItems,
	})
	return ep.PublishEvent(ctx, event)
}

// PublishCartItemRemoved publishes a cart item removed event
func (ep *EventPublisher) PublishCartItemRemoved(ctx context.Context, userID, productID string, totalItems int) error {
	event := models.NewCheckoutEvent(models.CartEventItemRemoved, userID, map[string]interface{}{
		"productId":  productID,
		"totalItems": totalItems,
	})
	return ep.PublishEvent(ctx, event)
}

// PublishCartCleared publishes a cart cleared event
func (ep *EventPublisher) PublishCartCleared(ctx context.Context, userID string, itemsCount int) error {
	event := models.NewCheckoutEvent(models.CartEventCleared, userID, map[string]interface{}{
		"itemsCleared": itemsCount,
	})
	return ep.PublishEvent(ctx, event)
}

// PublishOrderCreated publishes an order created event
func (ep *EventPublisher) PublishOrderCreated(ctx context.Context, order *models.Order) error {
	event := models.NewOrderEvent(models.OrderEventCreated, order.UserID, order.OrderID, map[string]interface{}{
		"totalAmount":   order.TotalAmount,
		"itemsCount":    len(order.Items),
		"status":        order.Status,
		"paymentStatus": order.PaymentStatus,
		"paymentMethod": order.PaymentMethod,
		"items":         ep.orderItemsToEventData(order.Items),
	})
	return ep.PublishEvent(ctx, event)
}

// PublishOrderStatusUpdated publishes an order status updated event
func (ep *EventPublisher) PublishOrderStatusUpdated(ctx context.Context, order *models.Order, oldStatus models.OrderStatus) error {
	event := models.NewOrderEvent(ep.getOrderEventTypeFromStatus(order.Status), order.UserID, order.OrderID, map[string]interface{}{
		"newStatus":     order.Status,
		"oldStatus":     oldStatus,
		"totalAmount":   order.TotalAmount,
		"paymentStatus": order.PaymentStatus,
		"itemsCount":    len(order.Items),
	})
	return ep.PublishEvent(ctx, event)
}

// PublishPaymentStatusUpdated publishes a payment status updated event
func (ep *EventPublisher) PublishPaymentStatusUpdated(ctx context.Context, order *models.Order, oldPaymentStatus models.PaymentStatus) error {
	event := models.NewOrderEvent(ep.getPaymentEventTypeFromStatus(order.PaymentStatus), order.UserID, order.OrderID, map[string]interface{}{
		"newPaymentStatus": order.PaymentStatus,
		"oldPaymentStatus": oldPaymentStatus,
		"totalAmount":      order.TotalAmount,
		"paymentMethod":    order.PaymentMethod,
		"orderStatus":      order.Status,
	})
	return ep.PublishEvent(ctx, event)
}

// PublishCheckoutStarted publishes a checkout started event
func (ep *EventPublisher) PublishCheckoutStarted(ctx context.Context, userID string, cartTotal float64, itemsCount int) error {
	event := models.NewCheckoutEvent(models.CheckoutEventStarted, userID, map[string]interface{}{
		"cartTotal":  cartTotal,
		"itemsCount": itemsCount,
	})
	return ep.PublishEvent(ctx, event)
}

// PublishCheckoutCompleted publishes a checkout completed event
func (ep *EventPublisher) PublishCheckoutCompleted(ctx context.Context, order *models.Order) error {
	event := models.NewOrderEvent(models.CheckoutEventCompleted, order.UserID, order.OrderID, map[string]interface{}{
		"totalAmount":   order.TotalAmount,
		"itemsCount":    len(order.Items),
		"paymentMethod": order.PaymentMethod,
		"items":         ep.orderItemsToEventData(order.Items),
	})
	return ep.PublishEvent(ctx, event)
}

// PublishCheckoutAbandoned publishes a checkout abandoned event
func (ep *EventPublisher) PublishCheckoutAbandoned(ctx context.Context, userID string, reason string) error {
	event := models.NewCheckoutEvent(models.CheckoutEventAbandoned, userID, map[string]interface{}{
		"reason": reason,
	})
	return ep.PublishEvent(ctx, event)
}

// Helper methods

// getOrderEventTypeFromStatus maps order status to event type
func (ep *EventPublisher) getOrderEventTypeFromStatus(status models.OrderStatus) models.CheckoutEventType {
	switch status {
	case models.OrderStatusConfirmed:
		return models.OrderEventConfirmed
	case models.OrderStatusProcessing:
		return models.OrderEventProcessing
	case models.OrderStatusShipped:
		return models.OrderEventShipped
	case models.OrderStatusDelivered:
		return models.OrderEventDelivered
	case models.OrderStatusCancelled:
		return models.OrderEventCancelled
	default:
		return models.OrderEventCreated
	}
}

// getPaymentEventTypeFromStatus maps payment status to event type
func (ep *EventPublisher) getPaymentEventTypeFromStatus(status models.PaymentStatus) models.CheckoutEventType {
	switch status {
	case models.PaymentStatusCompleted:
		return models.PaymentEventCompleted
	case models.PaymentStatusFailed:
		return models.PaymentEventFailed
	case models.PaymentStatusRefunded:
		return models.PaymentEventRefunded
	default:
		return models.PaymentEventInitiated
	}
}

// orderItemsToEventData converts order items to event-friendly data
func (ep *EventPublisher) orderItemsToEventData(items []models.OrderItem) []map[string]interface{} {
	eventItems := make([]map[string]interface{}, len(items))
	for i, item := range items {
		eventItems[i] = map[string]interface{}{
			"productId":   item.ProductID,
			"productName": item.ProductName,
			"price":       item.Price,
			"quantity":    item.Quantity,
			"category":    item.Category,
			"subtotal":    item.Subtotal,
		}
	}
	return eventItems
}

// HealthCheck performs a health check on the SNS service
func (ep *EventPublisher) HealthCheck(ctx context.Context) error {
	if !ep.enabled {
		return fmt.Errorf("event publishing is disabled")
	}

	// Try to get topic attributes to verify connectivity
	input := &sns.GetTopicAttributesInput{
		TopicArn: aws.String(ep.topicARN),
	}

	_, err := ep.snsClient.GetTopicAttributes(ctx, input)
	if err != nil {
		if strings.Contains(err.Error(), "does not exist") {
			return fmt.Errorf("SNS topic does not exist: %s", ep.topicARN)
		}
		return fmt.Errorf("SNS health check failed: %w", err)
	}

	return nil
}
