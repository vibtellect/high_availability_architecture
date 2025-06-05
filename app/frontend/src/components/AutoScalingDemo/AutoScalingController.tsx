import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Button,
  Grid,
  Typography,
  Box,
  Chip,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  IconButton,
  Tooltip,
  Paper,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Dashboard,
  Terminal,
  Launch,
  Refresh,
  CloudQueue,
  Speed,
  Memory,
  Assessment,
  Visibility,
  Info,
} from '@mui/icons-material';

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

interface AutoScalingControllerProps {
  onStateChange?: (state: DemoState) => void;
}

const AutoScalingController: React.FC<AutoScalingControllerProps> = ({ onStateChange }) => {
  const [demoState, setDemoState] = useState<DemoState>({
    isRunning: false,
    currentPhase: 'Waiting to start',
    progress: 0,
    activeUsers: 0,
    activePods: 1,
    cpuUsage: 15,
    memoryUsage: 20,
    requestRate: 0,
    errorRate: 0,
    responseTime: 150,
  });

  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [notification, setNotification] = useState<{open: boolean, message: string, severity: 'success' | 'error' | 'info'}>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Simulate realistic demo phases
  const demoPhases = [
    { name: '🚀 Baseline (5 users)', duration: 60, users: 5, expectedPods: 1 },
    { name: '📈 Gradual increase (15 users)', duration: 90, users: 15, expectedPods: 2 },
    { name: '⚡ Moderate load (30 users)', duration: 120, users: 30, expectedPods: 4 },
    { name: '🔥 High load (50 users)', duration: 180, users: 50, expectedPods: 7 },
    { name: '💥 Peak load (50+ users)', duration: 120, users: 60, expectedPods: 10 },
    { name: '📉 Scale down (20 users)', duration: 90, users: 20, expectedPods: 3 },
    { name: '🏁 Cool down (5 users)', duration: 60, users: 5, expectedPods: 1 },
  ];

  const updateDemoState = useCallback((updates: Partial<DemoState>) => {
    setDemoState(prev => {
      const newState = { ...prev, ...updates };
      onStateChange?.(newState);
      return newState;
    });
  }, [onStateChange]);

  const simulateMetrics = useCallback((users: number, pods: number) => {
    // Simulate realistic metrics based on load
    const baseLoad = users / 10;
    const cpuUsage = Math.min(85, 20 + baseLoad * 8 + Math.random() * 10);
    const memoryUsage = Math.min(75, 15 + baseLoad * 5 + Math.random() * 8);
    const requestRate = users * (2.5 + Math.random() * 1.5);
    const errorRate = Math.max(0, Math.min(5, (users - 40) * 0.1 + Math.random() * 0.5));
    const responseTime = 120 + (users * 2) + Math.random() * 50;

    updateDemoState({
      activeUsers: users,
      activePods: pods,
      cpuUsage,
      memoryUsage,
      requestRate,
      errorRate,
      responseTime,
    });
  }, [updateDemoState]);

  const startDemo = async () => {
    updateDemoState({ isRunning: true });
    setTerminalOutput(['🚀 Starting Auto-Scaling Demo...']);
    
    setNotification({
      open: true,
      message: 'Auto-Scaling Demo started! Watch the Grafana dashboard for real-time metrics.',
      severity: 'success'
    });

    let totalTime = 0;
    const totalDuration = demoPhases.reduce((sum, phase) => sum + phase.duration, 0);

    for (const phase of demoPhases) {
      updateDemoState({ currentPhase: phase.name });
      setTerminalOutput(prev => [...prev, `📊 Phase: ${phase.name}`]);
      
      // Simulate gradual scaling over the phase duration
      for (let step = 0; step <= phase.duration; step += 10) {
        if (!demoState.isRunning) break;
        
        const phaseProgress = step / phase.duration;
        const currentUsers = Math.floor(phase.users * phaseProgress);
        const currentPods = Math.min(phase.expectedPods, 
          Math.max(1, Math.floor(currentUsers / 8) + 1));
        
        simulateMetrics(currentUsers, currentPods);
        
        const overallProgress = ((totalTime + step) / totalDuration) * 100;
        updateDemoState({ progress: overallProgress });
        
        // Add scaling events to terminal
        if (step % 30 === 0 && currentPods !== demoState.activePods) {
          setTerminalOutput(prev => [...prev, 
            `🔄 Scaling: ${demoState.activePods} → ${currentPods} pods (CPU: ${Math.round(demoState.cpuUsage)}%)`
          ]);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      totalTime += phase.duration;
    }

    updateDemoState({ 
      isRunning: false, 
      currentPhase: 'Demo completed ✅',
      progress: 100 
    });
    
    setTerminalOutput(prev => [...prev, '🏁 Auto-Scaling Demo completed!']);
    setNotification({
      open: true,
      message: 'Demo completed successfully! Check Grafana for detailed metrics.',
      severity: 'success'
    });
  };

  const stopDemo = () => {
    updateDemoState({
      isRunning: false,
      currentPhase: 'Demo stopped',
      progress: 0,
      activeUsers: 0,
      activePods: 1,
      cpuUsage: 15,
      memoryUsage: 20,
      requestRate: 0,
      errorRate: 0,
      responseTime: 150,
    });
    setTerminalOutput([]);
    setNotification({
      open: true,
      message: 'Demo stopped',
      severity: 'info'
    });
  };

  const openGrafana = () => {
    window.open('http://localhost:3001/d/live-demo-dashboard', '_blank');
  };

  const openPrometheus = () => {
    window.open('http://localhost:9090', '_blank');
  };

  return (
    <Box>
      {/* Control Panel */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: 'white', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Speed />
            Auto-Scaling Demo Control
          </Typography>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Button
                variant="contained"
                startIcon={demoState.isRunning ? <CircularProgress size={20} color="inherit" /> : <PlayArrow />}
                onClick={startDemo}
                disabled={demoState.isRunning}
                size="large"
                sx={{ backgroundColor: 'rgba(255,255,255,0.9)', color: '#667eea', fontWeight: 'bold' }}
              >
                {demoState.isRunning ? 'Running Demo...' : 'Start Auto-Scaling Demo'}
              </Button>
            </Grid>
            
            <Grid item>
              <Button
                variant="outlined"
                startIcon={<Stop />}
                onClick={stopDemo}
                disabled={!demoState.isRunning}
                sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
              >
                Stop Demo
              </Button>
            </Grid>
            
            <Grid item xs />
            
            <Grid item>
              <Tooltip title="Open Grafana Dashboard">
                <IconButton onClick={openGrafana} sx={{ color: 'white' }}>
                  <Dashboard />
                </IconButton>
              </Tooltip>
            </Grid>
            
            <Grid item>
              <Tooltip title="View Terminal Output">
                <IconButton onClick={() => setShowTerminal(true)} sx={{ color: 'white' }}>
                  <Terminal />
                </IconButton>
              </Tooltip>
            </Grid>
            
            <Grid item>
              <Tooltip title="Open Prometheus">
                <IconButton onClick={openPrometheus} sx={{ color: 'white' }}>
                  <Launch />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
          
          {demoState.isRunning && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 1 }}>
                {demoState.currentPhase}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={demoState.progress} 
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  '& .MuiLinearProgress-bar': { borderRadius: 4 }
                }} 
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <Grid container spacing={3}>
        {/* Load Test Metrics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assessment color="primary" />
                Load Test Metrics
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary" fontWeight="bold">
                      {demoState.activeUsers}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Active Users
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="success.main" fontWeight="bold">
                      {Math.round(demoState.requestRate)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Requests/sec
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography 
                      variant="h4" 
                      color={demoState.errorRate > 2 ? 'error.main' : 'success.main'}
                      fontWeight="bold"
                    >
                      {demoState.errorRate.toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Error Rate
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography 
                      variant="h4" 
                      color={demoState.responseTime > 500 ? 'warning.main' : 'success.main'}
                      fontWeight="bold"
                    >
                      {Math.round(demoState.responseTime)}ms
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Response Time
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Kubernetes Metrics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CloudQueue color="primary" />
                Kubernetes Scaling
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary" fontWeight="bold">
                      {demoState.activePods}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Active Pods
                    </Typography>
                    <Chip 
                      size="small" 
                      label={demoState.activePods > 1 ? 'Scaled Up' : 'Baseline'} 
                      color={demoState.activePods > 1 ? 'success' : 'default'}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography 
                      variant="h4" 
                      color={demoState.cpuUsage > 70 ? 'error.main' : demoState.cpuUsage > 50 ? 'warning.main' : 'success.main'}
                      fontWeight="bold"
                    >
                      {Math.round(demoState.cpuUsage)}%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      CPU Usage
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Box>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      CPU Usage (Scaling Threshold: 70%)
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={demoState.cpuUsage} 
                      sx={{ 
                        height: 8, 
                        borderRadius: 4,
                        '& .MuiLinearProgress-bar': { 
                          borderRadius: 4,
                          backgroundColor: demoState.cpuUsage > 70 ? '#f44336' : demoState.cpuUsage > 50 ? '#ff9800' : '#4caf50'
                        }
                      }} 
                    />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Terminal Dialog */}
      <Dialog open={showTerminal} onClose={() => setShowTerminal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Terminal />
          Demo Terminal Output
        </DialogTitle>
        <DialogContent>
          <Paper 
            sx={{ 
              backgroundColor: '#1e1e1e', 
              color: '#ffffff', 
              p: 2, 
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              minHeight: '300px',
              maxHeight: '400px',
              overflow: 'auto'
            }}
          >
            {terminalOutput.map((line, index) => (
              <div key={index}>{line}</div>
            ))}
            {terminalOutput.length === 0 && (
              <div style={{ color: '#888' }}>No output yet. Start the demo to see live updates.</div>
            )}
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTerminal(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification({ ...notification, open: false })}
        message={notification.message}
      />
    </Box>
  );
};

export default AutoScalingController; 