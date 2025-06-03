import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardMedia,
  CardContent,
  IconButton,
  Button,
  TextField,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Chip,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import {
  ShoppingCart as ShoppingCartIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  ShoppingBag as ShoppingBagIcon,
  LocalShipping as ShippingIcon,
  Payment as PaymentIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useCart } from '../context/CartContext';
import { orderService, analyticsService } from '../services/api';
import type { Address, Order } from '../types/Product';

const CartPage: React.FC = () => {
  const { items, total, itemCount, updateQuantity, removeFromCart, clearCart } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [shippingAddress, setShippingAddress] = useState<Address>({
    street: '',
    city: '',
    zipCode: '',
    country: 'Germany'
  });
  const [paymentMethod, setPaymentMethod] = useState('credit-card');
  const [orderComplete, setOrderComplete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  const shippingCost = total > 50 ? 0 : 4.99;
  const finalTotal = total + shippingCost;

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      updateQuantity(productId, newQuantity);
    }
  };

  const handleCheckout = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // Validate address
      if (!shippingAddress.street || !shippingAddress.city || !shippingAddress.zipCode) {
        throw new Error('Bitte fülle alle Adressfelder aus');
      }

      // Create order
      const order = await orderService.createOrder(items, shippingAddress);
      
      // Track purchase
      await analyticsService.trackPurchase(order.id, finalTotal);

      // Clear cart and show success
      clearCart();
      setOrderComplete(true);
      setCheckoutOpen(false);
      
    } catch (err: any) {
      setError(err.message || 'Fehler beim Verarbeiten der Bestellung');
    } finally {
      setIsProcessing(false);
    }
  };

  const steps = ['Warenkorb', 'Lieferung', 'Bezahlung', 'Bestätigung'];

  if (items.length === 0 && !orderComplete) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
          <ShoppingCartIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Dein Warenkorb ist leer
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={3}>
            Füge Produkte hinzu, um mit dem Einkauf zu beginnen.
          </Typography>
          <Button 
            variant="contained" 
            size="large"
            href="/products"
            startIcon={<ShoppingBagIcon />}
          >
            Jetzt einkaufen
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={4}>
        <ShoppingCartIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
        <Box>
          <Typography variant="h3" component="h1" fontWeight="bold">
            Warenkorb
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {itemCount} {itemCount === 1 ? 'Artikel' : 'Artikel'}
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Cart Items */}
        <Grid item xs={12} lg={8}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" mb={3}>
              Deine Artikel
            </Typography>

            {items.map((item, index) => (
              <Box key={item.product.id}>
                <Card elevation={0} sx={{ display: 'flex', mb: 2 }}>
                  <CardMedia
                    component="img"
                    sx={{ width: 120, height: 120, objectFit: 'cover' }}
                    image={item.product.imageUrl}
                    alt={item.product.name}
                  />
                  <CardContent sx={{ flex: 1, p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={6}>
                        <Typography variant="h6" fontWeight="medium">
                          {item.product.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.product.brand}
                        </Typography>
                        <Chip 
                          label={item.product.category} 
                          size="small" 
                          variant="outlined"
                          sx={{ mt: 1 }}
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={3}>
                        <Box display="flex" alignItems="center" justifyContent="center">
                          <IconButton 
                            size="small"
                            onClick={() => handleQuantityChange(item.product.id, item.quantity - 1)}
                          >
                            <RemoveIcon />
                          </IconButton>
                          <TextField
                            size="small"
                            value={item.quantity}
                            onChange={(e) => {
                              const newQuantity = parseInt(e.target.value) || 0;
                              handleQuantityChange(item.product.id, newQuantity);
                            }}
                            inputProps={{ 
                              style: { textAlign: 'center', width: '60px' },
                              min: 0
                            }}
                            variant="outlined"
                          />
                          <IconButton 
                            size="small"
                            onClick={() => handleQuantityChange(item.product.id, item.quantity + 1)}
                          >
                            <AddIcon />
                          </IconButton>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12} sm={2}>
                        <Typography variant="h6" textAlign="center" fontWeight="bold">
                          {formatPrice(item.product.price * item.quantity)}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={12} sm={1}>
                        <IconButton 
                          color="error"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
                {index < items.length - 1 && <Divider sx={{ my: 2 }} />}
              </Box>
            ))}
          </Paper>
        </Grid>

        {/* Order Summary */}
        <Grid item xs={12} lg={4}>
          <Paper elevation={2} sx={{ p: 3, position: 'sticky', top: 20 }}>
            <Typography variant="h6" fontWeight="bold" mb={3}>
              Bestellübersicht
            </Typography>

            <Box mb={2}>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography>Zwischensumme:</Typography>
                <Typography>{formatPrice(total)}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography>Versand:</Typography>
                <Typography color={shippingCost === 0 ? 'success.main' : 'inherit'}>
                  {shippingCost === 0 ? 'Kostenlos' : formatPrice(shippingCost)}
                </Typography>
              </Box>
              {total < 50 && shippingCost > 0 && (
                <Typography variant="caption" color="text.secondary">
                  Kostenloser Versand ab {formatPrice(50)}
                </Typography>
              )}
              <Divider sx={{ my: 2 }} />
              <Box display="flex" justifyContent="space-between">
                <Typography variant="h6" fontWeight="bold">
                  Gesamt:
                </Typography>
                <Typography variant="h6" fontWeight="bold" color="primary.main">
                  {formatPrice(finalTotal)}
                </Typography>
              </Box>
            </Box>

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={() => setCheckoutOpen(true)}
              startIcon={<PaymentIcon />}
              sx={{ mb: 2 }}
            >
              Zur Kasse
            </Button>

            <Button
              fullWidth
              variant="outlined"
              href="/products"
              startIcon={<ShoppingBagIcon />}
            >
              Weiter einkaufen
            </Button>

            {/* Security info */}
            <Box mt={3} p={2} bgcolor="grey.50" borderRadius={1}>
              <Typography variant="caption" color="text.secondary" textAlign="center" display="block">
                🔒 Sichere Bezahlung mit SSL-Verschlüsselung
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Checkout Dialog */}
      <Dialog 
        open={checkoutOpen} 
        onClose={() => setCheckoutOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h5" fontWeight="bold">
            Checkout
          </Typography>
          <Stepper activeStep={currentStep} sx={{ mt: 2 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {currentStep === 0 && (
            <Box>
              <Typography variant="h6" mb={2}>Bestellübersicht</Typography>
              {items.map(item => (
                <Box key={item.product.id} display="flex" justifyContent="space-between" mb={1}>
                  <Typography>{item.product.name} × {item.quantity}</Typography>
                  <Typography>{formatPrice(item.product.price * item.quantity)}</Typography>
                </Box>
              ))}
              <Divider sx={{ my: 2 }} />
              <Box display="flex" justifyContent="space-between" fontWeight="bold">
                <Typography fontWeight="bold">Gesamt:</Typography>
                <Typography fontWeight="bold">{formatPrice(finalTotal)}</Typography>
              </Box>
            </Box>
          )}

          {currentStep === 1 && (
            <Box>
              <Typography variant="h6" mb={2}>Lieferadresse</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Straße und Hausnummer"
                    value={shippingAddress.street}
                    onChange={(e) => setShippingAddress(prev => ({ ...prev, street: e.target.value }))}
                    required
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="PLZ"
                    value={shippingAddress.zipCode}
                    onChange={(e) => setShippingAddress(prev => ({ ...prev, zipCode: e.target.value }))}
                    required
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Stadt"
                    value={shippingAddress.city}
                    onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Land</InputLabel>
                    <Select
                      value={shippingAddress.country}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, country: e.target.value }))}
                      label="Land"
                    >
                      <MenuItem value="Germany">Deutschland</MenuItem>
                      <MenuItem value="Austria">Österreich</MenuItem>
                      <MenuItem value="Switzerland">Schweiz</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          )}

          {currentStep === 2 && (
            <Box>
              <Typography variant="h6" mb={2}>Zahlungsmethode</Typography>
              <FormControl fullWidth>
                <InputLabel>Zahlungsart</InputLabel>
                <Select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  label="Zahlungsart"
                >
                  <MenuItem value="credit-card">Kreditkarte</MenuItem>
                  <MenuItem value="paypal">PayPal</MenuItem>
                  <MenuItem value="bank-transfer">Überweisung</MenuItem>
                </Select>
              </FormControl>
              
              {paymentMethod === 'credit-card' && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Demo: Kreditkarten-Integration würde hier erfolgen
                </Alert>
              )}
            </Box>
          )}

          {currentStep === 3 && (
            <Box textAlign="center">
              <Typography variant="h6" mb={2}>Bestellung bestätigen</Typography>
              <Typography variant="body1" mb={2}>
                Bitte überprüfe deine Bestellung vor dem Abschließen.
              </Typography>
              <Box bgcolor="grey.50" p={2} borderRadius={1} mb={2}>
                <Typography variant="subtitle2" fontWeight="bold">Lieferadresse:</Typography>
                <Typography variant="body2">
                  {shippingAddress.street}<br />
                  {shippingAddress.zipCode} {shippingAddress.city}<br />
                  {shippingAddress.country}
                </Typography>
              </Box>
              <Typography variant="h6" color="primary.main">
                Gesamtbetrag: {formatPrice(finalTotal)}
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setCheckoutOpen(false)}
            disabled={isProcessing}
          >
            Abbrechen
          </Button>
          {currentStep > 0 && (
            <Button 
              onClick={() => setCurrentStep(currentStep - 1)}
              disabled={isProcessing}
            >
              Zurück
            </Button>
          )}
          {currentStep < steps.length - 1 ? (
            <Button 
              variant="contained" 
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={isProcessing}
            >
              Weiter
            </Button>
          ) : (
            <Button 
              variant="contained" 
              onClick={handleCheckout}
              disabled={isProcessing}
              startIcon={isProcessing ? <ShippingIcon /> : <CheckCircleIcon />}
            >
              {isProcessing ? 'Verarbeite...' : 'Bestellung abschließen'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Order Complete Snackbar */}
      <Snackbar
        open={orderComplete}
        autoHideDuration={6000}
        onClose={() => setOrderComplete(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setOrderComplete(false)} 
          severity="success" 
          variant="filled"
          sx={{ width: '100%' }}
        >
          🎉 Bestellung erfolgreich aufgegeben! Vielen Dank für deinen Einkauf.
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CartPage; 