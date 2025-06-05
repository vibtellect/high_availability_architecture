// Demo Script Service for launching and monitoring demonstrations
export interface DemoScript {
  id: string;
  name: string;
  description: string;
  duration: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  command: string;
  lastRun?: Date;
  pid?: number;
}

export interface DemoScriptResult {
  scriptId: string;
  success: boolean;
  message: string;
  output?: string;
  pid?: number;
}

class DemoService {
  private readonly baseUrl = 'http://localhost:8084'; // Demo script service

  async launchScript(scriptId: string): Promise<DemoScriptResult> {
    try {
      // For demo purposes, simulate script launch
      // In production, this would call a backend service that manages script execution
      
      const response = await fetch(`${this.baseUrl}/api/demos/${scriptId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Fallback to simulation if demo service not available
        return this.simulateScriptLaunch(scriptId);
      }

      return await response.json();
    } catch (error) {
      // Fallback to simulation for demo purposes
      return this.simulateScriptLaunch(scriptId);
    }
  }

  async stopScript(scriptId: string): Promise<DemoScriptResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/demos/${scriptId}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return this.simulateScriptStop(scriptId);
      }

      return await response.json();
    } catch (error) {
      return this.simulateScriptStop(scriptId);
    }
  }

  async getScriptStatus(scriptId: string): Promise<DemoScript | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/demos/${scriptId}/status`);
      
      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      return null;
    }
  }

  async listAvailableScripts(): Promise<DemoScript[]> {
    // Return available demo scripts
    return [
      {
        id: 'circuit-breaker-demo',
        name: 'Circuit Breaker Demo',
        description: 'Demonstrates circuit breaker pattern with service failures and recovery',
        duration: '5 minutes',
        status: 'idle',
        command: './scripts/demo-circuit-breaker.sh',
      },
      {
        id: 'chaos-engineering',
        name: 'Chaos Engineering',
        description: 'Introduces controlled failures to test system resilience',
        duration: '3 minutes',
        status: 'idle',
        command: 'python scripts/circuit_breaker_tester.py',
      },
      {
        id: 'load-testing',
        name: 'Load Testing',
        description: 'Simulates high traffic to test system performance under load',
        duration: '2 minutes',
        status: 'idle',
        command: 'docker-compose exec k6-load-tester k6 run /scripts/load-test.js',
      },
      {
        id: 'service-mesh-demo',
        name: 'Service Mesh Demo',
        description: 'Shows service-to-service communication and monitoring',
        duration: '4 minutes',
        status: 'idle',
        command: './scripts/service-mesh-demo.sh',
      }
    ];
  }

  // Simulation methods for demo purposes
  private async simulateScriptLaunch(scriptId: string): Promise<DemoScriptResult> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const scripts = await this.listAvailableScripts();
    const script = scripts.find(s => s.id === scriptId);

    if (!script) {
      return {
        scriptId,
        success: false,
        message: 'Script not found'
      };
    }

    // Simulate successful launch
    return {
      scriptId,
      success: true,
      message: `${script.name} launched successfully! Monitor progress in Grafana.`,
      output: `Starting ${script.command}...`,
      pid: Math.floor(Math.random() * 10000) + 1000
    };
  }

  private async simulateScriptStop(scriptId: string): Promise<DemoScriptResult> {
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      scriptId,
      success: true,
      message: 'Demo script stopped'
    };
  }

  // Helper method to open Grafana with script-specific dashboard
  openGrafanaDashboard(scriptId: string): void {
    const dashboardUrls: Record<string, string> = {
      'circuit-breaker-demo': 'http://localhost:3000/d/circuit-breakers',
      'chaos-engineering': 'http://localhost:3000/d/chaos-engineering',
      'load-testing': 'http://localhost:3000/d/load-testing',
      'service-mesh-demo': 'http://localhost:3000/d/service-mesh'
    };

    const dashboardUrl = dashboardUrls[scriptId] || 'http://localhost:3000';
    window.open(dashboardUrl, '_blank');
  }

  // Helper method to open monitoring tools
  openMonitoringTool(tool: 'grafana' | 'prometheus' | 'jaeger'): void {
    const urls = {
      grafana: 'http://localhost:3000',
      prometheus: 'http://localhost:9090',
      jaeger: 'http://localhost:16686'
    };

    window.open(urls[tool], '_blank');
  }
}

export const demoService = new DemoService();
export default demoService; 