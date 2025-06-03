import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { backendApiService } from '../backendApi';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('BackendAPIService', () => {
  let originalConsoleLog: typeof console.log;
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console logs during tests for cleaner output
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    console.log = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
    // Restore console logs
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe('getSystemHealth', () => {
    it('returns a health status object for all monitored services', async () => {
      // Mock successful responses for health endpoints
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => []
      });

      const health = await backendApiService.getSystemHealth();

      // Just verify it returns an object with service health statuses
      expect(typeof health).toBe('object');
      expect(health).toHaveProperty('product');
      expect(health).toHaveProperty('user');
      expect(health).toHaveProperty('checkout');
      expect(health).toHaveProperty('analytics');
      
      // Each service should have a valid health status
      Object.values(health).forEach(status => {
        expect(['healthy', 'unhealthy', 'unknown']).toContain(status);
      });
    });

    it('handles network errors gracefully', async () => {
      // Mock network error
      mockFetch.mockRejectedValue(new Error('Network error'));

      const health = await backendApiService.getSystemHealth();

      // Should still return a valid health object with all services as 'unknown'
      expect(typeof health).toBe('object');
      expect(Object.keys(health).length).toBeGreaterThan(0);
      
      // All services should be 'unknown' when network fails
      Object.values(health).forEach(status => {
        expect(status).toBe('unknown');
      });
    });
  });

  describe('getProducts', () => {
    it('returns products when API is accessible', async () => {
      // MSW will handle the /api/products request
      const products = await backendApiService.getProducts();
      
      // Should return an array with at least one product
      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBeGreaterThan(0);
      expect(products[0]).toHaveProperty('id');
      expect(products[0]).toHaveProperty('name');
      expect(products[0]).toHaveProperty('price');
    });

    it('returns fallback data when API fails', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'));

      const products = await backendApiService.getProducts();
      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBeGreaterThan(0);
      
      // Should return fallback data structure
      expect(products[0]).toHaveProperty('id');
      expect(products[0]).toHaveProperty('name');
      expect(products[0]).toHaveProperty('price');
    });
  });

  describe('getMonitoringUrls', () => {
    it('returns monitoring URLs', () => {
      const urls = backendApiService.getMonitoringUrls();
      
      expect(urls).toHaveProperty('grafana');
      expect(urls).toHaveProperty('jaeger');
      expect(urls).toHaveProperty('prometheus');
      
      expect(typeof urls.grafana).toBe('string');
      expect(typeof urls.jaeger).toBe('string');
      expect(typeof urls.prometheus).toBe('string');
      
      // URLs should be valid
      expect(urls.grafana).toMatch(/^https?:\/\//);
      expect(urls.jaeger).toMatch(/^https?:\/\//);
      expect(urls.prometheus).toMatch(/^https?:\/\//);
    });
  });
}); 