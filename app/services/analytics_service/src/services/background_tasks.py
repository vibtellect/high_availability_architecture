from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Dict, List, Any, Optional
import asyncio
from uuid import uuid4
import json
import redis
import os

from celery import Celery, Task
from celery.signals import task_postrun, task_prerun, celeryd_init
from celery.utils.log import get_task_logger
from kombu import Queue, Exchange
from src.config.settings import Config
from celery.schedules import crontab
import structlog

from ..models.analytics_models import AnalyticsEvent, AnalyticsAggregation, EventType
from .aws_services import DynamoDBService, SNSService
from .cache_service import CacheService

# Initialize Celery app with Redis broker and backend
settings = Config()
logger = structlog.get_logger(__name__)

celery_app = Celery(
    settings.SERVICE_NAME,
    broker_url=settings.REDIS_URL,
    backend_url=settings.REDIS_URL,
    include=[
        'src.services.background_tasks'
    ]
)

# Modern Celery configuration based on Context7 best practices
celery_app.conf.update(
    # Broker settings
    broker_connection_retry_on_startup=True,
    broker_pool_limit=10,
    broker_heartbeat=30,

    # Result backend settings
    result_expires=timedelta(days=7),
    result_extended=True,

    # Task settings
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    worker_send_task_events=True,
    task_time_limit=300,
    task_soft_time_limit=240,

    # Routing configuration
    task_routes=({
        'src.services.background_tasks.process_event_task': {'queue': 'high_priority'},
        'src.services.background_tasks.process_event_batch_task': {'queue': 'high_priority'},
        'src.services.background_tasks.generate_hourly_aggregations': {'queue': 'aggregations'},
        'src.services.background_tasks.generate_daily_aggregations': {'queue': 'aggregations'},
        'src.services.background_tasks.generate_weekly_aggregations': {'queue': 'aggregations'},
        'src.services.background_tasks.generate_monthly_aggregations': {'queue': 'aggregations'},
        'src.services.background_tasks.send_notification_task': {'queue': 'notifications'},
        'src.services.background_tasks.cleanup_old_data_task': {'queue': 'maintenance'},
        'src.services.background_tasks.cache_warmup_task': {'queue': 'maintenance'},
    }),

    # Periodic tasks (Celery Beat)
    beat_schedule={
        'generate-hourly-aggregations': {
            'task': 'src.services.background_tasks.generate_hourly_aggregations',
            'schedule': crontab(minute='5'),
        },
        'generate-daily-aggregations': {
            'task': 'src.services.background_tasks.generate_daily_aggregations',
            'schedule': crontab(hour='1', minute='0'),
        },
        'cleanup-old-data': {
            'task': 'src.services.background_tasks.cleanup_old_data_task',
            'schedule': crontab(hour='3', minute='0', day_of_week='sunday'),
        },
        'cache-warmup-task': {
            'task': 'src.services.background_tasks.cache_warmup_task',
            'schedule': crontab(minute='*/30'),
        }
    },

    # Logging
    worker_log_format="[%(asctime)s: %(levelname)s/%(processName)s] %(message)s",
    worker_task_log_format="[%(asctime)s: %(levelname)s/%(processName)s][%(task_name)s(%(task_id)s)] %(message)s",

    # Concurrency and worker settings (can be overridden by CeleryWorkerManager)
    worker_concurrency=os.cpu_count() or 2,
    worker_max_tasks_per_child=1000,

    # Security
    security_key=settings.SECRET_KEY,
    security_certificate=None,
    security_cert_store=None,
)

class BaseAnalyticsTask(Task):
    """Base task class with common functionality and retry logic"""
    autoretry_for = (ConnectionError, redis.RedisError, Exception)
    max_retries = 5
    retry_backoff = True
    retry_backoff_max = 700
    retry_jitter = False
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Handle task failure"""
        logger.error(f'Task {task_id} failed: {exc}', 
                    extra={'task_id': task_id, 'args': args, 'kwargs': kwargs})
    
    def on_success(self, retval, task_id, args, kwargs):
        """Handle task success"""
        logger.info(f'Task {task_id} completed successfully', 
                   extra={'task_id': task_id, 'return_value': retval})

# Register base task class
celery_app.Task = BaseAnalyticsTask

@celery_app.task(bind=True, queue='high_priority')
def process_event_batch(self, events_data: List[Dict[str, Any]], 
                       correlation_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Process a batch of analytics events asynchronously
    Enhanced with proper validation and error handling
    """
    correlation_id = correlation_id or str(uuid4())
    logger.info(f'Processing event batch: {len(events_data)} events', 
               extra={'correlation_id': correlation_id})
    
    try:
        # Initialize services
        dynamodb = DynamoDBService()
        sns = SNSService()
        cache = CacheService()
        
        processed_events = []
        failed_events = []
        
        for event_data in events_data:
            try:
                # Validate and create event object
                event = AnalyticsEvent(**event_data)
                
                # Store in DynamoDB
                dynamodb.store_event(event)
                
                # Update real-time cache
                cache_key = f"user_events:{event.user_id}:{event.event_day}"
                cache.increment_counter(cache_key, ttl=86400)
                
                # Publish to SNS for real-time processing
                sns.publish_event(
                    topic_name='analytics-events',
                    event=event,
                    correlation_id=correlation_id
                )
                
                processed_events.append(event.event_id)
                
            except Exception as e:
                logger.error(f'Failed to process event: {e}', 
                           extra={'event_data': event_data, 'correlation_id': correlation_id})
                failed_events.append({'event_data': event_data, 'error': str(e)})
        
        # Trigger aggregation updates for processed events
        if processed_events:
            update_realtime_aggregations.delay(
                processed_events, 
                correlation_id=correlation_id
            )
        
        result = {
            'processed_count': len(processed_events),
            'failed_count': len(failed_events),
            'processed_events': processed_events,
            'failed_events': failed_events,
            'correlation_id': correlation_id,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        logger.info(f'Batch processing completed: {result}')
        return result
        
    except Exception as e:
        logger.error(f'Batch processing failed: {e}', 
                    extra={'correlation_id': correlation_id})
        raise self.retry(countdown=60, exc=e)

@celery_app.task(bind=True, queue='aggregations')
def update_realtime_aggregations(self, event_ids: List[str], 
                                correlation_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Update real-time aggregations based on processed events
    """
    logger.info(f'Updating aggregations for {len(event_ids)} events',
               extra={'correlation_id': correlation_id})
    
    try:
        cache = CacheService()
        current_time = datetime.now(timezone.utc)
        
        # Update various time-based counters
        time_buckets = {
            'minute': current_time.strftime('%Y-%m-%d %H:%M'),
            'hour': current_time.strftime('%Y-%m-%d %H'),
            'day': current_time.strftime('%Y-%m-%d'),
        }
        
        for period, bucket in time_buckets.items():
            cache_key = f"events_count:{period}:{bucket}"
            cache.increment_counter(cache_key, len(event_ids), ttl=86400)
        
        # Update dashboard metrics cache
        dashboard_cache_key = "dashboard:realtime_metrics"
        current_metrics = cache.get_json(dashboard_cache_key) or {}
        
        current_metrics.update({
            'last_update': current_time.isoformat(),
            'events_processed_last_minute': current_metrics.get('events_processed_last_minute', 0) + len(event_ids),
            'total_events_today': current_metrics.get('total_events_today', 0) + len(event_ids),
        })
        
        cache.set_json(dashboard_cache_key, current_metrics, ttl=300)  # 5 minutes TTL
        
        return {
            'updated_aggregations': len(time_buckets),
            'event_count': len(event_ids),
            'correlation_id': correlation_id,
            'timestamp': current_time.isoformat()
        }
        
    except Exception as e:
        logger.error(f'Aggregation update failed: {e}', 
                    extra={'correlation_id': correlation_id})
        raise self.retry(countdown=30, exc=e)

@celery_app.task(bind=True, queue='aggregations')
def generate_periodic_aggregations(self, period: str = 'hour', 
                                 target_time: Optional[str] = None) -> Dict[str, Any]:
    """
    Generate periodic aggregations (hourly, daily, weekly, monthly)
    """
    target_datetime = datetime.fromisoformat(target_time) if target_time else datetime.now(timezone.utc)
    logger.info(f'Generating {period} aggregations for {target_datetime}')
    
    try:
        dynamodb = DynamoDBService()
        cache = CacheService()
        
        # Calculate period boundaries
        if period == 'hour':
            period_start = target_datetime.replace(minute=0, second=0, microsecond=0)
            period_end = period_start + timedelta(hours=1)
        elif period == 'day':
            period_start = target_datetime.replace(hour=0, minute=0, second=0, microsecond=0)
            period_end = period_start + timedelta(days=1)
        elif period == 'week':
            days_since_monday = target_datetime.weekday()
            period_start = target_datetime.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days_since_monday)
            period_end = period_start + timedelta(weeks=1)
        else:  # month
            period_start = target_datetime.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            next_month = period_start.replace(month=period_start.month + 1) if period_start.month < 12 else period_start.replace(year=period_start.year + 1, month=1)
            period_end = next_month
        
        # Query events for the period
        events = dynamodb.query_events_by_timerange(period_start, period_end)
        
        # Calculate aggregations
        aggregations = {}
        for event_type in ['page_view', 'product_view', 'purchase', 'add_to_cart']:
            type_events = [e for e in events if e.get('event_type') == event_type]
            aggregations[event_type] = {
                'total_events': len(type_events),
                'unique_users': len(set(e.get('user_id') for e in type_events if e.get('user_id'))),
                'unique_sessions': len(set(e.get('session_id') for e in type_events if e.get('session_id'))),
            }
            
            # Revenue calculations for purchase events
            if event_type == 'purchase':
                total_revenue = sum(Decimal(str(e.get('revenue', 0))) for e in type_events if e.get('revenue'))
                aggregations[event_type]['total_revenue'] = float(total_revenue)
        
        # Store aggregation in DynamoDB
        aggregation = AnalyticsAggregation(
            period=period,
            period_start=period_start,
            period_end=period_end,
            total_events=len(events),
            unique_users=len(set(e.get('user_id') for e in events if e.get('user_id'))),
            unique_sessions=len(set(e.get('session_id') for e in events if e.get('session_id'))),
            total_revenue=Decimal(str(sum(Decimal(str(e.get('revenue', 0))) for e in events if e.get('revenue')))),
            conversion_metrics=aggregations
        )
        
        dynamodb.store_aggregation(aggregation)
        
        # Cache the result
        cache_key = f"aggregation:{period}:{period_start.isoformat()}"
        cache.set_json(cache_key, aggregation.model_dump(mode='json'), ttl=3600)
        
        return {
            'period': period,
            'period_start': period_start.isoformat(),
            'period_end': period_end.isoformat(),
            'total_events': len(events),
            'aggregations': aggregations,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f'Aggregation generation failed: {e}')
        raise self.retry(countdown=120, exc=e)

@celery_app.task(bind=True, queue='notifications')
def send_alert_notifications(self, alert_type: str, data: Dict[str, Any], 
                           correlation_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Send alert notifications for various conditions
    """
    logger.info(f'Sending {alert_type} alert notification', 
               extra={'correlation_id': correlation_id})
    
    try:
        sns = SNSService()
        
        alert_message = {
            'alert_type': alert_type,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'data': data,
            'correlation_id': correlation_id,
            'service': 'analytics-service'
        }
        
        # Send to different topics based on alert type
        topic_mapping = {
            'high_error_rate': 'system-alerts',
            'unusual_traffic': 'traffic-alerts',
            'revenue_threshold': 'business-alerts',
            'system_health': 'health-alerts'
        }
        
        topic = topic_mapping.get(alert_type, 'general-alerts')
        
        sns.publish_message(
            topic_name=topic,
            message=alert_message,
            subject=f'Analytics Alert: {alert_type}'
        )
        
        return {
            'alert_type': alert_type,
            'topic': topic,
            'correlation_id': correlation_id,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f'Alert notification failed: {e}', 
                    extra={'correlation_id': correlation_id})
        raise self.retry(countdown=60, exc=e)

@celery_app.task(bind=True, queue='maintenance')
def cleanup_expired_data(self, days_to_keep: int = 30) -> Dict[str, Any]:
    """
    Clean up expired data from DynamoDB and Redis cache
    """
    logger.info(f'Starting cleanup of data older than {days_to_keep} days')
    
    try:
        dynamodb = DynamoDBService()
        cache = CacheService()
        
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_to_keep)
        
        # Clean up old events
        deleted_events = dynamodb.delete_events_before_date(cutoff_date)
        
        # Clean up old aggregations (keep longer)
        aggregation_cutoff = datetime.now(timezone.utc) - timedelta(days=days_to_keep * 2)
        deleted_aggregations = dynamodb.delete_aggregations_before_date(aggregation_cutoff)
        
        # Clean up expired cache keys
        expired_keys = cache.cleanup_expired_keys()
        
        result = {
            'deleted_events': deleted_events,
            'deleted_aggregations': deleted_aggregations,
            'expired_cache_keys': expired_keys,
            'cutoff_date': cutoff_date.isoformat(),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        logger.info(f'Cleanup completed: {result}')
        return result
        
    except Exception as e:
        logger.error(f'Cleanup failed: {e}')
        raise self.retry(countdown=300, exc=e)

# Signal handlers for monitoring and logging
@task_prerun.connect
def task_prerun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, **kwds):
    """Log task start"""
    logger.info(f'Task starting: {task.name}', 
               extra={'task_id': task_id, 'task_name': task.name})

@task_postrun.connect
def task_postrun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, 
                        retval=None, state=None, **kwds):
    """Log task completion"""
    logger.info(f'Task completed: {task.name} - {state}', 
               extra={'task_id': task_id, 'task_name': task.name, 'state': state})

@celeryd_init.connect
def configure_worker(sender=None, conf=None, **kwargs):
    """Configure worker-specific settings"""
    hostname = sender
    logger.info(f'Configuring worker: {hostname}')
    
    # Worker-specific configurations can be added here
    if 'aggregation' in hostname:
        conf.worker_prefetch_multiplier = 2
        conf.task_default_rate_limit = '50/m'
    elif 'priority' in hostname:
        conf.worker_prefetch_multiplier = 1
        conf.task_default_rate_limit = '200/m'

# Helper functions for easy task dispatching
class BackgroundTaskManager:
    """Manager class for dispatching background tasks"""
    
    @staticmethod
    def process_events_async(events: List[Dict[str, Any]], 
                           correlation_id: Optional[str] = None) -> str:
        """Dispatch event processing task"""
        result = process_event_batch.delay(events, correlation_id)
        return result.id
    
    @staticmethod
    def generate_aggregations_async(period: str, 
                                  target_time: Optional[str] = None) -> str:
        """Dispatch aggregation generation task"""
        result = generate_periodic_aggregations.delay(period, target_time)
        return result.id
    
    @staticmethod
    def send_alert_async(alert_type: str, data: Dict[str, Any], 
                        correlation_id: Optional[str] = None) -> str:
        """Dispatch alert notification task"""
        result = send_alert_notifications.delay(alert_type, data, correlation_id)
        return result.id
    
    @staticmethod
    def cleanup_data_async(days_to_keep: int = 30) -> str:
        """Dispatch data cleanup task"""
        result = cleanup_expired_data.delay(days_to_keep)
        return result.id
    
    @staticmethod
    def get_task_status(task_id: str) -> Dict[str, Any]:
        """Get task status and result"""
        result = celery_app.AsyncResult(task_id)
        return {
            'task_id': task_id,
            'status': result.status,
            'result': result.result if result.ready() else None,
            'traceback': result.traceback if result.failed() else None
        } 