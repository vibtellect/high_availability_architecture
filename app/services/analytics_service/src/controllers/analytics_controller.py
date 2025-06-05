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

@analytics_bp.route('/metrics/load-test', methods=['GET'])
@correlation_id_required
@log_function_call()
def get_load_test_metrics():
    """
    Get current load test metrics for the frontend dashboard
    """
    try:
        # Get load test metrics from cache or generate mock data
        cache_key = "load_test_metrics"
        cached_metrics = cache_service.get(cache_key)
        
        if cached_metrics:
            return jsonify(cached_metrics), 200
        
        # Generate realistic mock metrics
        import random
        metrics = {
            'timestamp': datetime.utcnow().isoformat(),
            'metrics': {
                'requests_per_second': random.randint(80, 120),
                'average_response_time': random.randint(120, 250),
                'error_rate': random.uniform(0.1, 2.5),
                'active_users': random.randint(50, 200),
                'cpu_usage': random.uniform(25, 75),
                'memory_usage': random.uniform(40, 80)
            },
            'services': {
                'product-service': {
                    'status': 'healthy' if random.random() > 0.1 else 'degraded',
                    'response_time': random.randint(80, 200),
                    'requests': random.randint(1000, 5000)
                },
                'user-service': {
                    'status': 'healthy' if random.random() > 0.05 else 'degraded',
                    'response_time': random.randint(90, 180),
                    'requests': random.randint(800, 3000)
                },
                'checkout-service': {
                    'status': 'healthy' if random.random() > 0.15 else 'degraded',
                    'response_time': random.randint(100, 300),
                    'requests': random.randint(500, 2000)
                },
                'analytics-service': {
                    'status': 'healthy' if random.random() > 0.02 else 'degraded',
                    'response_time': random.randint(70, 150),
                    'requests': random.randint(2000, 8000)
                }
            }
        }
        
        # Cache for 2 seconds
        cache_service.set(cache_key, metrics, ttl=2)
        
        return jsonify(metrics), 200
        
    except Exception as e:
        logger.error(
            "Failed to get load test metrics",
            **add_structured_context(error=str(e)),
            exc_info=True
        )
        return jsonify({
            'error': 'Failed to retrieve load test metrics',
            'correlation_id': get_correlation_id()
        }), 500

@analytics_bp.route('/chaos-status', methods=['GET'])
@correlation_id_required  
@log_function_call()
def get_chaos_status():
    """
    Get current chaos engineering status - proxy to chaos controller
    """
    try:
        # Import chaos state from chaos controller
        from src.controllers.chaos_controller import chaos_state
        
        return jsonify({
            'timestamp': datetime.utcnow().isoformat(),
            'chaos_engineering': {
                'active': chaos_state['active'],
                'scenario': chaos_state.get('experiment_type', 'none'),
                'affected_services': chaos_state.get('affected_services', []),
                'start_time': chaos_state.get('start_time', ''),
                'impact_level': chaos_state.get('impact_level', 'low')
            },
            'system_resilience': {
                'circuit_breakers_triggered': chaos_state['circuit_breakers_triggered'],
                'auto_recovery_attempts': chaos_state['auto_recovery_attempts'],
                'service_health_scores': chaos_state['service_health_scores']
            }
        }), 200
        
    except Exception as e:
        logger.error(
            "Failed to get chaos status",
            **add_structured_context(error=str(e)),
            exc_info=True
        )
        return jsonify({
            'error': 'Failed to retrieve chaos status',
            'correlation_id': get_correlation_id()
        }), 500

@analytics_bp.route('/load-test/scenarios-simple', methods=['GET'])
@correlation_id_required
@log_function_call()
def get_load_test_scenarios_simple():
    """Get available k6 load test scenarios - simple version"""
    return jsonify({
        'success': True,
        'scenarios': {
            'baseline': 'microservices-load-test.js',
            'spike': 'spike-test.js',
            'stress': 'stress-test.js'
        },
        'correlation_id': get_correlation_id()
    }), 200

@analytics_bp.route('/load-test/start', methods=['POST'])
@correlation_id_required
@log_function_call()
def start_load_test():
    """Start k6 load test by executing k6 container with proper configuration"""
    try:
        import subprocess
        import time
        import os
        import tempfile
        
        # Get configuration from request
        config = request.get_json() or {}
        duration = config.get('duration', 60)  # seconds
        target_vus = config.get('vus', config.get('rps', 10))  # Use VUs instead of RPS
        target_service = config.get('target', 'all-services')
        test_type = config.get('type', 'baseline')  # baseline, spike, stress
        
        # Generate unique test ID
        test_id = f"k6-test-{int(time.time())}"
        
        logger.info(f"Starting k6 load test {test_id}: {target_service}, {target_vus} VUs, {duration}s")
        
        # Select appropriate k6 script based on test type
        script_map = {
            'baseline': 'microservices-load-test.js',
            'spike': 'spike-test.js', 
            'stress': 'stress-test.js',
            'api': 'api-load-test.js'
        }
        
        script_file = script_map.get(test_type, 'microservices-load-test.js')
        
        # Execute k6 in Docker container with proper environment variables
        k6_command = [
            'docker', 'exec', '-d', 'k6-load-tester',
            'k6', 'run',
            '--out', 'experimental-prometheus-rw',
            '--env', f'DURATION={duration}',
            '--env', f'TARGET_VUS={target_vus}',
            '--env', f'TARGET_SERVICE={target_service}',
            '--env', f'TEST_ID={test_id}',
            f'/scripts/{script_file}'
        ]
        
        # Execute the command
        process = subprocess.run(k6_command, capture_output=True, text=True, timeout=30)
        
        if process.returncode == 0:
            logger.info(f"k6 load test {test_id} started successfully")
            
            # Store test state in cache for tracking
            test_state = {
                'test_id': test_id,
                'status': 'running',
                'start_time': time.time(),
                'configuration': {
                    'duration': duration,
                    'target_vus': target_vus,
                    'target_service': target_service,
                    'test_type': test_type,
                    'script_file': script_file
                },
                'expected_end_time': time.time() + duration + 60  # Add buffer for ramp-up/down
            }
            
            # Store in Redis cache for status tracking
            try:
                from src.services.cache_service import cache_service
                cache_service.set_value(f"k6_test_state:{test_id}", test_state, ttl=duration + 300)
                cache_service.set_value("k6_active_test", test_id, ttl=duration + 300)
            except Exception as cache_error:
                logger.warning(f"Failed to cache test state: {cache_error}")
            
            return jsonify({
                'success': True,
                'status': 'started',
                'test_id': test_id,
                'message': f'k6 load test started successfully with {target_vus} VUs for {duration}s',
                'configuration': test_state['configuration'],
                'expected_duration': duration,
                'correlation_id': get_correlation_id()
            }), 200
        else:
            logger.error(f"Failed to start k6 test: {process.stderr}")
            return jsonify({
                'success': False,
                'error': f'Failed to start k6 container: {process.stderr}',
                'correlation_id': get_correlation_id()
            }), 500

    except subprocess.TimeoutExpired:
        logger.error("k6 start command timed out")
        return jsonify({
            'success': False,
            'error': 'k6 start command timed out',
            'correlation_id': get_correlation_id()
        }), 500
    except Exception as e:
        logger.error(f"Failed to start k6 load test: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'correlation_id': get_correlation_id()
        }), 500

@analytics_bp.route('/load-test/stop', methods=['POST'])
@correlation_id_required
@log_function_call()
def stop_load_test():
    """Stop any running k6 load tests"""
    try:
        import subprocess
        
        logger.info("Stopping all k6 load tests")
        
        # Kill any running k6 processes in the container
        stop_command = [
            'docker', 'exec', 'k6-load-tester',
            'pkill', '-f', 'k6'
        ]
        
        process = subprocess.run(stop_command, capture_output=True, text=True, timeout=10)
        
        # Clean up active test state from cache
        try:
            from src.services.cache_service import cache_service
            active_test_id = cache_service.get_value("k6_active_test")
            if active_test_id:
                cache_service.delete_value(f"k6_test_state:{active_test_id}")
                cache_service.delete_value("k6_active_test")
                logger.info(f"Cleaned up test state for {active_test_id}")
        except Exception as cache_error:
            logger.warning(f"Failed to clean up cache: {cache_error}")
        
        return jsonify({
            'success': True,
            'status': 'stopped',
            'message': 'All k6 load tests stopped successfully',
            'correlation_id': get_correlation_id()
        }), 200

    except subprocess.TimeoutExpired:
        logger.error("k6 stop command timed out")
        return jsonify({
            'success': False,
            'error': 'k6 stop command timed out',
            'correlation_id': get_correlation_id()
        }), 500
    except Exception as e:
        logger.error(f"Failed to stop k6 load test: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'correlation_id': get_correlation_id()
        }), 500

@analytics_bp.route('/load-test/status', methods=['GET'])
@correlation_id_required
@log_function_call()
def get_load_test_status():
    """Get current k6 load test status with real-time information"""
    try:
        import subprocess
        import time
        
        # Check if k6 process is running in container
        check_command = [
            'docker', 'exec', 'k6-load-tester',
            'pgrep', '-f', 'k6'
        ]
        
        process = subprocess.run(check_command, capture_output=True, text=True, timeout=5)
        is_k6_running = process.returncode == 0
        
        # Get test state from cache
        test_state = None
        active_test_id = None
        
        try:
            from src.services.cache_service import cache_service
            active_test_id = cache_service.get_value("k6_active_test")
            if active_test_id:
                test_state = cache_service.get_value(f"k6_test_state:{active_test_id}")
        except Exception as cache_error:
            logger.warning(f"Failed to get test state from cache: {cache_error}")
        
        if test_state and is_k6_running:
            # Calculate progress
            current_time = time.time()
            elapsed = current_time - test_state['start_time']
            duration = test_state['configuration']['duration']
            progress = min(100, (elapsed / (duration + 60)) * 100)  # Include ramp-up/down
            
            # Check if test should be finished
            if current_time > test_state['expected_end_time']:
                is_k6_running = False
                status = 'completed'
            else:
                status = 'running'
            
            return jsonify({
                'success': True,
                'status': status,
                'test_id': active_test_id,
                'active_tests': 1,
                'progress': round(progress, 1),
                'elapsed_time': round(elapsed, 1),
                'remaining_time': max(0, round(test_state['expected_end_time'] - current_time, 1)),
                'configuration': test_state['configuration'],
                'is_k6_running': is_k6_running,
                'message': f'k6 test {active_test_id} is {status}',
                'correlation_id': get_correlation_id()
            }), 200
        
        elif test_state and not is_k6_running:
            # Test finished, clean up
            try:
                from src.services.cache_service import cache_service
                cache_service.delete_value(f"k6_test_state:{active_test_id}")
                cache_service.delete_value("k6_active_test")
            except Exception:
                pass
            
            return jsonify({
                'success': True,
                'status': 'completed',
                'test_id': active_test_id,
                'active_tests': 0,
                'message': f'k6 test {active_test_id} completed',
                'correlation_id': get_correlation_id()
            }), 200
        
        else:
            # No active tests
            return jsonify({
                'success': True,
                'status': 'idle',
                'active_tests': 0,
                'is_k6_running': is_k6_running,
                'message': 'No active k6 load tests',
                'correlation_id': get_correlation_id()
            }), 200

    except subprocess.TimeoutExpired:
        logger.error("k6 status check timed out")
        return jsonify({
            'success': False,
            'error': 'k6 status check timed out',
            'correlation_id': get_correlation_id()
        }), 500
    except Exception as e:
        logger.error(f"Failed to get k6 load test status: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'correlation_id': get_correlation_id()
        }), 500

@analytics_bp.route('/load-test/test', methods=['GET'])
@correlation_id_required
@log_function_call()
def test_k6_endpoint():
    """Simple test endpoint to verify k6 API routing"""
    return jsonify({
        'success': True,
        'message': 'k6 Test endpoint working',
        'correlation_id': get_correlation_id()
    }), 200

@analytics_bp.route('/load-test/scenarios', methods=['GET'])
@correlation_id_required
@log_function_call()
def get_load_test_scenarios():
    """Get available k6 load test scenarios and their configurations"""
    return jsonify({
        'success': True,
        'message': 'k6 scenarios endpoint working',
        'correlation_id': get_correlation_id()
    }), 200

@analytics_bp.route('/load-test/metrics', methods=['GET'])
@correlation_id_required
@log_function_call()
def get_load_test_results():
    """Get k6 load test results from Prometheus metrics"""
    try:
        import requests
        import time
        
        # Query Prometheus for k6 metrics
        prometheus_url = "http://prometheus:9090"
        
        # Get recent k6 metrics (last 5 minutes)
        end_time = time.time()
        start_time = end_time - 300  # 5 minutes ago
        
        queries = {
            'request_rate': 'rate(k6_http_reqs_total[1m])',
            'error_rate': 'rate(k6_http_reqs_total{status!~"2.."}[1m]) / rate(k6_http_reqs_total[1m])',
            'response_time_p95': 'k6_http_req_duration{quantile="0.95"}',
            'response_time_avg': 'k6_http_req_duration{quantile="0.5"}',
            'active_vus': 'k6_vus'
        }
        
        metrics = {}
        
        for metric_name, query in queries.items():
            try:
                response = requests.get(
                    f"{prometheus_url}/api/v1/query",
                    params={
                        'query': query,
                        'time': end_time
                    },
                    timeout=5
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data['status'] == 'success' and data['data']['result']:
                        metrics[metric_name] = {
                            'value': float(data['data']['result'][0]['value'][1]),
                            'timestamp': data['data']['result'][0]['value'][0]
                        }
                    else:
                        metrics[metric_name] = {'value': 0, 'timestamp': end_time}
                else:
                    metrics[metric_name] = {'value': 0, 'timestamp': end_time}
                    
            except Exception as query_error:
                logger.warning(f"Failed to query {metric_name}: {query_error}")
                metrics[metric_name] = {'value': 0, 'timestamp': end_time}
        
        return jsonify({
            'success': True,
            'metrics': metrics,
            'timestamp': end_time,
            'prometheus_available': True,
            'correlation_id': get_correlation_id()
        }), 200

    except Exception as e:
        logger.error(f"Failed to get k6 load test metrics: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'metrics': {
                'request_rate': {'value': 0, 'timestamp': time.time()},
                'error_rate': {'value': 0, 'timestamp': time.time()},
                'response_time_p95': {'value': 0, 'timestamp': time.time()},
                'response_time_avg': {'value': 0, 'timestamp': time.time()},
                'active_vus': {'value': 0, 'timestamp': time.time()}
            },
            'prometheus_available': False,
            'correlation_id': get_correlation_id()
        }), 500

@analytics_bp.route('/artillery/start', methods=['POST'])
@correlation_id_required
@log_function_call()
def start_artillery_test():
    """Start Artillery user journey test with specified scenario"""
    try:
        import subprocess
        import json
        import os
        
        # Get configuration from request
        config = request.get_json() or {}
        scenario = config.get('scenario', 'complete-purchase-flow')  # Default scenario
        duration = config.get('duration', 300)  # 5 minutes default
        arrival_rate = config.get('arrivalRate', 10)
        ramp_to = config.get('rampTo', 20)
        
        # Available Artillery scenarios
        available_scenarios = {
            'complete-purchase-flow': 'complete-purchase-flow.yml',
            'anonymous-to-purchase': 'anonymous-to-purchase.yml',
            'quick-purchase': 'complete-purchase-flow.yml',  # Use same script, different config
        }
        
        if scenario not in available_scenarios:
            return jsonify({
                'success': False,
                'error': f'Invalid scenario. Available: {list(available_scenarios.keys())}',
                'correlation_id': get_correlation_id()
            }), 400
        
        script_file = available_scenarios[scenario]
        
        # Create temporary config override if needed
        temp_config = {
            'config': {
                'target': 'http://api-gateway',
                'phases': [
                    {
                        'duration': duration,
                        'arrivalRate': arrival_rate,
                        'rampTo': ramp_to,
                        'name': f'Custom {scenario} test'
                    }
                ]
            }
        }
        
        # Docker command to run Artillery
        docker_cmd = [
            'docker', 'exec', 'artillery-user-journey',
            'artillery', 'run',
            f'/scripts/{script_file}',
            '--output', f'/tmp/artillery-results-{scenario}-{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        ]
        
        # Start Artillery in background
        process = subprocess.Popen(
            docker_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Store test metadata
        test_metadata = {
            'test_id': f'artillery-{scenario}-{datetime.now().strftime("%Y%m%d_%H%M%S")}',
            'scenario': scenario,
            'script_file': script_file,
            'config': config,
            'status': 'running',
            'start_time': datetime.now().isoformat(),
            'process_id': process.pid,
            'expected_duration': duration,
            'correlation_id': get_correlation_id()
        }
        
        return jsonify({
            'success': True,
            'message': f'Artillery {scenario} test started successfully',
            'test_metadata': test_metadata,
            'correlation_id': get_correlation_id()
        }), 200
        
    except subprocess.CalledProcessError as e:
        return jsonify({
            'success': False,
            'error': f'Failed to start Artillery test: {str(e)}',
            'correlation_id': get_correlation_id()
        }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Unexpected error: {str(e)}',
            'correlation_id': get_correlation_id()
        }), 500

@analytics_bp.route('/artillery/scenarios', methods=['GET'])
@correlation_id_required
@log_function_call()
def get_artillery_scenarios():
    """Get available Artillery user journey scenarios"""
    try:
        scenarios = {
            'complete-purchase-flow': {
                'name': 'Complete Purchase Journey',
                'description': 'Full user registration, product browsing, cart management, and checkout flow',
                'script': 'complete-purchase-flow.yml',
                'estimated_duration': '10-20 minutes per user journey',
                'user_scenarios': [
                    'Complete Purchase Journey (70% weight)',
                    'Quick Browse and Exit (20% weight)', 
                    'Returning User Quick Purchase (10% weight)'
                ],
                'key_metrics': [
                    'User registration conversion rate',
                    'Cart abandonment rate',
                    'End-to-end purchase completion time',
                    'Payment processing success rate'
                ],
                'recommended_config': {
                    'duration': 600,
                    'arrivalRate': 10,
                    'rampTo': 20
                }
            },
            'anonymous-to-purchase': {
                'name': 'Anonymous Browse to Purchase',
                'description': 'Anonymous users browsing and converting to registered buyers',
                'script': 'anonymous-to-purchase.yml',
                'estimated_duration': '5-15 minutes per user journey',
                'user_scenarios': [
                    'Anonymous Browse to Purchase (60% weight)',
                    'Anonymous Browse and Abandon (30% weight)',
                    'Anonymous Research Heavy Browse (10% weight)'
                ],
                'key_metrics': [
                    'Anonymous to registered conversion rate',
                    'Browse abandonment patterns',
                    'Search behavior analysis',
                    'Registration trigger points'
                ],
                'recommended_config': {
                    'duration': 300,
                    'arrivalRate': 15,
                    'rampTo': 25
                }
            }
        }
        
        return jsonify({
            'success': True,
            'scenarios': scenarios,
            'correlation_id': get_correlation_id()
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to retrieve scenarios: {str(e)}',
            'correlation_id': get_correlation_id()
        }), 500

@analytics_bp.route('/artillery/status', methods=['GET'])
@correlation_id_required  
@log_function_call()
def get_artillery_status():
    """Get current Artillery test status and running processes"""
    try:
        import subprocess
        
        # Check for running artillery processes
        docker_cmd = ['docker', 'exec', 'artillery-user-journey', 'ps', 'aux']
        
        try:
            result = subprocess.run(docker_cmd, capture_output=True, text=True, timeout=10)
            processes = result.stdout
            
            # Look for artillery processes
            artillery_running = 'artillery' in processes and 'run' in processes
            
            # Get container stats
            stats_cmd = ['docker', 'stats', 'artillery-user-journey', '--no-stream', '--format', 'json']
            stats_result = subprocess.run(stats_cmd, capture_output=True, text=True, timeout=5)
            
            container_stats = {}
            if stats_result.returncode == 0:
                try:
                    container_stats = json.loads(stats_result.stdout)
                except:
                    container_stats = {'error': 'Failed to parse stats'}
            
            status_info = {
                'artillery_running': artillery_running,
                'container_status': 'running' if artillery_running else 'idle',
                'container_stats': container_stats,
                'processes': processes.split('\\n') if processes else [],
                'timestamp': datetime.now().isoformat(),
                'correlation_id': get_correlation_id()
            }
            
            return jsonify({
                'success': True,
                'status': status_info,
                'correlation_id': get_correlation_id()
            }), 200
            
        except subprocess.TimeoutExpired:
            return jsonify({
                'success': False,
                'error': 'Timeout while checking Artillery status',
                'correlation_id': get_correlation_id()
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to get Artillery status: {str(e)}',
            'correlation_id': get_correlation_id()
        }), 500

@analytics_bp.route('/artillery/stop', methods=['POST'])
@correlation_id_required
@log_function_call()
def stop_artillery_test():
    """Stop any running Artillery tests"""
    try:
        import subprocess
        
        # Kill artillery processes in container
        kill_cmd = ['docker', 'exec', 'artillery-user-journey', 'pkill', '-f', 'artillery']
        
        try:
            subprocess.run(kill_cmd, capture_output=True, text=True, timeout=10)
            
            return jsonify({
                'success': True,
                'message': 'Artillery tests stopped successfully',
                'correlation_id': get_correlation_id()
            }), 200
            
        except subprocess.TimeoutExpired:
            return jsonify({
                'success': False,
                'error': 'Timeout while stopping Artillery',
                'correlation_id': get_correlation_id()
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to stop Artillery tests: {str(e)}',
            'correlation_id': get_correlation_id()
        }), 500

@analytics_bp.route('/artillery/results/<test_id>', methods=['GET'])
@correlation_id_required
@log_function_call()
def get_artillery_results(test_id):
    """Get Artillery test results for a specific test ID"""
    try:
        import subprocess
        import json
        
        # Look for result files in container
        find_cmd = ['docker', 'exec', 'artillery-user-journey', 'find', '/tmp', '-name', f'*{test_id}*.json']
        
        result = subprocess.run(find_cmd, capture_output=True, text=True, timeout=10)
        
        if result.returncode != 0 or not result.stdout.strip():
            return jsonify({
                'success': False,
                'error': f'No results found for test ID: {test_id}',
                'correlation_id': get_correlation_id()
            }), 404
        
        result_file = result.stdout.strip().split('\\n')[0]  # Get first match
        
        # Read the result file
        cat_cmd = ['docker', 'exec', 'artillery-user-journey', 'cat', result_file]
        cat_result = subprocess.run(cat_cmd, capture_output=True, text=True, timeout=10)
        
        if cat_result.returncode != 0:
            return jsonify({
                'success': False,
                'error': f'Failed to read results file: {result_file}',
                'correlation_id': get_correlation_id()
            }), 500
        
        try:
            test_results = json.loads(cat_result.stdout)
            
            return jsonify({
                'success': True,
                'test_id': test_id,
                'results': test_results,
                'result_file': result_file,
                'correlation_id': get_correlation_id()
            }), 200
            
        except json.JSONDecodeError:
            return jsonify({
                'success': False,
                'error': 'Invalid JSON in results file',
                'correlation_id': get_correlation_id()
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to retrieve results: {str(e)}',
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