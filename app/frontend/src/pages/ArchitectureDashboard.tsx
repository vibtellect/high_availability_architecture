import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
  Alert,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Snackbar,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Speed as SpeedIcon,
  Timeline as TimelineIcon,
  Dashboard as DashboardIcon,
  Assessment as AssessmentIcon,
  OpenInNew as OpenInNewIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon
} from '@mui/icons-material';
import { backendApiService } from '../services/backendApi';
import type { LoadTestConfig, ChaosConfig } from '../services/backendApi';

const ArchitectureDashboard: React.FC = () => {
  const [systemHealth, setSystemHealth] = useState<{[key: string]: 'healthy' | 'unhealthy' | 'unknown'}>({});
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadTestDialog, setLoadTestDialog] = useState(false);
  const [chaosDialog, setChaosDialog] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [chaosLoading, setChaosLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [chaosError, setChaosError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{open: boolean; message: string; severity: 'success' | 'error' | 'info'}>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Load test configuration
  const [loadTestConfig, setLoadTestConfig] = useState<LoadTestConfig>({
    duration: 60,
    rps: 10,
    target: 'product-service',
    scenario: 'browse_products'
  });

  // Chaos engineering configuration
  const [chaosConfig, setChaosConfig] = useState<ChaosConfig>({
    type: 'latency',
    service: 'product',
    duration: 30,
    intensity: 5
  });

  const [activeTests, setActiveTests] = useState<{loadTests: string[], chaosExperiments: string[]}>({
    loadTests: [],
    chaosExperiments: []
  });

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Use backendApiService for consistent data fetching
      const healthData = await backendApiService.getSystemHealth();
      setSystemHealth(healthData);
      
      // Mock metrics data since we don't have a real analytics service yet
      const mockMetrics = {
        totalUsers: Math.floor(Math.random() * 10000) + 1000,
        totalOrders: Math.floor(Math.random() * 5000) + 500,
        revenue: Math.floor(Math.random() * 100000) + 10000,
        conversionRate: (Math.random() * 5) + 2
      };
      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      showSnackbar('Error fetching dashboard data', 'error');
      
      // Set fallback data when services are unavailable
      setSystemHealth({
        product: 'unknown',
        user: 'unknown',
        checkout: 'unknown',
        analytics: 'unknown'
      });
      setMetrics({
        totalUsers: 0,
        totalOrders: 0,
        revenue: 0,
        conversionRate: 0
      });
    }
    setLoading(false);
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const getHealthIcon = (status: 'healthy' | 'unhealthy' | 'unknown') => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon color="success" />;
      case 'unhealthy':
        return <ErrorIcon color="error" />;
      default:
        return <WarningIcon color="warning" />;
    }
  };

  const getHealthColor = (status: 'healthy' | 'unhealthy' | 'unknown') => {
    switch (status) {
      case 'healthy': return 'success';
      case 'unhealthy': return 'error';
      default: return 'warning';
    }
  };

  const handleStartLoadTest = async () => {
    setTestLoading(true);
    setTestError(null);
    
    try {
      // Validate configuration before starting
      if (!loadTestConfig.duration || loadTestConfig.duration <= 0) {
        throw new Error('Duration must be greater than 0 seconds');
      }
      if (!loadTestConfig.rps || loadTestConfig.rps <= 0) {
        throw new Error('Requests per second must be greater than 0');
      }

      const result = await backendApiService.startLoadTest(loadTestConfig);
      
      if (result.testId) {
        setActiveTests(prev => ({ ...prev, loadTests: [...prev.loadTests, result.testId] }));
        showSnackbar(result.message, 'success');
        setLoadTestDialog(false);
      } else {
        const errorMessage = result.message || 'Unknown error occurred while starting load test';
        setTestError(errorMessage);
        showSnackbar(errorMessage, 'error');
      }
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to start load test. Please check if backend services are running and try again.';
      
      setTestError(errorMessage);
      showSnackbar(errorMessage, 'error');
      console.error('Load test error:', error);
    }
    
    setTestLoading(false);
  };

  const handleStartChaosExperiment = async () => {
    setChaosLoading(true);
    setChaosError(null);
    
    try {
      // Validate configuration before starting
      if (!chaosConfig.duration || chaosConfig.duration <= 0) {
        throw new Error('Duration must be greater than 0 seconds');
      }
      if (!chaosConfig.intensity || chaosConfig.intensity < 1 || chaosConfig.intensity > 10) {
        throw new Error('Intensity must be between 1 and 10');
      }

      const result = await backendApiService.startChaosExperiment(chaosConfig);
      
      if (result.experimentId) {
        setActiveTests(prev => ({ ...prev, chaosExperiments: [...prev.chaosExperiments, result.experimentId] }));
        showSnackbar(result.message, 'success');
        setChaosDialog(false);
      } else {
        const errorMessage = result.message || 'Unknown error occurred while starting chaos experiment';
        setChaosError(errorMessage);
        showSnackbar(errorMessage, 'error');
      }
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to start chaos experiment. Please verify that the target service is running and accessible.';
      
      setChaosError(errorMessage);
      showSnackbar(errorMessage, 'error');
      console.error('Chaos experiment error:', error);
    }
    
    setChaosLoading(false);
  };

  const openMonitoringTool = (tool: 'grafana' | 'jaeger' | 'prometheus') => {
    const urls = backendApiService.getMonitoringUrls();
    window.open(urls[tool], '_blank');
  };

  const healthyServices = Object.values(systemHealth).filter(status => status === 'healthy').length;
  const totalServices = Object.keys(systemHealth).length;
  const systemHealthPercentage = totalServices > 0 ? (healthyServices / totalServices) * 100 : 0;

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          System Dashboard
        </Typography>
        <Box>
          <IconButton onClick={fetchDashboardData} disabled={loading}>
            <RefreshIcon />
          </IconButton>
          <Button
            variant="outlined"
            startIcon={<SpeedIcon />}
            onClick={() => setLoadTestDialog(true)}
            sx={{ ml: 1 }}
          >
            Load Test
          </Button>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<WarningIcon />}
            onClick={() => setChaosDialog(true)}
            sx={{ ml: 1 }}
          >
            Chaos Test
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={3}>
        {/* System Health Overview */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Health
              </Typography>
              <Box mb={2}>
                <LinearProgress 
                  variant="determinate" 
                  value={systemHealthPercentage}
                  color={systemHealthPercentage === 100 ? 'success' : systemHealthPercentage >= 50 ? 'warning' : 'error'}
                  sx={{ height: 8, borderRadius: 1 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {healthyServices}/{totalServices} services healthy ({Math.round(systemHealthPercentage)}%)
                </Typography>
              </Box>
              
              <Grid container spacing={1}>
                {Object.entries(systemHealth).map(([service, status]) => (
                  <Grid item xs={6} key={service}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getHealthIcon(status)}
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                        {service}
                      </Typography>
                      <Chip 
                        label={status} 
                        color={getHealthColor(status)}
                        size="small"
                      />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Key Metrics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Key Metrics
              </Typography>
              {metrics ? (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="primary">
                        {metrics.totalUsers?.toLocaleString() || 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Users
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="secondary">
                        {metrics.totalOrders?.toLocaleString() || 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Orders
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="success.main">
                        €{metrics.revenue?.toLocaleString() || 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Revenue
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="info.main">
                        {metrics.conversionRate?.toFixed(2) || 'N/A'}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Conversion Rate
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Loading metrics...
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Active Tests */}
        {(activeTests.loadTests.length > 0 || activeTests.chaosExperiments.length > 0) && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Active Tests & Experiments
                </Typography>
                <Grid container spacing={2}>
                  {activeTests.loadTests.length > 0 && (
                    <Grid item xs={12} md={6}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Load Tests ({activeTests.loadTests.length} active)
                        </Typography>
                        <List dense>
                          {activeTests.loadTests.map((testId) => (
                            <ListItem key={testId}>
                              <ListItemIcon>
                                <SpeedIcon color="primary" />
                              </ListItemIcon>
                              <ListItemText 
                                primary={`Test ${testId.split('-').pop()}`}
                                secondary="Running..."
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Paper>
                    </Grid>
                  )}
                  {activeTests.chaosExperiments.length > 0 && (
                    <Grid item xs={12} md={6}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Chaos Experiments ({activeTests.chaosExperiments.length} active)
                        </Typography>
                        <List dense>
                          {activeTests.chaosExperiments.map((expId) => (
                            <ListItem key={expId}>
                              <ListItemIcon>
                                <WarningIcon color="warning" />
                              </ListItemIcon>
                              <ListItemText 
                                primary={`Experiment ${expId.split('-').pop()}`}
                                secondary="Running..."
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Monitoring Tools */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Monitoring & Observability Tools
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Paper 
                    variant="outlined" 
                    sx={{ p: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }}}
                    onClick={() => openMonitoringTool('grafana')}
                  >
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box display="flex" alignItems="center" gap={1}>
                        <DashboardIcon color="primary" />
                        <Box>
                          <Typography variant="subtitle1">Grafana</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Dashboards & Visualization
                          </Typography>
                        </Box>
                      </Box>
                      <OpenInNewIcon color="action" />
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper 
                    variant="outlined" 
                    sx={{ p: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }}}
                    onClick={() => openMonitoringTool('jaeger')}
                  >
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box display="flex" alignItems="center" gap={1}>
                        <TimelineIcon color="secondary" />
                        <Box>
                          <Typography variant="subtitle1">Jaeger</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Distributed Tracing
                          </Typography>
                        </Box>
                      </Box>
                      <OpenInNewIcon color="action" />
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper 
                    variant="outlined" 
                    sx={{ p: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }}}
                    onClick={() => openMonitoringTool('prometheus')}
                  >
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box display="flex" alignItems="center" gap={1}>
                        <AssessmentIcon color="info" />
                        <Box>
                          <Typography variant="subtitle1">Prometheus</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Metrics & Alerting
                          </Typography>
                        </Box>
                      </Box>
                      <OpenInNewIcon color="action" />
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Service Status Details */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Service Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6">Product Service</Typography>
                    <Typography variant="body2" color="text.secondary">Kotlin + Spring Boot</Typography>
                    <Typography variant="body2">Port: 8080</Typography>
                    <Chip 
                      label={systemHealth['product'] || 'unknown'} 
                      color={getHealthColor(systemHealth['product'] || 'unknown')}
                      sx={{ mt: 1 }}
                    />
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6">User Service</Typography>
                    <Typography variant="body2" color="text.secondary">Java + Spring Boot</Typography>
                    <Typography variant="body2">Port: 8081</Typography>
                    <Chip 
                      label={systemHealth['user'] || 'unknown'} 
                      color={getHealthColor(systemHealth['user'] || 'unknown')}
                      sx={{ mt: 1 }}
                    />
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6">Checkout Service</Typography>
                    <Typography variant="body2" color="text.secondary">Go + Gin</Typography>
                    <Typography variant="body2">Port: 8082</Typography>
                    <Chip 
                      label={systemHealth['checkout'] || 'unknown'} 
                      color={getHealthColor(systemHealth['checkout'] || 'unknown')}
                      sx={{ mt: 1 }}
                    />
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6">Analytics Service</Typography>
                    <Typography variant="body2" color="text.secondary">Python + Flask</Typography>
                    <Typography variant="body2">Port: 8083</Typography>
                    <Chip 
                      label={systemHealth['analytics'] || 'unknown'} 
                      color={getHealthColor(systemHealth['analytics'] || 'unknown')}
                      sx={{ mt: 1 }}
                    />
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Load Test Dialog */}
      <Dialog open={loadTestDialog} onClose={() => setLoadTestDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Load Test Configuration</DialogTitle>
        <DialogContent>
          {testError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {testError}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Duration (seconds)"
                type="number"
                value={loadTestConfig.duration}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLoadTestConfig(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                fullWidth
                error={!loadTestConfig.duration || loadTestConfig.duration <= 0}
                helperText={!loadTestConfig.duration || loadTestConfig.duration <= 0 ? "Must be greater than 0" : ""}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Requests per Second"
                type="number"
                value={loadTestConfig.rps}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLoadTestConfig(prev => ({ ...prev, rps: parseInt(e.target.value) || 0 }))}
                fullWidth
                error={!loadTestConfig.rps || loadTestConfig.rps <= 0}
                helperText={!loadTestConfig.rps || loadTestConfig.rps <= 0 ? "Must be greater than 0" : ""}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Test Scenario</InputLabel>
                <Select
                  value={loadTestConfig.scenario}
                  onChange={(e) => setLoadTestConfig(prev => ({ ...prev, scenario: e.target.value as LoadTestConfig['scenario'] }))}
                >
                  <MenuItem value="browse_products">Product Browsing</MenuItem>
                  <MenuItem value="add_to_cart">Add to Cart</MenuItem>
                  <MenuItem value="checkout">Checkout Process</MenuItem>
                  <MenuItem value="user_registration">User Registration</MenuItem>
                  <MenuItem value="mixed_workload">Mixed Workload</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setLoadTestDialog(false);
            setTestError(null);
          }}>Cancel</Button>
          <Button 
            onClick={handleStartLoadTest} 
            variant="contained" 
            disabled={testLoading || !loadTestConfig.duration || !loadTestConfig.rps}
          >
            {testLoading ? 'Starting...' : 'Start Test'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Chaos Engineering Dialog */}
      <Dialog open={chaosDialog} onClose={() => setChaosDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Chaos Engineering Configuration</DialogTitle>
        <DialogContent>
          {chaosError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {chaosError}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Chaos Type</InputLabel>
                <Select
                  value={chaosConfig.type}
                  onChange={(e) => setChaosConfig(prev => ({ ...prev, type: e.target.value as ChaosConfig['type'] }))}
                >
                  <MenuItem value="latency">Latency Injection</MenuItem>
                  <MenuItem value="error">Error Injection</MenuItem>
                  <MenuItem value="circuit_breaker">Circuit Breaker</MenuItem>
                  <MenuItem value="resource_exhaustion">Resource Exhaustion</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Target Service</InputLabel>
                <Select
                  value={chaosConfig.service}
                  onChange={(e) => setChaosConfig(prev => ({ ...prev, service: e.target.value as ChaosConfig['service'] }))}
                >
                  <MenuItem value="product">Product Service</MenuItem>
                  <MenuItem value="user">User Service</MenuItem>
                  <MenuItem value="checkout">Checkout Service</MenuItem>
                  <MenuItem value="analytics">Analytics Service</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Duration (seconds)"
                type="number"
                value={chaosConfig.duration}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChaosConfig(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                fullWidth
                error={!chaosConfig.duration || chaosConfig.duration <= 0}
                helperText={!chaosConfig.duration || chaosConfig.duration <= 0 ? "Must be greater than 0" : ""}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Intensity (1-10)"
                type="number"
                inputProps={{ min: 1, max: 10 }}
                value={chaosConfig.intensity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChaosConfig(prev => ({ ...prev, intensity: parseInt(e.target.value) || 1 }))}
                fullWidth
                error={chaosConfig.intensity < 1 || chaosConfig.intensity > 10}
                helperText={chaosConfig.intensity < 1 || chaosConfig.intensity > 10 ? "Must be between 1 and 10" : ""}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setChaosDialog(false);
            setChaosError(null);
          }}>Cancel</Button>
          <Button 
            onClick={handleStartChaosExperiment} 
            variant="contained" 
            color="warning" 
            disabled={chaosLoading || !chaosConfig.duration || chaosConfig.intensity < 1 || chaosConfig.intensity > 10}
          >
            {chaosLoading ? 'Starting...' : 'Start Experiment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ArchitectureDashboard; 