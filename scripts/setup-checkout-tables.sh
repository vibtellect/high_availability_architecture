#!/bin/bash

# Script to create missing DynamoDB tables for the checkout service
# Usage: ./scripts/setup-checkout-tables.sh

set -e

# Define LocalStack endpoint and region
LOCALSTACK_ENDPOINT=${LOCALSTACK_ENDPOINT:-http://localhost:4566}
AWS_REGION=${AWS_REGION:-eu-central-1}

echo "🛒 Setting up Checkout Service DynamoDB Tables..."

# Wait for LocalStack to be ready
echo "⏳ Waiting for LocalStack..."
until aws dynamodb list-tables --endpoint-url $LOCALSTACK_ENDPOINT --region $AWS_REGION --output text > /dev/null 2>&1; do
  echo "LocalStack DynamoDB not ready, waiting 2 seconds..."
  sleep 2
done

echo "✅ LocalStack DynamoDB is ready!"

# Set AWS CLI environment
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=$AWS_REGION

# Function to create table if it doesn't exist
create_table_if_not_exists() {
  TABLE_NAME=$1
  TABLE_PARAMS=$2

  if aws dynamodb describe-table --table-name $TABLE_NAME --endpoint-url $LOCALSTACK_ENDPOINT --region $AWS_REGION > /dev/null 2>&1; then
    echo "ℹ️  $TABLE_NAME table already exists"
  else
    echo "Creating $TABLE_NAME table..."
    aws dynamodb create-table --table-name $TABLE_NAME $TABLE_PARAMS --endpoint-url $LOCALSTACK_ENDPOINT --region $AWS_REGION
    if [ $? -eq 0 ]; then
      echo "✅ $TABLE_NAME table created successfully."
    else
      echo "❌ Failed to create $TABLE_NAME table."
      return 1
    fi
  fi
  return 0
}

# Define table parameters
CARTS_TABLE_PARAMS="--attribute-definitions AttributeName=userId,AttributeType=S --key-schema AttributeName=userId,KeyType=HASH --billing-mode PAY_PER_REQUEST"
ORDERS_TABLE_PARAMS="--attribute-definitions AttributeName=orderId,AttributeType=S AttributeName=userId,AttributeType=S --key-schema AttributeName=orderId,KeyType=HASH --global-secondary-indexes IndexName=UserIdIndex,KeySchema='[{AttributeName=userId,KeyType=HASH}]',Projection='{ProjectionType=ALL}' --billing-mode PAY_PER_REQUEST"

# Create tables
echo "🛒 Creating carts table..."
create_table_if_not_exists "carts" "$CARTS_TABLE_PARAMS"
if [ $? -ne 0 ]; then exit 1; fi

echo "📦 Creating orders table..."
create_table_if_not_exists "orders" "$ORDERS_TABLE_PARAMS"
if [ $? -ne 0 ]; then exit 1; fi

echo "🔍 Checking table status..."
# Function to check table status
check_table_status() {
  TABLE_NAME=$1
  echo "$TABLE_NAME table status:"
  aws dynamodb describe-table --table-name $TABLE_NAME --endpoint-url $LOCALSTACK_ENDPOINT --region $AWS_REGION --query 'Table.TableStatus' --output text
}

check_table_status "carts"
check_table_status "orders"

echo "✅ Checkout Service DynamoDB tables setup complete."

# List all tables to confirm
echo "📋 All DynamoDB tables:"
aws dynamodb list-tables \
    --endpoint-url $LOCALSTACK_ENDPOINT \
    --region $AWS_REGION \
    --no-cli-pager \
    --query 'TableNames' \
    --output table

echo "✅ Checkout Service tables created successfully!"
echo ""
echo "📋 Tables created:"
echo "  - carts (userId as primary key)"
echo "  - orders (orderId as primary key, UserIdIndex GSI)"
echo ""
echo "🚀 Checkout service is now ready to use these tables!" 