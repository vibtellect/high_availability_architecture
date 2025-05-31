import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Alert,
  Button,
  Stack,
  Divider
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Cloud as CloudIcon,
  Timeline as TimelineIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  NetworkCheck as NetworkIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface ServiceMetric {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  responseTime: number;
  throughput: number;
  errorRate: number;
  uptime: number;
}

interface PerformanceData {
  timestamp: string;
  responseTime: number;
  throughput: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
}

const ArchitectureDashboard: React.FC = () => {
  const [services, setServices] = useState<ServiceMetric[]>([
    {
      name: 'Product Service',
      status: 'healthy',
      responseTime: 145,
      throughput: 1250,
      errorRate: 0.02,
      uptime: 99.98
    },
    {
      name: 'User Service',
      status: 'healthy',
      responseTime: 89,
      throughput: 980,
      errorRate: 0.01,
      uptime: 99.99
    },
    {
      name: 'Checkout Service',
      status: 'warning',
      responseTime: 320,
      throughput: 450,
      errorRate: 0.15,
      uptime: 99.85
    },
    {
      name: 'Analytics Service',
      status: 'healthy',
      responseTime: 75,
      throughput: 2100,
      errorRate: 0.003,
      uptime: 99.97
    }
  ]);

  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [isArtilleryRunning, setIsArtilleryRunning] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  useEffect(() => {
    // Simuliere real-time Daten
    const interval = setInterval(() => {
      const now = new Date().toLocaleTimeString();
      const newData: PerformanceData = {
        timestamp: now,
        responseTime: Math.random() * 500 + 100,
        throughput: Math.random() * 1000 + 500,
        errorRate: Math.random() * 0.1,
        cpuUsage: Math.random() * 80 + 20,
        memoryUsage: Math.random() * 70 + 30
      };

      setPerformanceData(prev => {
        const updated = [...prev, newData];
        return updated.slice(-20); // Behalte nur die letzten 20 Datenpunkte
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  const runArtilleryTest = async () => {
    setIsArtilleryRunning(true);
    try {
      // Simuliere Artillery-Test (in Production würde hier ein API-Call stehen)
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const mockResults = {
        summary: {
          duration: 180,
          totalRequests: 15420,
          successfulRequests: 15398,
          failedRequests: 22,
          averageResponseTime: 287,
          p95ResponseTime: 645,
          rps: 85.7,
          throughput: '2.4 MB/s'
        },
        endpoints: [
          { name: 'GET /', requests: 3850, avgTime: 234, p95: 512 },
          { name: 'GET /api/products', requests: 4620, avgTime: 189, p95: 387 },
          { name: 'POST /api/checkout', requests: 2310, avgTime: 456, p95: 892 },
          { name: 'GET /api/analytics', requests: 4640, avgTime: 156, p95: 298 }
        ]
      };
      
      setTestResults(mockResults);
    } catch (error) {
      console.error('Artillery test failed:', error);
    } finally {
      setIsArtilleryRunning(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" alignItems="center" mb={3}>
        <DashboardIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
        <Typography variant="h3" component="h1" gutterBottom>
          High Availability Architecture Dashboard
        </Typography>
      </Box>

      {/* Service Status Overview */}
      <Grid container spacing={3} mb={4}>
        {services.map((service, index) => (
          <Grid item xs={12} md={3} key={index}>
            <Card elevation={3}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">{service.name}</Typography>
                  <Chip 
                    label={service.status.toUpperCase()} 
                    color={getStatusColor(service.status) as any}
                    size="small"
                  />
                </Box>
                <Stack spacing={1}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Response Time:</Typography>
                    <Typography variant="body2" fontWeight="bold">{service.responseTime}ms</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Throughput:</Typography>
                    <Typography variant="body2" fontWeight="bold">{service.throughput} req/s</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Error Rate:</Typography>
                    <Typography variant="body2" fontWeight="bold">{(service.errorRate * 100).toFixed(2)}%</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Uptime:</Typography>
                    <Typography variant="body2" fontWeight="bold">{service.uptime}%</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Performance Charts */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" mb={2}>
              <TimelineIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Real-Time Performance Metrics</Typography>
            </Box>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="responseTime" 
                  stroke="#1976d2" 
                  strokeWidth={2}
                  name="Response Time (ms)"
                />
                <Line 
                  type="monotone" 
                  dataKey="throughput" 
                  stroke="#2e7d32" 
                  strokeWidth={2}
                  name="Throughput (req/s)"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
            <Box display="flex" alignItems="center" mb={2}>
              <SpeedIcon sx={{ mr: 1, color: 'warning.main' }} />
              <Typography variant="h6">System Resources</Typography>
            </Box>
            <Stack spacing={3}>
              <Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">CPU Usage</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {performanceData.length > 0 ? Math.round(performanceData[performanceData.length - 1].cpuUsage) : 0}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={performanceData.length > 0 ? performanceData[performanceData.length - 1].cpuUsage : 0} 
                  color="warning"
                />
              </Box>
              <Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Memory Usage</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {performanceData.length > 0 ? Math.round(performanceData[performanceData.length - 1].memoryUsage) : 0}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={performanceData.length > 0 ? performanceData[performanceData.length - 1].memoryUsage : 0} 
                  color="info"
                />
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Artillery Load Testing Section */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box display="flex" alignItems="center">
            <AssessmentIcon sx={{ mr: 1, color: 'error.main' }} />
            <Typography variant="h6">Artillery Load Testing</Typography>
          </Box>
          <Button
            variant="contained"
            color="error"
            onClick={runArtilleryTest}
            disabled={isArtilleryRunning}
            startIcon={<SpeedIcon />}
          >
            {isArtilleryRunning ? 'Running Test...' : 'Start Load Test'}
          </Button>
        </Box>

        {isArtilleryRunning && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Artillery load test is running. This may take several minutes...
            <LinearProgress sx={{ mt: 1 }} />
          </Alert>
        )}

        {testResults && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" mb={2}>Test Summary</Typography>
              <Stack spacing={1}>
                <Box display="flex" justifyContent="space-between">
                  <Typography>Duration:</Typography>
                  <Typography fontWeight="bold">{testResults.summary.duration}s</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography>Total Requests:</Typography>
                  <Typography fontWeight="bold">{testResults.summary.totalRequests.toLocaleString()}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography>Success Rate:</Typography>
                  <Typography fontWeight="bold" color="success.main">
                    {((testResults.summary.successfulRequests / testResults.summary.totalRequests) * 100).toFixed(2)}%
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography>Avg Response Time:</Typography>
                  <Typography fontWeight="bold">{testResults.summary.averageResponseTime}ms</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography>P95 Response Time:</Typography>
                  <Typography fontWeight="bold">{testResults.summary.p95ResponseTime}ms</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography>Requests/sec:</Typography>
                  <Typography fontWeight="bold">{testResults.summary.rps}</Typography>
                </Box>
              </Stack>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" mb={2}>Endpoint Performance</Typography>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={testResults.endpoints}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="avgTime" fill="#1976d2" name="Avg Time (ms)" />
                </BarChart>
              </ResponsiveContainer>
            </Grid>
          </Grid>
        )}
      </Paper>

      {/* Architecture Overview */}
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <CloudIcon sx={{ mr: 1, color: 'info.main' }} />
          <Typography variant="h6">Architecture Components</Typography>
        </Box>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <NetworkIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h6">API Gateway</Typography>
                <Typography variant="body2" color="text.secondary">
                  Load balancing & routing
                </Typography>
                <Chip label="Active" color="success" size="small" sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <MemoryIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                <Typography variant="h6">Microservices</Typography>
                <Typography variant="body2" color="text.secondary">
                  4 independent services
                </Typography>
                <Chip label="Healthy" color="success" size="small" sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <StorageIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="h6">Database</Typography>
                <Typography variant="body2" color="text.secondary">
                  PostgreSQL cluster
                </Typography>
                <Chip label="Replicated" color="info" size="small" sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <SecurityIcon sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
                <Typography variant="h6">Security</Typography>
                <Typography variant="body2" color="text.secondary">
                  JWT & rate limiting
                </Typography>
                <Chip label="Protected" color="error" size="small" sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default ArchitectureDashboard; 