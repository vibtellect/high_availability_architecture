import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Badge,
  Box,
  InputBase,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  ShoppingCart as ShoppingCartIcon,
  AccountCircle as AccountCircleIcon,
  Menu as MenuIcon,
  Home as HomeIcon,
  Store as StoreIcon,
  Dashboard as DashboardIcon,
  Architecture as ArchitectureIcon,
  FavoriteOutlined as FavoriteIcon,
} from '@mui/icons-material';
import { styled, alpha } from '@mui/material/styles';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../../context/CartContext';

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(3),
    width: 'auto',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: '25ch',
    },
  },
}));

const Header: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { itemCount } = useCart();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const navigationItems = [
    { text: 'Home', icon: <HomeIcon />, path: '/' },
    { text: 'Shop', icon: <StoreIcon />, path: '/products' },
    { text: 'HA Dashboard', icon: <ArchitectureIcon />, path: '/ha-dashboard' },
  ];

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" sx={{ my: 2, fontWeight: 'bold' }}>
        🛍️ HA E-Commerce
      </Typography>
      <List>
        {navigationItems.map((item) => (
          <ListItem 
            key={item.text} 
            component="button"
            onClick={() => handleNavigation(item.path)}
            sx={{
              cursor: 'pointer',
              backgroundColor: location.pathname === item.path ? 'action.selected' : 'transparent',
              '&:hover': {
                backgroundColor: 'action.hover'
              }
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
        
        {/* Mobile Cart Item */}
        <ListItem 
          component="button"
          onClick={() => handleNavigation('/cart')}
          sx={{
            cursor: 'pointer',
            backgroundColor: location.pathname === '/cart' ? 'action.selected' : 'transparent',
            '&:hover': {
              backgroundColor: 'action.hover'
            }
          }}
        >
          <ListItemIcon>
            <Badge badgeContent={itemCount} color="error">
              <ShoppingCartIcon />
            </Badge>
          </ListItemIcon>
          <ListItemText primary={`Warenkorb (${itemCount})`} />
        </ListItem>
      </List>
    </Box>
  );

  const isMenuOpen = Boolean(anchorEl);

  const renderMenu = (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      keepMounted
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      open={isMenuOpen}
      onClose={handleMenuClose}
    >
      <MenuItem onClick={() => { handleMenuClose(); handleNavigation('/profile'); }}>
        👤 Profil
      </MenuItem>
      <MenuItem onClick={() => { handleMenuClose(); handleNavigation('/orders'); }}>
        📦 Meine Bestellungen
      </MenuItem>
      <MenuItem onClick={() => { handleMenuClose(); handleNavigation('/wishlist'); }}>
        ❤️ Wunschliste
      </MenuItem>
      <MenuItem onClick={handleMenuClose}>
        ⚙️ Einstellungen
      </MenuItem>
      <MenuItem onClick={handleMenuClose}>
        🚪 Abmelden
      </MenuItem>
    </Menu>
  );

  return (
    <>
      <AppBar position="sticky" elevation={1}>
        <Toolbar>
          {/* Mobile Menu Button */}
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Logo/Brand */}
          <Typography
            variant="h6"
            noWrap
            component="div"
            onClick={() => handleNavigation('/')}
            sx={{
              display: { xs: 'none', sm: 'block' },
              cursor: 'pointer',
              fontWeight: 'bold',
              mr: 4,
            }}
          >
            🛍️ HA E-Commerce
          </Typography>

          {/* Desktop Navigation */}
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 1, mr: 'auto' }}>
              {navigationItems.map((item) => (
                <Button
                  key={item.text}
                  color="inherit"
                  startIcon={item.icon}
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    backgroundColor: location.pathname === item.path ? 'rgba(255,255,255,0.1)' : 'transparent',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.15)',
                    },
                  }}
                >
                  {item.text}
                </Button>
              ))}
            </Box>
          )}

          {/* Search Bar */}
          <Search sx={{ flexGrow: isMobile ? 1 : 0 }}>
            <SearchIconWrapper>
              <SearchIcon />
            </SearchIconWrapper>
            <form onSubmit={handleSearchSubmit}>
              <StyledInputBase
                placeholder="Suchen…"
                inputProps={{ 'aria-label': 'search' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
          </Search>

          <Box sx={{ flexGrow: 1 }} />

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Shopping Cart */}
            <Tooltip title="Warenkorb">
              <IconButton
                size="large"
                aria-label={`show ${itemCount} items in cart`}
                color="inherit"
                onClick={() => handleNavigation('/cart')}
              >
                <Badge badgeContent={itemCount} color="error">
                  <ShoppingCartIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Wishlist */}
            <Tooltip title="Wunschliste">
              <IconButton
                size="large"
                aria-label="wishlist"
                color="inherit"
                onClick={() => handleNavigation('/wishlist')}
              >
                <FavoriteIcon />
              </IconButton>
            </Tooltip>

            {/* Profile Menu */}
            <Tooltip title="Profil">
              <IconButton
                size="large"
                edge="end"
                aria-label="account of current user"
                aria-controls="primary-search-account-menu"
                aria-haspopup="true"
                onClick={handleProfileMenuOpen}
                color="inherit"
              >
                <AccountCircleIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <nav>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
          }}
        >
          {drawer}
        </Drawer>
      </nav>

      {renderMenu}
    </>
  );
};

export default Header; 