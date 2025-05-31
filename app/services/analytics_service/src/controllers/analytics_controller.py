"""
Analytics Controller
Main API endpoints for analytics event tracking and metrics
"""

import uuid
import structlog
from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify, current_app
from pydantic import ValidationError
from src.models.analytics_models import (
    AnalyticsEvent, MetricData, DashboardMetrics, 
    EventType, 
    EventBatchRequest, EventSearchRequest, EventSearchResponse,
    AnalyticsAggregation
)
from src.services.cache_service import CacheService
from src.services.aws_services import AWSServices, DynamoDBService, SNSService
from src.services.background_tasks import BackgroundTaskManager
from src.middleware.monitoring_middleware import (
    log_function_call, correlation_id_required, PerformanceProfiler,
    get_correlation_id, add_structured_context,
    RequestMonitoringMiddleware, 
    REQUEST_COUNT, REQUEST_DURATION
)
from prometheus_client import Counter, Histogram, Gauge

logger = structlog.get_logger(__name__)

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/v1/analytics')

# Prometheus metrics
events_counter = Counter('analytics_events_total', 'Total analytics events', ['event_type', 'source'])
api_requests = Counter('analytics_api_requests_total', 'Total API requests', ['endpoint', 'method'])
request_duration = Histogram('analytics_request_duration_seconds', 'Request duration', ['endpoint'])
active_sessions = Gauge('analytics_active_sessions', 'Number of active sessions')

# Initialize services with proper dependencies
aws_services = AWSServices()
dynamodb_service = DynamoDBService(aws_services)
sns_service = SNSService(aws_services)
cache_service = CacheService()
task_manager = BackgroundTaskManager()

@analytics_bp.route('/events', methods=['POST'])
@correlation_id_required
@log_function_call()
def track_event():
    """
    Track a single analytics event with enhanced validation and background processing
    """
    with PerformanceProfiler("track_event"):
        try:
            # Validate request data
            if not request.is_json:
                return jsonify({
                    'error': 'Content-Type must be application/json',
                    'correlation_id': get_correlation_id()
                }), 400
            
            event_data = request.get_json()
            
            # Create and validate event using Pydantic v2
            try:
                event = AnalyticsEvent(**event_data)
            except ValidationError as e:
                logger.warning(
                    "Event validation failed",
                    **add_structured_context(
                        validation_errors=e.errors(),
                        event_data=event_data
                    )
                )
                return jsonify({
                    'error': 'Invalid event data',
                    'details': e.errors(),
                    'correlation_id': get_correlation_id()
                }), 400
            
            # Process event synchronously for immediate feedback
            try:
                # Store in DynamoDB
                dynamodb_service.store_event(event)
                
                # Update real-time cache metrics
                cache_key = f"user_events:{event.user_id}:{event.event_day}"
                cache_service.increment_counter(cache_key, ttl=86400)
                
                # Dispatch background tasks for heavy processing
                task_id = task_manager.process_events_async(
                    [event.model_dump()], 
                    get_correlation_id()
                )
                
                logger.info(
                    "Event tracked successfully",
                    **add_structured_context(
                        event_id=event.event_id,
                        event_type=event.event_type,
                        user_id=event.user_id,
                        background_task_id=task_id
                    )
                )
                
                return jsonify({
                    'success': True,
                    'event_id': event.event_id,
                    'background_task_id': task_id,
                    'correlation_id': get_correlation_id(),
                    'computed_fields': {
                        'event_day': event.event_day,
                        'event_hour': event.event_hour,
                        'total_value': event.total_value
                    }
                }), 201
                
            except Exception as e:
                logger.error(
                    "Failed to store event",
                    **add_structured_context(
                        error=str(e),
                        event_id=event.event_id,
                        event_type=event.event_type
                    )
                )
                return jsonify({
                    'error': 'Failed to process event',
                    'correlation_id': get_correlation_id()
                }), 500
                
        except Exception as e:
            logger.error(
                "Unexpected error in track_event",
                **add_structured_context(error=str(e)),
                exc_info=True
            )
            return jsonify({
                'error': 'Internal server error',
                'correlation_id': get_correlation_id()
            }), 500

@analytics_bp.route('/events/batch', methods=['POST'])
@correlation_id_required
@log_function_call()
def track_event_batch():
    """
    Track multiple analytics events in a batch with optimized background processing
    """
    with PerformanceProfiler("track_event_batch"):
        try:
            if not request.is_json:
                return jsonify({
                    'error': 'Content-Type must be application/json',
                    'correlation_id': get_correlation_id()
                }), 400
            
            # Validate batch request
            try:
                batch_request = EventBatchRequest(**request.get_json())
            except ValidationError as e:
                logger.warning(
                    "Batch validation failed",
                    **add_structured_context(validation_errors=e.errors())
                )
                return jsonify({
                    'error': 'Invalid batch data',
                    'details': e.errors(),
                    'correlation_id': get_correlation_id()
                }), 400
            
            # Convert events to dict format for background processing
            events_data = [event.model_dump() for event in batch_request.events]
            
            # Dispatch to background task for processing
            task_id = task_manager.process_events_async(
                events_data, 
                get_correlation_id()
            )
            
            logger.info(
                "Event batch queued for processing",
                **add_structured_context(
                    event_count=len(events_data),
                    background_task_id=task_id
                )
            )
            
            return jsonify({
                'success': True,
                'queued_events': len(events_data),
                'background_task_id': task_id,
                'correlation_id': get_correlation_id(),
                'estimated_processing_time': f"{len(events_data) * 0.1:.1f} seconds"
            }), 202  # Accepted for processing
            
        except Exception as e:
            logger.error(
                "Unexpected error in track_event_batch",
                **add_structured_context(error=str(e)),
                exc_info=True
            )
            return jsonify({
                'error': 'Internal server error',
                'correlation_id': get_correlation_id()
            }), 500

@analytics_bp.route('/events/search', methods=['GET'])
@correlation_id_required
@log_function_call()
def search_events():
    """
    Search analytics events with advanced filtering and pagination
    """
    with PerformanceProfiler("search_events"):
        try:
            # Parse query parameters using Pydantic
            try:
                search_request = EventSearchRequest(
                    user_id=request.args.get('user_id'),
                    event_type=request.args.get('event_type'),
                    start_time=request.args.get('start_time'),
                    end_time=request.args.get('end_time'),
                    limit=int(request.args.get('limit', 100)),
                    offset=int(request.args.get('offset', 0))
                )
            except (ValidationError, ValueError) as e:
                return jsonify({
                    'error': 'Invalid search parameters',
                    'details': str(e),
                    'correlation_id': get_correlation_id()
                }), 400
            
            # Check cache first
            cache_key = f"event_search:{hash(str(search_request.model_dump()))}"
            cached_result = cache_service.get_json(cache_key)
            
            if cached_result:
                logger.info(
                    "Event search served from cache",
                    **add_structured_context(cache_key=cache_key)
                )
                return jsonify(cached_result)
            
            # Query events from DynamoDB
            events = dynamodb_service.search_events(
                user_id=search_request.user_id,
                event_type=search_request.event_type,
                start_time=search_request.start_time,
                end_time=search_request.end_time,
                limit=search_request.limit,
                offset=search_request.offset
            )
            
            # Get total count for pagination
            total_count = dynamodb_service.count_events(
                user_id=search_request.user_id,
                event_type=search_request.event_type,
                start_time=search_request.start_time,
                end_time=search_request.end_time
            )
            
            # Create response using Pydantic model
            response = EventSearchResponse(
                events=[AnalyticsEvent(**event) for event in events],
                total_count=total_count,
                has_more=(search_request.offset + len(events)) < total_count
            )
            
            response_data = response.model_dump(mode='json')
            response_data['correlation_id'] = get_correlation_id()
            
            # Cache the result for 5 minutes
            cache_service.set_json(cache_key, response_data, ttl=300)
            
            logger.info(
                "Event search completed",
                **add_structured_context(
                    returned_count=len(events),
                    total_count=total_count,
                    cache_key=cache_key
                )
            )
            
            return jsonify(response_data)
            
        except Exception as e:
            logger.error(
                "Unexpected error in search_events",
                **add_structured_context(error=str(e)),
                exc_info=True
            )
            return jsonify({
                'error': 'Internal server error',
                'correlation_id': get_correlation_id()
            }), 500

@analytics_bp.route('/dashboard/metrics', methods=['GET'])
@correlation_id_required
@log_function_call()
def get_dashboard_metrics():
    """
    Get dashboard metrics with real-time data and computed fields
    """
    with PerformanceProfiler("get_dashboard_metrics"):
        try:
            # Check cache first
            cache_key = "dashboard:metrics:current"
            cached_metrics = cache_service.get_json(cache_key)
            
            if cached_metrics:
                cached_metrics['correlation_id'] = get_correlation_id()
                cached_metrics['from_cache'] = True
                return jsonify(cached_metrics)
            
            # Get current time for calculations
            now = datetime.now(timezone.utc)
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            last_hour = now - timedelta(hours=1)
            last_24h = now - timedelta(hours=24)
            
            # Get metrics from various sources
            total_users = cache_service.get_counter("users:total") or 0
            active_sessions = cache_service.get_counter("sessions:active") or 0
            
            # Get event counts
            events_last_hour = dynamodb_service.count_events(start_time=last_hour)
            events_last_24h = dynamodb_service.count_events(start_time=last_24h)
            total_events = dynamodb_service.count_events()
            
            # Get revenue data
            revenue_last_24h = dynamodb_service.get_revenue_sum(start_time=last_24h)
            total_revenue = dynamodb_service.get_revenue_sum()
            
            # Get conversion funnel data
            funnel_data = dynamodb_service.get_conversion_funnel(start_time=today_start)
            
            # Create dashboard metrics using Pydantic model
            metrics = DashboardMetrics(
                total_users=total_users,
                active_sessions=active_sessions,
                total_revenue=total_revenue,
                total_events=total_events,
                events_last_hour=events_last_hour,
                events_last_24h=events_last_24h,
                revenue_last_24h=revenue_last_24h,
                new_users_today=funnel_data.get('new_users', 0),
                avg_response_time=cache_service.get_counter("performance:avg_response_time") or 0.0,
                error_rate=cache_service.get_counter("performance:error_rate") or 0.0,
                page_views=funnel_data.get('page_views', 0),
                add_to_carts=funnel_data.get('add_to_carts', 0),
                purchases=funnel_data.get('purchases', 0)
            )
            
            response_data = metrics.model_dump(mode='json')
            response_data['correlation_id'] = get_correlation_id()
            response_data['from_cache'] = False
            
            # Cache for 2 minutes
            cache_service.set_json(cache_key, response_data, ttl=120)
            
            logger.info(
                "Dashboard metrics generated",
                **add_structured_context(
                    total_events=total_events,
                    conversion_rate=metrics.conversion_rate,
                    avg_revenue_per_user=metrics.avg_revenue_per_user
                )
            )
            
            return jsonify(response_data)
            
        except Exception as e:
            logger.error(
                "Unexpected error in get_dashboard_metrics",
                **add_structured_context(error=str(e)),
                exc_info=True
            )
            return jsonify({
                'error': 'Internal server error',
                'correlation_id': get_correlation_id()
            }), 500

@analytics_bp.route('/aggregations/<period>', methods=['GET'])
@correlation_id_required
@log_function_call()
def get_aggregations(period: str):
    """
    Get time-based aggregations (hourly, daily, weekly, monthly)
    """
    with PerformanceProfiler(f"get_aggregations_{period}"):
        try:
            # Validate period
            valid_periods = ['minute', 'hour', 'day', 'week', 'month']
            if period not in valid_periods:
                return jsonify({
                    'error': f'Invalid period. Must be one of: {valid_periods}',
                    'correlation_id': get_correlation_id()
                }), 400
            
            # Parse optional parameters
            start_time = request.args.get('start_time')
            end_time = request.args.get('end_time')
            limit = int(request.args.get('limit', 100))
            
            # Check cache
            cache_key = f"aggregations:{period}:{start_time}:{end_time}:{limit}"
            cached_result = cache_service.get_json(cache_key)
            
            if cached_result:
                cached_result['correlation_id'] = get_correlation_id()
                cached_result['from_cache'] = True
                return jsonify(cached_result)
            
            # Query aggregations
            aggregations = dynamodb_service.get_aggregations(
                period=period,
                start_time=start_time,
                end_time=end_time,
                limit=limit
            )
            
            response_data = {
                'period': period,
                'aggregations': [agg.model_dump(mode='json') if hasattr(agg, 'model_dump') else agg for agg in aggregations],
                'count': len(aggregations),
                'correlation_id': get_correlation_id(),
                'from_cache': False
            }
            
            # Cache for appropriate duration based on period
            cache_ttl = {
                'minute': 60,      # 1 minute
                'hour': 300,       # 5 minutes  
                'day': 1800,       # 30 minutes
                'week': 3600,      # 1 hour
                'month': 7200      # 2 hours
            }
            
            cache_service.set_json(cache_key, response_data, ttl=cache_ttl.get(period, 300))
            
            logger.info(
                "Aggregations retrieved",
                **add_structured_context(
                    period=period,
                    count=len(aggregations),
                    cache_key=cache_key
                )
            )
            
            return jsonify(response_data)
            
        except Exception as e:
            logger.error(
                "Unexpected error in get_aggregations",
                **add_structured_context(error=str(e), period=period),
                exc_info=True
            )
            return jsonify({
                'error': 'Internal server error',
                'correlation_id': get_correlation_id()
            }), 500

@analytics_bp.route('/tasks/<task_id>/status', methods=['GET'])
@correlation_id_required
@log_function_call()
def get_task_status(task_id: str):
    """
    Get status of background task
    """
    try:
        task_status = task_manager.get_task_status(task_id)
        task_status['correlation_id'] = get_correlation_id()
        
        return jsonify(task_status)
        
    except Exception as e:
        logger.error(
            "Unexpected error in get_task_status",
            **add_structured_context(error=str(e), task_id=task_id),
            exc_info=True
        )
        return jsonify({
            'error': 'Internal server error',
            'correlation_id': get_correlation_id()
        }), 500

@analytics_bp.route('/aggregations/<period>/generate', methods=['POST'])
@correlation_id_required
@log_function_call()
def trigger_aggregation_generation(period: str):
    """
    Manually trigger aggregation generation for a specific period
    """
    try:
        # Validate period
        valid_periods = ['hour', 'day', 'week', 'month']
        if period not in valid_periods:
            return jsonify({
                'error': f'Invalid period. Must be one of: {valid_periods}',
                'correlation_id': get_correlation_id()
            }), 400
        
        # Get optional target time
        target_time = request.get_json().get('target_time') if request.is_json else None
        
        # Dispatch background task
        task_id = task_manager.generate_aggregations_async(period, target_time)
        
        logger.info(
            "Aggregation generation triggered",
            **add_structured_context(
                period=period,
                target_time=target_time,
                task_id=task_id
            )
        )
        
        return jsonify({
            'success': True,
            'period': period,
            'target_time': target_time,
            'task_id': task_id,
            'correlation_id': get_correlation_id()
        }), 202
        
    except Exception as e:
        logger.error(
            "Unexpected error in trigger_aggregation_generation",
            **add_structured_context(error=str(e), period=period),
            exc_info=True
        )
        return jsonify({
            'error': 'Internal server error',
            'correlation_id': get_correlation_id()
        }), 500

# Error handlers for the blueprint
@analytics_bp.errorhandler(ValidationError)
def handle_validation_error(error):
    """Handle Pydantic validation errors"""
    logger.warning(
        "Validation error",
        **add_structured_context(validation_errors=error.errors())
    )
    return jsonify({
        'error': 'Validation failed',
        'details': error.errors(),
        'correlation_id': get_correlation_id()
    }), 400

@analytics_bp.errorhandler(404)
def handle_not_found(error):
    """Handle 404 errors"""
    return jsonify({
        'error': 'Endpoint not found',
        'correlation_id': get_correlation_id()
    }), 404

@analytics_bp.errorhandler(405)
def handle_method_not_allowed(error):
    """Handle 405 errors"""
    return jsonify({
        'error': 'Method not allowed',
        'correlation_id': get_correlation_id()
    }), 405 