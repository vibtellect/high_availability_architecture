#!/usr/bin/env python3
"""
Quick Chaos Testing Script
Simple script for rapid chaos engineering tests and validation
"""

import sys
import os
import subprocess
import time
import requests
import docker
import json
from datetime import datetime

class QuickChaos:
    def __init__(self):
        self.docker_client = docker.from_env()
        self.services = {
            'product-service': 'http://localhost:8081/api/v1/products/health',
            'user-service': 'http://localhost:8082/api/v1/users/health',
            'checkout-service': 'http://localhost:8080/api/v1/checkout/health',
            'analytics-service': 'http://localhost:8083/health'
        }
        
    def check_all_services(self):
        """Quick health check of all services"""
        print("🔍 Quick Service Health Check:")
        results = {}
        
        for service, endpoint in self.services.items():
            try:
                response = requests.get(endpoint, timeout=3)
                healthy = response.status_code == 200
                status = "✅ HEALTHY" if healthy else f"❌ UNHEALTHY ({response.status_code})"
                results[service] = healthy
            except Exception as e:
                status = f"❌ ERROR: {str(e)[:50]}..."
                results[service] = False
                
            print(f"  {service}: {status}")
            
        healthy_count = sum(results.values())
        total_count = len(results)
        print(f"\n📊 Overall Health: {healthy_count}/{total_count} services healthy")
        return results
        
    def quick_kill_test(self, service_name: str):
        """Kill a service and monitor recovery"""
        print(f"\n🔥 CHAOS TEST: Killing {service_name}")
        
        try:
            # Stop container
            container = self.docker_client.containers.get(service_name)
            container.stop()
            print(f"✅ Container {service_name} stopped")
            
            # Monitor recovery
            print("⏱️ Monitoring recovery...")
            start_time = time.time()
            
            for i in range(30):  # Monitor for 30 seconds
                time.sleep(1)
                try:
                    container.reload()
                    if container.status == 'running':
                        recovery_time = time.time() - start_time
                        print(f"🔄 Container recovered in {recovery_time:.2f}s")
                        
                        # Wait a bit more for service to be ready
                        time.sleep(3)
                        
                        # Check health
                        endpoint = self.services.get(service_name)
                        if endpoint:
                            try:
                                response = requests.get(endpoint, timeout=5)
                                if response.status_code == 200:
                                    print(f"✅ Service {service_name} is healthy again!")
                                    return True
                                else:
                                    print(f"⚠️ Service recovered but health check failed: {response.status_code}")
                            except:
                                print(f"⚠️ Service recovered but health endpoint not responding")
                        return True
                except docker.errors.NotFound:
                    pass
                    
            print(f"❌ Service {service_name} did not recover within 30s")
            return False
            
        except Exception as e:
            print(f"❌ Error during chaos test: {e}")
            return False
            
    def load_test_with_chaos(self):
        """Run chaos during load test"""
        print("\n🚀 LOAD TEST + CHAOS ENGINEERING")
        
        # Check if k6 container is available
        try:
            k6_container = self.docker_client.containers.get('k6-load-tester')
            print("✅ k6 container found")
        except:
            print("❌ k6 container not found, skipping load test chaos")
            return
            
        # Start load test in background
        print("📊 Starting load test...")
        load_cmd = [
            'docker', 'exec', 'k6-load-tester', 
            'k6', 'run', '--duration', '60s', '--arrival-rate', '5',
            '/scripts/microservices-load-test.js'
        ]
        
        load_process = subprocess.Popen(load_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Wait for ramp-up
        print("⏱️ Waiting 15s for load test ramp-up...")
        time.sleep(15)
        
        # Execute chaos
        print("🔥 Injecting chaos during load test...")
        self.quick_kill_test('product-service')
        
        # Wait for load test to complete
        print("⏱️ Waiting for load test to complete...")
        stdout, stderr = load_process.communicate()
        
        print(f"📈 Load test completed with exit code: {load_process.returncode}")
        if stdout:
            print("Load test output:")
            print(stdout.decode()[-500:])  # Last 500 chars
            
    def chaos_dashboard(self):
        """Quick dashboard showing current system state"""
        print("\n📊 CHAOS ENGINEERING DASHBOARD")
        print("=" * 50)
        
        # Container status
        print("\n🐳 Container Status:")
        containers = ['product-service', 'user-service', 'checkout-service', 'analytics-service']
        for container_name in containers:
            try:
                container = self.docker_client.containers.get(container_name)
                status = "🟢 RUNNING" if container.status == 'running' else f"🔴 {container.status.upper()}"
                print(f"  {container_name}: {status}")
            except:
                print(f"  {container_name}: 🔴 NOT FOUND")
                
        # Service health
        print("\n🏥 Service Health:")
        self.check_all_services()
        
        # Recent logs (last 5 lines)
        print("\n📝 Recent Container Logs:")
        for container_name in containers[:2]:  # Just show first 2 to keep it short
            try:
                container = self.docker_client.containers.get(container_name)
                logs = container.logs(tail=2).decode().strip()
                if logs:
                    print(f"  {container_name}:")
                    for line in logs.split('\n')[-2:]:
                        print(f"    {line}")
            except:
                pass


def main():
    if len(sys.argv) < 2:
        print("🔥 Quick Chaos Engineering Tool")
        print("\nUsage:")
        print("  python quick_chaos.py health          - Check all services health")
        print("  python quick_chaos.py kill <service>  - Kill specific service and monitor recovery")
        print("  python quick_chaos.py random          - Kill random service")
        print("  python quick_chaos.py load-chaos      - Load test + chaos")
        print("  python quick_chaos.py dashboard       - Show system status")
        print("\nAvailable services: product-service, user-service, checkout-service, analytics-service")
        return
        
    chaos = QuickChaos()
    command = sys.argv[1]
    
    if command == 'health':
        chaos.check_all_services()
        
    elif command == 'kill':
        if len(sys.argv) < 3:
            print("❌ Please specify service name")
            return
        service = sys.argv[2]
        if service not in chaos.services:
            print(f"❌ Unknown service: {service}")
            print(f"Available: {', '.join(chaos.services.keys())}")
            return
        chaos.quick_kill_test(service)
        
    elif command == 'random':
        import random
        service = random.choice(list(chaos.services.keys()))
        print(f"🎲 Randomly selected: {service}")
        chaos.quick_kill_test(service)
        
    elif command == 'load-chaos':
        chaos.load_test_with_chaos()
        
    elif command == 'dashboard':
        chaos.chaos_dashboard()
        
    else:
        print(f"❌ Unknown command: {command}")


if __name__ == '__main__':
    main() 