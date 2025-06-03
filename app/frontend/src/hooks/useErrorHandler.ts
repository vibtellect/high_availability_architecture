import { useEffect, useCallback } from 'react';

interface ErrorInfo {
  error: Error;
  errorInfo?: {
    componentStack?: string;
  };
  context?: string;
  timestamp: string;
  userAgent: string;
  url: string;
}

interface UseErrorHandlerOptions {
  enableConsoleGrouping?: boolean;
  enableNotifications?: boolean;
  enableAnalytics?: boolean;
}

const useErrorHandler = (options: UseErrorHandlerOptions = {}) => {
  const {
    enableConsoleGrouping = true,
    enableNotifications = true,
    enableAnalytics = false
  } = options;

  // Enhanced error logging function
  const logError = useCallback((errorInfo: ErrorInfo) => {
    if (enableConsoleGrouping) {
      console.group('🚨 Frontend Error Detected');
      console.error('Error:', errorInfo.error);
      console.error('Message:', errorInfo.error.message);
      console.error('Stack:', errorInfo.error.stack);
      if (errorInfo.errorInfo?.componentStack) {
        console.error('Component Stack:', errorInfo.errorInfo.componentStack);
      }
      console.error('Context:', errorInfo.context || 'Unknown');
      console.error('Timestamp:', errorInfo.timestamp);
      console.error('URL:', errorInfo.url);
      console.error('User Agent:', errorInfo.userAgent);
      console.groupEnd();
    } else {
      console.error('Frontend Error:', errorInfo);
    }

    // Send to analytics if enabled
    if (enableAnalytics && window.analytics) {
      window.analytics.track('Frontend Error', {
        error: errorInfo.error.message,
        stack: errorInfo.error.stack,
        context: errorInfo.context,
        timestamp: errorInfo.timestamp,
        url: errorInfo.url
      });
    }
  }, [enableConsoleGrouping, enableAnalytics]);

  // Global error handler for uncaught JavaScript errors
  const handleGlobalError = useCallback((event: ErrorEvent) => {
    const errorInfo: ErrorInfo = {
      error: event.error || new Error(event.message),
      context: 'Global Error Handler',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    logError(errorInfo);

    if (enableNotifications) {
      // You could show a toast notification here
      console.warn('Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu.');
    }

    // Prevent the default browser error handling
    return true;
  }, [logError, enableNotifications]);

  // Promise rejection handler for uncaught promise rejections
  const handleUnhandledRejection = useCallback((event: PromiseRejectionEvent) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    
    const errorInfo: ErrorInfo = {
      error,
      context: 'Unhandled Promise Rejection',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    logError(errorInfo);

    if (enableNotifications) {
      console.warn('Ein Netzwerk- oder Datenfehler ist aufgetreten.');
    }

    // Prevent the default unhandled rejection handling
    event.preventDefault();
  }, [logError, enableNotifications]);

  // Manual error reporting function
  const reportError = useCallback((error: Error, context?: string, componentStack?: string) => {
    const errorInfo: ErrorInfo = {
      error,
      errorInfo: componentStack ? { componentStack } : undefined,
      context: context || 'Manual Report',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    logError(errorInfo);
  }, [logError]);

  // Setup global error handlers
  useEffect(() => {
    // Handle uncaught JavaScript errors
    window.addEventListener('error', handleGlobalError);
    
    // Handle uncaught promise rejections
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Setup React error boundary fallback for development
    if (process.env.NODE_ENV === 'development') {
      const originalConsoleError = console.error;
      console.error = (...args) => {
        // Check if this looks like a React error
        const isReactError = args.some(arg => 
          typeof arg === 'string' && (
            arg.includes('React') ||
            arg.includes('component') ||
            arg.includes('hook') ||
            arg.includes('render')
          )
        );

        if (isReactError) {
          console.group('⚛️ React Development Error');
          originalConsoleError(...args);
          console.group('💡 Tipps zur Fehlerbehebung:');
          console.log('1. Überprüfen Sie die Component-Props und State');
          console.log('2. Stellen Sie sicher, dass alle Hooks korrekt verwendet werden');
          console.log('3. Prüfen Sie die Import/Export Statements');
          console.log('4. Schauen Sie in die Browser DevTools für weitere Details');
          console.groupEnd();
          console.groupEnd();
        } else {
          originalConsoleError(...args);
        }
      };

      // Cleanup function to restore original console.error
      return () => {
        console.error = originalConsoleError;
        window.removeEventListener('error', handleGlobalError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    }

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [handleGlobalError, handleUnhandledRejection]);

  return { reportError };
};

export default useErrorHandler; 