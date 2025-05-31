#!/bin/bash

# Script zum Initialisieren der DynamoDB Tabellen in LocalStack
# Verwendung: ./scripts/init-dynamodb.sh

set -e

LOCALSTACK_ENDPOINT="http://localhost:4566"
AWS_REGION="eu-central-1"

echo "🚀 Initialisiere DynamoDB Tabellen in LocalStack..."

# Warten bis LocalStack bereit ist
echo "⏳ Warte auf LocalStack..."
until curl -s $LOCALSTACK_ENDPOINT/_localstack/health | grep -q '"dynamodb": "available"'; do
  echo "LocalStack noch nicht bereit, warte 2 Sekunden..."
  sleep 2
done

echo "✅ LocalStack ist bereit!✅"

# Products Tabelle erstellen
echo "📦 Erstelle Products Tabelle..."
aws dynamodb create-table \
    --table-name Products \
    --attribute-definitions \
        AttributeName=productId,AttributeType=S \
    --key-schema \
        AttributeName=productId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --endpoint-url $LOCALSTACK_ENDPOINT \
    --region $AWS_REGION \
    --no-cli-pager

# Users Tabelle erstellen
echo "👤 Erstelle Users Tabelle..."
aws dynamodb create-table \
    --table-name Users \
    --attribute-definitions \
        AttributeName=userId,AttributeType=S \
    --key-schema \
        AttributeName=userId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --endpoint-url $LOCALSTACK_ENDPOINT \
    --region $AWS_REGION \
    --no-cli-pager

# Tabellen Status prüfen
echo "🔍 Prüfe Tabellen Status..."
aws dynamodb describe-table \
    --table-name Products \
    --endpoint-url $LOCALSTACK_ENDPOINT \
    --region $AWS_REGION \
    --no-cli-pager \
    --query 'Table.TableStatus'

aws dynamodb describe-table \
    --table-name Users \
    --endpoint-url $LOCALSTACK_ENDPOINT \
    --region $AWS_REGION \
    --no-cli-pager \
    --query 'Table.TableStatus'

echo "✅ DynamoDB Tabellen erfolgreich erstellt!✅"

# Optional: Test-Daten einfügen
echo "📝 Füge Test-Daten ein..."
aws dynamodb put-item \
    --table-name Products \
    --item '{
        "productId": {"S": "test-product-1"},
        "name": {"S": "Test Laptop"},
        "description": {"S": "Gaming Laptop für Entwickler"},
        "price": {"N": "1299.99"},
        "inventoryCount": {"N": "10"},
        "category": {"S": "Electronics"},
        "createdAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"},
        "updatedAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"}
    }' \
    --endpoint-url $LOCALSTACK_ENDPOINT \
    --region $AWS_REGION \
    --no-cli-pager

aws dynamodb put-item \
    --table-name Products \
    --item '{
        "productId": {"S": "test-product-2"},
        "name": {"S": "Wireless Mouse"},
        "description": {"S": "Ergonomische kabellose Maus"},
        "price": {"N": "29.99"},
        "inventoryCount": {"N": "50"},
        "category": {"S": "Electronics"},
        "createdAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"},
        "updatedAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"}
    }' \
    --endpoint-url $LOCALSTACK_ENDPOINT \
    --region $AWS_REGION \
    --no-cli-pager

# Test-User einfügen
echo "👤 Füge Test-User ein..."
aws dynamodb put-item \
    --table-name Users \
    --item '{
        "userId": {"S": "test-user-1"},
        "email": {"S": "admin@example.com"},
        "username": {"S": "admin"},
        "passwordHash": {"S": "$2a$10$N9qo8uLOickgx2ZMRZoMye/Ci/BABjulVdlIqiOOYFnqOqLQqU.0m"},
        "firstName": {"S": "Admin"},
        "lastName": {"S": "User"},
        "role": {"S": "ADMIN"},
        "active": {"BOOL": true},
        "createdAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"},
        "updatedAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"}
    }' \
    --endpoint-url $LOCALSTACK_ENDPOINT \
    --region $AWS_REGION \
    --no-cli-pager

aws dynamodb put-item \
    --table-name Users \
    --item '{
        "userId": {"S": "test-user-2"},
        "email": {"S": "user@example.com"},
        "username": {"S": "testuser"},
        "passwordHash": {"S": "$2a$10$N9qo8uLOickgx2ZMRZoMye/Ci/BABjulVdlIqiOOYFnqOqLQqU.0m"},
        "firstName": {"S": "Test"},
        "lastName": {"S": "User"},
        "role": {"S": "USER"},
        "active": {"BOOL": true},
        "createdAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"},
        "updatedAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"}
    }' \
    --endpoint-url $LOCALSTACK_ENDPOINT \
    --region $AWS_REGION \
    --no-cli-pager

echo "Test-Daten eingefügt!"
echo "✅Setup komplett! Product Service und User Service können jetzt gestartet werden.✅" 