import type { Product, User, Order, CartItem } from '../types/Product';
import { backendApiService } from './backendApi';

const API_BASE_URL = 'http://localhost';

// Mock data as fallback when backend services are not available
const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Gaming Laptop Pro',
    description: 'High-performance gaming laptop with RTX 4080, 32GB RAM, and 1TB SSD. Perfect for gaming and content creation.',
    price: 1299.99,
    category: 'Electronics',
    imageUrl: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=400',
    stock: 15,
    rating: 4.8,
    reviewCount: 256,
    brand: 'TechPro',
    tags: ['gaming', 'laptop', 'high-performance', 'rtx']
  },
  {
    id: '2',
    name: 'Wireless Noise-Canceling Headphones',
    description: 'Premium wireless headphones with active noise cancellation, 30-hour battery life, and studio-quality sound.',
    price: 299.99,
    category: 'Electronics',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
    stock: 42,
    rating: 4.7,
    reviewCount: 189,
    brand: 'AudioMax',
    tags: ['wireless', 'noise-canceling', 'headphones', 'premium']
  },
  {
    id: '3',
    name: 'Ergonomic Office Chair',
    description: 'Professional ergonomic office chair with lumbar support, adjustable height, and premium mesh fabric.',
    price: 399.99,
    category: 'Home',
    imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400',
    stock: 28,
    rating: 4.6,
    reviewCount: 145,
    brand: 'ComfortPlus',
    tags: ['ergonomic', 'office', 'chair', 'professional']
  },
  {
    id: '4',
    name: 'Organic Cotton T-Shirt',
    description: 'Soft, breathable organic cotton t-shirt available in multiple colors. Sustainable and comfortable.',
    price: 29.99,
    category: 'Clothing',
    imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
    stock: 156,
    rating: 4.5,
    reviewCount: 89,
    brand: 'EcoWear',
    tags: ['organic', 'cotton', 't-shirt', 'sustainable']
  },
  {
    id: '5',
    name: 'Smart Watch Pro',
    description: 'Advanced fitness tracking, heart rate monitoring, GPS, and 7-day battery life. Water resistant.',
    price: 349.99,
    category: 'Electronics',
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
    stock: 67,
    rating: 4.4,
    reviewCount: 312,
    brand: 'FitTech',
    tags: ['smartwatch', 'fitness', 'gps', 'waterproof']
  },
  {
    id: '6',
    name: 'Premium Running Shoes',
    description: 'Lightweight running shoes with advanced cushioning technology and breathable mesh upper.',
    price: 129.99,
    category: 'Clothing',
    imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400',
    stock: 89,
    rating: 4.9,
    reviewCount: 234,
    brand: 'RunFast',
    tags: ['running', 'shoes', 'lightweight', 'cushioning']
  },
  {
    id: '7',
    name: 'Professional Coffee Maker',
    description: 'Programmable coffee maker with built-in grinder, thermal carafe, and customizable brew strength.',
    price: 249.99,
    category: 'Home',
    imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400',
    stock: 34,
    rating: 4.6,
    reviewCount: 167,
    brand: 'BrewMaster',
    tags: ['coffee', 'programmable', 'grinder', 'thermal']
  },
  {
    id: '8',
    name: 'Bluetooth Speaker Portable',
    description: 'Compact waterproof Bluetooth speaker with 360-degree sound and 12-hour battery life.',
    price: 89.99,
    category: 'Electronics',
    imageUrl: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400',
    stock: 123,
    rating: 4.3,
    reviewCount: 98,
    brand: 'SoundWave',
    tags: ['bluetooth', 'portable', 'waterproof', '360-sound']
  },
  {
    id: '9',
    name: 'Leather Messenger Bag',
    description: 'Handcrafted genuine leather messenger bag with laptop compartment and adjustable strap.',
    price: 179.99,
    category: 'Clothing',
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
    stock: 45,
    rating: 4.8,
    reviewCount: 76,
    brand: 'CraftLeather',
    tags: ['leather', 'messenger', 'laptop', 'handcrafted']
  },
  {
    id: '10',
    name: 'Smart Home Hub',
    description: 'Central control hub for all smart home devices with voice control and mobile app integration.',
    price: 199.99,
    category: 'Electronics',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    stock: 78,
    rating: 4.5,
    reviewCount: 145,
    brand: 'SmartLife',
    tags: ['smart-home', 'hub', 'voice-control', 'automation']
  }
];

// Helper function to generate image URLs based on product data
const generateImageUrl = (product: any): string => {
  const name = product.name?.toLowerCase() || '';
  const category = product.category?.toLowerCase() || '';
  
  // Map products to specific Unsplash images based on keywords
  if (name.includes('macbook') || name.includes('mac')) {
    return 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500';
  }
  if (name.includes('iphone')) {
    return 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500';
  }
  if (name.includes('ipad')) {
    return 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=500';
  }
  if (name.includes('airpods')) {
    return 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=500';
  }
  if (name.includes('samsung') && name.includes('galaxy')) {
    return 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=500';
  }
  if (name.includes('samsung') && name.includes('monitor')) {
    return 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500';
  }
  if (name.includes('nintendo') || name.includes('switch')) {
    return 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=500';
  }
  if (name.includes('sony') || name.includes('headphone')) {
    return 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500';
  }
  if (name.includes('dell') || name.includes('xps')) {
    return 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=500';
  }
  if (name.includes('surface') || name.includes('microsoft')) {
    return 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500';
  }
  if (name.includes('logitech') || name.includes('mouse')) {
    return 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=500';
  }
  if (name.includes('kindle') || name.includes('e-reader')) {
    return 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500';
  }
  if (name.includes('canon') || name.includes('camera')) {
    return 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=500';
  }
  if (name.includes('lg') && (name.includes('tv') || name.includes('oled'))) {
    return 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500';
  }
  if (name.includes('gaming') && name.includes('stuhl')) {
    return 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500';
  }
  
  // Fallback based on category
  if (category.includes('laptop') || category.includes('electronics')) {
    return 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500';
  }
  if (category.includes('smartphone') || category.includes('phone')) {
    return 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500';
  }
  if (category.includes('audio') || category.includes('headphone')) {
    return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500';
  }
  if (category.includes('gaming')) {
    return 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=500';
  }
  if (category.includes('tv') || category.includes('monitor')) {
    return 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500';
  }
  if (category.includes('camera')) {
    return 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=500';
  }
  if (category.includes('tablet')) {
    return 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=500';
  }
  
  // Default fallback
  return 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=500';
};

// Transform backend product data to frontend format
const transformProduct = (backendProduct: any): Product => {
  return {
    id: backendProduct.productId || backendProduct.id,
    name: backendProduct.name,
    description: backendProduct.description,
    price: backendProduct.price,
    category: backendProduct.category,
    imageUrl: backendProduct.imageUrl || generateImageUrl(backendProduct),
    stock: backendProduct.inventoryCount || backendProduct.stock || 0,
    rating: backendProduct.rating || 4.5, // Default rating
    reviewCount: backendProduct.reviewCount || Math.floor(Math.random() * 100) + 10,
    brand: backendProduct.brand || 'Unknown',
    tags: backendProduct.tags || [backendProduct.category]
  };
};

// Enhanced Product Service with Backend Integration
class ProductService {
  async getProducts(): Promise<Product[]> {
    try {
      // Try to get real data from backend first
      const realProducts = await backendApiService.getProducts();
      return realProducts.map(transformProduct);
    } catch (error) {
      console.log('Backend not available, using mock data');
      // Fallback to mock data
      return mockProducts.map(transformProduct);
    }
  }

  async getProductById(id: string): Promise<Product | null> {
    try {
      // Try backend first
      const product = await backendApiService.getProductById(id);
      if (product) return transformProduct(product);
    } catch (error) {
      console.log('Backend not available for product details, using mock data');
    }
    
    // Fallback to mock data
    return mockProducts.find(p => p.id === id) || null;
  }

  async searchProducts(query: string): Promise<Product[]> {
    const products = await this.getProducts();
    if (!query.trim()) return products;
    
    const searchTerms = query.toLowerCase().split(' ');
    return products.filter(product => 
      searchTerms.some(term => 
        product.name.toLowerCase().includes(term) ||
        product.description.toLowerCase().includes(term) ||
        product.brand.toLowerCase().includes(term) ||
        product.tags.some(tag => tag.toLowerCase().includes(term))
      )
    );
  }
}

// Enhanced User Service with Backend Integration
class UserService {
  async createUser(userData: Omit<User, 'id'>): Promise<User> {
    try {
      // Try backend first
      return await backendApiService.createUser(userData);
    } catch (error) {
      console.log('Backend not available for user creation, using mock');
      // Fallback: create mock user
      return {
        id: 'mock-' + Date.now(),
        ...userData
      };
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      return await backendApiService.getUserById(id);
    } catch (error) {
      console.log('Backend not available for user lookup, using mock');
      // Mock user for demonstration
      return {
        id,
        email: 'demo@example.com',
        name: 'Demo User'
      };
    }
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User | null> {
    try {
      // This would be implemented in backend
      const user = await this.getUserById(id);
      if (user) {
        return { ...user, ...userData };
      }
    } catch (error) {
      console.log('Backend not available for user update');
    }
    return null;
  }
}

// Enhanced Order Service with Backend Integration
class OrderService {
  async createOrder(orderData: Omit<Order, 'id'>): Promise<Order> {
    try {
      // Try backend first
      return await backendApiService.createOrder(orderData);
    } catch (error) {
      console.log('Backend not available for order creation, using mock');
      // Fallback: create mock order
      return {
        id: 'order-' + Date.now(),
        ...orderData,
        createdAt: new Date().toISOString()
      };
    }
  }

  async getOrderById(id: string): Promise<Order | null> {
    try {
      return await backendApiService.getOrderById(id);
    } catch (error) {
      console.log('Backend not available for order lookup');
      return null;
    }
  }

  async getOrdersByUserId(userId: string): Promise<Order[]> {
    // This would be implemented in backend
    console.log('Mock: Getting orders for user', userId);
    return [];
  }
}

// Enhanced Analytics Service with Backend Integration
class AnalyticsService {
  async trackEvent(event: string, data: any): Promise<void> {
    try {
      // Try backend first
      await backendApiService.trackEvent(event, data);
    } catch (error) {
      // Analytics tracking failures should be silent
      console.log('Analytics tracking failed:', event, data);
    }
  }

  async getMetrics(): Promise<any> {
    try {
      return await backendApiService.getAnalytics('overview');
    } catch (error) {
      console.log('Backend not available for metrics');
      // Return mock metrics
      return {
        totalUsers: 1234,
        totalOrders: 5678,
        revenue: 123456.78,
        conversionRate: 3.45
      };
    }
  }

  async trackProductView(productId: string): Promise<void> {
    await this.trackEvent('product_view', { productId, timestamp: new Date().toISOString() });
  }

  async trackAddToCart(productId: string, quantity: number): Promise<void> {
    await this.trackEvent('add_to_cart', { productId, quantity, timestamp: new Date().toISOString() });
  }

  async trackRemoveFromCart(productId: string): Promise<void> {
    await this.trackEvent('remove_from_cart', { productId, timestamp: new Date().toISOString() });
  }

  async trackPurchase(orderId: string, total: number, items: CartItem[]): Promise<void> {
    await this.trackEvent('purchase', { 
      orderId, 
      total, 
      itemCount: items.length,
      items: items.map(item => ({ 
        productId: item.product.id, 
        quantity: item.quantity,
        price: item.product.price 
      })),
      timestamp: new Date().toISOString() 
    });
  }

  async trackPageView(page: string): Promise<void> {
    await this.trackEvent('page_view', { page, timestamp: new Date().toISOString() });
  }
}

// System Health Service
class SystemHealthService {
  async getHealthStatus(): Promise<{[key: string]: 'healthy' | 'unhealthy' | 'unknown'}> {
    try {
      return await backendApiService.getSystemHealth();
    } catch (error) {
      return {
        product: 'unknown',
        user: 'unknown', 
        checkout: 'unknown',
        analytics: 'unknown'
      };
    }
  }
}

// Service instances
export const productService = new ProductService();
export const userService = new UserService();
export const orderService = new OrderService();
export const analyticsService = new AnalyticsService();
export const systemHealthService = new SystemHealthService();

// Export backend API service for direct access
export { backendApiService };

// Export ProductCategories constant
export const ProductCategories = [
  'Electronics',
  'Clothing', 
  'Home',
  'Sports',
  'Books'
] as const; 