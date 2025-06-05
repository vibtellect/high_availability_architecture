#!/usr/bin/env python3
"""
Circuit Breaker Testing and Simulation Script
This script provides precise testing of circuit breaker functionality
with various failure scenarios and load patterns.
"""

import asyncio
import aiohttp
import argparse
import json
import time
import sys
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

@dataclass
class ServiceConfig:
    """Configuration for a microservice"""
    name: str
    url: str
    health_endpoint: str = "/health"
    circuit_breaker_endpoint: str = "/api/v1/circuit-breakers"
    test_endpoint: str = "/api/v1/products"

@dataclass
class TestResult:
    """Result of a circuit breaker test"""
    timestamp: str
    test_name: str
    success_rate: float
    average_response_time: float
    circuit_breaker_state: str
    error_count: int
    total_requests: int

class CircuitBreakerTester:
    """Advanced Circuit Breaker Testing Class"""
    
    def __init__(self):
        self.services = {
            'product': ServiceConfig(
                name='Product Service',
                url='http://localhost:8081'
            ),
            'user': ServiceConfig(
                name='User Service', 
                url='http://localhost:8080'
            ),
            'checkout': ServiceConfig(
                name='Checkout Service',
                url='http://localhost:8082'
            ),
            'analytics': ServiceConfig(
                name='Analytics Service',
                url='http://localhost:8083'
            )
        }
        
        self.monitoring = {
            'prometheus': 'http://localhost:9090',
            'grafana': 'http://localhost:3000'
        }
        
        self.test_results: List[TestResult] = []
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        """Async context manager entry"""
        timeout = aiohttp.ClientTimeout(total=30, connect=10)
        self.session = aiohttp.ClientSession(timeout=timeout)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    async def check_service_health(self, service_key: str) -> bool:
        """Check if a service is healthy"""
        service = self.services[service_key]
        try:
            async with self.session.get(f"{service.url}{service.health_endpoint}") as response:
                is_healthy = response.status == 200
                status = "✅ HEALTHY" if is_healthy else f"❌ UNHEALTHY ({response.status})"
                logger.info(f"{service.name}: {status}")
                return is_healthy
        except Exception as e:
            logger.error(f"{service.name}: ❌ UNREACHABLE ({str(e)})")
            return False
    
    async def get_circuit_breaker_status(self, service_key: str) -> Dict:
        """Get circuit breaker status from a service"""
        service = self.services[service_key]
        try:
            async with self.session.get(f"{service.url}{service.circuit_breaker_endpoint}") as response:
                if response.status == 200:
                    return await response.json()
                else:
                    return {"status": f"endpoint_error_{response.status}"}
        except Exception as e:
            return {"status": f"connection_error", "error": str(e)}
    
    async def send_test_request(self, service_key: str, endpoint: str = None) -> Tuple[bool, float, int]:
        """Send a test request to a service
        
        Returns:
            Tuple of (success, response_time, status_code)
        """
        service = self.services[service_key]
        test_url = f"{service.url}{endpoint or service.test_endpoint}"
        
        start_time = time.time()
        try:
            async with self.session.get(test_url) as response:
                response_time = time.time() - start_time
                success = 200 <= response.status < 400
                return success, response_time, response.status
        except Exception as e:
            response_time = time.time() - start_time
            logger.debug(f"Request failed: {str(e)}")
            return False, response_time, 0
    
    async def load_test(self, service_key: str, duration: int, rps: int, endpoint: str = None) -> TestResult:
        """Run a load test against a service
        
        Args:
            service_key: Service to test
            duration: Test duration in seconds
            rps: Requests per second
            endpoint: Optional specific endpoint to test
        
        Returns:
            TestResult with aggregated metrics
        """
        service = self.services[service_key]
        logger.info(f"🔥 Load testing {service.name} - {rps} RPS for {duration}s")
        
        start_time = time.time()
        end_time = start_time + duration
        
        request_interval = 1.0 / rps
        successful_requests = 0
        failed_requests = 0
        total_response_time = 0.0
        error_count = 0
        
        tasks = []
        request_times = []
        
        while time.time() < end_time:
            # Create batch of requests for this second
            batch_start = time.time()
            
            for _ in range(rps):
                if time.time() >= end_time:
                    break
                    
                task = asyncio.create_task(self.send_test_request(service_key, endpoint))
                tasks.append(task)
                request_times.append(time.time())
                
                # Small delay between requests to spread load
                await asyncio.sleep(request_interval)
            
            # Process completed requests every second
            if len(tasks) >= rps:
                completed_tasks = tasks[:rps]
                tasks = tasks[rps:]
                
                results = await asyncio.gather(*completed_tasks, return_exceptions=True)
                
                for result in results:
                    if isinstance(result, Exception):
                        failed_requests += 1
                        error_count += 1
                    else:
                        success, response_time, status_code = result
                        total_response_time += response_time
                        
                        if success:
                            successful_requests += 1
                        else:
                            failed_requests += 1
                            if status_code >= 500:
                                error_count += 1
        
        # Process remaining tasks
        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for result in results:
                if isinstance(result, Exception):
                    failed_requests += 1
                    error_count += 1
                else:
                    success, response_time, status_code = result
                    total_response_time += response_time
                    
                    if success:
                        successful_requests += 1
                    else:
                        failed_requests += 1
                        if status_code >= 500:
                            error_count += 1
        
        total_requests = successful_requests + failed_requests
        success_rate = (successful_requests / total_requests * 100) if total_requests > 0 else 0
        avg_response_time = (total_response_time / total_requests) if total_requests > 0 else 0
        
        # Get circuit breaker status
        cb_status = await self.get_circuit_breaker_status(service_key)
        cb_state = cb_status.get('status', 'unknown')
        
        result = TestResult(
            timestamp=datetime.now().isoformat(),
            test_name=f"Load Test {service.name}",
            success_rate=success_rate,
            average_response_time=avg_response_time,
            circuit_breaker_state=cb_state,
            error_count=error_count,
            total_requests=total_requests
        )
        
        self.test_results.append(result)
        
        logger.info(f"📊 Results: {successful_requests}/{total_requests} success ({success_rate:.1f}%), "
                   f"avg response: {avg_response_time:.3f}s, errors: {error_count}")
        
        return result
    
    async def chaos_test_service_failure(self, target_service: str, dependent_service: str, 
                                       failure_duration: int = 60, load_rps: int = 5):
        """Simulate service failure and test circuit breaker activation
        
        Args:
            target_service: Service to make requests to  
            dependent_service: Service that will "fail" (simulated)
            failure_duration: How long to simulate failure
            load_rps: Requests per second during test
        """
        logger.info(f"🌪️ CHAOS TEST: {dependent_service} failure affecting {target_service}")
        
        # Step 1: Baseline test
        logger.info("📊 Phase 1: Baseline measurement")
        baseline = await self.load_test(target_service, 30, load_rps)
        
        # Step 2: Simulate dependency failure
        logger.info(f"💥 Phase 2: Simulating {dependent_service} failure for {failure_duration}s")
        
        # In a real implementation, we would:
        # - Stop the dependent service
        # - Use network rules to block traffic
        # - Use a chaos engineering tool like Chaos Monkey
        
        # For demo purposes, we'll just continue testing and observe circuit breaker behavior
        failure_test = await self.load_test(target_service, failure_duration, load_rps)
        
        # Step 3: Recovery phase
        logger.info("🔄 Phase 3: Recovery testing")
        recovery_test = await self.load_test(target_service, 30, load_rps)
        
        # Compare results
        logger.info("📈 CHAOS TEST SUMMARY:")
        logger.info(f"  Baseline Success Rate: {baseline.success_rate:.1f}%")
        logger.info(f"  Failure Phase Success Rate: {failure_test.success_rate:.1f}%")
        logger.info(f"  Recovery Success Rate: {recovery_test.success_rate:.1f}%")
        logger.info(f"  Circuit Breaker Final State: {recovery_test.circuit_breaker_state}")
        
        return {
            'baseline': baseline,
            'failure': failure_test,
            'recovery': recovery_test
        }
    
    async def benchmark_circuit_breaker(self, service_key: str):
        """Run comprehensive circuit breaker benchmarks"""
        logger.info(f"🔬 BENCHMARK: Circuit Breaker Performance for {self.services[service_key].name}")
        
        test_scenarios = [
            ("Low Load", 30, 2),
            ("Medium Load", 30, 5),
            ("High Load", 30, 10),
            ("Burst Load", 15, 20),
        ]
        
        results = {}
        
        for scenario_name, duration, rps in test_scenarios:
            logger.info(f"🎯 Running scenario: {scenario_name}")
            result = await self.load_test(service_key, duration, rps)
            results[scenario_name] = result
            
            # Cool down between tests
            logger.info("⏱️  Cooldown period...")
            await asyncio.sleep(10)
        
        return results
    
    async def monitor_prometheus_metrics(self) -> Dict:
        """Fetch circuit breaker metrics from Prometheus"""
        prometheus_url = self.monitoring['prometheus']
        
        queries = {
            'cb_open_state': 'sum(cb:open_state:current)',
            'cb_closed_state': 'sum(cb:closed_state:current)', 
            'cb_half_open_state': 'sum(cb:half_open_state:current)',
            'error_rate_5xx': 'sum(rate(http_requests_total{status=~"5.."}[5m]))',
            'request_rate': 'sum(rate(http_requests_total[5m]))'
        }
        
        metrics = {}
        
        for metric_name, query in queries.items():
            try:
                url = f"{prometheus_url}/api/v1/query?query={query}"
                async with self.session.get(url) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data['data']['result']:
                            metrics[metric_name] = float(data['data']['result'][0]['value'][1])
                        else:
                            metrics[metric_name] = 0.0
                    else:
                        metrics[metric_name] = None
            except Exception as e:
                logger.warning(f"Failed to fetch {metric_name}: {e}")
                metrics[metric_name] = None
        
        return metrics
    
    def save_results_to_file(self, filename: str):
        """Save test results to JSON file"""
        results_data = {
            'test_run_timestamp': datetime.now().isoformat(),
            'results': [
                {
                    'timestamp': result.timestamp,
                    'test_name': result.test_name,
                    'success_rate': result.success_rate,
                    'average_response_time': result.average_response_time,
                    'circuit_breaker_state': result.circuit_breaker_state,
                    'error_count': result.error_count,
                    'total_requests': result.total_requests
                }
                for result in self.test_results
            ]
        }
        
        with open(filename, 'w') as f:
            json.dump(results_data, f, indent=2)
        
        logger.info(f"💾 Results saved to {filename}")

async def main():
    """Main function to run circuit breaker tests"""
    parser = argparse.ArgumentParser(description='Circuit Breaker Testing Tool')
    parser.add_argument('--service', choices=['product', 'user', 'checkout', 'analytics'], 
                       default='checkout', help='Service to test')
    parser.add_argument('--test-type', choices=['load', 'chaos', 'benchmark', 'health'], 
                       default='health', help='Type of test to run')
    parser.add_argument('--duration', type=int, default=60, help='Test duration in seconds')
    parser.add_argument('--rps', type=int, default=5, help='Requests per second')
    parser.add_argument('--output', help='Output file for results')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose logging')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    async with CircuitBreakerTester() as tester:
        logger.info("🔌 Circuit Breaker Testing Tool Started")
        logger.info("=" * 50)
        
        if args.test_type == 'health':
            logger.info("🏥 Health Check for all services")
            for service_key in tester.services.keys():
                await tester.check_service_health(service_key)
                
                # Get circuit breaker status
                cb_status = await tester.get_circuit_breaker_status(service_key)
                logger.info(f"   Circuit Breaker Status: {cb_status}")
        
        elif args.test_type == 'load':
            logger.info(f"🔥 Load Test: {args.service}")
            await tester.load_test(args.service, args.duration, args.rps)
            
        elif args.test_type == 'chaos':
            logger.info(f"🌪️ Chaos Test: {args.service}")
            # Simulate product service failure affecting checkout
            await tester.chaos_test_service_failure('checkout', 'product', args.duration, args.rps)
            
        elif args.test_type == 'benchmark':
            logger.info(f"🔬 Benchmark: {args.service}")
            await tester.benchmark_circuit_breaker(args.service)
        
        # Get Prometheus metrics
        logger.info("📊 Current Prometheus Metrics:")
        metrics = await tester.monitor_prometheus_metrics()
        for metric_name, value in metrics.items():
            if value is not None:
                logger.info(f"   {metric_name}: {value}")
            else:
                logger.info(f"   {metric_name}: unavailable")
        
        # Save results if requested
        if args.output:
            tester.save_results_to_file(args.output)
        
        logger.info("✅ Testing completed successfully")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("⚠️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Test failed: {e}")
        sys.exit(1) 