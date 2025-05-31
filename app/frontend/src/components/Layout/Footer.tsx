import React from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Link,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  Instagram as InstagramIcon,
  LinkedIn as LinkedInIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    company: [
      { text: 'About Us', href: '/about' },
      { text: 'Careers', href: '/careers' },
      { text: 'Press', href: '/press' },
      { text: 'Blog', href: '/blog' },
    ],
    support: [
      { text: 'Help Center', href: '/help' },
      { text: 'Contact Us', href: '/contact' },
      { text: 'Shipping Info', href: '/shipping' },
      { text: 'Returns', href: '/returns' },
    ],
    legal: [
      { text: 'Privacy Policy', href: '/privacy' },
      { text: 'Terms of Service', href: '/terms' },
      { text: 'Cookie Policy', href: '/cookies' },
      { text: 'GDPR', href: '/gdpr' },
    ],
  };

  const socialLinks = [
    { icon: <FacebookIcon />, href: 'https://facebook.com', label: 'Facebook' },
    { icon: <TwitterIcon />, href: 'https://twitter.com', label: 'Twitter' },
    { icon: <InstagramIcon />, href: 'https://instagram.com', label: 'Instagram' },
    { icon: <LinkedInIcon />, href: 'https://linkedin.com', label: 'LinkedIn' },
  ];

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: 'grey.900',
        color: 'white',
        py: 6,
        mt: 'auto',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Company Info */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              E-Commerce Platform
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: 'grey.300' }}>
              Your trusted partner for high-quality products and exceptional service. 
              Built with modern technology for the best shopping experience.
            </Typography>
            
            {/* Contact Info */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <EmailIcon sx={{ mr: 1, fontSize: 18 }} />
              <Typography variant="body2" color="grey.300">
                support@ecommerce.com
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <PhoneIcon sx={{ mr: 1, fontSize: 18 }} />
              <Typography variant="body2" color="grey.300">
                +1 (555) 123-4567
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LocationIcon sx={{ mr: 1, fontSize: 18 }} />
              <Typography variant="body2" color="grey.300">
                123 Commerce St, Tech City, TC 12345
              </Typography>
            </Box>

            {/* Social Links */}
            <Box>
              {socialLinks.map((social) => (
                <IconButton
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ 
                    color: 'grey.300',
                    '&:hover': { color: 'primary.main' },
                    mr: 1,
                  }}
                  aria-label={social.label}
                >
                  {social.icon}
                </IconButton>
              ))}
            </Box>
          </Grid>

          {/* Company Links */}
          <Grid item xs={12} sm={4} md={2}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Company
            </Typography>
            <Box>
              {footerLinks.company.map((link) => (
                <Link
                  key={link.text}
                  href={link.href}
                  color="grey.300"
                  display="block"
                  sx={{
                    textDecoration: 'none',
                    mb: 1,
                    '&:hover': { color: 'primary.main' },
                  }}
                >
                  {link.text}
                </Link>
              ))}
            </Box>
          </Grid>

          {/* Support Links */}
          <Grid item xs={12} sm={4} md={2}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Support
            </Typography>
            <Box>
              {footerLinks.support.map((link) => (
                <Link
                  key={link.text}
                  href={link.href}
                  color="grey.300"
                  display="block"
                  sx={{
                    textDecoration: 'none',
                    mb: 1,
                    '&:hover': { color: 'primary.main' },
                  }}
                >
                  {link.text}
                </Link>
              ))}
            </Box>
          </Grid>

          {/* Legal Links */}
          <Grid item xs={12} sm={4} md={2}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Legal
            </Typography>
            <Box>
              {footerLinks.legal.map((link) => (
                <Link
                  key={link.text}
                  href={link.href}
                  color="grey.300"
                  display="block"
                  sx={{
                    textDecoration: 'none',
                    mb: 1,
                    '&:hover': { color: 'primary.main' },
                  }}
                >
                  {link.text}
                </Link>
              ))}
            </Box>
          </Grid>

          {/* Newsletter Signup */}
          <Grid item xs={12} md={2}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Newsletter
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: 'grey.300' }}>
              Subscribe to get updates on new products and offers.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <input
                type="email"
                placeholder="Enter your email"
                style={{
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '14px',
                }}
              />
              <button
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Subscribe
              </button>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4, bgcolor: 'grey.700' }} />

        {/* Bottom Section */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            textAlign: { xs: 'center', sm: 'left' },
          }}
        >
          <Typography variant="body2" color="grey.400">
            © {currentYear} E-Commerce Platform. All rights reserved.
          </Typography>
          <Typography variant="body2" color="grey.400" sx={{ mt: { xs: 1, sm: 0 } }}>
            Built with React, TypeScript & Material-UI
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer; 