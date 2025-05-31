import React from 'react';
import { Box, Container, CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '@/theme';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  disableGutters?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  maxWidth = 'lg', 
  disableGutters = false 
}) => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        <Header />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            py: 3,
          }}
        >
          <Container 
            maxWidth={maxWidth} 
            disableGutters={disableGutters}
            sx={{ height: '100%' }}
          >
            {children}
          </Container>
        </Box>
        <Footer />
      </Box>
    </ThemeProvider>
  );
};

export default Layout; 