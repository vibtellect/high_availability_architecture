import time
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from functools import wraps
import structlog
from flask import Flask, request, Response, g, has_request_context
from prometheus_client import Counter, Histogram, Gauge, generate_latest
import psutil
import threading

# Prometheus metrics
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status_code', 'service']
)

REQUEST_DURATION = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint', 'service'],
    buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

ACTIVE_REQUESTS = Gauge(
    'http_requests_active',
    'Number of active HTTP requests',
    ['service']
)

SYSTEM_MEMORY_USAGE = Gauge(
    'system_memory_usage_bytes',
    'System memory usage in bytes',
    ['type']
)

SYSTEM_CPU_USAGE = Gauge(
    'system_cpu_usage_percent',
    'System CPU usage percentage'
)

ERROR_COUNT = Counter(
    'errors_total',
    'Total number of errors',
    ['error_type', 'service', 'endpoint']
)

# Logger
logger = structlog.get_logger(__name__)

class RequestMonitoringMiddleware:
    """
    Advanced request monitoring middleware with structured logging,
    Prometheus metrics, and correlation tracking
    """
    
    def __init__(self, app: Flask, service_name: str = "analytics-service"):
        self.app = app
        self.service_name = service_name
        self.setup_middleware()
        self.start_system_monitoring()
    
    def setup_middleware(self):
        """Setup Flask middleware hooks"""
        self.app.before_request(self.before_request)
        self.app.after_request(self.after_request)
        self.app.teardown_appcontext(self.teardown_request)
        self.app.errorhandler(Exception)(self.handle_exception)
    
    def before_request(self):
        """Called before each request"""
        # Generate correlation ID
        correlation_id = request.headers.get('X-Correlation-ID', str(uuid.uuid4()))
        g.correlation_id = correlation_id
        g.start_time = time.time()
        
        # Track active requests
        ACTIVE_REQUESTS.labels(service=self.service_name).inc()
        
        # Log request start
        logger.info(
            "Request started",
            correlation_id=correlation_id,
            method=request.method,
            endpoint=request.endpoint or 'unknown',
            path=request.path,
            user_agent=request.headers.get('User-Agent', ''),
            remote_addr=request.remote_addr,
            content_length=request.content_length,
            timestamp=datetime.now(timezone.utc).isoformat()
        )
    
    def after_request(self, response):
        """Called after each request"""
        if not has_request_context() or not hasattr(g, 'start_time'):
            return response
        
        # Calculate duration
        duration = time.time() - g.start_time
        
        # Add correlation ID to response headers
        if hasattr(g, 'correlation_id'):
            response.headers['X-Correlation-ID'] = g.correlation_id
        
        # Record metrics
        endpoint = request.endpoint or 'unknown'
        REQUEST_COUNT.labels(
            method=request.method,
            endpoint=endpoint,
            status_code=response.status_code,
            service=self.service_name
        ).inc()
        
        REQUEST_DURATION.labels(
            method=request.method,
            endpoint=endpoint,
            service=self.service_name
        ).observe(duration)
        
        ACTIVE_REQUESTS.labels(service=self.service_name).dec()
        
        # Log request completion
        logger.info(
            "Request completed",
            correlation_id=getattr(g, 'correlation_id', 'unknown'),
            method=request.method,
            endpoint=endpoint,
            path=request.path,
            status_code=response.status_code,
            duration_seconds=round(duration, 4),
            content_length=response.content_length,
            timestamp=datetime.now(timezone.utc).isoformat()
        )
        
        return response
    
    def teardown_request(self, exception=None):
        """Called when request context is torn down"""
        if exception:
            endpoint = request.endpoint or 'unknown'
            ERROR_COUNT.labels(
                error_type=type(exception).__name__,
                service=self.service_name,
                endpoint=endpoint
            ).inc()
            
            logger.error(
                "Request failed with exception",
                correlation_id=getattr(g, 'correlation_id', 'unknown'),
                exception=str(exception),
                exception_type=type(exception).__name__,
                endpoint=endpoint,
                path=request.path if has_request_context() else 'unknown',
                timestamp=datetime.now(timezone.utc).isoformat()
            )
    
    def handle_exception(self, error):
        """Global exception handler"""
        endpoint = request.endpoint or 'unknown'
        
        ERROR_COUNT.labels(
            error_type=type(error).__name__,
            service=self.service_name,
            endpoint=endpoint
        ).inc()
        
        logger.error(
            "Unhandled exception",
            correlation_id=getattr(g, 'correlation_id', 'unknown'),
            error=str(error),
            error_type=type(error).__name__,
            endpoint=endpoint,
            path=request.path,
            method=request.method,
            timestamp=datetime.now(timezone.utc).isoformat(),
            exc_info=True
        )
        
        # Return JSON error response
        return {
            'error': 'Internal server error',
            'correlation_id': getattr(g, 'correlation_id', 'unknown'),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }, 500
    
    def start_system_monitoring(self):
        """Start background thread for system metrics collection"""
        def collect_system_metrics():
            while True:
                try:
                    # Memory metrics
                    memory = psutil.virtual_memory()
                    SYSTEM_MEMORY_USAGE.labels(type='total').set(memory.total)
                    SYSTEM_MEMORY_USAGE.labels(type='used').set(memory.used)
                    SYSTEM_MEMORY_USAGE.labels(type='free').set(memory.free)
                    SYSTEM_MEMORY_USAGE.labels(type='cached').set(memory.cached)
                    
                    # CPU metrics
                    cpu_percent = psutil.cpu_percent(interval=1)
                    SYSTEM_CPU_USAGE.set(cpu_percent)
                    
                    time.sleep(30)  # Collect every 30 seconds
                    
                except Exception as e:
                    logger.error("Failed to collect system metrics", error=str(e))
                    time.sleep(60)  # Wait longer on error
        
        thread = threading.Thread(target=collect_system_metrics, daemon=True)
        thread.start()

def correlation_id_required(f):
    """Decorator to ensure correlation ID is present"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not hasattr(g, 'correlation_id'):
            g.correlation_id = str(uuid.uuid4())
        return f(*args, **kwargs)
    return decorated_function

def log_function_call(logger_name: Optional[str] = None):
    """Decorator for logging function calls with correlation tracking"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            func_logger = structlog.get_logger(logger_name or f.__module__)
            correlation_id = getattr(g, 'correlation_id', str(uuid.uuid4()))
            
            start_time = time.time()
            
            func_logger.info(
                f"Function call started: {f.__name__}",
                correlation_id=correlation_id,
                function=f.__name__,
                args_count=len(args),
                kwargs_keys=list(kwargs.keys()),
                timestamp=datetime.now(timezone.utc).isoformat()
            )
            
            try:
                result = f(*args, **kwargs)
                duration = time.time() - start_time
                
                func_logger.info(
                    f"Function call completed: {f.__name__}",
                    correlation_id=correlation_id,
                    function=f.__name__,
                    duration_seconds=round(duration, 4),
                    timestamp=datetime.now(timezone.utc).isoformat()
                )
                
                return result
                
            except Exception as e:
                duration = time.time() - start_time
                
                func_logger.error(
                    f"Function call failed: {f.__name__}",
                    correlation_id=correlation_id,
                    function=f.__name__,
                    duration_seconds=round(duration, 4),
                    error=str(e),
                    error_type=type(e).__name__,
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    exc_info=True
                )
                
                raise
        
        return decorated_function
    return decorator

class PerformanceProfiler:
    """Context manager for profiling code blocks"""
    
    def __init__(self, operation_name: str, logger_name: Optional[str] = None):
        self.operation_name = operation_name
        self.logger = structlog.get_logger(logger_name or __name__)
        self.start_time = None
        self.correlation_id = getattr(g, 'correlation_id', str(uuid.uuid4()))
    
    def __enter__(self):
        self.start_time = time.time()
        self.logger.info(
            f"Performance profiling started: {self.operation_name}",
            correlation_id=self.correlation_id,
            operation=self.operation_name,
            timestamp=datetime.now(timezone.utc).isoformat()
        )
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = time.time() - self.start_time
        
        if exc_type is None:
            self.logger.info(
                f"Performance profiling completed: {self.operation_name}",
                correlation_id=self.correlation_id,
                operation=self.operation_name,
                duration_seconds=round(duration, 4),
                timestamp=datetime.now(timezone.utc).isoformat()
            )
        else:
            self.logger.error(
                f"Performance profiling failed: {self.operation_name}",
                correlation_id=self.correlation_id,
                operation=self.operation_name,
                duration_seconds=round(duration, 4),
                error=str(exc_val),
                error_type=exc_type.__name__,
                timestamp=datetime.now(timezone.utc).isoformat()
            )

def get_metrics_endpoint():
    """Return Prometheus metrics endpoint content"""
    return generate_latest()

def get_correlation_id() -> str:
    """Get current correlation ID"""
    return getattr(g, 'correlation_id', str(uuid.uuid4()))

def add_structured_context(**kwargs) -> Dict[str, Any]:
    """Add structured context to logs"""
    context = {
        'correlation_id': get_correlation_id(),
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'service': 'analytics-service'
    }
    context.update(kwargs)
    return context 