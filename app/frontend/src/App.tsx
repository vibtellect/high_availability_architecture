import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import { CartProvider } from './context/CartContext';
import ErrorBoundary from './components/ErrorBoundary';
import useErrorHandler from './hooks/useErrorHandler';

// Pages
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import DashboardPage from './pages/DashboardPage';
import ArchitecturePage from './pages/ArchitecturePage';
import ArchitectureDashboard from './pages/ArchitectureDashboard';

// Create a client for React Query with enhanced error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      onError: (error) => {
        console.group('🔌 Query Error');
        console.error('React Query Error:', error);
        console.groupEnd();
      }
    },
    mutations: {
      onError: (error) => {
        console.group('🔄 Mutation Error');
        console.error('React Query Mutation Error:', error);
        console.groupEnd();
      }
    }
  },
});

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const AppContent: React.FC = () => {
  // Enable global error handling
  useErrorHandler({
    enableConsoleGrouping: true,
    enableNotifications: true,
    enableAnalytics: false // Set to true if you want to track errors
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <CartProvider>
          <Router>
            <Box display="flex" flexDirection="column" minHeight="100vh">
              <Header />
              <Box component="main" flexGrow={1}>
                <ErrorBoundary>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/products" element={<ProductsPage />} />
                    <Route path="/shop" element={<ProductsPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/architecture" element={<ArchitecturePage />} />
                    <Route path="/arch-dashboard" element={<ArchitectureDashboard />} />
                    
                    {/* Placeholder routes for future implementation */}
                    <Route path="/profile" element={<div>Profile Page - Coming Soon</div>} />
                    <Route path="/orders" element={<div>Orders Page - Coming Soon</div>} />
                    <Route path="/wishlist" element={<div>Wishlist Page - Coming Soon</div>} />
                    
                    {/* 404 Page */}
                    <Route 
                      path="*" 
                      element={
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                          <h1>404 - Seite nicht gefunden</h1>
                          <p>Die angeforderte Seite existiert nicht.</p>
                        </div>
                      } 
                    />
                  </Routes>
                </ErrorBoundary>
              </Box>
              <Footer />
            </Box>
          </Router>
        </CartProvider>
      </ThemeProvider>
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
};

export default App;
