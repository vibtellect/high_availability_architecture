import { http, HttpResponse } from 'msw'

// Product Service Mock Handlers
export const productHandlers = [
  http.get('/api/products', () => {
    return HttpResponse.json([
      {
        id: 'product-1',
        name: 'High-Performance Laptop',
        price: 999.99,
        description: 'Professional laptop for developers',
        category: 'electronics',
        stock: 25,
        imageUrl: '/images/laptop.jpg'
      },
      {
        id: 'product-2', 
        name: 'Wireless Mouse',
        price: 49.99,
        description: 'Ergonomic wireless mouse',
        category: 'accessories',
        stock: 100,
        imageUrl: '/images/mouse.jpg'
      },
      {
        id: 'product-3',
        name: 'Mechanical Keyboard',
        price: 129.99,
        description: 'RGB mechanical gaming keyboard',
        category: 'accessories', 
        stock: 50,
        imageUrl: '/images/keyboard.jpg'
      }
    ])
  }),

  http.get('/api/products/:id', ({ params }) => {
    const { id } = params
    return HttpResponse.json({
      id,
      name: 'Mock Product',
      price: 99.99,
      description: `Mock description for product ${id}`,
      category: 'electronics',
      stock: 10,
      imageUrl: '/images/mock-product.jpg'
    })
  }),

  http.post('/api/products', async ({ request }) => {
    const newProduct = await request.json()
    return HttpResponse.json({
      id: 'new-product-id',
      ...newProduct,
      createdAt: new Date().toISOString()
    }, { status: 201 })
  })
]

// User Service Mock Handlers
export const userHandlers = [
  http.post('/api/users/login', async ({ request }) => {
    const { email, password } = await request.json() as { email: string; password: string }
    
    if (email === 'test@example.com' && password === 'password') {
      return HttpResponse.json({
        token: 'mock-jwt-token',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'customer'
        }
      })
    }
    
    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }),

  http.post('/api/users/register', async ({ request }) => {
    const userData = await request.json()
    return HttpResponse.json({
      user: {
        id: 'new-user-id',
        ...userData,
        createdAt: new Date().toISOString()
      }
    }, { status: 201 })
  }),

  http.get('/api/users/profile', ({ request }) => {
    const auth = request.headers.get('Authorization')
    if (!auth) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    return HttpResponse.json({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'customer',
      createdAt: '2024-01-01T00:00:00Z'
    })
  })
]

// Checkout Service Mock Handlers
export const checkoutHandlers = [
  http.post('/api/checkout/cart', async ({ request }) => {
    const { productId, quantity } = await request.json() as { productId: string; quantity: number }
    return HttpResponse.json({
      cartId: 'cart-1',
      items: [
        {
          productId,
          quantity,
          price: 99.99,
          subtotal: 99.99 * quantity
        }
      ],
      total: 99.99 * quantity
    })
  }),

  http.get('/api/checkout/cart/:cartId', ({ params }) => {
    return HttpResponse.json({
      cartId: params.cartId,
      items: [
        {
          productId: 'product-1',
          quantity: 2,
          price: 99.99,
          subtotal: 199.98
        }
      ],
      total: 199.98
    })
  }),

  http.post('/api/checkout/order', async ({ request }) => {
    const orderData = await request.json()
    return HttpResponse.json({
      orderId: 'order-123',
      status: 'confirmed',
      total: orderData.total || 199.98,
      createdAt: new Date().toISOString()
    }, { status: 201 })
  })
]

// Analytics Service Mock Handlers
export const analyticsHandlers = [
  http.post('/api/analytics/events', async ({ request }) => {
    const eventData = await request.json()
    return HttpResponse.json({
      eventId: 'event-123',
      status: 'recorded',
      timestamp: new Date().toISOString()
    }, { status: 201 })
  }),

  http.get('/api/analytics/metrics/load-test', () => {
    return HttpResponse.json({
      timestamp: new Date().toISOString(),
      metrics: {
        requests_per_second: Math.floor(Math.random() * 1000) + 500,
        average_response_time: Math.floor(Math.random() * 200) + 50,
        error_rate: Math.random() * 5,
        active_users: Math.floor(Math.random() * 100) + 50,
        cpu_usage: Math.random() * 80 + 10,
        memory_usage: Math.random() * 70 + 20
      },
      services: {
        product_service: {
          status: 'healthy',
          response_time: Math.floor(Math.random() * 100) + 20,
          requests: Math.floor(Math.random() * 200) + 100
        },
        user_service: {
          status: 'healthy', 
          response_time: Math.floor(Math.random() * 80) + 15,
          requests: Math.floor(Math.random() * 150) + 80
        },
        checkout_service: {
          status: 'healthy',
          response_time: Math.floor(Math.random() * 120) + 30,
          requests: Math.floor(Math.random() * 100) + 50
        },
        analytics_service: {
          status: 'healthy',
          response_time: Math.floor(Math.random() * 90) + 25,
          requests: Math.floor(Math.random() * 300) + 200
        }
      }
    })
  }),

  http.get('/api/analytics/chaos-status', () => {
    const scenarios = ['service-failure', 'high-latency', 'network-partition', 'resource-exhaustion']
    const activeScenario = scenarios[Math.floor(Math.random() * scenarios.length)]
    
    return HttpResponse.json({
      timestamp: new Date().toISOString(),
      chaos_engineering: {
        active: Math.random() > 0.5,
        scenario: activeScenario,
        affected_services: ['product-service'],
        start_time: new Date(Date.now() - 30000).toISOString(),
        impact_level: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
      },
      system_resilience: {
        circuit_breakers_triggered: Math.floor(Math.random() * 3),
        auto_recovery_attempts: Math.floor(Math.random() * 5),
        service_health_scores: {
          product_service: Math.random() * 40 + 60,
          user_service: Math.random() * 30 + 70,
          checkout_service: Math.random() * 50 + 50,
          analytics_service: Math.random() * 20 + 80
        }
      }
    })
  })
]

// Combined handlers for all services
export const handlers = [
  ...productHandlers,
  ...userHandlers, 
  ...checkoutHandlers,
  ...analyticsHandlers
] 