from flask import Flask, jsonify, request
from flask_cors import CORS
import subprocess
import threading
import time
import logging
import json

app = Flask(__name__)
CORS(app, origins=['http://localhost:3001', 'http://localhost:3000'])

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Store running tests
running_tests = {}

def run_k6_test(test_type, duration=60, vus=5):
    """Run K6 test in Docker container"""
    try:
        if test_type == 'load-testing':
            cmd = [
                'docker', 'exec', 'k6-load-tester', 
                'k6', 'run', 
                f'--duration={duration}s', 
                f'--vus={vus}', 
                '--out', 'experimental-prometheus-rw',
                '/scripts/microservices-load-test.js'
            ]
        elif test_type == 'stress-testing':
            cmd = [
                'docker', 'exec', 'k6-load-tester', 
                'k6', 'run', 
                f'--duration={duration}s', 
                f'--vus={vus * 2}', 
                '--out', 'experimental-prometheus-rw',
                '/scripts/stress-test.js'
            ]
        else:
            # Default to microservices test
            cmd = [
                'docker', 'exec', 'k6-load-tester', 
                'k6', 'run', 
                f'--duration={duration}s', 
                f'--vus={vus}', 
                '--out', 'experimental-prometheus-rw',
                '/scripts/microservices-load-test.js'
            ]
        
        logger.info(f"Starting K6 test: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=duration+30)
        
        if test_type in running_tests:
            running_tests[test_type]['status'] = 'completed'
            running_tests[test_type]['result'] = {
                'success': result.returncode == 0,
                'stdout': result.stdout,
                'stderr': result.stderr
            }
        
        logger.info(f"K6 test {test_type} completed with return code: {result.returncode}")
        
    except Exception as e:
        logger.error(f"Error running K6 test {test_type}: {str(e)}")
        if test_type in running_tests:
            running_tests[test_type]['status'] = 'failed'
            running_tests[test_type]['error'] = str(e)

@app.route('/api/demos/load-testing/start', methods=['POST'])
def start_load_testing():
    """Start load testing demo"""
    try:
        # Handle cases where no JSON is sent or JSON is empty
        data = {}
        try:
            if request.is_json:
                json_data = request.get_json(silent=True)
                if json_data:
                    data = json_data
        except Exception:
            # If JSON parsing fails, use defaults
            pass
        
        duration = data.get('duration', 60)
        vus = data.get('vus', 5)
        
        if 'load-testing' in running_tests and running_tests['load-testing']['status'] == 'running':
            return jsonify({
                'scriptId': 'load-testing',
                'success': False,
                'message': 'Load test is already running'
            }), 400
        
        # Mark test as running
        running_tests['load-testing'] = {
            'status': 'running',
            'start_time': time.time(),
            'duration': duration,
            'vus': vus
        }
        
        # Start test in background thread
        thread = threading.Thread(target=run_k6_test, args=('load-testing', duration, vus))
        thread.daemon = True
        thread.start()
        
        return jsonify({
            'scriptId': 'load-testing',
            'success': True,
            'message': f'Load test started with {vus} virtual users for {duration} seconds',
            'output': f'K6 load test running with {vus} virtual users for {duration} seconds',
            'grafana_url': 'http://localhost:3000/d/k6-load-testing/k6-load-testing-dashboard'
        })
        
    except Exception as e:
        logger.error(f"Error starting load test: {str(e)}")
        return jsonify({
            'scriptId': 'load-testing',
            'success': False,
            'message': f'Failed to start load test: {str(e)}'
        }), 500

@app.route('/api/demos/load-testing/status', methods=['GET'])
def get_load_testing_status():
    """Get load testing status"""
    if 'load-testing' not in running_tests:
        return jsonify({
            'status': 'not_started',
            'message': 'No load test has been started'
        })
    
    test_info = running_tests['load-testing']
    
    if test_info['status'] == 'running':
        elapsed = time.time() - test_info['start_time']
        remaining = max(0, test_info['duration'] - elapsed)
        
        return jsonify({
            'status': 'running',
            'elapsed_seconds': int(elapsed),
            'remaining_seconds': int(remaining),
            'duration': test_info['duration'],
            'vus': test_info['vus'],
            'grafana_url': 'http://localhost:3000/d/k6-load-testing/k6-load-testing-dashboard'
        })
    
    return jsonify({
        'status': test_info['status'],
        'result': test_info.get('result'),
        'error': test_info.get('error')
    })

@app.route('/api/demos/health-monitoring/start', methods=['POST'])
def start_health_monitoring():
    """Start health monitoring demo"""
    return jsonify({
        'scriptId': 'health-monitoring',
        'success': True,
        'message': 'Health monitoring demo simulation started',
        'output': 'Health monitoring test started - tracking service health and availability patterns',
        'grafana_url': 'http://localhost:3000/d/microservices-overview/microservices-overview'
    })

@app.route('/api/demos/failover/start', methods=['POST'])
def start_failover():
    """Start failover demo"""
    return jsonify({
        'scriptId': 'failover',
        'success': True,
        'message': 'Failover demo simulation started',
        'output': 'Failover test started - simulating service failures and automatic recovery',
        'grafana_url': 'http://localhost:3000/d/microservices-overview/microservices-overview'
    })

@app.route('/api/demos/load-balancing/start', methods=['POST'])
def start_load_balancing():
    """Start load balancing demo"""
    return jsonify({
        'scriptId': 'load-balancing',
        'success': True,
        'message': 'Load balancing demo simulation started',
        'output': 'Load balancing test started - distributing traffic across service instances',
        'grafana_url': 'http://localhost:3000/d/microservices-overview/microservices-overview'
    })

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'demo-service',
        'timestamp': time.time()
    })

@app.route('/api/demos/status', methods=['GET'])
def get_all_status():
    """Get status of all demos"""
    return jsonify({
        'demos': {
            'load-testing': running_tests.get('load-testing', {'status': 'not_started'}),
            'health-monitoring': {'status': 'available'},
            'failover': {'status': 'available'},
            'load-balancing': {'status': 'available'}
        }
    })

if __name__ == '__main__':
    logger.info("Starting Demo Service on port 8084")
    app.run(host='0.0.0.0', port=8084, debug=True) 