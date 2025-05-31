import React from 'react';
import { Typography, Box, Button, Card, CardContent, Container, Grid } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart as ShoppingCartIcon,
  AccountCircle as AccountIcon,
  Store as StoreIcon,
  Dashboard as DashboardIcon,
  Architecture as ArchitectureIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg">
      <Box sx={{ textAlign: 'center', mb: 6, mt: 4 }}>
        <Typography variant="h2" component="h1" gutterBottom>
          High Availability E-Commerce Platform
        </Typography>
        <Typography variant="h5" color="text.secondary" paragraph>
          Microservices Architecture with Real-Time Monitoring & Load Testing
        </Typography>
      </Box>

      <Grid container spacing={4} mb={6}>
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              <StoreIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Product Catalog
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Browse our extensive product catalog with advanced search and filtering capabilities.
                Powered by our high-performance microservices architecture.
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                size="large"
                onClick={() => navigate('/products')}
                startIcon={<ShoppingCartIcon />}
              >
                View Products
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              <DashboardIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Architecture Dashboard
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Monitor system performance, view real-time metrics, and run Artillery load tests
                to ensure high availability and scalability.
              </Typography>
              <Button 
                variant="contained" 
                color="error" 
                size="large"
                onClick={() => navigate('/dashboard')}
                startIcon={<ArchitectureIcon />}
              >
                View Dashboard
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h4" gutterBottom>
          Performance & Load Testing
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph sx={{ maxWidth: 800, mx: 'auto' }}>
          Our platform is built for high availability with comprehensive load testing using Artillery.
          Monitor real-time performance metrics and stress test the entire microservices architecture.
        </Typography>
        <Button 
          variant="outlined" 
          color="error" 
          size="large" 
          onClick={() => navigate('/dashboard')}
          startIcon={<SpeedIcon />}
          sx={{ mt: 2 }}
        >
          Start Load Test
        </Button>
      </Box>

      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Built with Modern Technologies
        </Typography>
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={6} md={3}>
            <Box sx={{ 
              p: 2, 
              bgcolor: 'primary.main', 
              color: 'primary.contrastText',
              borderRadius: 2,
              textAlign: 'center'
            }}>
              <Typography variant="h6">React 18.x</Typography>
              <Typography variant="body2">Modern Frontend</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box sx={{ 
              p: 2, 
              bgcolor: 'secondary.main', 
              color: 'secondary.contrastText',
              borderRadius: 2,
              textAlign: 'center'
            }}>
              <Typography variant="h6">TypeScript 5.x</Typography>
              <Typography variant="body2">Type Safety</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box sx={{ 
              p: 2, 
              bgcolor: 'success.main', 
              color: 'success.contrastText',
              borderRadius: 2,
              textAlign: 'center'
            }}>
              <Typography variant="h6">Material-UI v6</Typography>
              <Typography variant="body2">Modern UI</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box sx={{ 
              p: 2, 
              bgcolor: 'error.main', 
              color: 'error.contrastText',
              borderRadius: 2,
              textAlign: 'center'
            }}>
              <Typography variant="h6">Artillery</Typography>
              <Typography variant="body2">Load Testing</Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ textAlign: 'center', p: 4, bgcolor: 'grey.100', borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom>
          Architecture Highlights
        </Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={4}>
            <Typography variant="h6" color="primary">Microservices</Typography>
            <Typography variant="body2">4 independent services</Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="h6" color="primary">Load Balancing</Typography>
            <Typography variant="body2">API Gateway routing</Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="h6" color="primary">Real-time Monitoring</Typography>
            <Typography variant="body2">Performance analytics</Typography>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default HomePage; 