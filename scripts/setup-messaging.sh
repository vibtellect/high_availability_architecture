#!/bin/bash
# LocalStack SNS/SQS Setup für Event-driven Architecture

AWS_ENDPOINT="http://localhost:4566"
AWS_REGION="eu-central-1"

echo "Setting up SNS Topics and SQS Queues..."

# Create SNS Topics
aws --endpoint-url=$AWS_ENDPOINT sns create-topic --name user-events --region $AWS_REGION
aws --endpoint-url=$AWS_ENDPOINT sns create-topic --name product-events --region $AWS_REGION  
aws --endpoint-url=$AWS_ENDPOINT sns create-topic --name order-events --region $AWS_REGION

# Create SQS Queues (with DLQ)
aws --endpoint-url=$AWS_ENDPOINT sqs create-queue --queue-name user-queue --region $AWS_REGION
aws --endpoint-url=$AWS_ENDPOINT sqs create-queue --queue-name product-queue --region $AWS_REGION
aws --endpoint-url=$AWS_ENDPOINT sqs create-queue --queue-name order-queue --region $AWS_REGION
aws --endpoint-url=$AWS_ENDPOINT sqs create-queue --queue-name dlq-user --region $AWS_REGION
aws --endpoint-url=$AWS_ENDPOINT sqs create-queue --queue-name dlq-product --region $AWS_REGION
aws --endpoint-url=$AWS_ENDPOINT sqs create-queue --queue-name dlq-order --region $AWS_REGION

# Subscribe SQS to SNS Topics
echo "Creating subscriptions..."