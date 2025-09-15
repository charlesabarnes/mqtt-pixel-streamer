import axios from 'axios';

const API_BASE = '/api';

export interface WeatherDataField {
  key: string;
  label: string;
  format: string;
  example: string;
}

export interface WeatherLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  enabled: boolean;
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

class WeatherService {
  async getDataFields(): Promise<WeatherDataField[]> {
    const response = await axios.get(`${API_BASE}/weather/data-fields`);
    return response.data;
  }

  async getLocations(): Promise<WeatherLocation[]> {
    const response = await axios.get(`${API_BASE}/weather/locations`);
    return response.data;
  }

  async getLocation(id: number): Promise<WeatherLocation> {
    const response = await axios.get(`${API_BASE}/weather/locations/${id}`);
    return response.data;
  }

  async createLocation(location: Omit<WeatherLocation, 'id'>): Promise<WeatherLocation> {
    const response = await axios.post(`${API_BASE}/weather/locations`, location);
    return response.data;
  }

  async updateLocation(id: number, location: Partial<WeatherLocation>): Promise<WeatherLocation> {
    const response = await axios.put(`${API_BASE}/weather/locations/${id}`, location);
    return response.data;
  }

  async deleteLocation(id: number): Promise<void> {
    await axios.delete(`${API_BASE}/weather/locations/${id}`);
  }

  async getCurrentWeather(): Promise<{ location: WeatherLocation; weather: WeatherData }> {
    const response = await axios.get(`${API_BASE}/weather/current`);
    return response.data;
  }

  async getCurrentWeatherForLocation(id: number): Promise<{ location: WeatherLocation; weather: WeatherData }> {
    const response = await axios.get(`${API_BASE}/weather/locations/${id}/current`);
    return response.data;
  }

  async testLocation(latitude: number, longitude: number): Promise<any> {
    const response = await axios.post(`${API_BASE}/weather/test-location`, {
      latitude,
      longitude,
    });
    return response.data;
  }

  async clearCache(): Promise<any> {
    const response = await axios.post(`${API_BASE}/weather/clear-cache`);
    return response.data;
  }
}

export const weatherService = new WeatherService();