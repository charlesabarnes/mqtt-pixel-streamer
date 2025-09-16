// Common Dashboard Functionality for LED Display

class LEDDashboard {
  constructor() {
    this.updateInterval = null;
    this.weatherData = null;
    this.lastWeatherUpdate = 0;
    this.weatherUpdateInterval = 300000; // 5 minutes
  }

  // Initialize the dashboard
  init() {
    this.updateTime();
    this.updateWeather();

    // Update time every second
    this.updateInterval = setInterval(() => {
      this.updateTime();

      // Update weather every 5 minutes
      if (Date.now() - this.lastWeatherUpdate > this.weatherUpdateInterval) {
        this.updateWeather();
      }
    }, 1000);

    console.log('LED Dashboard initialized');
  }

  // Update time display
  updateTime() {
    const now = new Date();
    const timeElement = document.querySelector('.time-display');

    if (timeElement) {
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      timeElement.textContent = `${hours}:${minutes}`;
    }
  }

  // Update weather data
  async updateWeather() {
    try {
      const response = await fetch('/api/weather');

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      this.weatherData = await response.json();
      this.displayWeather();
      this.lastWeatherUpdate = Date.now();

    } catch (error) {
      console.error('Failed to update weather:', error);
      this.displayWeatherError();
    }
  }

  // Display weather information
  displayWeather() {
    if (!this.weatherData) return;

    const tempElement = document.querySelector('.weather-temp');

    if (tempElement) {
      const temp = Math.round(this.weatherData.temperature);
      tempElement.textContent = `${temp}°`;
    }
  }

  // Display weather error
  displayWeatherError() {
    const tempElement = document.querySelector('.weather-temp');

    if (tempElement) tempElement.textContent = '--°';
  }

  // Get CSS class for weather icon
  getWeatherIconClass(condition) {
    const conditionMap = {
      'clear': 'weather-clear',
      'clouds': 'weather-clouds',
      'rain': 'weather-rain',
      'snow': 'weather-snow',
      'thunderstorm': 'weather-thunderstorm',
      'drizzle': 'weather-drizzle',
      'mist': 'weather-mist',
      'fog': 'weather-mist',
      'haze': 'weather-mist'
    };

    return conditionMap[condition.toLowerCase()] || 'weather-clouds';
  }

  // Cleanup when dashboard is destroyed
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // Utility function to format temperature
  static formatTemperature(temp, unit = 'F') {
    const rounded = Math.round(temp);
    return `${rounded}°${unit}`;
  }

  // Utility function to get time with AM/PM
  static formatTime12Hour(date = new Date()) {
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes}${ampm}`;
  }

  // Utility function to get 24-hour time
  static formatTime24Hour(date = new Date()) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  window.dashboard = new LEDDashboard();
  window.dashboard.init();
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
  if (window.dashboard) {
    window.dashboard.destroy();
  }
});