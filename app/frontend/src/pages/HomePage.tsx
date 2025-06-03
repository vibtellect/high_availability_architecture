import React from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Paper,
  Chip,
  Rating,
  useTheme,
  useMediaQuery,
  Stack,
  Divider
} from '@mui/material';
import {
  ShoppingBag as ShoppingBagIcon,
  TrendingUp as TrendingUpIcon,
  Security as SecurityIcon,
  LocalShipping as ShippingIcon,
  Support as SupportIcon,
  Star as StarIcon,
  StorefrontOutlined as StorefrontIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { productService } from '../services/api';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Get featured products
  const { data: products = [] } = useQuery('products', productService.getProducts);
  const featuredProducts = products.slice(0, 4);

  const features = [
    {
      icon: <SecurityIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
      title: 'Sichere Bezahlung',
      description: 'SSL-verschlüsselte Transaktionen und sichere Zahlungsmethoden'
    },
    {
      icon: <ShippingIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
      title: 'Schneller Versand',
      description: 'Kostenloser Versand ab 50€ und Express-Lieferung verfügbar'
    },
    {
      icon: <SupportIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
      title: '24/7 Support',
      description: 'Unser Kundenservice ist rund um die Uhr für Sie da'
    },
    {
      icon: <TrendingUpIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
      title: 'High Availability',
      description: 'Moderne Microservices-Architektur für maximale Verfügbarkeit'
    }
  ];

  const stats = [
    { value: '10,000+', label: 'Zufriedene Kunden' },
    { value: '50,000+', label: 'Verkaufte Produkte' },
    { value: '99.9%', label: 'Uptime' },
    { value: '4.8/5', label: 'Kundenbewertung' }
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          py: { xs: 8, md: 12 },
          mb: 8
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography 
                variant={isMobile ? "h3" : "h2"} 
                component="h1" 
                fontWeight="bold" 
                gutterBottom
              >
                High Availability E-Commerce Platform
              </Typography>
              <Typography 
                variant="h5" 
                sx={{ mb: 4, opacity: 0.9 }}
              >
                Erleben Sie modernen Online-Shopping mit unserer hochverfügbaren Microservices-Architektur
              </Typography>
              <Typography 
                variant="body1" 
                sx={{ mb: 4, fontSize: '1.1rem', opacity: 0.8 }}
              >
                Entdecken Sie unsere Produktauswahl und erleben Sie, wie robuste Technologie 
                ein nahtloses Einkaufserlebnis ermöglicht.
              </Typography>
              
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/products')}
                  startIcon={<ShoppingBagIcon />}
                  sx={{
                    bgcolor: 'white',
                    color: 'primary.main',
                    fontWeight: 'bold',
                    px: 4,
                    py: 1.5,
                    '&:hover': {
                      bgcolor: 'grey.100'
                    }
                  }}
                >
                  Jetzt einkaufen
                </Button>
                
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/architecture')}
                  startIcon={<StorefrontIcon />}
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    fontWeight: 'bold',
                    px: 4,
                    py: 1.5,
                    '&:hover': {
                      borderColor: 'white',
                      bgcolor: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  Architektur erkunden
                </Button>
              </Stack>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  textAlign: 'center',
                  '& img': {
                    maxWidth: '100%',
                    height: 'auto',
                    borderRadius: 2,
                    boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
                  }
                }}
              >
                <img 
                  src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop"
                  alt="E-Commerce Shopping"
                />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg">
        {/* Stats Section */}
        <Paper elevation={3} sx={{ p: 4, mb: 8, borderRadius: 3 }}>
          <Grid container spacing={4} textAlign="center">
            {stats.map((stat, index) => (
              <Grid item xs={6} md={3} key={index}>
                <Typography variant="h3" fontWeight="bold" color="primary.main">
                  {stat.value}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {stat.label}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </Paper>

        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <Box mb={8}>
            <Typography 
              variant="h4" 
              component="h2" 
              fontWeight="bold" 
              textAlign="center" 
              mb={1}
            >
              Beliebte Produkte
            </Typography>
            <Typography 
              variant="body1" 
              color="text.secondary" 
              textAlign="center" 
              mb={4}
            >
              Entdecken Sie unsere meistverkauften Artikel
            </Typography>
            
            <Grid container spacing={3}>
              {featuredProducts.map((product) => (
                <Grid item xs={12} sm={6} md={3} key={product.id}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 4
                      }
                    }}
                    onClick={() => navigate('/products')}
                  >
                    <CardMedia
                      component="img"
                      height="200"
                      image={product.imageUrl}
                      alt={product.name}
                      sx={{ objectFit: 'cover' }}
                    />
                    <CardContent>
                      <Chip 
                        label={product.category} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                        sx={{ mb: 1 }}
                      />
                      <Typography 
                        variant="h6" 
                        fontWeight="medium" 
                        gutterBottom
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}
                      >
                        {product.name}
                      </Typography>
                      
                      <Box display="flex" alignItems="center" mb={1}>
                        <Rating value={product.rating} precision={0.1} size="small" readOnly />
                        <Typography variant="caption" color="text.secondary" ml={1}>
                          ({product.reviewCount})
                        </Typography>
                      </Box>
                      
                      <Typography 
                        variant="h6" 
                        color="primary.main" 
                        fontWeight="bold"
                      >
                        {formatPrice(product.price)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
            
            <Box textAlign="center" mt={4}>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/products')}
                startIcon={<ShoppingBagIcon />}
              >
                Alle Produkte anzeigen
              </Button>
            </Box>
          </Box>
        )}

        {/* Features Section */}
        <Box mb={8}>
          <Typography 
            variant="h4" 
            component="h2" 
            fontWeight="bold" 
            textAlign="center" 
            mb={1}
          >
            Warum HA E-Commerce?
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary" 
            textAlign="center" 
            mb={4}
          >
            Moderne Technologie trifft auf erstklassigen Service
          </Typography>
          
          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card 
                  elevation={2}
                  sx={{ 
                    height: '100%', 
                    textAlign: 'center', 
                    p: 3,
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 4
                    }
                  }}
                >
                  <Box mb={2}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Technology Showcase */}
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            mb: 8, 
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            borderRadius: 3
          }}
        >
          <Typography 
            variant="h4" 
            component="h2" 
            fontWeight="bold" 
            textAlign="center" 
            mb={2}
          >
            Powered by Modern Architecture
          </Typography>
          <Typography 
            variant="body1" 
            textAlign="center" 
            mb={4}
            color="text.secondary"
          >
            Unsere Platform nutzt modernste Microservices-Technologien für maximale Skalierbarkeit und Zuverlässigkeit
          </Typography>
          
          <Grid container spacing={2} justifyContent="center">
            {['Spring Boot', 'Docker', 'Kubernetes', 'Redis', 'PostgreSQL', 'React', 'OpenTelemetry', 'Jaeger'].map((tech) => (
              <Grid item key={tech}>
                <Chip 
                  label={tech} 
                  variant="outlined" 
                  color="primary"
                  sx={{ 
                    fontWeight: 'medium',
                    '&:hover': {
                      bgcolor: 'primary.main',
                      color: 'white'
                    }
                  }}
                />
              </Grid>
            ))}
          </Grid>
          
          <Box textAlign="center" mt={3}>
            <Button
              variant="outlined"
              onClick={() => navigate('/architecture')}
              startIcon={<TrendingUpIcon />}
            >
              Architektur Details
            </Button>
          </Box>
        </Paper>

        {/* Call to Action */}
        <Box textAlign="center" py={6}>
          <Typography variant="h4" fontWeight="bold" mb={2}>
            Bereit zum Einkaufen?
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={4}>
            Entdecken Sie unsere große Auswahl an hochwertigen Produkten
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/products')}
            startIcon={<ShoppingBagIcon />}
            sx={{ px: 4, py: 1.5, fontSize: '1.1rem' }}
          >
            Zum Shop
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default HomePage; 