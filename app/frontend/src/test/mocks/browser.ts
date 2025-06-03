import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

// Setup MSW browser worker for development mocking
export const worker = setupWorker(...handlers)

// Start the worker in development mode
if (import.meta.env.DEV) {
  worker.start({
    onUnhandledRequest: 'warn',
    serviceWorker: {
      url: '/mockServiceWorker.js'
    }
  })
} 