import express from 'express';
import path from 'path';
import { config } from '../src/config';

const app = express();
const DASHBOARD_PORT = 3002;

// Middleware for CORS (needed for OBS Browser Source)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
});

// Serve static files
app.use('/public', express.static(path.join(__dirname, 'public')));

// Dashboard routes
app.get('/dashboard/weather-time', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'weather-time.html'));
});

// Weather API endpoint
app.get('/api/weather', async (req, res) => {
  try {
    // Get weather data from OpenWeatherMap or similar service
    const weatherData = await getWeatherData();
    res.json(weatherData);
  } catch (error) {
    console.error('Weather API error:', error);
    res.status(500).json({
      error: 'Failed to fetch weather data',
      temperature: 0,
      condition: 'unknown',
      description: 'ERROR'
    });
  }
});

// Health check for dashboard server
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'dashboard-server',
    timestamp: new Date().toISOString()
  });
});

// Default route - list available dashboards
app.get('/', (req, res) => {
  res.json({
    service: 'LED Dashboard Server',
    version: '1.0.0',
    dashboards: [
      {
        name: 'Weather & Time',
        url: `/dashboard/weather-time`,
        description: 'Weather info (top) and current time (bottom)'
      }
    ],
    display: {
      width: 128,
      height: 64,
      mode: 'dual',
      sections: {
        top: '128x32 - Weather',
        bottom: '128x32 - Time'
      }
    }
  });
});

// Mock weather function - replace with real API
async function getWeatherData() {
  // For now, return mock data
  // TODO: Integrate with OpenWeatherMap API using environment variables
  const mockWeather = {
    temperature: 72,
    condition: 'clear',
    description: 'CLEAR',
    humidity: 45,
    windSpeed: 5
  };

  // If weather API key is configured, fetch real data
  if (process.env.WEATHER_API_KEY) {
    try {
      return await fetchRealWeatherData();
    } catch (error) {
      console.warn('Failed to fetch real weather, using mock data:', error instanceof Error ? error.message : String(error));
    }
  }

  return mockWeather;
}

// Real weather API integration (placeholder)
async function fetchRealWeatherData() {
  const apiKey = process.env.WEATHER_API_KEY;
  const location = process.env.WEATHER_LOCATION || 'New York,NY';

  if (!apiKey) {
    throw new Error('Weather API key not configured');
  }

  // OpenWeatherMap API example
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=imperial`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Weather API responded with status: ${response.status}`);
  }

  const data: any = await response.json();

  return {
    temperature: data.main.temp,
    condition: data.weather[0].main.toLowerCase(),
    description: data.weather[0].description.toUpperCase(),
    humidity: data.main.humidity,
    windSpeed: data.wind.speed
  };
}

// Start dashboard server
const server = app.listen(DASHBOARD_PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                     LED DASHBOARD SERVER                         ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  🖥️ Dashboard URL:                                               ║
║     http://localhost:${DASHBOARD_PORT}/dashboard/weather-time                ║
║                                                                   ║
║  📐 Display Configuration:                                       ║
║     Canvas Size: 128x64 pixels                                   ║
║     Top Section (32px): Weather                                   ║
║     Bottom Section (32px): Time                                   ║
║                                                                   ║
║  🎥 OBS Browser Source Settings:                                 ║
║     URL: http://localhost:${DASHBOARD_PORT}/dashboard/weather-time           ║
║     Width: 128                                                    ║
║     Height: 64                                                    ║
║     FPS: 1-5 (recommended)                                        ║
║                                                                   ║
║  🌤️ Weather Configuration (optional):                            ║
║     WEATHER_API_KEY=your_openweathermap_key                       ║
║     WEATHER_LOCATION=City,State                                   ║
║                                                                   ║
╚══════════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Dashboard server shutting down...');
  server.close(() => {
    console.log('👋 Dashboard server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 Dashboard server shutting down...');
  server.close(() => {
    console.log('👋 Dashboard server closed');
    process.exit(0);
  });
});

export default app;