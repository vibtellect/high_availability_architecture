// Global type definitions for the High Availability Architecture Frontend

declare global {
  interface Window {
    analytics?: {
      track: (event: string, properties?: Record<string, any>) => void;
      identify: (userId: string, traits?: Record<string, any>) => void;
      page: (category?: string, name?: string, properties?: Record<string, any>) => void;
    };
  }

  // Environment variables
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      VITE_API_BASE_URL?: string;
      VITE_ENABLE_ANALYTICS?: string;
      VITE_BACKEND_TIMEOUT?: string;
    }
  }
}

// Extend Material-UI theme if needed
declare module '@mui/material/styles' {
  interface Theme {
    status?: {
      danger: string;
    };
  }

  interface ThemeOptions {
    status?: {
      danger?: string;
    };
  }
}

// Add type definitions for module imports that might not have types
declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}

// Error event types for better error handling
interface ErrorEvent {
  error?: Error;
  message: string;
  filename?: string;
  lineno?: number;
  colno?: number;
}

interface PromiseRejectionEvent {
  reason: any;
  promise: Promise<any>;
  preventDefault(): void;
}

// React Query error types
interface QueryError {
  message: string;
  status?: number;
  data?: any;
}

// Export empty object to make this a module
export {}; 