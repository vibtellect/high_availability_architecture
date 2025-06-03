import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  BugReport as BugReportIcon
} from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorId: ''
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Log error details for debugging
    console.group('🚨 Error Boundary Details');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Component Stack:', errorInfo.componentStack);
    console.groupEnd();

    this.setState({
      error,
      errorInfo,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });

    // Send error to analytics service if available
    if (window.analytics) {
      window.analytics.track('Error Boundary Triggered', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId
      });
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  private copyErrorDetails = () => {
    const { error, errorInfo, errorId } = this.state;
    const errorDetails = `
Error ID: ${errorId}
Timestamp: ${new Date().toISOString()}
Error Message: ${error?.message || 'Unknown error'}
Stack Trace: ${error?.stack || 'No stack trace'}
Component Stack: ${errorInfo?.componentStack || 'No component stack'}
User Agent: ${navigator.userAgent}
URL: ${window.location.href}
    `.trim();

    navigator.clipboard.writeText(errorDetails).then(() => {
      alert('Fehlerdetails in die Zwischenablage kopiert!');
    });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, errorId } = this.state;
      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <ErrorIcon sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" component="h1">
                    Oops! Etwas ist schiefgelaufen
                  </Typography>
                  <Typography variant="subtitle1">
                    Error ID: {errorId}
                  </Typography>
                </Box>
              </Box>

              <Alert severity="error" sx={{ mb: 3, bgcolor: 'background.paper' }}>
                <AlertTitle>Anwendungsfehler</AlertTitle>
                Die Anwendung ist auf einen unerwarteten Fehler gestoßen. 
                Bitte versuchen Sie es erneut oder kontaktieren Sie den Support, 
                wenn das Problem weiterhin besteht.
              </Alert>

              <Box display="flex" gap={2} mb={3}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<RefreshIcon />}
                  onClick={this.handleReload}
                >
                  Seite neu laden
                </Button>
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={this.handleReset}
                >
                  Fehler ignorieren
                </Button>
                {isDevelopment && (
                  <Button
                    variant="outlined"
                    color="inherit"
                    startIcon={<BugReportIcon />}
                    onClick={this.copyErrorDetails}
                  >
                    Fehlerdetails kopieren
                  </Button>
                )}
              </Box>

              {isDevelopment && error && (
                <Accordion sx={{ bgcolor: 'background.paper', color: 'text.primary' }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">
                      🔧 Entwickler-Details (nur im Development Mode)
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Fehlermeldung:
                      </Typography>
                      <Box 
                        component="pre" 
                        sx={{ 
                          bgcolor: 'grey.100', 
                          p: 2, 
                          borderRadius: 1, 
                          overflow: 'auto',
                          fontSize: '0.875rem',
                          mb: 2
                        }}
                      >
                        {error.message}
                      </Box>

                      {error.stack && (
                        <>
                          <Typography variant="h6" gutterBottom>
                            Stack Trace:
                          </Typography>
                          <Box 
                            component="pre" 
                            sx={{ 
                              bgcolor: 'grey.100', 
                              p: 2, 
                              borderRadius: 1, 
                              overflow: 'auto',
                              fontSize: '0.75rem',
                              mb: 2
                            }}
                          >
                            {error.stack}
                          </Box>
                        </>
                      )}

                      {errorInfo?.componentStack && (
                        <>
                          <Typography variant="h6" gutterBottom>
                            Component Stack:
                          </Typography>
                          <Box 
                            component="pre" 
                            sx={{ 
                              bgcolor: 'grey.100', 
                              p: 2, 
                              borderRadius: 1, 
                              overflow: 'auto',
                              fontSize: '0.75rem'
                            }}
                          >
                            {errorInfo.componentStack}
                          </Box>
                        </>
                      )}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              )}

              <Box mt={3}>
                <Typography variant="body2" color="inherit">
                  Wenn dieser Fehler weiterhin auftritt, können Sie:
                </Typography>
                <ul>
                  <li>Die Seite neu laden</li>
                  <li>Den Browser-Cache leeren</li>
                  <li>Ein anderes Browser-Fenster verwenden</li>
                  <li>Den Support mit der Error ID kontaktieren: <code>{errorId}</code></li>
                </ul>
              </Box>
            </CardContent>
          </Card>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 