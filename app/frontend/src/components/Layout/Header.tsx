import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
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
  AccountCircle as AccountCircleIcon,
  Menu as MenuIcon,
  Home as HomeIcon,
  Store as StoreIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { styled, alpha } from '@mui/material/styles';
import { useNavigate, useLocation } from 'react-router-dom';

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

  // Demo-focused navigation
  const navigationItems = [
    { text: 'Home', icon: <HomeIcon />, path: '/' },
    { text: 'Products', icon: <StoreIcon />, path: '/products' },
    { text: 'HA Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
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
      <MenuItem onClick={() => { handleMenuClose(); alert('Demo-Feature: User Profile'); }}>
        👤 Profil
      </MenuItem>
      <MenuItem onClick={() => { handleMenuClose(); alert('Demo-Feature: System Settings'); }}>
        ⚙️ Einstellungen
      </MenuItem>
      <MenuItem onClick={() => { handleMenuClose(); alert('Demo-Feature: Logout'); }}>
        🚪 Abmelden
      </MenuItem>
    </Menu>
  );

  return (
    <>
      <AppBar position="sticky" elevation={1}>
        <Toolbar>
          {/* Mobile menu button */}
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

          {/* Logo */}
          <Typography
            variant="h6"
            component="div"
            sx={{
              flexGrow: 0,
              fontWeight: 'bold',
              mr: 4,
              cursor: 'pointer',
            }}
            onClick={() => handleNavigation('/')}
          >
            🛍️ HA E-Commerce
          </Typography>

          {/* Desktop Navigation */}
          {!isMobile && (
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              {navigationItems.map((item) => (
                <Button
                  key={item.text}
                  color="inherit"
                  onClick={() => handleNavigation(item.path)}
                  startIcon={item.icon}
                  sx={{
                    backgroundColor: location.pathname === item.path ? 'rgba(255,255,255,0.1)' : 'transparent',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  {item.text}
                </Button>
              ))}
            </Box>
          )}

          {/* Spacer for mobile */}
          {isMobile && <Box sx={{ flexGrow: 1 }} />}

          {/* Search */}
          <Search>
            <SearchIconWrapper>
              <SearchIcon />
            </SearchIconWrapper>
            <form onSubmit={handleSearchSubmit}>
              <StyledInputBase
                placeholder="Produkte suchen..."
                inputProps={{ 'aria-label': 'search' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
          </Search>

          {/* User menu */}
          <Tooltip title="Benutzermenü">
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
        </Toolbar>
      </AppBar>

      {/* Mobile Navigation Drawer */}
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

      {renderMenu}
    </>
  );
};

export default Header; 