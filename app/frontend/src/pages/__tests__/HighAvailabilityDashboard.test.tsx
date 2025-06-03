import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { server } from '../../test/setup';
import { handlers } from '../../test/mocks/handlers';
import HighAvailabilityDashboard from '../HighAvailabilityDashboard';

// Create a theme for testing
const theme = createTheme();

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
);

describe('HighAvailabilityDashboard', () => {
  beforeEach(() => {
    // Reset all handlers before each test
    server.resetHandlers(...handlers);
  });

  it('renders dashboard title and main navigation tabs', async () => {
    render(
      <TestWrapper>
        <HighAvailabilityDashboard />
      </TestWrapper>
    );

    // Check if main title is rendered
    expect(screen.getByText('High-Availability Architecture Dashboard')).toBeInTheDocument();
    
    // Check if all tabs are present
    expect(screen.getByText('System Overview')).toBeInTheDocument();
    expect(screen.getByText('Load Testing')).toBeInTheDocument();
    expect(screen.getByText('Chaos Engineering')).toBeInTheDocument();
    expect(screen.getByText('Performance Monitoring')).toBeInTheDocument();
    
    // Check if real-time toggle is present
    expect(screen.getByText('Real-time Updates')).toBeInTheDocument();
  });

  it('displays key metrics cards in system overview', async () => {
    render(
      <TestWrapper>
        <HighAvailabilityDashboard />
      </TestWrapper>
    );

    // Wait for initial data to load
    await waitFor(() => {
      // Check for key metric labels
      expect(screen.getByText('Requests/sec')).toBeInTheDocument();
      expect(screen.getByText('Avg Response Time')).toBeInTheDocument();
      expect(screen.getByText('Error Rate')).toBeInTheDocument();
      expect(screen.getByText('Active Users')).toBeInTheDocument();
    });
  });

  it('shows system health status', async () => {
    render(
      <TestWrapper>
        <HighAvailabilityDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('System Health Status')).toBeInTheDocument();
    });
  });

  it('displays quick actions section', async () => {
    render(
      <TestWrapper>
        <HighAvailabilityDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      expect(screen.getByText('Start Load Test')).toBeInTheDocument();
      expect(screen.getByText('Start Chaos Engineering')).toBeInTheDocument();
      expect(screen.getByText('Open Grafana')).toBeInTheDocument();
    });
  });

  it('can switch between tabs', async () => {
    render(
      <TestWrapper>
        <HighAvailabilityDashboard />
      </TestWrapper>
    );

    // Click on Load Testing tab
    const loadTestTab = screen.getByText('Load Testing');
    fireEvent.click(loadTestTab);

    await waitFor(() => {
      expect(screen.getByText('Load Test Configuration')).toBeInTheDocument();
    });

    // Click on Chaos Engineering tab
    const chaosTab = screen.getByText('Chaos Engineering');
    fireEvent.click(chaosTab);

    await waitFor(() => {
      expect(screen.getByText('Chaos Engineering Configuration')).toBeInTheDocument();
    });

    // Click on Performance Monitoring tab
    const monitoringTab = screen.getByText('Performance Monitoring');
    fireEvent.click(monitoringTab);

    await waitFor(() => {
      expect(screen.getByText('Resource Usage')).toBeInTheDocument();
      expect(screen.getByText('External Monitoring Tools')).toBeInTheDocument();
    });
  });

  it('handles load test configuration and shows controls', async () => {
    render(
      <TestWrapper>
        <HighAvailabilityDashboard />
      </TestWrapper>
    );

    // Switch to Load Testing tab
    fireEvent.click(screen.getByText('Load Testing'));

    await waitFor(() => {
      const durationInput = screen.getByLabelText('Duration (seconds)');
      const rpsInput = screen.getByLabelText('Requests per Second');
      
      expect(durationInput).toBeInTheDocument();
      expect(rpsInput).toBeInTheDocument();
      
      // Check specifically for the Start Load Test button (more specific)
      expect(screen.getByRole('button', { name: /start load test/i })).toBeInTheDocument();
    });
  });

  it('handles chaos engineering configuration and shows controls', async () => {
    render(
      <TestWrapper>
        <HighAvailabilityDashboard />
      </TestWrapper>
    );

    // Switch to Chaos Engineering tab
    fireEvent.click(screen.getByText('Chaos Engineering'));

    await waitFor(() => {
      expect(screen.getByText('Chaos Engineering Configuration')).toBeInTheDocument();
      expect(screen.getByText('Chaos Engineering Status')).toBeInTheDocument();
      
      // Check for either Start or Stop button based on chaos state
      expect(screen.getByRole('button', { name: /(start|stop) chaos engineering/i })).toBeInTheDocument();
    });
  });

  it('toggles real-time updates', async () => {
    render(
      <TestWrapper>
        <HighAvailabilityDashboard />
      </TestWrapper>
    );

    const realTimeSwitch = screen.getByRole('checkbox', { name: /real-time updates/i });
    
    // Should be enabled by default
    expect(realTimeSwitch).toBeChecked();
    
    // Click to disable
    fireEvent.click(realTimeSwitch);
    
    // Should now be unchecked
    expect(realTimeSwitch).not.toBeChecked();
  });

  it('handles refresh button click', async () => {
    render(
      <TestWrapper>
        <HighAvailabilityDashboard />
      </TestWrapper>
    );

    const refreshButton = screen.getByLabelText('Refresh Data');
    
    // Should be able to click refresh without errors
    fireEvent.click(refreshButton);
    
    // Component should still be rendered
    expect(screen.getByText('High-Availability Architecture Dashboard')).toBeInTheDocument();
  });

  it('fetches and displays metrics from API', async () => {
    render(
      <TestWrapper>
        <HighAvailabilityDashboard />
      </TestWrapper>
    );

    // Wait for API data to be fetched and displayed
    await waitFor(() => {
      // The MSW handlers return mock data, so we should see some numbers
      const metricsElements = screen.getAllByText(/\d+/);
      expect(metricsElements.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('displays charts without errors', async () => {
    render(
      <TestWrapper>
        <HighAvailabilityDashboard />
      </TestWrapper>
    );

    // Switch to Performance Monitoring tab to see charts
    fireEvent.click(screen.getByText('Performance Monitoring'));

    await waitFor(() => {
      // Check for chart containers
      expect(screen.getByText('Resource Usage')).toBeInTheDocument();
      expect(screen.getByText('Service Health Scores')).toBeInTheDocument();
      expect(screen.getByText('Service Response Times')).toBeInTheDocument();
    });
  });

  it('opens monitoring tools when buttons are clicked', async () => {
    // Mock window.open
    const mockOpen = vi.fn();
    global.window.open = mockOpen;

    render(
      <TestWrapper>
        <HighAvailabilityDashboard />
      </TestWrapper>
    );

    // Switch to Performance Monitoring tab
    fireEvent.click(screen.getByText('Performance Monitoring'));

    await waitFor(() => {
      const grafanaButton = screen.getByText('Open Grafana');
      fireEvent.click(grafanaButton);
      
      expect(mockOpen).toHaveBeenCalledWith('http://localhost:3000', '_blank');
    });
  });

  it('shows chaos engineering status when available', async () => {
    render(
      <TestWrapper>
        <HighAvailabilityDashboard />
      </TestWrapper>
    );

    // Switch to Chaos Engineering tab
    fireEvent.click(screen.getByText('Chaos Engineering'));

    await waitFor(() => {
      expect(screen.getByText('Chaos Engineering Status')).toBeInTheDocument();
    });
  });

  it('updates load test configuration inputs', async () => {
    render(
      <TestWrapper>
        <HighAvailabilityDashboard />
      </TestWrapper>
    );

    // Switch to Load Testing tab
    fireEvent.click(screen.getByText('Load Testing'));

    await waitFor(() => {
      const durationInput = screen.getByLabelText('Duration (seconds)') as HTMLInputElement;
      const rpsInput = screen.getByLabelText('Requests per Second') as HTMLInputElement;
      
      // Update duration
      fireEvent.change(durationInput, { target: { value: '120' } });
      expect(durationInput.value).toBe('120');
      
      // Update RPS
      fireEvent.change(rpsInput, { target: { value: '200' } });
      expect(rpsInput.value).toBe('200');
    });
  });

  it('has functional dashboard controls', async () => {
    render(
      <TestWrapper>
        <HighAvailabilityDashboard />
      </TestWrapper>
    );

    // Check that dashboard has control elements
    await waitFor(() => {
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      expect(screen.getByLabelText('Refresh Data')).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /real-time updates/i })).toBeInTheDocument();
    });
  });
}); 