import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Alert,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Tooltip,
  Snackbar
} from '@mui/material';
import {
  Speed as SpeedIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  OpenInNew as ExternalIcon,
  Science as ScienceIcon,
  FlashOn as ElectricalIcon,
  Monitor as MonitorIcon,
  Terminal as TerminalIcon,
  Launch as LaunchIcon,
  CloudDone as CloudIcon,
  Settings as SettingsIcon,
  BugReport as BugIcon
} from '@mui/icons-material';
import { demoService, DemoScript } from '../services/demoService';

// Add CSS for animations
const styles = `
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.7; }
    100% { opacity: 1; }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

// Add styles to document if not already present
if (!document.getElementById('demo-control-animations')) {
  const styleSheet = document.createElement("style");
  styleSheet.id = 'demo-control-animations';
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}



interface ServiceStatus {
  name: string;
  status: 'UP' | 'DOWN' | 'DEGRADED';
  url: string;
  port: number;
  lastCheck?: string;
}

interface DemoScriptUI extends DemoScript {
  icon: React.ReactElement;
}

const DemoControlPanel: React.FC = () => {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'Product Service', status: 'UP', url: 'http://localhost:8080', port: 8080 },
    { name: 'User Service', status: 'UP', url: 'http://localhost:8081', port: 8081 },
    { name: 'Checkout Service', status: 'UP', url: 'http://localhost:8082', port: 8082 },
    { name: 'Analytics Service', status: 'UP', url: 'http://localhost:8083', port: 8083 },
  ]);

  const [demoScripts, setDemoScripts] = useState<DemoScriptUI[]>([
    {
      id: 'circuit-breaker-demo',
      name: 'Circuit Breaker Demo',
      description: 'Demonstrates circuit breaker pattern with service failures and recovery',
      duration: '5 minutes',
      status: 'idle',
      command: './scripts/demo-circuit-breaker.sh',
      icon: <ElectricalIcon />
    },
    {
      id: 'chaos-engineering',
      name: 'Chaos Engineering',
      description: 'Introduces controlled failures to test system resilience',
      duration: '3 minutes',
      status: 'idle',
      command: 'python scripts/circuit_breaker_tester.py',
      icon: <ScienceIcon />
    },
    {
      id: 'load-testing',
      name: 'Load Testing',
      description: 'Simulates high traffic to test system performance under load',
      duration: '2 minutes',
      status: 'idle',
      command: 'docker-compose exec k6-load-tester k6 run /scripts/load-test.js',
      icon: <SpeedIcon />
    }
  ]);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' as 'success' | 'error' | 'info' });
  const [refreshing, setRefreshing] = useState(false);

  // External monitoring links
  const monitoringLinks = [
    { name: 'Grafana Dashboard', url: 'http://localhost:3000', icon: <AssessmentIcon />, description: 'System metrics and monitoring' },
    { name: 'Prometheus', url: 'http://localhost:9090', icon: <TimelineIcon />, description: 'Metrics collection and alerts' },
    { name: 'Jaeger Tracing', url: 'http://localhost:16686', icon: <BugIcon />, description: 'Distributed tracing' },
  ];

  useEffect(() => {
    checkServiceHealth();
    const interval = setInterval(checkServiceHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkServiceHealth = async () => {
    setRefreshing(true);
    const updatedServices = await Promise.all(
      services.map(async (service) => {
        try {
          const response = await fetch(`${service.url}/api/v1/health`, { 
            method: 'GET',
            signal: AbortSignal.timeout(5000)
          });
          return {
            ...service,
            status: response.ok ? 'UP' as const : 'DEGRADED' as const,
            lastCheck: new Date().toLocaleTimeString()
          };
        } catch (error) {
          return {
            ...service,
            status: 'DOWN' as const,
            lastCheck: new Date().toLocaleTimeString()
          };
        }
      })
    );
    setServices(updatedServices);
    setRefreshing(false);
  };

  const startDemoScript = async (scriptId: string) => {
    const script = demoScripts.find(s => s.id === scriptId);
    if (!script) return;

    // Update script status to running
    setDemoScripts(prev => 
      prev.map(s => s.id === scriptId ? { ...s, status: 'running' } : s)
    );

    setSnackbar({
      open: true,
      message: `Starting ${script.name}...`,
      severity: 'info'
    });

    try {
      const result = await demoService.launchScript(scriptId);
      
      if (result.success) {
        setSnackbar({
          open: true,
          message: result.message,
          severity: 'success'
        });

        // Simulate script completion after some time
        setTimeout(() => {
          setDemoScripts(prev => 
            prev.map(s => s.id === scriptId ? { ...s, status: 'completed' } : s)
          );
        }, 10000);
      } else {
        setDemoScripts(prev => 
          prev.map(s => s.id === scriptId ? { ...s, status: 'failed' } : s)
        );
        setSnackbar({
          open: true,
          message: result.message,
          severity: 'error'
        });
      }
    } catch (error) {
      setDemoScripts(prev => 
        prev.map(s => s.id === scriptId ? { ...s, status: 'failed' } : s)
      );
      setSnackbar({
        open: true,
        message: `Failed to start ${script.name}`,
        severity: 'error'
      });
    }
  };

  const stopDemoScript = async (scriptId: string) => {
    try {
      const result = await demoService.stopScript(scriptId);
      
      setDemoScripts(prev => 
        prev.map(s => s.id === scriptId ? { ...s, status: 'idle' } : s)
      );
      
      setSnackbar({
        open: true,
        message: result.message,
        severity: 'info'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to stop demo script',
        severity: 'error'
      });
    }
  };

  const openGrafanaForScript = (scriptId: string) => {
    demoService.openGrafanaDashboard(scriptId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UP': case 'completed': return 'success';
      case 'DOWN': case 'failed': return 'error';
      case 'DEGRADED': case 'running': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'UP': case 'completed': return <CheckIcon />;
      case 'DOWN': case 'failed': return <ErrorIcon />;
      case 'DEGRADED': case 'running': return <WarningIcon />;
      default: return <RefreshIcon />;
    }
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      <Paper elevation={2} sx={{ mb: 3, p: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TerminalIcon sx={{ fontSize: 48, color: 'white' }} />
            <Box>
              <Typography variant="h4" component="h1" sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}>
                HA Architecture Control Panel
              </Typography>
              <Typography variant="subtitle1" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                Demo Script Launcher & System Monitor
              </Typography>
            </Box>
          </Box>
          <Tooltip title="Refresh Services">
            <IconButton 
              onClick={checkServiceHealth} 
              disabled={refreshing}
              sx={{ color: 'white' }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CloudIcon color="primary" />
                Service Health Status
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {services.map((service) => (
                  <Grid item xs={12} sm={6} md={3} key={service.name}>
                    <Card elevation={1}>
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                          {getStatusIcon(service.status)}
                        </Box>
                        <Typography variant="h6" gutterBottom>{service.name}</Typography>
                        <Chip 
                          label={service.status}
                          color={getStatusColor(service.status) as any}
                          size="small"
                          sx={{ mb: 1 }}
                        />
                        <Typography variant="caption" display="block" color="textSecondary">
                          Port {service.port}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LaunchIcon color="primary" />
                Demo Script Launcher
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                Launch demonstrations to showcase high-availability patterns and monitoring
              </Typography>
              
              <Grid container spacing={2}>
                {demoScripts.map((script) => (
                  <Grid item xs={12} sm={6} key={script.id}>
                    <Card 
                      elevation={1}
                      sx={{ 
                        border: script.status === 'running' ? '2px solid #ff9800' : '1px solid #e0e0e0',
                        animation: script.status === 'running' ? 'pulse 2s infinite' : 'none'
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {script.icon}
                            <Typography variant="h6">{script.name}</Typography>
                          </Box>
                          <Chip 
                            label={script.status}
                            color={getStatusColor(script.status) as any}
                            size="small"
                          />
                        </Box>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                          {script.description}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" sx={{ mb: 2, display: 'block' }}>
                          Duration: {script.duration}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="contained"
                            startIcon={<PlayIcon />}
                            onClick={() => startDemoScript(script.id)}
                            disabled={script.status === 'running'}
                            size="small"
                            sx={{ flexGrow: 1 }}
                          >
                            {script.status === 'running' ? 'Running...' : 'Start Demo'}
                          </Button>
                          {script.status === 'running' && (
                            <Button
                              variant="outlined"
                              startIcon={<StopIcon />}
                              onClick={() => stopDemoScript(script.id)}
                              size="small"
                              sx={{ minWidth: 80 }}
                            >
                              Stop
                            </Button>
                          )}
                          <Button
                            variant="outlined"
                            startIcon={<AssessmentIcon />}
                            onClick={() => openGrafanaForScript(script.id)}
                            size="small"
                            sx={{ minWidth: 80 }}
                          >
                            Monitor
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MonitorIcon color="primary" />
                Monitoring Tools
              </Typography>
              
              <List>
                {monitoringLinks.map((link, index) => (
                  <React.Fragment key={link.name}>
                    <ListItem 
                      component="a"
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ 
                        cursor: 'pointer',
                        borderRadius: 1,
                        '&:hover': { bgcolor: 'action.hover' },
                        textDecoration: 'none',
                        color: 'inherit'
                      }}
                    >
                      <ListItemIcon>{link.icon}</ListItemIcon>
                      <ListItemText 
                        primary={link.name}
                        secondary={link.description}
                      />
                      <ExternalIcon color="action" />
                    </ListItem>
                    {index < monitoringLinks.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Tip:</strong> Start a demo script and watch the metrics in Grafana!
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
};

export default DemoControlPanel; 