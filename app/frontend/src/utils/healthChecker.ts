// Health checker utility for debugging architecture dashboard data
import { backendApiService } from '../services/backendApi';

export interface DetailedHealthCheck {
  service: string;
  endpoint: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime: number;
  httpStatus?: number;
  error?: string;
  details?: any;
}

export class HealthChecker {
  private async checkEndpoint(
    name: string, 
    url: string, 
    timeout: number = 5000
  ): Promise<DetailedHealthCheck> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      let status: 'healthy' | 'unhealthy' | 'unknown';
      let details: any = {};
      
      try {
        details = await response.text();
        if (details.startsWith('{') || details.startsWith('[')) {
          details = JSON.parse(details);
        }
      } catch (e) {
        // Not JSON, keep as text
      }
      
      // Determine health status based on service and response
      if (name === 'user' && (response.status === 401 || response.status === 403)) {
        status = 'healthy'; // Auth required is expected
      } else if (name === 'checkout' && response.status < 500) {
        status = 'healthy'; // Any non-server error means service is running
      } else if (response.ok) {
        status = 'healthy';
      } else if (response.status >= 500) {
        status = 'unhealthy';
      } else {
        status = 'healthy'; // Client errors usually mean service is running
      }
      
      return {
        service: name,
        endpoint: url,
        status,
        responseTime,
        httpStatus: response.status,
        details
      };
    } catch (error) {
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      return {
        service: name,
        endpoint: url,
        status: 'unknown',
        responseTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async checkAllServices(): Promise<DetailedHealthCheck[]> {
    const checks = [
      // Product Service
      this.checkEndpoint('product', 'http://localhost/api/v1/products'),
      
      // User Service  
      this.checkEndpoint('user', 'http://localhost/api/v1/users'),
      
      // Checkout Service - try both endpoints
      this.checkEndpoint('checkout-health', 'http://localhost/health'),
      this.checkEndpoint('checkout-orders', 'http://localhost/api/v1/orders'),
      
      // Analytics Service
      this.checkEndpoint('analytics', 'http://localhost:8083/health'),
      
      // Direct service checks (bypassing NGINX)
      this.checkEndpoint('product-direct', 'http://localhost:8080/actuator/health'),
      this.checkEndpoint('user-direct', 'http://localhost:8081/actuator/health'),
      this.checkEndpoint('checkout-direct', 'http://localhost:8082/health'),
    ];

    const results = await Promise.all(checks);
    return results;
  }

  async logDetailedStatus(): Promise<void> {
    console.group('🔍 Detailed Health Check Analysis');
    
    try {
      // First, get the results from our health checker
      const detailedResults = await this.checkAllServices();
      
      console.log('📊 Individual Endpoint Results:');
      detailedResults.forEach(result => {
        const icon = result.status === 'healthy' ? '✅' : 
                    result.status === 'unhealthy' ? '❌' : '❓';
        
        console.log(`${icon} ${result.service}: ${result.status}`);
        console.log(`   Endpoint: ${result.endpoint}`);
        console.log(`   Response Time: ${result.responseTime}ms`);
        
        if (result.httpStatus) {
          console.log(`   HTTP Status: ${result.httpStatus}`);
        }
        
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        } else if (result.details) {
          console.log(`   Response:`, result.details);
        }
        
        console.log(''); // Empty line for readability
      });

      // Then compare with the actual health check method
      console.log('🔄 Backend API Service Health Check:');
      const apiHealth = await backendApiService.getSystemHealth();
      
      Object.entries(apiHealth).forEach(([service, status]) => {
        const icon = status === 'healthy' ? '✅' : 
                    status === 'unhealthy' ? '❌' : '❓';
        console.log(`${icon} ${service}: ${status}`);
      });

      // Analysis
      console.log('🔍 Analysis:');
      
      // Check for discrepancies
      const productDirect = detailedResults.find(r => r.service === 'product-direct');
      const productViaProxy = detailedResults.find(r => r.service === 'product');
      
      if (productDirect && productViaProxy) {
        if (productDirect.status !== productViaProxy.status) {
          console.log('⚠️  Product service shows different status via NGINX vs direct access');
        }
      }

      // Check checkout service confusion
      const checkoutHealth = detailedResults.find(r => r.service === 'checkout-health');
      const checkoutOrders = detailedResults.find(r => r.service === 'checkout-orders');
      
      if (checkoutHealth?.status === 'unknown' && checkoutOrders?.status !== 'unknown') {
        console.log('ℹ️  Checkout service /health endpoint not available, but service is running (orders endpoint responds)');
      }

      // Check user service authentication
      const userCheck = detailedResults.find(r => r.service === 'user');
      if (userCheck?.httpStatus === 403) {
        console.log('ℹ️  User service returns 403 (Forbidden) - this is expected and means the service is healthy');
      }

    } catch (error) {
      console.error('❌ Error during health check analysis:', error);
    }
    
    console.groupEnd();
  }
}

// Export a singleton instance
export const healthChecker = new HealthChecker();

// Helper function to quickly debug health issues
export async function debugHealthStatus(): Promise<void> {
  await healthChecker.logDetailedStatus();
} 