#!/bin/bash

echo "🚀 Setting up LocalStack for Event-driven Architecture..."

# Wait for LocalStack to be ready
echo "⏳ Waiting for LocalStack to be ready..."
while ! curl -s http://localhost:4566/_localstack/health > /dev/null; do
    echo "Waiting for LocalStack..."
    sleep 2
done
echo "✅ LocalStack is ready!"

# Set AWS CLI to use LocalStack
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=eu-central-1

echo "📋 Creating SNS Topics..."

# Create SNS topic for user events
USER_TOPIC_ARN=$(aws --endpoint-url=http://localhost:4566 sns create-topic --name user-events --query 'TopicArn' --output text)
echo "✅ Created SNS topic: $USER_TOPIC_ARN"

# Create SNS topic for product events  
PRODUCT_TOPIC_ARN=$(aws --endpoint-url=http://localhost:4566 sns create-topic --name product-events --query 'TopicArn' --output text)
echo "✅ Created SNS topic: $PRODUCT_TOPIC_ARN"

# Create SNS topic for checkout events
CHECKOUT_TOPIC_ARN=$(aws --endpoint-url=http://localhost:4566 sns create-topic --name checkout-events --query 'TopicArn' --output text)
echo "✅ Created SNS topic: $CHECKOUT_TOPIC_ARN"

echo "......................................... Creating SQS Queues....................................."

# Create SQS queues for each service to consume events
USER_QUEUE_URL=$(aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name user-events-queue --query 'QueueUrl' --output text)
echo "✅ Created SQS queue: $USER_QUEUE_URL"

PRODUCT_QUEUE_URL=$(aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name product-events-queue --query 'QueueUrl' --output text)
echo "✅ Created SQS queue: $PRODUCT_QUEUE_URL"

CHECKOUT_QUEUE_URL=$(aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name checkout-events-queue --query 'QueueUrl' --output text)
echo "✅ Created SQS queue: $CHECKOUT_QUEUE_URL"

# Create Dead Letter Queues
USER_DLQ_URL=$(aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name user-events-dlq --query 'QueueUrl' --output text)
echo "✅ Created DLQ: $USER_DLQ_URL"

PRODUCT_DLQ_URL=$(aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name product-events-dlq --query 'QueueUrl' --output text)
echo "✅ Created DLQ: $PRODUCT_DLQ_URL"

CHECKOUT_DLQ_URL=$(aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name checkout-events-dlq --query 'QueueUrl' --output text)
echo "✅ Created DLQ: $CHECKOUT_DLQ_URL"

echo "🔗 Setting up SNS-SQS Subscriptions..."

# Get queue ARNs (needed for subscriptions)
USER_QUEUE_ARN=$(aws --endpoint-url=http://localhost:4566 sqs get-queue-attributes --queue-url $USER_QUEUE_URL --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)
PRODUCT_QUEUE_ARN=$(aws --endpoint-url=http://localhost:4566 sqs get-queue-attributes --queue-url $PRODUCT_QUEUE_URL --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)
CHECKOUT_QUEUE_ARN=$(aws --endpoint-url=http://localhost:4566 sqs get-queue-attributes --queue-url $CHECKOUT_QUEUE_URL --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)

# Subscribe queues to topics
aws --endpoint-url=http://localhost:4566 sns subscribe --topic-arn $USER_TOPIC_ARN --protocol sqs --notification-endpoint $USER_QUEUE_ARN
aws --endpoint-url=http://localhost:4566 sns subscribe --topic-arn $PRODUCT_TOPIC_ARN --protocol sqs --notification-endpoint $PRODUCT_QUEUE_ARN  
aws --endpoint-url=http://localhost:4566 sns subscribe --topic-arn $CHECKOUT_TOPIC_ARN --protocol sqs --notification-endpoint $CHECKOUT_QUEUE_ARN

echo "✅ SNS-SQS subscriptions created!"

echo "📋 Setting up DynamoDB Tables..."

# Create DynamoDB table for users (if not exists)
aws --endpoint-url=http://localhost:4566 dynamodb create-table \
    --table-name users \
    --attribute-definitions \
        AttributeName=userId,AttributeType=S \
        AttributeName=email,AttributeType=S \
        AttributeName=username,AttributeType=S \
    --key-schema \
        AttributeName=userId,KeyType=HASH \
    --global-secondary-indexes \
        IndexName=EmailIndex,KeySchema='[{AttributeName=email,KeyType=HASH}]',Projection='{ProjectionType=ALL}',ProvisionedThroughput='{ReadCapacityUnits=5,WriteCapacityUnits=5}' \
        IndexName=UsernameIndex,KeySchema='[{AttributeName=username,KeyType=HASH}]',Projection='{ProjectionType=ALL}',ProvisionedThroughput='{ReadCapacityUnits=5,WriteCapacityUnits=5}' \
    --provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=10 \
    2>/dev/null || echo "ℹ️  Users table already exists"

# Create DynamoDB table for products (if not exists)
aws --endpoint-url=http://localhost:4566 dynamodb create-table \
    --table-name Products \
    --attribute-definitions \
        AttributeName=productId,AttributeType=S \
    --key-schema \
        AttributeName=productId,KeyType=HASH \
    --provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=10 \
    2>/dev/null || echo "ℹ️  Products table already exists"

echo "✅ DynamoDB tables ready!"

echo ""
echo "🎉 LocalStack setup complete!"
echo ""
echo "📊 Resources created:"
echo "  📢 SNS Topics:"
echo "    - user-events: $USER_TOPIC_ARN"
echo "    - product-events: $PRODUCT_TOPIC_ARN"
echo "    - checkout-events: $CHECKOUT_TOPIC_ARN"
echo ""
echo "  📮 SQS Queues:"
echo "    - user-events-queue: $USER_QUEUE_URL"
echo "    - product-events-queue: $PRODUCT_QUEUE_URL"  
echo "    - checkout-events-queue: $CHECKOUT_QUEUE_URL"
echo "    - user-events-dlq: $USER_DLQ_URL"
echo "    - product-events-dlq: $PRODUCT_DLQ_URL"
echo "    - checkout-events-dlq: $CHECKOUT_DLQ_URL"
echo ""
echo "  🗃️  DynamoDB Tables:"
echo "    - users (with EmailIndex, UsernameIndex)"
echo "    - Products (productId as partition key)"
echo ""
echo "🔧 LocalStack Dashboard: http://localhost:4566/_localstack/health"
echo "🌐 Services ready for event-driven communication!" 