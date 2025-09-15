import axios from 'axios';

export interface WeatherLocation {
  latitude: number;
  longitude: number;
  name?: string;
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

export interface MetNoForecast {
  properties: {
    timeseries: Array<{
      time: string;
      data: {
        instant: {
          details: {
            air_temperature: number;
            relative_humidity: number;
            wind_speed: number;
            wind_from_direction: number;
            air_pressure_at_sea_level: number;
            cloud_area_fraction: number;
            ultraviolet_index_clear_sky?: number;
          };
        };
        next_1_hours?: {
          summary: {
            symbol_code: string;
          };
          details: {
            precipitation_amount: number;
            probability_of_precipitation: number;
          };
        };
        next_6_hours?: {
          summary: {
            symbol_code: string;
          };
          details: {
            precipitation_amount: number;
            probability_of_precipitation: number;
          };
        };
      };
    }>;
  };
}

export class MetNoWeatherService {
  private static readonly BASE_URL = 'https://api.met.no/weatherapi/locationforecast/2.0';
  private static readonly USER_AGENT = 'mqtt-pixel-streamer/1.0 (https://github.com/yourusername/mqtt-pixel-streamer)';
  private cache = new Map<string, { data: WeatherData; expiry: number }>();

  constructor() {
    // Configure axios defaults
    axios.defaults.headers.common['User-Agent'] = MetNoWeatherService.USER_AGENT;
  }

  async getWeatherData(location: WeatherLocation): Promise<WeatherData> {
    const cacheKey = `${location.latitude},${location.longitude}`;
    const cached = this.cache.get(cacheKey);

    // Return cached data if still valid (15 minutes)
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }

    try {
      const response = await axios.get<MetNoForecast>(`${MetNoWeatherService.BASE_URL}/complete`, {
        params: {
          lat: location.latitude,
          lon: location.longitude,
        },
        headers: {
          'User-Agent': MetNoWeatherService.USER_AGENT,
        },
        timeout: 10000,
      });

      const weatherData = this.parseWeatherData(response.data, location);

      // Cache for 15 minutes
      this.cache.set(cacheKey, {
        data: weatherData,
        expiry: Date.now() + 15 * 60 * 1000,
      });

      return weatherData;
    } catch (error) {
      console.error('Failed to fetch weather data from met.no:', error);

      // Return cached data if available, even if expired
      if (cached) {
        console.warn('Using expired weather data due to API error');
        return cached.data;
      }

      throw new Error('Failed to fetch weather data and no cached data available');
    }
  }

  private parseWeatherData(forecast: MetNoForecast, location: WeatherLocation): WeatherData {
    const current = forecast.properties.timeseries[0];
    if (!current) {
      throw new Error('No weather data available in forecast');
    }

    const details = current.data.instant.details;
    const next1h = current.data.next_1_hours;
    const next6h = current.data.next_6_hours;

    // Use next_1_hours if available, otherwise next_6_hours
    const precipitationData = next1h || next6h;
    const symbolCode = precipitationData?.summary.symbol_code || 'clearsky_day';

    // Calculate sunrise/sunset (simplified calculation)
    const { sunrise, sunset } = this.calculateSunriseSunset(location.latitude, location.longitude);

    return {
      temperature: Math.round((details.air_temperature * 9/5) + 32), // Convert Celsius to Fahrenheit
      humidity: Math.round(details.relative_humidity),
      condition: this.symbolCodeToCondition(symbolCode),
      conditionCode: symbolCode,
      windSpeed: Math.round(details.wind_speed * 2.237), // m/s to mph
      windDirection: Math.round(details.wind_from_direction),
      pressure: Math.round(details.air_pressure_at_sea_level),
      cloudCoverage: Math.round(details.cloud_area_fraction),
      precipitation: precipitationData?.details.precipitation_amount || 0,
      precipitationProbability: precipitationData?.details.probability_of_precipitation || 0,
      uvIndex: details.ultraviolet_index_clear_sky,
      sunrise,
      sunset,
      lastUpdated: new Date(),
    };
  }

  private symbolCodeToCondition(symbolCode: string): string {
    const conditionMap: Record<string, string> = {
      'clearsky_day': 'Clear',
      'clearsky_night': 'Clear',
      'fair_day': 'Fair',
      'fair_night': 'Fair',
      'partlycloudy_day': 'Partly Cloudy',
      'partlycloudy_night': 'Partly Cloudy',
      'cloudy': 'Cloudy',
      'rainshowers_day': 'Rain Showers',
      'rainshowers_night': 'Rain Showers',
      'rain': 'Rain',
      'lightrain': 'Light Rain',
      'heavyrain': 'Heavy Rain',
      'snow': 'Snow',
      'snowshowers_day': 'Snow Showers',
      'snowshowers_night': 'Snow Showers',
      'fog': 'Fog',
      'sleet': 'Sleet',
      'thunderstorm': 'Thunderstorm',
    };

    // Remove time suffix (_day, _night) and polartwilight prefixes
    const baseCode = symbolCode.replace(/_day|_night$/, '').replace(/^polartwilight_/, '');
    return conditionMap[baseCode] || conditionMap[symbolCode] || 'Unknown';
  }

  private calculateSunriseSunset(latitude: number, longitude: number): { sunrise: Date; sunset: Date } {
    // Simplified sunrise/sunset calculation
    // For production, consider using a library like 'suncalc'
    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);

    // Very simplified calculation - assumes 6 AM sunrise, 6 PM sunset
    // This should be replaced with proper solar calculation
    const sunrise = new Date(now);
    sunrise.setHours(6, 0, 0, 0);

    const sunset = new Date(now);
    sunset.setHours(18, 0, 0, 0);

    return { sunrise, sunset };
  }

  async testConnection(location: WeatherLocation): Promise<boolean> {
    try {
      await this.getWeatherData(location);
      return true;
    } catch (error) {
      console.error('Weather service connection test failed:', error);
      return false;
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  static getSymbolIconUrl(symbolCode: string): string {
    return `https://api.met.no/images/weathericons/svg/${symbolCode}.svg`;
  }
}

// Singleton instance
export const metNoWeatherService = new MetNoWeatherService();