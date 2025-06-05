import type { Product, User, Order, CartItem } from '../types/Product';

// Backend service URLs
const BACKEND_SERVICES = {
  PRODUCT_SERVICE: 'http://localhost:8080',
  USER_SERVICE: 'http://localhost:8081',
  CHECKOUT_SERVICE: 'http://localhost:8082',
  ANALYTICS_SERVICE: 'http://localhost:8083',
  API_GATEWAY: 'http://localhost:80',
  GRAFANA: 'http://localhost:3000',
  JAEGER: 'http://localhost:16686',
  PROMETHEUS: 'http://localhost:9090'
};

// Load Testing Configuration
interface LoadTestConfig {
  duration: number; // in seconds
  rps: number; // requests per second
  target: string;
  scenario: 'browse_products' | 'add_to_cart' | 'checkout' | 'user_registration' | 'mixed_workload';
}

// Chaos Engineering Configuration
interface ChaosConfig {
  type: 'latency' | 'error' | 'circuit_breaker' | 'resource_exhaustion';
  service: 'product' | 'user' | 'checkout' | 'analytics';
  duration: number; // in seconds
  intensity: number; // 1-10 scale
}

class BackendAPIService {
  private async fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // Product Service Methods
  async getProducts(): Promise<Product[]> {
    try {
      const response = await this.fetchWithTimeout(`${BACKEND_SERVICES.PRODUCT_SERVICE}/api/v1/products`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching products from backend:', error);
      // Return mock data as fallback
      return this.getMockProducts();
    }
  }

  async getProductById(id: string): Promise<Product | null> {
    try {
      const response = await this.fetchWithTimeout(`${BACKEND_SERVICES.PRODUCT_SERVICE}/api/v1/products/${id}`);
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching product:', error);
      return null;
    }
  }

  // User Service Methods
  async createUser(userData: Omit<User, 'id'>): Promise<User> {
    try {
      const response = await this.fetchWithTimeout(`${BACKEND_SERVICES.USER_SERVICE}/api/v1/users`, {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      const response = await this.fetchWithTimeout(`${BACKEND_SERVICES.USER_SERVICE}/api/v1/users/${id}`);
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  // Checkout Service Methods
  async createOrder(orderData: Omit<Order, 'id'>): Promise<Order> {
    try {
      const response = await this.fetchWithTimeout(`${BACKEND_SERVICES.CHECKOUT_SERVICE}/api/v1/orders`, {
        method: 'POST',
        body: JSON.stringify(orderData),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  async getOrderById(id: string): Promise<Order | null> {
    try {
      const response = await this.fetchWithTimeout(`${BACKEND_SERVICES.CHECKOUT_SERVICE}/api/v1/orders/${id}`);
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching order:', error);
      return null;
    }
  }

  // Analytics Service Methods
  async trackEvent(event: string, data: any): Promise<void> {
    try {
      await this.fetchWithTimeout(`${BACKEND_SERVICES.ANALYTICS_SERVICE}/api/v1/events`, {
        method: 'POST',
        body: JSON.stringify({ event, data, timestamp: new Date().toISOString() }),
      });
    } catch (error) {
      console.error('Error tracking event:', error);
      // Analytics failures shouldn't break the user experience
    }
  }

  async getAnalytics(metric: string): Promise<any> {
    try {
      const response = await this.fetchWithTimeout(`${BACKEND_SERVICES.ANALYTICS_SERVICE}/api/v1/metrics/${metric}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return null;
    }
  }

  // Health Check Methods
  async getSystemHealth(): Promise<{[key: string]: 'healthy' | 'unhealthy' | 'unknown'}> {
    const health: {[key: string]: 'healthy' | 'unhealthy' | 'unknown'} = {};
    
    // Add cache busting parameter
    const cacheBust = `?_cb=${Date.now()}`;

    // Test product service via NGINX
    try {
      const response = await this.fetchWithTimeout(
        `${BACKEND_SERVICES.PRODUCT_SERVICE}/api/v1/products${cacheBust}`,
        { cache: 'no-cache' },
        5000
      );
      health['product'] = response.ok ? 'healthy' : 'unhealthy';
      console.log(`Product Service Health: ${response.status} -> ${health['product']}`);
    } catch (error) {
      health['product'] = 'unknown';
      console.log(`Product Service Health: Error -> unknown`, error);
    }

    // Test user service via its dedicated health endpoint
    try {
      const response = await this.fetchWithTimeout(
        `${BACKEND_SERVICES.USER_SERVICE}/user/health${cacheBust}`,
        { cache: 'no-cache' },
        5000
      );
      health['user'] = response.ok ? 'healthy' : 'unhealthy';
      console.log(`User Service Health: ${response.status} -> ${health['user']}`);
    } catch (error) {
      health['user'] = 'unknown';
      console.log(`User Service Health: Error -> unknown`, error);
    }

    // Test checkout service via its dedicated health endpoint
    try {
      const response = await this.fetchWithTimeout(
        `${BACKEND_SERVICES.CHECKOUT_SERVICE}/checkout/health${cacheBust}`,
        { cache: 'no-cache' },
        5000
      );
      health['checkout'] = response.ok ? 'healthy' : 'unhealthy';
      console.log(`Checkout Service Health: ${response.status} -> ${health['checkout']}`);
    } catch (error) {
      health['checkout'] = 'unknown';
      console.log(`Checkout Service Health: Error -> unknown`, error);
    }

    // Test analytics service via main health endpoint for consistency
    try {
      const response = await this.fetchWithTimeout(
        `${BACKEND_SERVICES.ANALYTICS_SERVICE}/health${cacheBust}`,
        { cache: 'no-cache' },
        5000
      );
      health['analytics'] = response.ok ? 'healthy' : 'unhealthy';
      console.log(`Analytics Service Health: ${response.status} -> ${health['analytics']}`);
    } catch (error) {
      health['analytics'] = 'unknown';
      console.log(`Analytics Service Health: Error -> unknown`, error);
    }

    console.log('Final Health Check Results:', health);
    return health;
  }

  // Load Testing Methods
  async startLoadTest(config: LoadTestConfig): Promise<{ testId: string; message: string }> {
    try {
      const testId = `load-test-${Date.now()}`;
      
      // Start load test via analytics service which can coordinate the test
      const response = await this.fetchWithTimeout(`${BACKEND_SERVICES.ANALYTICS_SERVICE}/api/v1/load-test/start`, {
        method: 'POST',
        body: JSON.stringify({ ...config, testId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        testId,
        message: `Load test started: ${config.scenario} for ${config.duration}s at ${config.rps} RPS`
      };
    } catch (error) {
      console.error('Error starting load test:', error);
      return {
        testId: '',
        message: 'Failed to start load test. Please check if services are running.'
      };
    }
  }

  async getLoadTestStatus(testId: string): Promise<any> {
    try {
      const response = await this.fetchWithTimeout(`${BACKEND_SERVICES.ANALYTICS_SERVICE}/api/v1/load-test/${testId}/status`);
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching load test status:', error);
      return null;
    }
  }

  async stopLoadTest(testId: string): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(`${BACKEND_SERVICES.ANALYTICS_SERVICE}/api/v1/load-test/${testId}/stop`, {
        method: 'POST',
      });
      return response.ok;
    } catch (error) {
      console.error('Error stopping load test:', error);
      return false;
    }
  }

  // Chaos Engineering Methods
  async startChaosExperiment(config: ChaosConfig): Promise<{ experimentId: string; message: string }> {
    try {
      const experimentId = `chaos-exp-${Date.now()}`;
      
      const response = await this.fetchWithTimeout(`${BACKEND_SERVICES.ANALYTICS_SERVICE}/api/v1/chaos/start`, {
        method: 'POST',
        body: JSON.stringify({ ...config, experimentId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return {
        experimentId,
        message: `Chaos experiment started: ${config.type} on ${config.service} service for ${config.duration}s`
      };
    } catch (error) {
      console.error('Error starting chaos experiment:', error);
      return {
        experimentId: '',
        message: 'Failed to start chaos experiment. Please check if services are running.'
      };
    }
  }

  async getChaosExperimentStatus(experimentId: string): Promise<any> {
    try {
      const response = await this.fetchWithTimeout(`${BACKEND_SERVICES.ANALYTICS_SERVICE}/api/v1/chaos/${experimentId}/status`);
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching chaos experiment status:', error);
      return null;
    }
  }

  async stopChaosExperiment(experimentId: string): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(`${BACKEND_SERVICES.ANALYTICS_SERVICE}/api/v1/chaos/${experimentId}/stop`, {
        method: 'POST',
      });
      return response.ok;
    } catch (error) {
      console.error('Error stopping chaos experiment:', error);
      return false;
    }
  }

  // Monitoring URLs
  getMonitoringUrls() {
    return {
      grafana: BACKEND_SERVICES.GRAFANA,
      jaeger: BACKEND_SERVICES.JAEGER + '/search',
      prometheus: BACKEND_SERVICES.PROMETHEUS,
    };
  }

  // Fallback Mock Data (when services are not available)
  private getMockProducts(): Product[] {
    return [
      {
        id: '1',
        name: 'Backend Service Not Available',
        description: 'Please start the backend services to see real product data',
        price: 0,
        category: 'System',
        imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300',
        stock: 0,
        rating: 0,
        reviewCount: 0,
        brand: 'System',
        tags: ['backend', 'service']
      }
    ];
  }
}

export const backendApiService = new BackendAPIService();
export type { LoadTestConfig, ChaosConfig }; 