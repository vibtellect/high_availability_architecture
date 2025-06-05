import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Alert,
  LinearProgress,
  Tooltip,
  IconButton,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Electrical as ElectricalIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Speed as SpeedIcon,
  Timeline as TimelineIcon,
  Security as SecurityIcon,
  TrendingUp as TrendingUpIcon,
  ExpandMore as ExpandMoreIcon,
  BugReport as BugReportIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Types for Circuit Breaker data
interface CircuitBreakerState {
  name: string;
  service: string;
  targetService: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureRate: number;
  requestCount: number;
  successCount: number;
  failureCount: number;
  lastStateChange: string;
  nextRetryTime?: string;
  configuration: {
    failureThreshold: number;
    timeout: number;
    retryAttempts: number;
  };
}

interface CircuitBreakerMetrics {
  timestamp: string;
  circuitBreakers: CircuitBreakerState[];
  summary: {
    totalCircuitBreakers: number;
    openCount: number;
    halfOpenCount: number;
    closedCount: number;
    totalRequests: number;
    totalFailures: number;
    overallFailureRate: number;
  };
}

interface CircuitBreakerMonitorProps {
  refreshInterval?: number;
  autoRefresh?: boolean;
}

const COLORS = {
  closed: '#2e7d32',     // Green
  open: '#d32f2f',       // Red  
  halfOpen: '#ed6c02',   // Orange
  primary: '#1976d2',
  secondary: '#dc004e'
};

const PIE_COLORS = ['#2e7d32', '#d32f2f', '#ed6c02'];

const CircuitBreakerMonitor: React.FC<CircuitBreakerMonitorProps> = ({
  refreshInterval = 10000,
  autoRefresh = true
}) => {
  const [metrics, setMetrics] = useState<CircuitBreakerMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(autoRefresh);
  const [selectedBreaker, setSelectedBreaker] = useState<CircuitBreakerState | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Circuit Breaker metrics
  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Try Product Service first (Spring Boot)
      const productResponse = await fetch('http://localhost:8080/api/v1/health/circuit-breakers');
      
      // Try Checkout Service (Go)
      const checkoutResponse = await fetch('http://localhost:8081/api/v1/circuit-breakers');
      
      const circuitBreakers: CircuitBreakerState[] = [];
      
      // Parse Product Service response
      if (productResponse.ok) {
        const productData = await productResponse.json();
        
        // Transform Spring Boot Resilience4j data
        if (productData.circuitBreakers) {
          Object.entries(productData.circuitBreakers).forEach(([name, data]: [string, any]) => {
            circuitBreakers.push({
              name: name,
              service: 'product-service',
              targetService: name.includes('user') ? 'user-service' : 'analytics-service',
              state: data.state || 'CLOSED',
              failureRate: (data.failureRate || 0) * 100,
              requestCount: data.numberOfBufferedCalls || 0,
              successCount: data.numberOfSuccessfulCalls || 0,
              failureCount: data.numberOfFailedCalls || 0,
              lastStateChange: data.lastStateChange || new Date().toISOString(),
              configuration: {
                failureThreshold: data.failureRateThreshold || 60,
                timeout: data.waitDurationInOpenState || 60000,
                retryAttempts: data.permittedNumberOfCallsInHalfOpenState || 3
              }
            });
          });
        }
      }
      
      // Parse Checkout Service response
      if (checkoutResponse.ok) {
        const checkoutData = await checkoutResponse.json();
        
        // Transform Go gobreaker data
        if (checkoutData.circuitBreakers) {
          Object.entries(checkoutData.circuitBreakers).forEach(([name, data]: [string, any]) => {
            circuitBreakers.push({
              name: name,
              service: 'checkout-service',
              targetService: 'product-service',
              state: data.state || 'CLOSED',
              failureRate: data.failureRate || 0,
              requestCount: data.requests || 0,
              successCount: data.successes || 0,
              failureCount: data.failures || 0,
              lastStateChange: data.lastStateChange || new Date().toISOString(),
              nextRetryTime: data.nextRetry,
              configuration: {
                failureThreshold: data.maxRequests || 5,
                timeout: data.timeout || 60000,
                retryAttempts: data.maxRequests || 5
              }
            });
          });
        }
      }
      
      // If no real data, generate mock data for demonstration
      if (circuitBreakers.length === 0) {
        const mockBreakers: CircuitBreakerState[] = [
          {
            name: 'userServiceBreaker',
            service: 'product-service',
            targetService: 'user-service',
            state: Math.random() > 0.8 ? 'OPEN' : Math.random() > 0.9 ? 'HALF_OPEN' : 'CLOSED',
            failureRate: Math.random() * 15,
            requestCount: Math.floor(Math.random() * 1000) + 100,
            successCount: Math.floor(Math.random() * 800) + 100,
            failureCount: Math.floor(Math.random() * 50),
            lastStateChange: new Date(Date.now() - Math.random() * 3600000).toISOString(),
            configuration: {
              failureThreshold: 60,
              timeout: 60000,
              retryAttempts: 3
            }
          },
          {
            name: 'analyticsServiceBreaker',
            service: 'product-service',
            targetService: 'analytics-service',
            state: Math.random() > 0.7 ? 'OPEN' : 'CLOSED',
            failureRate: Math.random() * 25,
            requestCount: Math.floor(Math.random() * 800) + 50,
            successCount: Math.floor(Math.random() * 600) + 50,
            failureCount: Math.floor(Math.random() * 100),
            lastStateChange: new Date(Date.now() - Math.random() * 1800000).toISOString(),
            configuration: {
              failureThreshold: 70,
              timeout: 60000,
              retryAttempts: 3
            }
          },
          {
            name: 'productServiceBreaker',
            service: 'checkout-service',
            targetService: 'product-service',
            state: Math.random() > 0.85 ? 'HALF_OPEN' : 'CLOSED',
            failureRate: Math.random() * 10,
            requestCount: Math.floor(Math.random() * 600) + 200,
            successCount: Math.floor(Math.random() * 500) + 180,
            failureCount: Math.floor(Math.random() * 30),
            lastStateChange: new Date(Date.now() - Math.random() * 2400000).toISOString(),
            configuration: {
              failureThreshold: 5,
              timeout: 60000,
              retryAttempts: 5
            }
          }
        ];
        
        circuitBreakers.push(...mockBreakers);
      }
      
      // Calculate summary
      const summary = {
        totalCircuitBreakers: circuitBreakers.length,
        openCount: circuitBreakers.filter(cb => cb.state === 'OPEN').length,
        halfOpenCount: circuitBreakers.filter(cb => cb.state === 'HALF_OPEN').length,
        closedCount: circuitBreakers.filter(cb => cb.state === 'CLOSED').length,
        totalRequests: circuitBreakers.reduce((sum, cb) => sum + cb.requestCount, 0),
        totalFailures: circuitBreakers.reduce((sum, cb) => sum + cb.failureCount, 0),
        overallFailureRate: 0
      };
      
      summary.overallFailureRate = summary.totalRequests > 0 
        ? (summary.totalFailures / summary.totalRequests) * 100 
        : 0;
      
      setMetrics({
        timestamp: new Date().toISOString(),
        circuitBreakers,
        summary
      });
      
    } catch (err) {
      console.error('Failed to fetch circuit breaker metrics:', err);
      setError(`Failed to fetch circuit breaker metrics: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefreshEnabled) {
      const interval = setInterval(fetchMetrics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefreshEnabled, refreshInterval]);

  // Initial fetch
  useEffect(() => {
    fetchMetrics();
  }, []);

  const getStateColor = (state: string) => {
    switch (state) {
      case 'CLOSED': return COLORS.closed;
      case 'OPEN': return COLORS.open;
      case 'HALF_OPEN': return COLORS.halfOpen;
      default: return '#666';
    }
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'CLOSED': return <CheckCircleIcon sx={{ color: COLORS.closed }} />;
      case 'OPEN': return <ErrorIcon sx={{ color: COLORS.open }} />;
      case 'HALF_OPEN': return <WarningIcon sx={{ color: COLORS.halfOpen }} />;
      default: return <InfoIcon />;
    }
  };

  const handleBreakerClick = (breaker: CircuitBreakerState) => {
    setSelectedBreaker(breaker);
    setDetailsOpen(true);
  };

  // Prepare chart data
  const stateDistribution = metrics ? [
    { name: 'Closed', value: metrics.summary.closedCount, color: COLORS.closed },
    { name: 'Open', value: metrics.summary.openCount, color: COLORS.open },
    { name: 'Half-Open', value: metrics.summary.halfOpenCount, color: COLORS.halfOpen }
  ].filter(item => item.value > 0) : [];

  const breakerPerformance = metrics?.circuitBreakers.map(cb => ({
    name: cb.name.replace('Breaker', '').replace('Service', ''),
    failureRate: cb.failureRate,
    requests: cb.requestCount,
    state: cb.state
  })) || [];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ElectricalIcon color="primary" />
          Circuit Breaker Monitoring
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoRefreshEnabled}
                onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                color="primary"
              />
            }
            label="Auto Refresh"
          />
          
          <Tooltip title="Refresh Data">
            <IconButton onClick={fetchMetrics} color="primary" disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Loading indicator */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      {metrics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <ElectricalIcon color="primary" sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="h4">
                  {metrics.summary.totalCircuitBreakers}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Circuit Breakers
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <ErrorIcon sx={{ color: COLORS.open, fontSize: 32, mb: 1 }} />
                <Typography variant="h4" sx={{ color: COLORS.open }}>
                  {metrics.summary.openCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Open (Failing)
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <SpeedIcon color="primary" sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="h4">
                  {metrics.summary.totalRequests.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Requests
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <TrendingUpIcon 
                  sx={{ 
                    color: metrics.summary.overallFailureRate > 5 ? COLORS.open : COLORS.closed, 
                    fontSize: 32, 
                    mb: 1 
                  }} 
                />
                <Typography 
                  variant="h4" 
                  sx={{ 
                    color: metrics.summary.overallFailureRate > 5 ? COLORS.open : COLORS.closed 
                  }}
                >
                  {metrics.summary.overallFailureRate.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Overall Failure Rate
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Charts and Details */}
      {metrics && (
        <Grid container spacing={3}>
          {/* State Distribution Pie Chart */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Circuit Breaker State Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={stateDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stateDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Failure Rate Chart */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Circuit Breaker Failure Rates
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={breakerPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar 
                      dataKey="failureRate" 
                      fill={COLORS.primary} 
                      name="Failure Rate (%)" 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Circuit Breaker Details Table */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Circuit Breaker Details
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Service</TableCell>
                        <TableCell>Target</TableCell>
                        <TableCell>State</TableCell>
                        <TableCell align="right">Failure Rate</TableCell>
                        <TableCell align="right">Requests</TableCell>
                        <TableCell align="right">Failures</TableCell>
                        <TableCell>Last Change</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {metrics.circuitBreakers.map((breaker, index) => (
                        <TableRow key={index} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {getStateIcon(breaker.state)}
                              {breaker.name}
                            </Box>
                          </TableCell>
                          <TableCell>{breaker.service}</TableCell>
                          <TableCell>{breaker.targetService}</TableCell>
                          <TableCell>
                            <Chip
                              label={breaker.state}
                              size="small"
                              sx={{
                                bgcolor: getStateColor(breaker.state),
                                color: 'white',
                                fontWeight: 'bold'
                              }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              color={breaker.failureRate > 50 ? 'error' : breaker.failureRate > 25 ? 'warning' : 'inherit'}
                            >
                              {breaker.failureRate.toFixed(1)}%
                            </Typography>
                          </TableCell>
                          <TableCell align="right">{breaker.requestCount.toLocaleString()}</TableCell>
                          <TableCell align="right">{breaker.failureCount.toLocaleString()}</TableCell>
                          <TableCell>
                            <Tooltip title={new Date(breaker.lastStateChange).toLocaleString()}>
                              <Typography variant="body2">
                                {new Date(breaker.lastStateChange).toLocaleTimeString()}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<InfoIcon />}
                              onClick={() => handleBreakerClick(breaker)}
                            >
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Circuit Breaker Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Circuit Breaker Details: {selectedBreaker?.name}
        </DialogTitle>
        <DialogContent>
          {selectedBreaker && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>Service Information</Typography>
                  <Typography>Service: {selectedBreaker.service}</Typography>
                  <Typography>Target Service: {selectedBreaker.targetService}</Typography>
                  <Typography>Current State: 
                    <Chip
                      label={selectedBreaker.state}
                      size="small"
                      sx={{
                        ml: 1,
                        bgcolor: getStateColor(selectedBreaker.state),
                        color: 'white'
                      }}
                    />
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>Performance Metrics</Typography>
                  <Typography>Failure Rate: {selectedBreaker.failureRate.toFixed(2)}%</Typography>
                  <Typography>Total Requests: {selectedBreaker.requestCount.toLocaleString()}</Typography>
                  <Typography>Successful Requests: {selectedBreaker.successCount.toLocaleString()}</Typography>
                  <Typography>Failed Requests: {selectedBreaker.failureCount.toLocaleString()}</Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>Configuration</Typography>
                  <Typography>Failure Threshold: {selectedBreaker.configuration.failureThreshold}%</Typography>
                  <Typography>Timeout: {selectedBreaker.configuration.timeout / 1000}s</Typography>
                  <Typography>Retry Attempts: {selectedBreaker.configuration.retryAttempts}</Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>State Information</Typography>
                  <Typography>Last State Change: {new Date(selectedBreaker.lastStateChange).toLocaleString()}</Typography>
                  {selectedBreaker.nextRetryTime && (
                    <Typography>Next Retry: {new Date(selectedBreaker.nextRetryTime).toLocaleString()}</Typography>
                  )}
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CircuitBreakerMonitor; 