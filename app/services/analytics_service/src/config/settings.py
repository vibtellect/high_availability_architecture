"""
Configuration settings for Analytics Service
Environment-based configuration management
"""

import os
from typing import Optional


class Config:
    """Base configuration"""
    
    # Flask settings
    SECRET_KEY = os.getenv('SECRET_KEY', 'analytics-service-secret-key-dev')
    DEBUG = os.getenv('DEBUG', 'False').lower() in ['true', '1']
    
    # Service settings
    SERVICE_NAME = 'analytics-service'
    SERVICE_VERSION = '1.0.0'
    PORT = int(os.getenv('PORT', 8083))
    
    # AWS Configuration
    AWS_REGION = os.getenv('AWS_REGION', 'eu-central-1')
    AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID', 'test')
    AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY', 'test')
    
    # LocalStack endpoints for development
    AWS_DYNAMODB_ENDPOINT = os.getenv('AWS_DYNAMODB_ENDPOINT', 'http://localhost:4566')
    AWS_SNS_ENDPOINT = os.getenv('AWS_SNS_ENDPOINT', 'http://localhost:4566')
    AWS_SQS_ENDPOINT = os.getenv('AWS_SQS_ENDPOINT', 'http://localhost:4566')
    
    # DynamoDB Tables
    ANALYTICS_EVENTS_TABLE = os.getenv('ANALYTICS_EVENTS_TABLE', 'analytics-events')
    ANALYTICS_METRICS_TABLE = os.getenv('ANALYTICS_METRICS_TABLE', 'analytics-metrics')
    ANALYTICS_AGGREGATIONS_TABLE = os.getenv('ANALYTICS_AGGREGATIONS_TABLE', 'analytics-aggregations')
    
    # SNS Topics
    ANALYTICS_TOPIC_ARN = os.getenv('ANALYTICS_TOPIC_ARN', 
                                   'arn:aws:sns:eu-central-1:000000000000:analytics-events')
    
    # SQS Queues for event processing
    PRODUCT_EVENTS_QUEUE = os.getenv('PRODUCT_EVENTS_QUEUE', 'product-events-queue')
    USER_EVENTS_QUEUE = os.getenv('USER_EVENTS_QUEUE', 'user-events-queue')
    CHECKOUT_EVENTS_QUEUE = os.getenv('CHECKOUT_EVENTS_QUEUE', 'checkout-events-queue')
    
    # Redis Configuration
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
    REDIS_CACHE_TTL = int(os.getenv('REDIS_CACHE_TTL', 300))  # 5 minutes default
    
    # Alternative Redis configuration (for worker services)
    REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
    REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
    REDIS_DB = int(os.getenv('REDIS_DB', 0))
    
    # Event Processing Configuration
    EVENTS_ENABLED = os.getenv('EVENTS_ENABLED', 'true').lower() in ['true', '1']
    BATCH_SIZE = int(os.getenv('BATCH_SIZE', 100))
    PROCESSING_INTERVAL = int(os.getenv('PROCESSING_INTERVAL', 30))  # seconds
    
    # Other Services URLs
    PRODUCT_SERVICE_URL = os.getenv('PRODUCT_SERVICE_URL', 'http://localhost:8080')
    USER_SERVICE_URL = os.getenv('USER_SERVICE_URL', 'http://localhost:8081')
    CHECKOUT_SERVICE_URL = os.getenv('CHECKOUT_SERVICE_URL', 'http://localhost:8082')
    
    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    
    # Health Check Configuration
    HEALTH_CHECK_TIMEOUT = int(os.getenv('HEALTH_CHECK_TIMEOUT', 5))
    
    @property
    def redis_host(self):
        """Get Redis host for backward compatibility"""
        return self.REDIS_HOST
    
    @property
    def redis_port(self):
        """Get Redis port for backward compatibility"""
        return self.REDIS_PORT
    
    @property
    def redis_db(self):
        """Get Redis database for backward compatibility"""
        return self.REDIS_DB
    
    @classmethod
    def get_dynamodb_config(cls) -> dict:
        """Get DynamoDB configuration"""
        config = {
            'region_name': cls.AWS_REGION,
            'aws_access_key_id': cls.AWS_ACCESS_KEY_ID,
            'aws_secret_access_key': cls.AWS_SECRET_ACCESS_KEY,
        }
        
        if cls.AWS_DYNAMODB_ENDPOINT:
            config['endpoint_url'] = cls.AWS_DYNAMODB_ENDPOINT
            
        return config
    
    @classmethod
    def get_sns_config(cls) -> dict:
        """Get SNS configuration"""
        config = {
            'region_name': cls.AWS_REGION,
            'aws_access_key_id': cls.AWS_ACCESS_KEY_ID,
            'aws_secret_access_key': cls.AWS_SECRET_ACCESS_KEY,
        }
        
        if cls.AWS_SNS_ENDPOINT:
            config['endpoint_url'] = cls.AWS_SNS_ENDPOINT
            
        return config
    
    @classmethod
    def get_sqs_config(cls) -> dict:
        """Get SQS configuration"""
        config = {
            'region_name': cls.AWS_REGION,
            'aws_access_key_id': cls.AWS_ACCESS_KEY_ID,
            'aws_secret_access_key': cls.AWS_SECRET_ACCESS_KEY,
        }
        
        if cls.AWS_SQS_ENDPOINT:
            config['endpoint_url'] = cls.AWS_SQS_ENDPOINT
            
        return config


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    AWS_DYNAMODB_ENDPOINT = None  # Use real AWS endpoints
    AWS_SNS_ENDPOINT = None
    AWS_SQS_ENDPOINT = None


class TestConfig(Config):
    """Test configuration"""
    TESTING = True
    DEBUG = True


# Alias for backward compatibility
Settings = Config 