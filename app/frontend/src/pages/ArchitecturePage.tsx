import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Paper,
  CircularProgress,
  Snackbar,
  Tabs,
  Tab,
  Link,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Architecture as ArchitectureIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Visibility as VisibilityIcon,
  Warning as WarningIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  TrendingUp as TrendingUpIcon,
  Dashboard as DashboardIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  OpenInNew as OpenInNewIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { backendApiService } from '../services/backendApi';
import type { LoadTestConfig, ChaosConfig } from '../services/backendApi';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ArchitecturePage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [systemHealth, setSystemHealth] = useState<{[key: string]: 'healthy' | 'unhealthy' | 'unknown'}>({});
  const [loadTestDialog, setLoadTestDialog] = useState(false);
  const [chaosDialog, setChaosDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{open: boolean; message: string; severity: 'success' | 'error' | 'info'}>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Load Test Configuration
  const [loadTestConfig, setLoadTestConfig] = useState<LoadTestConfig>({
    duration: 60,
    rps: 10,
    target: 'product-service',
    scenario: 'browse_products'
  });

  // Chaos Engineering Configuration
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

  // Fetch system health on component mount
  useEffect(() => {
    fetchSystemHealth();
    const interval = setInterval(fetchSystemHealth, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchSystemHealth = async () => {
    try {
      const health = await backendApiService.getSystemHealth();
      setSystemHealth(health);
    } catch (error) {
      console.error('Error fetching system health:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleStartLoadTest = async () => {
    setLoading(true);
    try {
      const result = await backendApiService.startLoadTest(loadTestConfig);
      if (result.testId) {
        setActiveTests(prev => ({ ...prev, loadTests: [...prev.loadTests, result.testId] }));
        showSnackbar(result.message, 'success');
      } else {
        showSnackbar(result.message, 'error');
      }
    } catch (error) {
      showSnackbar('Failed to start load test', 'error');
    }
    setLoading(false);
    setLoadTestDialog(false);
  };

  const handleStartChaosExperiment = async () => {
    setLoading(true);
    try {
      const result = await backendApiService.startChaosExperiment(chaosConfig);
      if (result.experimentId) {
        setActiveTests(prev => ({ ...prev, chaosExperiments: [...prev.chaosExperiments, result.experimentId] }));
        showSnackbar(result.message, 'success');
      } else {
        showSnackbar(result.message, 'error');
      }
    } catch (error) {
      showSnackbar('Failed to start chaos experiment', 'error');
    }
    setLoading(false);
    setChaosDialog(false);
  };

  const openMonitoringTool = (tool: 'grafana' | 'jaeger' | 'prometheus') => {
    const urls = backendApiService.getMonitoringUrls();
    window.open(urls[tool], '_blank');
  };

  const getHealthColor = (status: 'healthy' | 'unhealthy' | 'unknown') => {
    switch (status) {
      case 'healthy': return 'success';
      case 'unhealthy': return 'error';
      default: return 'warning';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center" sx={{ mb: 4 }}>
        <ArchitectureIcon sx={{ fontSize: 40, mr: 2, verticalAlign: 'middle' }} />
        Hochverfügbare E-Commerce Architektur
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="architecture tabs">
          <Tab label="System Übersicht" />
          <Tab label="Load Testing" />
          <Tab label="Chaos Engineering" />
          <Tab label="Monitoring & Observability" />
        </Tabs>
      </Box>

      {/* System Overview Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={4}>
          {/* System Health Status */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h5">System Health Status</Typography>
                  <IconButton onClick={fetchSystemHealth}>
                    <RefreshIcon />
                  </IconButton>
                </Box>
                <Grid container spacing={2}>
                  {Object.entries(systemHealth).map(([service, status]) => (
                    <Grid item xs={12} sm={6} md={3} key={service}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h6" textTransform="capitalize">{service} Service</Typography>
                        <Chip 
                          label={status} 
                          color={getHealthColor(status)}
                          sx={{ mt: 1 }}
                        />
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Microservices Architecture */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  <ArchitectureIcon sx={{ mr: 1 }} />
                  Microservices
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Paper sx={{ p: 2, bgcolor: '#e3f2fd' }}>
                      <Typography variant="h6">Product Service</Typography>
                      <Typography variant="body2">Kotlin + Spring Boot</Typography>
                      <Typography variant="body2">Port: 8080</Typography>
                      <Chip label="CRUD" size="small" sx={{ mt: 1 }} />
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Paper sx={{ p: 2, bgcolor: '#f3e5f5' }}>
                      <Typography variant="h6">User Service</Typography>
                      <Typography variant="body2">Java + Spring Boot</Typography>
                      <Typography variant="body2">Port: 8081</Typography>
                      <Chip label="Auth" size="small" sx={{ mt: 1 }} />
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Paper sx={{ p: 2, bgcolor: '#e8f5e8' }}>
                      <Typography variant="h6">Checkout Service</Typography>
                      <Typography variant="body2">Go + Gin</Typography>
                      <Typography variant="body2">Port: 8082</Typography>
                      <Chip label="Orders" size="small" sx={{ mt: 1 }} />
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Paper sx={{ p: 2, bgcolor: '#fff3e0' }}>
                      <Typography variant="h6">Analytics Service</Typography>
                      <Typography variant="body2">Python + Flask</Typography>
                      <Typography variant="body2">Port: 8083</Typography>
                      <Chip label="Events" size="small" sx={{ mt: 1 }} />
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Infrastructure */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  <SecurityIcon sx={{ mr: 1 }} />
                  Infrastruktur
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                      <Typography variant="h6">Load Balancer</Typography>
                      <Typography variant="body2">NGINX (Port: 80)</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Paper sx={{ p: 2, bgcolor: '#fce4ec' }}>
                      <Typography variant="h6">Cache</Typography>
                      <Typography variant="body2">Redis (Port: 6379)</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Paper sx={{ p: 2, bgcolor: '#e0f2f1' }}>
                      <Typography variant="h6">Database</Typography>
                      <Typography variant="body2">DynamoDB (LocalStack)</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Load Testing Tab */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  <SpeedIcon sx={{ mr: 1 }} />
                  Load Testing Kontrolle
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<PlayIcon />}
                  onClick={() => setLoadTestDialog(true)}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  Neuen Load Test starten
                </Button>
                {activeTests.loadTests.length > 0 && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Aktive Tests: {activeTests.loadTests.length}
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>Test Szenarien</Typography>
                <Grid container spacing={1}>
                  <Grid item xs={12} sm={6}>
                    <Chip label="Product Browsing" variant="outlined" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Chip label="Add to Cart" variant="outlined" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Chip label="Checkout Process" variant="outlined" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Chip label="Mixed Workload" variant="outlined" />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Chaos Engineering Tab */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  <WarningIcon sx={{ mr: 1 }} />
                  Chaos Engineering
                </Typography>
                <Button
                  variant="contained"
                  color="warning"
                  startIcon={<PlayIcon />}
                  onClick={() => setChaosDialog(true)}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  Chaos Experiment starten
                </Button>
                {activeTests.chaosExperiments.length > 0 && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Aktive Experimente: {activeTests.chaosExperiments.length}
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>Chaos Typen</Typography>
                <Grid container spacing={1}>
                  <Grid item xs={12} sm={6}>
                    <Chip label="Latenz Injection" variant="outlined" color="warning" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Chip label="Error Injection" variant="outlined" color="warning" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Chip label="Circuit Breaker" variant="outlined" color="warning" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Chip label="Resource Exhaustion" variant="outlined" color="warning" />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Monitoring Tab */}
      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  <DashboardIcon sx={{ mr: 1 }} />
                  Grafana Dashboards
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Visualisierung von Metriken, Alerts und System Performance
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<OpenInNewIcon />}
                  onClick={() => openMonitoringTool('grafana')}
                  fullWidth
                >
                  Grafana öffnen
                </Button>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  http://localhost:3000
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  <TimelineIcon sx={{ mr: 1 }} />
                  Jaeger Tracing
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Distributed Tracing und Request Flow Analyse
                </Typography>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<OpenInNewIcon />}
                  onClick={() => openMonitoringTool('jaeger')}
                  fullWidth
                >
                  Jaeger öffnen
                </Button>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  http://localhost:16686
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  <AssessmentIcon sx={{ mr: 1 }} />
                  Prometheus Metrics
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Raw Metrics, Queries und Service Discovery
                </Typography>
                <Button
                  variant="contained"
                  color="info"
                  startIcon={<OpenInNewIcon />}
                  onClick={() => openMonitoringTool('prometheus')}
                  fullWidth
                >
                  Prometheus öffnen
                </Button>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  http://localhost:9090
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  <VisibilityIcon sx={{ mr: 1 }} />
                  Observability Stack
                </Typography>
                <Typography variant="body1" paragraph>
                  Unsere Observability-Pipeline verwendet OpenTelemetry für standardisierte Datensammlung,
                  Jaeger für Distributed Tracing, Prometheus für Metrics Collection und Grafana für 
                  Visualisierung und Alerting.
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h6">OpenTelemetry</Typography>
                      <Typography variant="body2">Instrumentierung</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h6">Jaeger</Typography>
                      <Typography variant="body2">Distributed Tracing</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h6">Prometheus</Typography>
                      <Typography variant="body2">Metrics Collection</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h6">Grafana</Typography>
                      <Typography variant="body2">Visualization</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Load Test Dialog */}
      <Dialog open={loadTestDialog} onClose={() => setLoadTestDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Load Test konfigurieren</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Dauer (Sekunden)"
                type="number"
                value={loadTestConfig.duration}
                onChange={(e) => setLoadTestConfig(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Requests pro Sekunde"
                type="number"
                value={loadTestConfig.rps}
                onChange={(e) => setLoadTestConfig(prev => ({ ...prev, rps: parseInt(e.target.value) }))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Test Szenario</InputLabel>
                <Select
                  value={loadTestConfig.scenario}
                  onChange={(e) => setLoadTestConfig(prev => ({ ...prev, scenario: e.target.value as any }))}
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
          <Button onClick={() => setLoadTestDialog(false)}>Abbrechen</Button>
          <Button onClick={handleStartLoadTest} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Test starten'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Chaos Engineering Dialog */}
      <Dialog open={chaosDialog} onClose={() => setChaosDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Chaos Experiment konfigurieren</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Chaos Typ</InputLabel>
                <Select
                  value={chaosConfig.type}
                  onChange={(e) => setChaosConfig(prev => ({ ...prev, type: e.target.value as any }))}
                >
                  <MenuItem value="latency">Latenz Injection</MenuItem>
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
                  onChange={(e) => setChaosConfig(prev => ({ ...prev, service: e.target.value as any }))}
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
                label="Dauer (Sekunden)"
                type="number"
                value={chaosConfig.duration}
                onChange={(e) => setChaosConfig(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography gutterBottom>Intensität</Typography>
              <Slider
                value={chaosConfig.intensity}
                onChange={(e, value) => setChaosConfig(prev => ({ ...prev, intensity: value as number }))}
                min={1}
                max={10}
                step={1}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChaosDialog(false)}>Abbrechen</Button>
          <Button onClick={handleStartChaosExperiment} variant="contained" color="warning" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Experiment starten'}
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
    </Container>
  );
};

export default ArchitecturePage; 