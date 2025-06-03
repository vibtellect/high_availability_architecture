import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Chip,
  IconButton,
  Drawer,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Alert,
  Button,
  Slider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Skeleton
} from '@mui/material';
import {
  Store as StoreIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  ExpandMore as ExpandMoreIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import type { Product } from '../types/Product';
import { productService } from '../services/api';
import ProductCard from '../components/ProductCard/ProductCard';

interface ProductFilters {
  search: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  sortBy: 'name' | 'price' | 'rating' | 'newest';
  sortOrder: 'asc' | 'desc';
}

const ProductsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State Management
  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    category: '',
    minPrice: 0,
    maxPrice: 2000,
    sortBy: 'name',
    sortOrder: 'asc'
  });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Data fetching
  const { 
    data: products = [], 
    isLoading, 
    error,
    refetch
  } = useQuery('products', productService.getProducts, {
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000
  });

  // Get unique categories
  const categories = [...new Set(products.map(p => p.category))];
  const priceRange = products.length > 0 ? {
    min: Math.min(...products.map(p => p.price)),
    max: Math.max(...products.map(p => p.price))
  } : { min: 0, max: 2000 };

  // Filter and sort products
  const filteredProducts = products
    .filter(product => {
      const matchesSearch = !filters.search || 
        product.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        product.description.toLowerCase().includes(filters.search.toLowerCase()) ||
        product.brand.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesCategory = !filters.category || product.category === filters.category;
      const matchesPrice = product.price >= filters.minPrice && product.price <= filters.maxPrice;
      
      return matchesSearch && matchesCategory && matchesPrice;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (filters.sortBy) {
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'rating':
          comparison = a.rating - b.rating;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        default:
          comparison = 0;
      }
      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

  const handleFilterChange = (key: keyof ProductFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      minPrice: priceRange.min,
      maxPrice: priceRange.max,
      sortBy: 'name',
      sortOrder: 'asc'
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  // Filter Panel Component
  const FilterPanel = () => (
    <Paper elevation={2} sx={{ p: 3, height: 'fit-content' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight="bold">
          <FilterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Filter
        </Typography>
        <Button 
          size="small" 
          onClick={clearFilters}
          startIcon={<ClearIcon />}
          color="secondary"
        >
          Zurücksetzen
        </Button>
      </Box>

      {/* Search */}
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Produkte suchen..."
        value={filters.search}
        onChange={(e) => handleFilterChange('search', e.target.value)}
        InputProps={{
          startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
        }}
        sx={{ mb: 3 }}
      />

      {/* Category Filter */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight="medium">Kategorie</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormControl fullWidth>
            <Select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              displayEmpty
            >
              <MenuItem value="">Alle Kategorien</MenuItem>
              {categories.map(category => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </AccordionDetails>
      </Accordion>

      {/* Price Range */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight="medium">Preis</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box px={1}>
            <Slider
              value={[filters.minPrice, filters.maxPrice]}
              onChange={(_, newValue) => {
                const [min, max] = newValue as number[];
                handleFilterChange('minPrice', min);
                handleFilterChange('maxPrice', max);
              }}
              valueLabelDisplay="auto"
              valueLabelFormat={formatPrice}
              min={priceRange.min}
              max={priceRange.max}
              step={10}
            />
            <Box display="flex" justifyContent="space-between" mt={1}>
              <Typography variant="caption" color="text.secondary">
                {formatPrice(filters.minPrice)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatPrice(filters.maxPrice)}
              </Typography>
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Sort Options */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight="medium">Sortierung</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Sortieren nach</InputLabel>
            <Select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              label="Sortieren nach"
            >
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="price">Preis</MenuItem>
              <MenuItem value="rating">Bewertung</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Reihenfolge</InputLabel>
            <Select
              value={filters.sortOrder}
              onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
              label="Reihenfolge"
            >
              <MenuItem value="asc">Aufsteigend</MenuItem>
              <MenuItem value="desc">Absteigend</MenuItem>
            </Select>
          </FormControl>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );

  // Loading State
  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" alignItems="center" mb={4}>
          <StoreIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h3" component="h1" fontWeight="bold">
            Produktkatalog
          </Typography>
        </Box>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Skeleton variant="rectangular" height={400} />
          </Grid>
          <Grid item xs={12} md={9}>
            <Grid container spacing={3}>
              {[...Array(6)].map((_, index) => (
                <Grid item xs={12} sm={6} lg={4} key={index}>
                  <Skeleton variant="rectangular" height={400} />
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </Container>
    );
  }

  // Error State
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              Wiederholen
            </Button>
          }
        >
          Fehler beim Laden der Produkte. Bitte versuche es erneut.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box display="flex" alignItems="center">
          <StoreIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Box>
            <Typography variant="h3" component="h1" fontWeight="bold">
              Produktkatalog
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {filteredProducts.length} von {products.length} Produkten
            </Typography>
          </Box>
        </Box>

        {/* Mobile Filter Button */}
        {isMobile && (
          <IconButton
            onClick={() => setMobileFiltersOpen(true)}
            color="primary"
            size="large"
          >
            <FilterIcon />
          </IconButton>
        )}
      </Box>

      {/* Active Filters */}
      {(filters.search || filters.category) && (
        <Box mb={3}>
          <Typography variant="subtitle2" color="text.secondary" mb={1}>
            Aktive Filter:
          </Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            {filters.search && (
              <Chip
                label={`Suche: "${filters.search}"`}
                onDelete={() => handleFilterChange('search', '')}
                color="primary"
                variant="outlined"
              />
            )}
            {filters.category && (
              <Chip
                label={`Kategorie: ${filters.category}`}
                onDelete={() => handleFilterChange('category', '')}
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
        </Box>
      )}

      <Grid container spacing={3}>
        {/* Desktop Filter Panel */}
        {!isMobile && (
          <Grid item md={3}>
            <FilterPanel />
          </Grid>
        )}

        {/* Products Grid */}
        <Grid item xs={12} md={isMobile ? 12 : 9}>
          {filteredProducts.length === 0 ? (
            <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" mb={2}>
                Keine Produkte gefunden
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Versuche andere Suchbegriffe oder ändere deine Filter.
              </Typography>
              <Button 
                variant="outlined" 
                onClick={clearFilters}
                sx={{ mt: 2 }}
              >
                Filter zurücksetzen
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {filteredProducts.map((product) => (
                <Grid item xs={12} sm={6} lg={4} key={product.id}>
                  <ProductCard 
                    product={product}
                    onViewDetails={setSelectedProduct}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Grid>
      </Grid>

      {/* Mobile Filter Drawer */}
      <Drawer
        anchor="right"
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        PaperProps={{ sx: { width: 300, p: 2 } }}
      >
        <FilterPanel />
      </Drawer>
    </Container>
  );
};

export default ProductsPage; 