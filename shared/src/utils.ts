export interface DataFormatOptions {
  format?: string;
  locale?: string;
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
   */
  static getCurrentDataValues(): Record<string, any> {
    return {
      time: new Date(),
      date: new Date(),
      weather: {
        temp: 72,
        condition: 'Sunny'
      }
    };
  }
}