"""
Analytics Service - Main Application
Python 3.12 + Flask 3.x
Real-time Analytics and Event Tracking for E-Commerce Platform
"""

import os
import structlog
from flask import Flask, jsonify
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from flask_cors import CORS
from src.config.settings import Config
from src.controllers.analytics_controller import analytics_bp
from src.controllers.health_controller import health_bp
from src.controllers.chaos_controller import chaos_bp
from src.middleware.monitoring_middleware import RequestMonitoringMiddleware, get_metrics_endpoint
from src.services.background_tasks import celery_app

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)


def create_app(config_name: str = None) -> Flask:
    """
    Application factory with enhanced configuration and monitoring
    """
    app = Flask(__name__)
    
    # Load configuration
    settings = Config()
    
    # Configure structured logging
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    
    # Set Flask configuration
    app.config.update(
        DEBUG=settings.DEBUG,
        TESTING=getattr(settings, 'TESTING', False),
        SECRET_KEY=settings.SECRET_KEY,
        
        # Database configurations
        DYNAMODB_REGION=settings.AWS_REGION,
        REDIS_URL=settings.REDIS_URL,
        
        # Celery configuration
        CELERY_BROKER_URL=settings.REDIS_URL,
        CELERY_RESULT_BACKEND=settings.REDIS_URL,
        
        # Performance settings
        MAX_CONTENT_LENGTH=16 * 1024 * 1024,  # 16MB max request size
        JSON_SORT_KEYS=False,
        JSONIFY_PRETTYPRINT_REGULAR=settings.DEBUG,
    )
    
    # Initialize monitoring middleware
    monitoring = RequestMonitoringMiddleware(app, service_name="analytics-service")
    
    # Register blueprints
    app.register_blueprint(analytics_bp)
    app.register_blueprint(health_bp)
    app.register_blueprint(chaos_bp)
    
    # Add Prometheus metrics endpoint
    @app.route('/metrics')
    def metrics():
        """Prometheus metrics endpoint"""
        return generate_latest(), 200, {'Content-Type': CONTENT_TYPE_LATEST}
    
    # Add CORS headers
    @app.after_request
    def after_request(response):
        """Add CORS headers and security headers"""
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Correlation-ID'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        return response
    
    # Global error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'error': 'Resource not found',
            'message': 'The requested endpoint does not exist',
            'service': 'analytics-service'
        }), 404
    
    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({
            'error': 'Method not allowed',
            'message': 'The HTTP method is not allowed for this endpoint',
            'service': 'analytics-service'
        }), 405
    
    @app.errorhandler(413)
    def request_entity_too_large(error):
        return jsonify({
            'error': 'Request too large',
            'message': 'Request payload exceeds maximum size limit',
            'service': 'analytics-service'
        }), 413
    
    @app.errorhandler(429)
    def rate_limit_exceeded(error):
        return jsonify({
            'error': 'Rate limit exceeded',
            'message': 'Too many requests. Please try again later',
            'service': 'analytics-service'
        }), 429
    
    # Root endpoint
    @app.route('/')
    def root():
        """Root endpoint with service information"""
        return jsonify({
            'service': 'analytics-service',
            'version': '2.0.0',
            'status': 'running',
            'features': [
                'event-tracking',
                'batch-processing', 
                'real-time-analytics',
                'background-tasks',
                'prometheus-metrics',
                'structured-logging',
                'correlation-tracking'
            ],
            'endpoints': {
                'health': '/health',
                'metrics': '/metrics', 
                'events': '/api/v1/analytics/events',
                'dashboard': '/api/v1/analytics/dashboard/metrics',
                'search': '/api/v1/analytics/events/search',
                'aggregations': '/api/v1/analytics/aggregations/{period}',
                'load_test_metrics': '/api/v1/analytics/metrics/load-test',
                'load_test_start': '/api/v1/analytics/load-test/start',
                'load_test_stop': '/api/v1/analytics/load-test/stop',
                'load_test_status': '/api/v1/analytics/load-test/status',
                'load_test_scenarios': '/api/v1/analytics/load-test/scenarios',
                'load_test_results': '/api/v1/analytics/load-test/results/{test_id}',
                'artillery_start': '/api/v1/analytics/artillery/start',
                'artillery_stop': '/api/v1/analytics/artillery/stop', 
                'artillery_status': '/api/v1/analytics/artillery/status',
                'artillery_scenarios': '/api/v1/analytics/artillery/scenarios',
                'artillery_results': '/api/v1/analytics/artillery/results/{test_id}'
            }
        })
    
    # Initialize Celery with Flask app context
    celery_app.conf.update(app.config)
    
    class ContextTask(celery_app.Task):
        """Make celery tasks work with Flask app context."""
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)
    
    celery_app.Task = ContextTask
    
    # Log application startup
    logger = structlog.get_logger(__name__)
    logger.info(
        "Analytics service initialized",
        version="2.0.0",
        debug=settings.DEBUG,
        redis_url=settings.REDIS_URL,
        aws_region=settings.AWS_REGION,
        features_enabled=[
            'background_tasks',
            'prometheus_metrics', 
            'structured_logging',
            'correlation_tracking',
            'caching',
            'rate_limiting'
        ]
    )
    
    return app

# Create application instance
app = create_app()

if __name__ == '__main__':
    # Get settings
    settings = Config()
    
    # Run the application
    app.run(
        host='0.0.0.0',
        port=settings.PORT,
        debug=settings.DEBUG,
        threaded=True
    ) 