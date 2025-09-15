export interface DataFormatOptions {
  format?: string;
  locale?: string;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  condition: string;
  conditionCode: string;
  windSpeed: number;
  windDirection: number;
  pressure: number;
  cloudCoverage: number;
  precipitation: number;
  precipitationProbability: number;
  uvIndex?: number;
  sunrise: Date;
  sunset: Date;
  lastUpdated: Date;
}

export class DataFormatter {
  /**
   * Get data value from a data source string, supporting nested object access
   */
  static getDataValue(dataSource: string, dataValues?: Record<string, any>): any {
    if (!dataValues) return dataSource;

    const parts = dataSource.split('.');
    let value: any = dataValues;

    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) return dataSource;
    }

    return value;
  }

  /**
   * Format a value according to its type and format specification
   */
  static formatValue(value: any, format?: string): string {
    if (!format) {
      // Default formatting for common data types
      if (value instanceof Date) {
        return this.formatTime(value);
      }
      return String(value);
    }

    // Handle specific format patterns
    if (format === 'time' && value instanceof Date) {
      return this.formatTime(value);
    }

    if (format === 'date' && value instanceof Date) {
      return this.formatDate(value);
    }

    if (format === 'HH:MM' && value instanceof Date) {
      return this.formatTime(value, false); // without seconds
    }

    if (format.includes('°F') && typeof value === 'number') {
      return `${value}°F`;
    }

    if (format.includes('°C') && typeof value === 'number') {
      return `${value}°C`;
    }

    if (format.includes('%') && typeof value === 'number') {
      return `${value}%`;
    }

    if (format.includes('mph') && typeof value === 'number') {
      return `${value} mph`;
    }

    if (format.includes('hPa') && typeof value === 'number') {
      return `${value} hPa`;
    }

    if (format.includes('mm') && typeof value === 'number') {
      return `${value} mm`;
    }

    return String(value);
  }

  /**
   * Format time consistently across frontend and backend
   */
  static formatTime(date: Date, includeSeconds: boolean = true): string {
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };

    if (includeSeconds) {
      options.second = '2-digit';
    }

    return date.toLocaleTimeString('en-US', options);
  }

  /**
   * Format date consistently across frontend and backend
   */
  static formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Process data elements for rendering - handles both direct values and nested data
   */
  static processDataElement(
    dataSource: string,
    dataValues?: Record<string, any>,
    format?: string
  ): string {
    // First get the raw value
    let value: any;

    // Handle special built-in data sources
    switch (dataSource) {
      case 'time':
        value = new Date();
        format = format || 'time';
        break;
      case 'date':
        value = new Date();
        format = format || 'date';
        break;
      default:
        // Handle nested data access
        value = this.getDataValue(dataSource, dataValues);
        break;
    }

    // Format the value
    return this.formatValue(value, format);
  }

  /**
   * Get current data values for template rendering
   * @deprecated Use DataIntegrationManager.getCurrentDataValues() instead for server-side rendering
   */
  static getCurrentDataValues(weatherData?: WeatherData): Record<string, any> {
    const baseData = {
      time: new Date(),
      date: new Date(),
    };

    if (weatherData) {
      return {
        ...baseData,
        weather: {
          temperature: weatherData.temperature,
          humidity: weatherData.humidity,
          condition: weatherData.condition,
          conditionCode: weatherData.conditionCode,
          windSpeed: weatherData.windSpeed,
          windDirection: weatherData.windDirection,
          pressure: weatherData.pressure,
          cloudCoverage: weatherData.cloudCoverage,
          precipitation: weatherData.precipitation,
          precipitationProbability: weatherData.precipitationProbability,
          uvIndex: weatherData.uvIndex,
          sunrise: weatherData.sunrise,
          sunset: weatherData.sunset,
          lastUpdated: weatherData.lastUpdated,
        }
      };
    }

    // Fallback mock data for development/testing (temperatures in Fahrenheit)
    return {
      ...baseData,
      weather: {
        temperature: 72, // Already in Fahrenheit
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
}