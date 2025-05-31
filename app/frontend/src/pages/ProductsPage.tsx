import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';
import { Store as StoreIcon } from '@mui/icons-material';

const ProductsPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" alignItems="center" mb={3}>
        <StoreIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
        <Typography variant="h3" component="h1">
          Product Catalog
        </Typography>
      </Box>
      
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Coming Soon
        </Typography>
        <Typography variant="body1" color="text.secondary">
          The product catalog will be implemented in the next phase of development.
          This page will showcase products from our microservices architecture.
        </Typography>
      </Paper>
    </Container>
  );
};

export default ProductsPage; 