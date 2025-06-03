"""
Chaos Engineering Controller - Analytics Service
Provides endpoints for chaos experiments and system resilience testing
"""

import os
import time
import random
import threading
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request
from prometheus_client import Counter, Gauge, Histogram
import structlog

# Initialize structured logger
logger = structlog.get_logger(__name__)

# Prometheus metrics for chaos engineering
chaos_experiments_total = Counter('chaos_experiments_total', 'Total chaos experiments started', ['experiment_type', 'service'])
chaos_experiment_active = Gauge('chaos_experiment_active', 'Currently active chaos experiment')
chaos_impact_level = Gauge('chaos_impact_level', 'Current chaos experiment impact level')
circuit_breaker_triggered_total = Counter('circuit_breaker_triggered_total', 'Total circuit breaker triggers')
auto_recovery_attempts_total = Counter('auto_recovery_attempts_total', 'Total auto recovery attempts')
service_health_score = Gauge('service_health_score', 'Service health score', ['service'])

# Create blueprint
chaos_bp = Blueprint('chaos', __name__, url_prefix='/api/v1/chaos')

# Global chaos state
chaos_state = {
    'active': False,
    'experiment_id': None,
    'experiment_type': None,
    'target_service': None,
    'start_time': None,
    'duration': 0,
    'intensity': 1,
    'impact_level': 'low',
    'affected_services': [],
    'circuit_breakers_triggered': 0,
    'auto_recovery_attempts': 0,
    'service_health_scores': {
        'product-service': 95.0,
        'user-service': 98.0,
        'checkout-service': 92.0,
        'analytics-service': 97.0
    }
}

def simulate_chaos_impact(experiment_type, intensity, duration):
    """Background thread to simulate chaos engineering impact"""
    global chaos_state
    
    logger.info(
        "Starting chaos experiment simulation",
        experiment_type=experiment_type,
        intensity=intensity,
        duration=duration
    )
    
    # Simulate different types of chaos
    if experiment_type == 'latency':
        # Simulate network latency impact
        for i in range(duration):
            if not chaos_state['active']:
                break
            
            # Degrade service health based on intensity
            degradation = intensity * 2  # 2-20% degradation
            for service in chaos_state['affected_services']:
                if service in chaos_state['service_health_scores']:
                    current_score = chaos_state['service_health_scores'][service]
                    chaos_state['service_health_scores'][service] = max(50, current_score - degradation)
                    service_health_score.labels(service=service).set(chaos_state['service_health_scores'][service])
            
            # Trigger circuit breakers randomly based on intensity
            if random.random() < (intensity / 20):  # 5-50% chance
                chaos_state['circuit_breakers_triggered'] += 1
                circuit_breaker_triggered_total.inc()
                logger.warn("Circuit breaker triggered due to chaos experiment")
            
            time.sleep(1)
    
    elif experiment_type == 'error':
        # Simulate error injection
        for i in range(duration):
            if not chaos_state['active']:
                break
            
            # Higher error rates = more recovery attempts
            if random.random() < (intensity / 10):  # 10-100% chance
                chaos_state['auto_recovery_attempts'] += 1
                auto_recovery_attempts_total.inc()
                logger.info("Auto recovery attempt triggered")
            
            # Degrade health scores
            degradation = intensity * 3  # 3-30% degradation
            for service in chaos_state['affected_services']:
                if service in chaos_state['service_health_scores']:
                    current_score = chaos_state['service_health_scores'][service]
                    chaos_state['service_health_scores'][service] = max(30, current_score - degradation)
                    service_health_score.labels(service=service).set(chaos_state['service_health_scores'][service])
            
            time.sleep(1)
    
    elif experiment_type == 'resource_exhaustion':
        # Simulate CPU/Memory pressure
        for i in range(duration):
            if not chaos_state['active']:
                break
            
            # Severe impact on performance
            degradation = intensity * 4  # 4-40% degradation
            for service in chaos_state['affected_services']:
                if service in chaos_state['service_health_scores']:
                    current_score = chaos_state['service_health_scores'][service]
                    chaos_state['service_health_scores'][service] = max(20, current_score - degradation)
                    service_health_score.labels(service=service).set(chaos_state['service_health_scores'][service])
            
            # Trigger more circuit breakers
            if random.random() < (intensity / 15):  # 6.7-66.7% chance
                chaos_state['circuit_breakers_triggered'] += 1
                circuit_breaker_triggered_total.inc()
            
            time.sleep(1)
    
    # Recovery simulation
    logger.info("Starting chaos experiment recovery")
    recovery_time = min(30, intensity * 3)  # 3-30 seconds recovery
    
    for i in range(recovery_time):
        if not chaos_state['active']:
            break
        
        # Gradually restore health scores
        for service in chaos_state['affected_services']:
            if service in chaos_state['service_health_scores']:
                target_score = {
                    'product-service': 95.0,
                    'user-service': 98.0,
                    'checkout-service': 92.0,
                    'analytics-service': 97.0
                }.get(service, 90.0)
                
                current_score = chaos_state['service_health_scores'][service]
                improvement = (target_score - current_score) / recovery_time
                new_score = min(target_score, current_score + improvement)
                chaos_state['service_health_scores'][service] = new_score
                service_health_score.labels(service=service).set(new_score)
        
        time.sleep(1)
    
    logger.info("Chaos experiment simulation completed")

@chaos_bp.route('/start', methods=['POST'])
def start_chaos_experiment():
    """Start a new chaos engineering experiment"""
    global chaos_state
    
    if chaos_state['active']:
        return jsonify({
            'error': 'Chaos experiment already active',
            'current_experiment': chaos_state['experiment_id']
        }), 400
    
    data = request.get_json() or {}
    
    # Extract experiment configuration
    experiment_type = data.get('type', 'latency')
    target_service = data.get('service', 'product-service')
    duration = int(data.get('duration', 60))
    intensity = int(data.get('intensity', 5))
    experiment_id = data.get('experimentId', f"chaos-exp-{int(time.time())}")
    
    # Determine impact level
    if intensity <= 3:
        impact_level = 'low'
    elif intensity <= 7:
        impact_level = 'medium'
    else:
        impact_level = 'high'
    
    # Determine affected services based on target
    if target_service == 'product-service':
        affected_services = ['product-service', 'checkout-service']
    elif target_service == 'user-service':
        affected_services = ['user-service', 'checkout-service']
    elif target_service == 'checkout-service':
        affected_services = ['checkout-service']
    else:
        affected_services = [target_service]
    
    # Update chaos state
    chaos_state.update({
        'active': True,
        'experiment_id': experiment_id,
        'experiment_type': experiment_type,
        'target_service': target_service,
        'start_time': datetime.utcnow().isoformat(),
        'duration': duration,
        'intensity': intensity,
        'impact_level': impact_level,
        'affected_services': affected_services,
        'circuit_breakers_triggered': 0,
        'auto_recovery_attempts': 0
    })
    
    # Update Prometheus metrics
    chaos_experiments_total.labels(experiment_type=experiment_type, service=target_service).inc()
    chaos_experiment_active.set(1)
    chaos_impact_level.set(intensity)
    
    # Start background simulation
    simulation_thread = threading.Thread(
        target=simulate_chaos_impact,
        args=(experiment_type, intensity, duration)
    )
    simulation_thread.daemon = True
    simulation_thread.start()
    
    logger.info(
        "Chaos experiment started",
        experiment_id=experiment_id,
        experiment_type=experiment_type,
        target_service=target_service,
        duration=duration,
        intensity=intensity,
        impact_level=impact_level
    )
    
    return jsonify({
        'message': 'Chaos experiment started successfully',
        'experiment_id': experiment_id,
        'experiment_type': experiment_type,
        'target_service': target_service,
        'duration': duration,
        'intensity': intensity,
        'impact_level': impact_level,
        'affected_services': affected_services,
        'start_time': chaos_state['start_time']
    }), 200

@chaos_bp.route('/<experiment_id>/status', methods=['GET'])
def get_chaos_experiment_status(experiment_id):
    """Get the status of a specific chaos experiment"""
    
    if not chaos_state['active'] or chaos_state['experiment_id'] != experiment_id:
        return jsonify({
            'experiment_id': experiment_id,
            'active': False,
            'message': 'Experiment not found or not active'
        }), 404
    
    # Calculate remaining time
    start_time = datetime.fromisoformat(chaos_state['start_time'])
    elapsed = (datetime.utcnow() - start_time).total_seconds()
    remaining = max(0, chaos_state['duration'] - elapsed)
    
    return jsonify({
        'experiment_id': experiment_id,
        'active': chaos_state['active'],
        'experiment_type': chaos_state['experiment_type'],
        'target_service': chaos_state['target_service'],
        'affected_services': chaos_state['affected_services'],
        'start_time': chaos_state['start_time'],
        'duration': chaos_state['duration'],
        'elapsed_seconds': int(elapsed),
        'remaining_seconds': int(remaining),
        'intensity': chaos_state['intensity'],
        'impact_level': chaos_state['impact_level'],
        'metrics': {
            'circuit_breakers_triggered': chaos_state['circuit_breakers_triggered'],
            'auto_recovery_attempts': chaos_state['auto_recovery_attempts'],
            'service_health_scores': chaos_state['service_health_scores']
        }
    }), 200

@chaos_bp.route('/<experiment_id>/stop', methods=['POST'])
def stop_chaos_experiment(experiment_id):
    """Stop a running chaos experiment"""
    global chaos_state
    
    if not chaos_state['active'] or chaos_state['experiment_id'] != experiment_id:
        return jsonify({
            'error': 'Experiment not found or not active',
            'experiment_id': experiment_id
        }), 404
    
    # Stop the experiment
    chaos_state['active'] = False
    experiment_type = chaos_state['experiment_type']
    target_service = chaos_state['target_service']
    
    # Update Prometheus metrics
    chaos_experiment_active.set(0)
    chaos_impact_level.set(0)
    
    logger.info(
        "Chaos experiment stopped",
        experiment_id=experiment_id,
        experiment_type=experiment_type,
        target_service=target_service
    )
    
    return jsonify({
        'message': 'Chaos experiment stopped successfully',
        'experiment_id': experiment_id,
        'final_metrics': {
            'circuit_breakers_triggered': chaos_state['circuit_breakers_triggered'],
            'auto_recovery_attempts': chaos_state['auto_recovery_attempts'],
            'service_health_scores': chaos_state['service_health_scores']
        }
    }), 200

@chaos_bp.route('/status', methods=['GET'])
def get_chaos_status():
    """Get current chaos engineering status - used by frontend"""
    
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

@chaos_bp.route('/experiments', methods=['GET'])
def list_chaos_experiments():
    """List available chaos experiment types"""
    
    return jsonify({
        'available_experiments': [
            {
                'type': 'latency',
                'name': 'Network Latency',
                'description': 'Simulates network delays between services',
                'impact': 'Increases response times, may trigger timeouts'
            },
            {
                'type': 'error',
                'name': 'Error Injection',
                'description': 'Introduces random errors in service responses',
                'impact': 'Triggers retry mechanisms and fallback systems'
            },
            {
                'type': 'resource_exhaustion',
                'name': 'Resource Exhaustion',
                'description': 'Simulates high CPU/memory usage',
                'impact': 'Degrades performance, may trigger auto-scaling'
            },
            {
                'type': 'circuit_breaker',
                'name': 'Circuit Breaker Test',
                'description': 'Tests circuit breaker patterns',
                'impact': 'Validates fail-fast behavior and recovery'
            }
        ],
        'target_services': [
            'product-service',
            'user-service', 
            'checkout-service',
            'analytics-service'
        ],
        'intensity_levels': {
            '1-3': 'Low - Minimal impact, good for baseline testing',
            '4-7': 'Medium - Moderate impact, tests resilience patterns',
            '8-10': 'High - Severe impact, validates disaster recovery'
        }
    }), 200 