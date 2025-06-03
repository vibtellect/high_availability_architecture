import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Enable Fast Refresh
      fastRefresh: true,
      // Better error handling in development
      babel: {
        plugins: process.env.NODE_ENV === 'development' ? [
          ['@babel/plugin-transform-react-jsx-development', {}]
        ] : []
      }
    })
  ],
  
  // Better error handling
  define: {
    __DEV__: process.env.NODE_ENV === 'development',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
  },

  // Improved development server configuration
  server: {
    port: 3001,
    host: true,
    strictPort: true,
    
    // Better error overlay
    hmr: {
      overlay: true,
      clientPort: 3001
    },
    
    // Proxy configuration for backend services
    proxy: {
      '/api/v1/products': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/v1\/products/, '/api/products')
      },
      '/api/v1/users': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/v1\/users/, '/api/users')
      },
      '/api/v1/checkout': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/v1\/checkout/, '/api/checkout')
      },
      '/api/v1/analytics': {
        target: 'http://localhost:8083',
        changeOrigin: true,
        rewrite: (path) => path
      },
      '/api/products': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/products/, '/api/products')
      },
      '/api/users': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/users/, '/api/users')
      },
      '/api/checkout': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/checkout/, '/api/checkout')
      },
      '/api/analytics': {
        target: 'http://localhost:8083',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/analytics/, '/api/analytics')
      },
      '/load-test': {
        target: 'http://localhost:8084',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/load-test/, '')
      }
    }
  },

  // Better build configuration
  build: {
    outDir: 'dist',
    sourcemap: true,
    
    // Show more detailed build errors
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000,
    
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          router: ['react-router-dom']
        }
      },
      
      // Better error handling during build
      onwarn(warning, warn) {
        // Suppress certain warnings that aren't critical
        if (warning.code === 'THIS_IS_UNDEFINED') return;
        if (warning.code === 'CIRCULAR_DEPENDENCY') return;
        
        // Show other warnings
        warn(warning);
      }
    }
  },

  // Better module resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@pages': resolve(__dirname, 'src/pages'),
      '@services': resolve(__dirname, 'src/services'),
      '@types': resolve(__dirname, 'src/types'),
      '@utils': resolve(__dirname, 'src/utils')
    }
  },

  // Optimized dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material',
      '@mui/icons-material',
      '@emotion/react',
      '@emotion/styled'
    ],
    
    // Handle pre-bundling errors gracefully
    exclude: ['@mui/x-date-pickers']
  },

  // Development-specific error handling
  ...(process.env.NODE_ENV === 'development' && {
    esbuild: {
      // Better error messages in development
      format: 'esm',
      logOverride: {
        'this-is-undefined-in-esm': 'silent'
      }
    }
  })
})
