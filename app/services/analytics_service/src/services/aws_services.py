"""
AWS Services Integration
DynamoDB, SNS, SQS services for Analytics Service
"""

import boto3
import structlog
from typing import Dict, List, Optional, Any
from botocore.exceptions import ClientError, BotoCoreError
from src.config.settings import Config
from src.models.analytics_models import AnalyticsEvent, MetricData, AnalyticsAggregation


logger = structlog.get_logger(__name__)


class AWSServices:
    """AWS services integration"""
    
    def __init__(self):
        self.config = Config()
        self._dynamodb = None
        self._sns = None
        self._sqs = None
        self._initialize_services()
    
    def _initialize_services(self):
        """Initialize AWS service clients"""
        try:
            # DynamoDB
            self._dynamodb = boto3.resource('dynamodb', **self.config.get_dynamodb_config())
            
            # SNS
            self._sns = boto3.client('sns', **self.config.get_sns_config())
            
            # SQS
            self._sqs = boto3.client('sqs', **self.config.get_sqs_config())
            
            logger.info("AWS services initialized successfully")
            
        except Exception as e:
            logger.error("Failed to initialize AWS services", error=str(e))
            raise
    
    @property
    def dynamodb(self):
        """Get DynamoDB resource"""
        return self._dynamodb
    
    @property
    def sns(self):
        """Get SNS client"""
        return self._sns
    
    @property
    def sqs(self):
        """Get SQS client"""
        return self._sqs


class DynamoDBService:
    """DynamoDB operations for analytics data"""
    
    def __init__(self, aws_services: AWSServices):
        self.dynamodb = aws_services.dynamodb
        self.config = Config()
        
        # Table references
        self.events_table = self.dynamodb.Table(self.config.ANALYTICS_EVENTS_TABLE)
        self.metrics_table = self.dynamodb.Table(self.config.ANALYTICS_METRICS_TABLE)
        self.aggregations_table = self.dynamodb.Table(self.config.ANALYTICS_AGGREGATIONS_TABLE)
    
    async def save_event(self, event: AnalyticsEvent) -> bool:
        """Save analytics event to DynamoDB"""
        try:
            event_data = event.dict()
            event_data['timestamp'] = event_data['timestamp'].isoformat()
            
            self.events_table.put_item(Item=event_data)
            logger.info("Event saved to DynamoDB", 
                       event_type=event.event_type, 
                       event_id=event.event_id)
            return True
            
        except ClientError as e:
            logger.error("Failed to save event to DynamoDB", 
                        error=str(e), 
                        event_type=event.event_type)
            return False
    
    async def save_metric(self, metric: MetricData) -> bool:
        """Save metric data to DynamoDB"""
        try:
            metric_data = metric.dict()
            metric_data['timestamp'] = metric_data['timestamp'].isoformat()
            
            self.metrics_table.put_item(Item=metric_data)
            logger.info("Metric saved to DynamoDB", 
                       metric_name=metric.metric_name)
            return True
            
        except ClientError as e:
            logger.error("Failed to save metric to DynamoDB", 
                        error=str(e), 
                        metric_name=metric.metric_name)
            return False
    
    async def save_aggregation(self, aggregation: AnalyticsAggregation) -> bool:
        """Save aggregation data to DynamoDB"""
        try:
            agg_data = aggregation.dict()
            agg_data['start_time'] = agg_data['start_time'].isoformat()
            agg_data['end_time'] = agg_data['end_time'].isoformat()
            agg_data['created_at'] = agg_data['created_at'].isoformat()
            
            self.aggregations_table.put_item(Item=agg_data)
            logger.info("Aggregation saved to DynamoDB", 
                       period=aggregation.period,
                       aggregation_id=aggregation.aggregation_id)
            return True
            
        except ClientError as e:
            logger.error("Failed to save aggregation to DynamoDB", 
                        error=str(e), 
                        aggregation_id=aggregation.aggregation_id)
            return False
    
    async def get_events_by_timerange(self, start_time: str, end_time: str, 
                                    event_type: Optional[str] = None) -> List[Dict]:
        """Get events within time range"""
        try:
            # Note: In production, you'd use proper GSI for time-based queries
            # For demo purposes, using scan with filter
            filter_expression = "timestamp BETWEEN :start_time AND :end_time"
            expression_values = {
                ':start_time': start_time,
                ':end_time': end_time
            }
            
            if event_type:
                filter_expression += " AND event_type = :event_type"
                expression_values[':event_type'] = event_type
            
            response = self.events_table.scan(
                FilterExpression=filter_expression,
                ExpressionAttributeValues=expression_values
            )
            
            return response.get('Items', [])
            
        except ClientError as e:
            logger.error("Failed to query events", error=str(e))
            return []
    
    async def get_recent_aggregations(self, period: str, limit: int = 10) -> List[Dict]:
        """Get recent aggregations for a period"""
        try:
            # Query aggregations by period (requires GSI in production)
            response = self.aggregations_table.scan(
                FilterExpression="period = :period",
                ExpressionAttributeValues={':period': period},
                Limit=limit
            )
            
            return response.get('Items', [])
            
        except ClientError as e:
            logger.error("Failed to query aggregations", error=str(e))
            return []


class SNSService:
    """SNS operations for event publishing"""
    
    def __init__(self, aws_services: AWSServices):
        self.sns = aws_services.sns
        self.config = Config()
    
    async def publish_analytics_event(self, event: AnalyticsEvent) -> bool:
        """Publish analytics event to SNS topic"""
        try:
            message = {
                'event_type': event.event_type,
                'event_data': event.dict(),
                'source': 'analytics-service'
            }
            
            response = self.sns.publish(
                TopicArn=self.config.ANALYTICS_TOPIC_ARN,
                Message=str(message),
                Subject=f"Analytics Event: {event.event_type}"
            )
            
            logger.info("Event published to SNS", 
                       event_type=event.event_type,
                       message_id=response.get('MessageId'))
            return True
            
        except ClientError as e:
            logger.error("Failed to publish event to SNS", 
                        error=str(e), 
                        event_type=event.event_type)
            return False
    
    async def publish_metric(self, metric: MetricData) -> bool:
        """Publish metric to SNS topic"""
        try:
            message = {
                'metric_name': metric.metric_name,
                'metric_data': metric.dict(),
                'source': 'analytics-service'
            }
            
            response = self.sns.publish(
                TopicArn=self.config.ANALYTICS_TOPIC_ARN,
                Message=str(message),
                Subject=f"Metric: {metric.metric_name}"
            )
            
            logger.info("Metric published to SNS", 
                       metric_name=metric.metric_name,
                       message_id=response.get('MessageId'))
            return True
            
        except ClientError as e:
            logger.error("Failed to publish metric to SNS", 
                        error=str(e), 
                        metric_name=metric.metric_name)
            return False


class SQSService:
    """SQS operations for event queue processing"""
    
    def __init__(self, aws_services: AWSServices):
        self.sqs = aws_services.sqs
        self.config = Config()
    
    async def get_queue_url(self, queue_name: str) -> Optional[str]:
        """Get SQS queue URL"""
        try:
            response = self.sqs.get_queue_url(QueueName=queue_name)
            return response['QueueUrl']
        except ClientError as e:
            logger.error("Failed to get queue URL", 
                        error=str(e), 
                        queue_name=queue_name)
            return None
    
    async def receive_messages(self, queue_name: str, max_messages: int = 10) -> List[Dict]:
        """Receive messages from SQS queue"""
        try:
            queue_url = await self.get_queue_url(queue_name)
            if not queue_url:
                return []
            
            response = self.sqs.receive_message(
                QueueUrl=queue_url,
                MaxNumberOfMessages=max_messages,
                WaitTimeSeconds=1,
                MessageAttributeNames=['All']
            )
            
            return response.get('Messages', [])
            
        except ClientError as e:
            logger.error("Failed to receive messages from SQS", 
                        error=str(e), 
                        queue_name=queue_name)
            return []
    
    async def delete_message(self, queue_name: str, receipt_handle: str) -> bool:
        """Delete processed message from SQS queue"""
        try:
            queue_url = await self.get_queue_url(queue_name)
            if not queue_url:
                return False
            
            self.sqs.delete_message(
                QueueUrl=queue_url,
                ReceiptHandle=receipt_handle
            )
            
            logger.info("Message deleted from SQS", queue_name=queue_name)
            return True
            
        except ClientError as e:
            logger.error("Failed to delete message from SQS", 
                        error=str(e), 
                        queue_name=queue_name)
            return False
    
    async def send_message(self, queue_name: str, message_body: str, 
                          attributes: Optional[Dict] = None) -> bool:
        """Send message to SQS queue"""
        try:
            queue_url = await self.get_queue_url(queue_name)
            if not queue_url:
                return False
            
            params = {
                'QueueUrl': queue_url,
                'MessageBody': message_body
            }
            
            if attributes:
                params['MessageAttributes'] = attributes
            
            response = self.sqs.send_message(**params)
            
            logger.info("Message sent to SQS", 
                       queue_name=queue_name,
                       message_id=response.get('MessageId'))
            return True
            
        except ClientError as e:
            logger.error("Failed to send message to SQS", 
                        error=str(e), 
                        queue_name=queue_name)
            return False 