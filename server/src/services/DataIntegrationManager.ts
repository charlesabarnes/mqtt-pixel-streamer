import { WeatherData } from '@mqtt-pixel-streamer/shared';
import { metNoWeatherService, WeatherLocation } from './MetNoWeatherService';

export interface IntegrationConfig {
  type: 'weather' | 'time' | 'custom';
  updateInterval: number;
  enabled: boolean;
  config?: any;
}

export interface IntegrationStatus {
  type: string;
  enabled: boolean;
  lastUpdate: Date | null;
  nextUpdate: Date | null;
  status: 'running' | 'stopped' | 'error';
  error?: string;
}

class DataIntegrationManager {
  private static instance: DataIntegrationManager;
  private integrations = new Map<string, any>();
  private intervals = new Map<string, NodeJS.Timeout>();
  private status = new Map<string, IntegrationStatus>();
  private configs = new Map<string, IntegrationConfig>();

  private constructor() {
    // Initialize with default time integration (always enabled)
    this.startTimeIntegration();
  }

  static getInstance(): DataIntegrationManager {
    if (!DataIntegrationManager.instance) {
      DataIntegrationManager.instance = new DataIntegrationManager();
    }
    return DataIntegrationManager.instance;
  }

  /**
   * Get current cached data for all integrations
   */
  getCurrentDataValues(): Record<string, any> {
    const baseData = {
      time: new Date(),
      date: new Date(),
    };

    const weatherData = this.integrations.get('weather');
    if (weatherData) {
      return {
        ...baseData,
        weather: weatherData,
      };
    }

    // Fallback mock data if weather integration not available
    return {
      ...baseData,
      weather: {
        temperature: 72,
        humidity: 65,
        condition: 'Partly Cloudy',
        conditionCode: 'partlycloudy_day',
        windSpeed: 5,
        windDirection: 245,
        pressure: 1013,
        cloudCoverage: 30,
        precipitation: 0,
        precipitationProbability: 20,
        uvIndex: 3,
        sunrise: new Date(new Date().setHours(6, 30, 0, 0)),
        sunset: new Date(new Date().setHours(18, 45, 0, 0)),
        lastUpdated: new Date(),
      }
    };
  }

  /**
   * Start weather integration with specified location and update interval
   */
  startWeatherIntegration(location: WeatherLocation, updateInterval: number = 900000): void {
    const integrationType = 'weather';

    // Stop existing weather integration if running
    this.stopIntegration(integrationType);

    const config: IntegrationConfig = {
      type: 'weather',
      updateInterval,
      enabled: true,
      config: { location }
    };

    this.configs.set(integrationType, config);

    // Initialize status
    this.status.set(integrationType, {
      type: integrationType,
      enabled: true,
      lastUpdate: null,
      nextUpdate: new Date(Date.now() + updateInterval),
      status: 'running'
    });

    const updateWeatherData = async () => {
      try {
        const weatherData = await metNoWeatherService.getWeatherData(location);
        this.integrations.set(integrationType, weatherData);

        // Update status
        const now = new Date();
        this.status.set(integrationType, {
          type: integrationType,
          enabled: true,
          lastUpdate: now,
          nextUpdate: new Date(now.getTime() + updateInterval),
          status: 'running'
        });

        console.log(`Weather data updated: ${weatherData.temperature}°F, ${weatherData.condition}`);
      } catch (error) {
        console.error('Failed to update weather data:', error);
        this.status.set(integrationType, {
          type: integrationType,
          enabled: true,
          lastUpdate: this.status.get(integrationType)?.lastUpdate || null,
          nextUpdate: new Date(Date.now() + updateInterval),
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };

    // Update immediately
    updateWeatherData();

    // Set up interval for future updates
    const interval = setInterval(updateWeatherData, updateInterval);
    this.intervals.set(integrationType, interval);

    console.log(`Weather integration started with ${updateInterval / 1000}s update interval`);
  }

  /**
   * Start time integration (always runs every second)
   */
  private startTimeIntegration(): void {
    const integrationType = 'time';

    const config: IntegrationConfig = {
      type: 'time',
      updateInterval: 1000,
      enabled: true
    };

    this.configs.set(integrationType, config);

    this.status.set(integrationType, {
      type: integrationType,
      enabled: true,
      lastUpdate: new Date(),
      nextUpdate: new Date(Date.now() + 1000),
      status: 'running'
    });

    // Time integration doesn't need to store data since it's always fresh
    console.log('Time integration started');
  }

  /**
   * Stop a specific integration
   */
  stopIntegration(type: string): void {
    const interval = this.intervals.get(type);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(type);
    }

    const status = this.status.get(type);
    if (status) {
      this.status.set(type, {
        ...status,
        status: 'stopped',
        enabled: false
      });
    }

    this.integrations.delete(type);
    console.log(`${type} integration stopped`);
  }

  /**
   * Get status for all integrations
   */
  getAllStatus(): Record<string, IntegrationStatus> {
    const result: Record<string, IntegrationStatus> = {};
    for (const [type, status] of this.status.entries()) {
      result[type] = status;
    }
    return result;
  }

  /**
   * Get status for a specific integration
   */
  getIntegrationStatus(type: string): IntegrationStatus | undefined {
    return this.status.get(type);
  }

  /**
   * Get configuration for a specific integration
   */
  getIntegrationConfig(type: string): IntegrationConfig | undefined {
    return this.configs.get(type);
  }

  /**
   * Check if a specific integration is available and has data
   */
  isIntegrationAvailable(type: string): boolean {
    const status = this.status.get(type);
    return status?.status === 'running' && this.integrations.has(type);
  }

  /**
   * Get the current weather data (if available)
   */
  getWeatherData(): WeatherData | null {
    return this.integrations.get('weather') || null;
  }

  /**
   * Shutdown all integrations
   */
  shutdown(): void {
    for (const type of this.intervals.keys()) {
      this.stopIntegration(type);
    }
    console.log('All integrations stopped');
  }
}

// Export singleton instance
export const dataIntegrationManager = DataIntegrationManager.getInstance();