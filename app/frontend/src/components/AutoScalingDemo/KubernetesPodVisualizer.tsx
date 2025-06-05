import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  Card,
  CardContent,
  Zoom,
  Fade,
  Tooltip,
} from '@mui/material';
import {
  Memory,
  Storage,
  NetworkCheck,
  CheckCircle,
  Error,
  Pending,
} from '@mui/icons-material';

interface Pod {
  id: string;
  name: string;
  status: 'Running' | 'Pending' | 'Error' | 'Terminating';
  cpuUsage: number;
  memoryUsage: number;
  requestsPerSec: number;
  createdAt: Date;
  service: string;
}

interface KubernetesPodVisualizerProps {
  targetPods: number;
  currentLoad: number;
  isScaling?: boolean;
}

const KubernetesPodVisualizer: React.FC<KubernetesPodVisualizerProps> = ({
  targetPods,
  currentLoad,
  isScaling = false
}) => {
  const [pods, setPods] = useState<Pod[]>([]);
  const [scalingAnimation, setScalingAnimation] = useState(false);

  // Services that get scaled
  const services = [
    { name: 'product-service', color: '#1976d2', maxPods: 4 },
    { name: 'user-service', color: '#388e3c', maxPods: 3 },
    { name: 'checkout-service', color: '#f57c00', maxPods: 2 },
    { name: 'analytics-service', color: '#7b1fa2', maxPods: 1 },
  ];

  const createPod = (service: string, index: number): Pod => ({
    id: `${service}-${index}-${Date.now()}`,
    name: `${service}-${index}`,
    status: Math.random() > 0.95 ? 'Pending' : 'Running',
    cpuUsage: 20 + Math.random() * 60,
    memoryUsage: 30 + Math.random() * 40,
    requestsPerSec: Math.random() * 50,
    createdAt: new Date(),
    service,
  });

  // Calculate how many pods each service should have
  const calculateServicePods = (serviceName: string, totalPods: number) => {
    const serviceConfig = services.find(s => s.name === serviceName);
    if (!serviceConfig) return 0;

    // Distribute pods based on load and service priority
    const loadFactor = Math.min(1, currentLoad / 50);
    const basePods = serviceName === 'product-service' ? 1 : 1;
    const scaledPods = Math.floor(basePods + (serviceConfig.maxPods - basePods) * loadFactor);
    
    return Math.min(serviceConfig.maxPods, Math.max(1, scaledPods));
  };

  useEffect(() => {
    setScalingAnimation(true);
    
    // Calculate desired pod distribution
    const newPods: Pod[] = [];
    
    services.forEach(service => {
      const servicePodsCount = calculateServicePods(service.name, targetPods);
      
      for (let i = 0; i < servicePodsCount; i++) {
        newPods.push(createPod(service.name, i + 1));
      }
    });

    // Simulate some pods still starting up when scaling
    if (isScaling && newPods.length > pods.length) {
      const newPodsToAdd = newPods.length - pods.length;
      for (let i = 0; i < Math.min(2, newPodsToAdd); i++) {
        const randomIndex = Math.floor(Math.random() * newPods.length);
        if (newPods[randomIndex]) {
          newPods[randomIndex].status = 'Pending';
        }
      }
    }

    // Simulate some pods terminating when scaling down
    if (isScaling && newPods.length < pods.length) {
      const existingPods = [...pods];
      const podsToRemove = pods.length - newPods.length;
      
      for (let i = 0; i < podsToRemove; i++) {
        if (existingPods[existingPods.length - 1 - i]) {
          existingPods[existingPods.length - 1 - i].status = 'Terminating';
        }
      }
      
      // Keep terminating pods for animation, then remove
      setTimeout(() => {
        setPods(newPods);
      }, 2000);
      
      setPods(existingPods);
      setScalingAnimation(false);
      return;
    }

    setPods(newPods);
    setTimeout(() => setScalingAnimation(false), 1000);
  }, [targetPods, currentLoad, isScaling]);

  const getPodIcon = (status: Pod['status']) => {
    switch (status) {
      case 'Running':
        return <CheckCircle sx={{ color: '#4caf50' }} />;
      case 'Pending':
        return <Pending sx={{ color: '#ff9800' }} />;
      case 'Error':
        return <Error sx={{ color: '#f44336' }} />;
      case 'Terminating':
        return <Error sx={{ color: '#ff5722' }} />;
      default:
        return <CheckCircle sx={{ color: '#4caf50' }} />;
    }
  };

  const getPodColor = (pod: Pod) => {
    const service = services.find(s => s.name === pod.service);
    return service?.color || '#666';
  };

  const groupedPods = services.map(service => ({
    ...service,
    pods: pods.filter(pod => pod.service === service.name)
  }));

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Memory color="primary" />
        Kubernetes Pod Distribution
        {scalingAnimation && <Chip size="small" label="Scaling..." color="warning" sx={{ ml: 1 }} />}
      </Typography>

      {/* Service Groups */}
      <Grid container spacing={2}>
        {groupedPods.map((serviceGroup) => (
          <Grid item xs={12} md={6} key={serviceGroup.name}>
            <Card sx={{ minHeight: 200 }}>
              <CardContent>
                <Typography 
                  variant="h6" 
                  gutterBottom 
                  sx={{ 
                    color: serviceGroup.color,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  <NetworkCheck />
                  {serviceGroup.name}
                  <Chip 
                    size="small" 
                    label={`${serviceGroup.pods.length} pods`}
                    sx={{ backgroundColor: serviceGroup.color, color: 'white' }}
                  />
                </Typography>

                {/* Pod Grid */}
                <Grid container spacing={1}>
                  {serviceGroup.pods.map((pod, index) => (
                    <Grid item xs={6} sm={4} key={pod.id}>
                      <Zoom 
                        in={true} 
                        timeout={500}
                        style={{ transitionDelay: `${index * 200}ms` }}
                      >
                        <Paper
                          elevation={2}
                          sx={{
                            p: 1,
                            backgroundColor: pod.status === 'Terminating' ? '#ffebee' : 'white',
                            border: `2px solid ${getPodColor(pod)}`,
                            borderStyle: pod.status === 'Pending' ? 'dashed' : 'solid',
                            opacity: pod.status === 'Terminating' ? 0.5 : 1,
                            transition: 'all 0.3s ease',
                            cursor: 'pointer',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: 3,
                            }
                          }}
                        >
                          <Tooltip
                            title={
                              <Box>
                                <Typography variant="body2" fontWeight="bold">{pod.name}</Typography>
                                <Typography variant="caption">Status: {pod.status}</Typography><br/>
                                <Typography variant="caption">CPU: {pod.cpuUsage.toFixed(1)}%</Typography><br/>
                                <Typography variant="caption">Memory: {pod.memoryUsage.toFixed(1)}%</Typography><br/>
                                <Typography variant="caption">Requests: {pod.requestsPerSec.toFixed(1)}/s</Typography>
                              </Box>
                            }
                          >
                            <Box textAlign="center">
                              {getPodIcon(pod.status)}
                              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                {pod.name.split('-').pop()}
                              </Typography>
                              <Typography variant="caption" color="textSecondary" display="block">
                                {pod.cpuUsage.toFixed(0)}% CPU
                              </Typography>
                            </Box>
                          </Tooltip>
                        </Paper>
                      </Zoom>
                    </Grid>
                  ))}

                  {/* Empty slots for max pods */}
                  {Array.from({ length: serviceGroup.maxPods - serviceGroup.pods.length }).map((_, index) => (
                    <Grid item xs={6} sm={4} key={`empty-${index}`}>
                      <Paper
                        sx={{
                          p: 1,
                          backgroundColor: '#f5f5f5',
                          border: '2px dashed #ddd',
                          opacity: 0.3,
                          minHeight: 64,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Typography variant="caption" color="textSecondary">
                          Available
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>

                {/* Service Metrics Summary */}
                <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid #eee' }}>
                  <Grid container spacing={1}>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="textSecondary" display="block">
                        Running: {serviceGroup.pods.filter(p => p.status === 'Running').length}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="textSecondary" display="block">
                        Pending: {serviceGroup.pods.filter(p => p.status === 'Pending').length}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="textSecondary" display="block">
                        Capacity: {serviceGroup.maxPods}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Summary Stats */}
      <Card sx={{ mt: 2, backgroundColor: '#f8f9fa' }}>
        <CardContent>
          <Grid container spacing={3} textAlign="center">
            <Grid item xs={3}>
              <Typography variant="h4" color="primary" fontWeight="bold">
                {pods.filter(p => p.status === 'Running').length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Running Pods
              </Typography>
            </Grid>
            
            <Grid item xs={3}>
              <Typography variant="h4" color="warning.main" fontWeight="bold">
                {pods.filter(p => p.status === 'Pending').length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Pending Pods
              </Typography>
            </Grid>
            
            <Grid item xs={3}>
              <Typography variant="h4" color="success.main" fontWeight="bold">
                {(pods.reduce((sum, pod) => sum + pod.requestsPerSec, 0)).toFixed(0)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total RPS
              </Typography>
            </Grid>
            
            <Grid item xs={3}>
              <Typography variant="h4" color="info.main" fontWeight="bold">
                {services.reduce((sum, service) => sum + service.maxPods, 0)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Max Capacity
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default KubernetesPodVisualizer; 