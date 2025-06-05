import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Box,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Snackbar,
} from "@mui/material";
import { 
  PlayArrow, 
  Stop, 
  CloudQueue, 
  Speed, 
  Memory, 
  Assessment,
  Timeline,
  ScaleOutlined,
  Refresh,
  Launch,
  Terminal,
  Visibility,
  ExpandMore,
  Dashboard,
  Code,
  Info
} from "@mui/icons-material";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import AutoScalingController from '../components/AutoScalingDemo/AutoScalingController';
import KubernetesPodVisualizer from '../components/AutoScalingDemo/KubernetesPodVisualizer';

interface MetricPoint {
  timestamp: string;
  pods: number;
  vus: number;
  cpuUsage: number;
  memoryUsage: number;
  requestsPerSec: number;
}

interface DemoState {
  isRunning: boolean;
  currentPhase: string;
  progress: number;
  activeUsers: number;
  activePods: number;
  cpuUsage: number;
  memoryUsage: number;
  requestRate: number;
  errorRate: number;
  responseTime: number;
}

const KubernetesAutoScalingPage: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);
  const [demoState, setDemoState] = useState<DemoState | null>(null);
  const [lastPodCount, setLastPodCount] = useState(1);

  const handleDemoStateChange = (newState: DemoState) => {
    setDemoState(newState);
    
    // Update metrics when demo state changes
    const newPoint: MetricPoint = {
      timestamp: new Date().toLocaleTimeString(),
      pods: newState.activePods,
      vus: newState.activeUsers,
      cpuUsage: newState.cpuUsage,
      memoryUsage: newState.memoryUsage,
      requestsPerSec: newState.requestRate
    };
    
    setMetrics(prev => [...prev.slice(-29), newPoint]);
    setLastPodCount(newState.activePods);
  };

  // Initialize with default metrics
  useEffect(() => {
    if (!demoState) {
      const initialPoint: MetricPoint = {
        timestamp: new Date().toLocaleTimeString(),
        pods: 1,
        vus: 0,
        cpuUsage: 15,
        memoryUsage: 20,
        requestsPerSec: 0
      };
      setMetrics([initialPoint]);
    }
  }, [demoState]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h3" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <ScaleOutlined fontSize="large" />
        🚀 Kubernetes Auto-Scaling Demo
      </Typography>
      
      <Typography variant="h6" color="text.secondary" gutterBottom>
        Interactive demonstration of Kubernetes HPA scaling with real-time load testing and pod visualization
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Enhanced Demo:</strong> Diese verbesserte Simulation zeigt realistische Kubernetes Auto-Scaling Szenarien. 
        Du kannst die Demo starten, Grafana öffnen, und sehen wie Pods dynamisch skaliert werden basierend auf CPU-Last.
        <Box sx={{ mt: 1 }}>
          <Chip size="small" label="🎯 Real k6 Integration" sx={{ mr: 1 }} />
          <Chip size="small" label="📊 Live Grafana Dashboard" sx={{ mr: 1 }} />
          <Chip size="small" label="🔄 Pod Visualization" />
        </Box>
      </Alert>

      {/* Auto-Scaling Controller */}
      <AutoScalingController onStateChange={handleDemoStateChange} />

      {/* Pod Visualizer */}
      <Box sx={{ mt: 3 }}>
        <KubernetesPodVisualizer 
          targetPods={demoState?.activePods || 1}
          currentLoad={demoState?.activeUsers || 0}
          isScaling={demoState?.isRunning || false}
        />
      </Box>

      {/* Metrics Chart */}
      {metrics.length > 1 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Timeline color="primary" />
              Real-time Scaling Metrics
            </Typography>
            
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <ChartTooltip />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="pods" 
                  stackId="1" 
                  stroke="#1976d2" 
                  fill="#1976d2" 
                  fillOpacity={0.6}
                  name="Active Pods"
                />
                <Area 
                  type="monotone" 
                  dataKey="vus" 
                  stackId="2" 
                  stroke="#ff9800" 
                  fill="#ff9800" 
                  fillOpacity={0.3}
                  name="Load Test Users"
                />
                <Line 
                  type="monotone" 
                  dataKey="cpuUsage" 
                  stroke="#f44336" 
                  strokeWidth={2}
                  dot={false}
                  name="CPU Usage %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

             {/* Status Information */}
       {demoState && (
         <Grid container spacing={2} sx={{ mt: 2 }}>
           <Grid item xs={12} md={3}>
             <Card>
               <CardContent sx={{ textAlign: 'center' }}>
                 <Typography variant="h6" color="primary">
                   {demoState.currentPhase}
                 </Typography>
                 <Typography variant="body2" color="textSecondary">
                   Current Phase
                 </Typography>
               </CardContent>
             </Card>
           </Grid>
           
           <Grid item xs={12} md={3}>
             <Card>
               <CardContent sx={{ textAlign: 'center' }}>
                 <Typography variant="h4" color="primary" fontWeight="bold">
                   {Math.round(demoState.progress)}%
                 </Typography>
                 <Typography variant="body2" color="textSecondary">
                   Demo Progress
                 </Typography>
               </CardContent>
             </Card>
           </Grid>
         </Grid>
       )}

       {/* Quick Actions */}
       <Card sx={{ mt: 3, backgroundColor: '#f8f9fa' }}>
         <CardContent>
           <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
             <Info color="primary" />
             Quick Actions & Resources
           </Typography>
           
           <Grid container spacing={2}>
             <Grid item xs={12} md={4}>
               <Button
                 fullWidth
                 variant="outlined"
                 startIcon={<Dashboard />}
                 onClick={() => window.open('http://localhost:3001/d/live-demo-dashboard', '_blank')}
               >
                 Open Grafana Dashboard
               </Button>
             </Grid>
             
             <Grid item xs={12} md={4}>
               <Button
                 fullWidth
                 variant="outlined"
                 startIcon={<Launch />}
                 onClick={() => window.open('http://localhost:9090', '_blank')}
               >
                 Open Prometheus
               </Button>
             </Grid>
             
             <Grid item xs={12} md={4}>
               <Button
                 fullWidth
                 variant="outlined"
                 startIcon={<Code />}
                 onClick={() => window.open('https://github.com/your-repo/k6-tests', '_blank')}
               >
                 View k6 Scripts
               </Button>
             </Grid>
           </Grid>
           
           <Alert severity="info" sx={{ mt: 2 }}>
             <Typography variant="body2">
               <strong>💡 Pro Tip:</strong> Während die Demo läuft, öffne das Grafana Dashboard um die Live-Metriken zu verfolgen. 
               Du siehst wie die Pods automatisch skaliert werden wenn die CPU-Last steigt!
             </Typography>
           </Alert>
         </CardContent>
       </Card>
    </Container>
  );
};

export default KubernetesAutoScalingPage;