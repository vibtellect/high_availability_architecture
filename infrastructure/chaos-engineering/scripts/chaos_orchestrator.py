#!/usr/bin/env python3
"""
Chaos Engineering Orchestrator for High Availability Testing
Performs controlled chaos operations to validate system resilience
"""

import subprocess
import time
import json
import random
import logging
import argparse
import threading
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import requests
import docker

class ChaosOrchestrator:
    def __init__(self, config_file: str = "configs/chaos_config.json"):
        """Initialize the Chaos Orchestrator"""
        self.setup_logging()
        self.docker_client = docker.from_env()
        self.config = self.load_config(config_file)
        self.active_tests = {}
        self.metrics = []
        
        # Service endpoints for health checks
        self.service_endpoints = {
            'product-service': 'http://localhost:8081/api/v1/products/health',
            'user-service': 'http://localhost:8082/api/v1/users/health', 
            'checkout-service': 'http://localhost:8080/api/v1/checkout/health',
            'analytics-service': 'http://localhost:8083/health'
        }
        
        # Docker container names
        self.container_names = {
            'product-service': 'product-service',
            'user-service': 'user-service',
            'checkout-service': 'checkout-service', 
            'analytics-service': 'analytics-service',
            'analytics-worker': 'analytics-worker',
            'analytics-beat': 'analytics-beat',
            'analytics-worker-maintenance': 'analytics-worker-maintenance'
        }

    def setup_logging(self):
        """Setup logging configuration"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('reports/chaos_engineering.log'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger('ChaosOrchestrator')

    def load_config(self, config_file: str) -> Dict:
        """Load chaos configuration"""
        try:
            with open(f"{config_file}", 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            self.logger.warning(f"Config file {config_file} not found. Using defaults.")
            return self.get_default_config()

    def get_default_config(self) -> Dict:
        """Get default chaos configuration"""
        return {
            "chaos_scenarios": {
                "service_termination": {
                    "enabled": True,
                    "recovery_timeout_seconds": 30,
                    "max_concurrent_failures": 2
                },
                "database_chaos": {
                    "enabled": True,
                    "connection_timeout_seconds": 10
                },
                "network_chaos": {
                    "enabled": True,
                    "latency_ms": 500,
                    "packet_loss_percent": 5
                }
            },
            "monitoring": {
                "health_check_interval_seconds": 5,
                "recovery_timeout_seconds": 60
            },
            "safety": {
                "max_chaos_duration_minutes": 10,
                "emergency_stop_enabled": True
            }
        }

    def check_service_health(self, service_name: str) -> bool:
        """Check if a service is healthy"""
        try:
            endpoint = self.service_endpoints.get(service_name)
            if not endpoint:
                self.logger.warning(f"No health endpoint defined for {service_name}")
                return False
                
            response = requests.get(endpoint, timeout=5)
            is_healthy = response.status_code == 200
            self.logger.debug(f"Health check {service_name}: {'✅' if is_healthy else '❌'}")
            return is_healthy
        except requests.exceptions.RequestException as e:
            self.logger.warning(f"Health check failed for {service_name}: {e}")
            return False

    def get_container_status(self, container_name: str) -> Dict:
        """Get Docker container status"""
        try:
            container = self.docker_client.containers.get(container_name)
            return {
                'name': container_name,
                'status': container.status,
                'running': container.status == 'running',
                'health': container.attrs.get('State', {}).get('Health', {}).get('Status', 'unknown')
            }
        except docker.errors.NotFound:
            return {
                'name': container_name,
                'status': 'not_found',
                'running': False,
                'health': 'unknown'
            }

    def terminate_service(self, service_name: str) -> Dict:
        """Terminate a specific service container"""
        self.logger.info(f"🔥 CHAOS: Terminating service {service_name}")
        
        container_name = self.container_names.get(service_name)
        if not container_name:
            return {'success': False, 'error': f'Unknown service: {service_name}'}
            
        start_time = time.time()
        
        try:
            # Stop the container
            container = self.docker_client.containers.get(container_name)
            container.stop()
            
            self.logger.info(f"✅ Service {service_name} terminated successfully")
            
            # Monitor recovery
            recovery_start = time.time()
            recovery_timeout = self.config['chaos_scenarios']['service_termination']['recovery_timeout_seconds']
            
            while time.time() - recovery_start < recovery_timeout:
                time.sleep(2)
                try:
                    container.reload()
                    if container.status == 'running':
                        recovery_time = time.time() - recovery_start
                        self.logger.info(f"🔄 Service {service_name} recovered in {recovery_time:.2f}s")
                        
                        # Verify health
                        time.sleep(5)  # Wait for service to be ready
                        if self.check_service_health(service_name):
                            return {
                                'success': True,
                                'recovery_time_seconds': recovery_time,
                                'service_healthy': True,
                                'action': 'terminate_and_recover'
                            }
                        else:
                            return {
                                'success': True,
                                'recovery_time_seconds': recovery_time,
                                'service_healthy': False,
                                'action': 'terminate_and_recover'
                            }
                except docker.errors.NotFound:
                    pass
                    
            return {
                'success': False,
                'error': f'Service {service_name} did not recover within {recovery_timeout}s',
                'recovery_time_seconds': recovery_timeout
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Failed to terminate {service_name}: {str(e)}'
            }

    def random_service_chaos(self, exclude_services: List[str] = None) -> Dict:
        """Randomly terminate a service"""
        exclude_services = exclude_services or []
        available_services = [s for s in self.service_endpoints.keys() if s not in exclude_services]
        
        if not available_services:
            return {'success': False, 'error': 'No services available for chaos'}
            
        target_service = random.choice(available_services)
        self.logger.info(f"🎲 Random chaos target: {target_service}")
        
        return self.terminate_service(target_service)

    def cascading_failure_test(self, services: List[str] = None, delay_seconds: int = 10) -> List[Dict]:
        """Execute cascading failure test"""
        if not services:
            services = list(self.service_endpoints.keys())
            
        self.logger.info(f"🌊 Starting cascading failure test with {len(services)} services")
        results = []
        
        for i, service in enumerate(services):
            self.logger.info(f"🔥 Cascading failure step {i+1}/{len(services)}: {service}")
            result = self.terminate_service(service)
            results.append({
                'step': i+1,
                'service': service,
                'result': result,
                'timestamp': datetime.now().isoformat()
            })
            
            if i < len(services) - 1:  # Don't wait after the last service
                self.logger.info(f"⏱️ Waiting {delay_seconds}s before next failure...")
                time.sleep(delay_seconds)
                
        return results

    def multiple_service_chaos(self, services: List[str] = None, concurrent: bool = True) -> List[Dict]:
        """Terminate multiple services simultaneously or sequentially"""
        if not services:
            # Select 2-3 random services
            available = list(self.service_endpoints.keys())
            services = random.sample(available, min(3, len(available)))
            
        self.logger.info(f"💥 Multiple service chaos: {services} ({'concurrent' if concurrent else 'sequential'})")
        
        if concurrent:
            # Use threading for concurrent termination
            results = []
            threads = []
            
            def terminate_and_store(service_name):
                result = self.terminate_service(service_name)
                results.append({
                    'service': service_name,
                    'result': result,
                    'timestamp': datetime.now().isoformat()
                })
                
            for service in services:
                thread = threading.Thread(target=terminate_and_store, args=(service,))
                threads.append(thread)
                thread.start()
                
            # Wait for all threads to complete
            for thread in threads:
                thread.join()
                
            return results
        else:
            # Sequential execution
            return self.cascading_failure_test(services, delay_seconds=5)

    def health_monitoring_during_chaos(self, duration_seconds: int = 60, check_interval: int = 5) -> List[Dict]:
        """Monitor all services health during chaos period"""
        self.logger.info(f"📊 Starting health monitoring for {duration_seconds}s")
        
        monitoring_results = []
        start_time = time.time()
        
        while time.time() - start_time < duration_seconds:
            timestamp = datetime.now().isoformat()
            health_snapshot = {}
            
            for service_name in self.service_endpoints.keys():
                health_snapshot[service_name] = {
                    'healthy': self.check_service_health(service_name),
                    'container_status': self.get_container_status(self.container_names.get(service_name, service_name))
                }
                
            monitoring_results.append({
                'timestamp': timestamp,
                'health_snapshot': health_snapshot
            })
            
            # Log current status
            healthy_count = sum(1 for h in health_snapshot.values() if h['healthy'])
            total_count = len(health_snapshot)
            self.logger.info(f"📊 Health Status: {healthy_count}/{total_count} services healthy")
            
            time.sleep(check_interval)
            
        return monitoring_results

    def chaos_with_load_test(self, load_test_command: str, chaos_delay_seconds: int = 30) -> Dict:
        """Execute chaos engineering during load test"""
        self.logger.info(f"🚀 Starting chaos test with load: {load_test_command}")
        
        # Start load test in background
        load_process = subprocess.Popen(
            load_test_command.split(),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Wait for load test to ramp up
        self.logger.info(f"⏱️ Waiting {chaos_delay_seconds}s for load test ramp-up...")
        time.sleep(chaos_delay_seconds)
        
        # Execute chaos
        chaos_results = self.random_service_chaos()
        
        # Continue monitoring during load test
        monitoring_results = self.health_monitoring_during_chaos(duration_seconds=60)
        
        # Wait for load test to complete
        load_stdout, load_stderr = load_process.communicate()
        
        return {
            'load_test_exit_code': load_process.returncode,
            'load_test_output': load_stdout.decode() if load_stdout else None,
            'load_test_errors': load_stderr.decode() if load_stderr else None,
            'chaos_results': chaos_results,
            'monitoring_results': monitoring_results
        }

    def generate_chaos_report(self, results: Dict, output_file: str = None) -> str:
        """Generate a comprehensive chaos test report"""
        report_data = {
            'test_summary': {
                'timestamp': datetime.now().isoformat(),
                'test_type': results.get('test_type', 'unknown'),
                'duration_seconds': results.get('duration_seconds', 0),
                'success': results.get('success', False)
            },
            'results': results,
            'system_state': {
                'services_health': {service: self.check_service_health(service) 
                                  for service in self.service_endpoints.keys()},
                'containers_status': {name: self.get_container_status(container) 
                                    for name, container in self.container_names.items()}
            }
        }
        
        if not output_file:
            output_file = f"reports/chaos_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            
        with open(f"{output_file}", 'w') as f:
            json.dump(report_data, f, indent=2)
            
        self.logger.info(f"📋 Chaos report generated: {output_file}")
        return output_file


def main():
    parser = argparse.ArgumentParser(description='High Availability Chaos Engineering')
    parser.add_argument('--scenario', choices=[
        'random_kill', 'cascading_failure', 'multiple_chaos', 
        'health_monitor', 'load_test_chaos'
    ], required=True, help='Chaos scenario to execute')
    
    parser.add_argument('--services', nargs='+', help='Specific services to target')
    parser.add_argument('--duration', type=int, default=60, help='Test duration in seconds')
    parser.add_argument('--concurrent', action='store_true', help='Execute chaos concurrently')
    parser.add_argument('--load-command', help='Load test command for load_test_chaos scenario')
    
    args = parser.parse_args()
    
    orchestrator = ChaosOrchestrator()
    
    try:
        if args.scenario == 'random_kill':
            result = orchestrator.random_service_chaos(exclude_services=[])
            result['test_type'] = 'random_service_termination'
            
        elif args.scenario == 'cascading_failure':
            result = orchestrator.cascading_failure_test(args.services)
            result = {'test_type': 'cascading_failure', 'results': result}
            
        elif args.scenario == 'multiple_chaos':
            result = orchestrator.multiple_service_chaos(args.services, args.concurrent)
            result = {'test_type': 'multiple_service_chaos', 'results': result, 'concurrent': args.concurrent}
            
        elif args.scenario == 'health_monitor':
            result = orchestrator.health_monitoring_during_chaos(args.duration)
            result = {'test_type': 'health_monitoring', 'results': result, 'duration_seconds': args.duration}
            
        elif args.scenario == 'load_test_chaos':
            if not args.load_command:
                raise ValueError("--load-command required for load_test_chaos scenario")
            result = orchestrator.chaos_with_load_test(args.load_command)
            result['test_type'] = 'load_test_with_chaos'
            
        result['success'] = True
        orchestrator.generate_chaos_report(result)
        
        print(f"✅ Chaos test completed successfully!")
        print(f"📊 Results: {json.dumps(result, indent=2)}")
        
    except Exception as e:
        error_result = {
            'test_type': args.scenario,
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }
        orchestrator.generate_chaos_report(error_result)
        orchestrator.logger.error(f"❌ Chaos test failed: {e}")
        raise


if __name__ == '__main__':
    main() 