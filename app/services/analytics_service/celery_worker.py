#!/usr/bin/env python3
"""
Celery worker startup script for Analytics Service
Handles background task processing with proper configuration
"""

import os
import sys
import signal
import logging
from typing import Optional

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.services.background_tasks import celery_app
from src.config.settings import Settings
import structlog

# Configure logging for Celery worker
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

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

class CeleryWorkerManager:
    """Manager for Celery worker lifecycle"""
    
    def __init__(self):
        self.settings = Settings()
        self.worker = None
        self.setup_signal_handlers()
    
    def setup_signal_handlers(self):
        """Setup signal handlers for graceful shutdown"""
        signal.signal(signal.SIGTERM, self.signal_handler)
        signal.signal(signal.SIGINT, self.signal_handler)
    
    def signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        logger.info(f"Received signal {signum}, initiating graceful shutdown...")
        if self.worker:
            self.worker.stop()
        sys.exit(0)
    
    def start_worker(self, 
                    worker_name: Optional[str] = None,
                    concurrency: Optional[int] = None,
                    queues: Optional[str] = None,
                    log_level: str = 'INFO'):
        """
        Start Celery worker with enhanced configuration
        
        Args:
            worker_name: Name of the worker (default: hostname)
            concurrency: Number of worker processes (default: CPU count)
            queues: Comma-separated list of queues to consume from
            log_level: Logging level
        """
        
        # Determine worker configuration
        worker_name = worker_name or f"analytics-worker@{os.uname().nodename}"
        concurrency = concurrency or os.cpu_count()
        queues = queues or "high_priority,aggregations,notifications,maintenance"
        
        # Log startup configuration
        logger.info(
            "Starting Celery worker",
            worker_name=worker_name,
            concurrency=concurrency,
            queues=queues,
            log_level=log_level,
            redis_host=self.settings.redis_host,
            redis_port=self.settings.redis_port,
            redis_db=self.settings.redis_db
        )
        
        # Configure Celery app
        celery_app.conf.update(
            worker_log_format='[%(asctime)s: %(levelname)s/%(processName)s] %(message)s',
            worker_task_log_format='[%(asctime)s: %(levelname)s/%(processName)s][%(task_name)s(%(task_id)s)] %(message)s',
            worker_hijack_root_logger=False,
            worker_redirect_stdouts=False,
        )
        
        # Start worker with configuration
        try:
            self.worker = celery_app.Worker(
                hostname=worker_name,
                concurrency=concurrency,
                queues=queues.split(','),
                loglevel=log_level.upper(),
                optimization='fair',
                pool='prefork',  # Use prefork pool for better isolation
                # Enable events for monitoring
                send_events=True,
                # Prefetch settings for better performance
                prefetch_multiplier=1,
                # Heartbeat settings
                worker_heartbeat_interval=30,
                # Task execution settings
                task_time_limit=1200,      # 20 minutes hard limit
                task_soft_time_limit=600,  # 10 minutes soft limit
                # Memory management
                worker_max_tasks_per_child=1000,  # Restart after 1000 tasks
                worker_disable_rate_limits=False,
                # Enable result backend
                result_persistent=True,
            )
            
            logger.info("Celery worker started successfully")
            self.worker.start()
            
        except Exception as e:
            logger.error(f"Failed to start Celery worker: {e}", exc_info=True)
            sys.exit(1)

def start_beat_scheduler():
    """Start Celery Beat scheduler for periodic tasks"""
    logger.info("Starting Celery Beat scheduler")
    
    try:
        # Use the proper way to start celery beat as documented
        # This is equivalent to: celery -A src.services.background_tasks:celery_app beat
        import os
        import subprocess
        import sys
        
        # Get the current environment
        env = os.environ.copy()
        
        # Construct the command
        cmd = [
            sys.executable, '-m', 'celery',
            '-A', 'src.services.background_tasks:celery_app',
            'beat',
            '--loglevel=INFO',
            '--pidfile=/tmp/celerybeat.pid',
            '--schedule=/tmp/celerybeat-schedule'
        ]
        
        logger.info("Starting Celery Beat with command", cmd=cmd)
        
        # Execute the command
        subprocess.run(cmd, env=env, check=True)
        
    except KeyboardInterrupt:
        logger.info("Celery Beat scheduler stopped by user")
    except Exception as e:
        logger.error(f"Failed to start Celery Beat: {e}", exc_info=True)
        sys.exit(1)

def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Analytics Service Celery Worker')
    parser.add_argument('--name', type=str, help='Worker name')
    parser.add_argument('--concurrency', type=int, help='Number of worker processes')
    parser.add_argument('--queues', type=str, help='Comma-separated list of queues')
    parser.add_argument('--log-level', type=str, default='INFO', 
                       choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
                       help='Log level')
    parser.add_argument('--beat', action='store_true', 
                       help='Start Beat scheduler instead of worker')
    
    args = parser.parse_args()
    
    if args.beat:
        start_beat_scheduler()
    else:
        manager = CeleryWorkerManager()
        manager.start_worker(
            worker_name=args.name,
            concurrency=args.concurrency,
            queues=args.queues,
            log_level=args.log_level
        )

if __name__ == '__main__':
    main() 