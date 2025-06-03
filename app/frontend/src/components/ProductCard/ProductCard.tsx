import React, { useState } from 'react';
import {
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  Button,
  Rating,
  Chip,
  Box,
  IconButton,
  Snackbar,
  Alert,
  Tooltip
} from '@mui/material';
import {
  ShoppingCart as ShoppingCartIcon,
  Visibility as VisibilityIcon,
  Inventory as InventoryIcon
} from '@mui/icons-material';
import type { Product } from '../../types/Product';
import { useCart } from '../../context/CartContext';
import { analyticsService } from '../../services/api';

interface ProductCardProps {
  product: Product;
  onViewDetails?: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onViewDetails }) => {
  const { addToCart, getCartItem } = useCart();
  const [showSuccess, setShowSuccess] = useState(false);
  const cartItem = getCartItem(product.id);

  const handleAddToCart = () => {
    addToCart(product);
    setShowSuccess(true);
    analyticsService.trackProductView(product.id);
  };

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(product);
    }
    analyticsService.trackProductView(product.id);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  const getStockStatus = () => {
    if (product.stock === 0) {
      return { label: 'Ausverkauft', color: 'error' as const, icon: '❌' };
    } else if (product.stock < 5) {
      return { label: 'Wenige verfügbar', color: 'warning' as const, icon: '⚠️' };
    } else {
      return { label: 'Verfügbar', color: 'success' as const, icon: '✅' };
    }
  };

  const stockStatus = getStockStatus();

  return (
    <>
      <Card 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 4
          }
        }}
      >
        {/* Product Image */}
        <CardMedia
          component="img"
          height="200"
          image={product.imageUrl}
          alt={product.name}
          sx={{ objectFit: 'cover' }}
        />
        
        {/* Product Content */}
        <CardContent sx={{ flexGrow: 1 }}>
          {/* Category & Brand */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Chip 
              label={product.category} 
              size="small" 
              variant="outlined"
              color="primary"
            />
            <Typography variant="caption" color="text.secondary">
              {product.brand}
            </Typography>
          </Box>

          {/* Product Name */}
          <Typography 
            variant="h6" 
            component="h2" 
            gutterBottom
            sx={{ 
              fontWeight: 'bold',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}
          >
            {product.name}
          </Typography>

          {/* Product Description */}
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              mb: 2
            }}
          >
            {product.description}
          </Typography>

          {/* Rating */}
          <Box display="flex" alignItems="center" mb={1}>
            <Rating 
              value={product.rating} 
              precision={0.1} 
              readOnly 
              size="small"
            />
            <Typography variant="caption" color="text.secondary" ml={1}>
              ({product.reviewCount} Bewertungen)
            </Typography>
          </Box>

          {/* Stock Status */}
          <Box display="flex" alignItems="center" mb={2}>
            <InventoryIcon 
              fontSize="small" 
              color={stockStatus.color}
              sx={{ mr: 0.5 }}
            />
            <Typography 
              variant="caption" 
              color={`${stockStatus.color}.main`}
              fontWeight="medium"
            >
              {stockStatus.icon} {stockStatus.label}
              {product.stock > 0 && product.stock < 10 && ` (${product.stock} Stück)`}
            </Typography>
          </Box>

          {/* Price */}
          <Typography 
            variant="h5" 
            component="div" 
            color="primary.main"
            fontWeight="bold"
          >
            {formatPrice(product.price)}
          </Typography>

          {/* Cart Status */}
          {cartItem && (
            <Typography 
              variant="caption" 
              color="success.main"
              display="block"
              mt={1}
              fontWeight="medium"
            >
              🛒 {cartItem.quantity} im Warenkorb
            </Typography>
          )}
        </CardContent>

        {/* Actions */}
        <CardActions sx={{ p: 2, pt: 0 }}>
          <Box 
            display="flex" 
            justifyContent="space-between" 
            alignItems="center" 
            width="100%"
          >
            <Button
              startIcon={<VisibilityIcon />}
              onClick={handleViewDetails}
              variant="outlined"
              size="small"
            >
              Details
            </Button>

            <Tooltip title={product.stock === 0 ? 'Nicht verfügbar' : 'In den Warenkorb'}>
              <span>
                <Button
                  startIcon={<ShoppingCartIcon />}
                  onClick={handleAddToCart}
                  variant="contained"
                  size="small"
                  disabled={product.stock === 0}
                  sx={{ ml: 1 }}
                >
                  {cartItem ? `+1 (${cartItem.quantity})` : 'In Warenkorb'}
                </Button>
              </span>
            </Tooltip>
          </Box>
        </CardActions>
      </Card>

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={3000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setShowSuccess(false)} 
          severity="success" 
          variant="filled"
        >
          {product.name} wurde in den Warenkorb gelegt!
        </Alert>
      </Snackbar>
    </>
  );
};

export default ProductCard; 