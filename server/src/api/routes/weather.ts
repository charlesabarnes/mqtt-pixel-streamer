import { Router, Request, Response } from 'express';
import { metNoWeatherService, WeatherLocation } from '../../services/MetNoWeatherService';

const router = Router();

// In-memory storage for weather locations (will be replaced with SQLite)
let weatherLocations: Array<WeatherLocation & { id: number; name: string; enabled: boolean }> = [
  {
    id: 1,
    name: 'Default Location',
    latitude: 40.7128,
    longitude: -74.0060,
    enabled: true,
  },
];

// Get all weather locations
router.get('/locations', (req: Request, res: Response) => {
  res.json(weatherLocations);
});

// Get weather location by ID
router.get('/locations/:id', (req: Request, res: Response) => {
  const location = weatherLocations.find(l => l.id === parseInt(req.params.id));
  if (!location) {
    return res.status(404).json({ error: 'Weather location not found' });
  }
  res.json(location);
});

// Create new weather location
router.post('/locations', async (req: Request, res: Response) => {
  try {
    const { name, latitude, longitude, enabled = true } = req.body;

    if (!name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: name, latitude, longitude'
      });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        error: 'Invalid coordinates. Latitude must be -90 to 90, longitude -180 to 180'
      });
    }

    const newLocation = {
      id: weatherLocations.length + 1,
      name,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      enabled,
    };

    // Test the connection
    const testLocation = { latitude: newLocation.latitude, longitude: newLocation.longitude };
    const isValid = await metNoWeatherService.testConnection(testLocation);

    if (!isValid) {
      return res.status(400).json({
        error: 'Unable to fetch weather data for this location'
      });
    }

    weatherLocations.push(newLocation);
    res.status(201).json(newLocation);
  } catch (error) {
    console.error('Error creating weather location:', error);
    res.status(500).json({
      error: 'Failed to create weather location',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update weather location
router.put('/locations/:id', async (req: Request, res: Response) => {
  try {
    const locationId = parseInt(req.params.id);
    const index = weatherLocations.findIndex(l => l.id === locationId);

    if (index === -1) {
      return res.status(404).json({ error: 'Weather location not found' });
    }

    const { name, latitude, longitude, enabled } = req.body;
    const currentLocation = weatherLocations[index];

    // Validate coordinates if provided
    if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
      return res.status(400).json({ error: 'Invalid latitude. Must be -90 to 90' });
    }
    if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
      return res.status(400).json({ error: 'Invalid longitude. Must be -180 to 180' });
    }

    const updatedLocation = {
      ...currentLocation,
      ...(name !== undefined && { name }),
      ...(latitude !== undefined && { latitude: parseFloat(latitude) }),
      ...(longitude !== undefined && { longitude: parseFloat(longitude) }),
      ...(enabled !== undefined && { enabled }),
    };

    // Test connection if coordinates changed
    if (latitude !== undefined || longitude !== undefined) {
      const testLocation = {
        latitude: updatedLocation.latitude,
        longitude: updatedLocation.longitude
      };
      const isValid = await metNoWeatherService.testConnection(testLocation);

      if (!isValid) {
        return res.status(400).json({
          error: 'Unable to fetch weather data for updated coordinates'
        });
      }
    }

    weatherLocations[index] = updatedLocation;
    res.json(updatedLocation);
  } catch (error) {
    console.error('Error updating weather location:', error);
    res.status(500).json({
      error: 'Failed to update weather location',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete weather location
router.delete('/locations/:id', (req: Request, res: Response) => {
  const locationId = parseInt(req.params.id);
  const index = weatherLocations.findIndex(l => l.id === locationId);

  if (index === -1) {
    return res.status(404).json({ error: 'Weather location not found' });
  }

  weatherLocations.splice(index, 1);
  res.status(204).send();
});

// Get current weather data for a location
router.get('/locations/:id/current', async (req: Request, res: Response) => {
  try {
    const locationId = parseInt(req.params.id);
    const location = weatherLocations.find(l => l.id === locationId);

    if (!location) {
      return res.status(404).json({ error: 'Weather location not found' });
    }

    if (!location.enabled) {
      return res.status(400).json({ error: 'Weather location is disabled' });
    }

    const weatherData = await metNoWeatherService.getWeatherData({
      latitude: location.latitude,
      longitude: location.longitude,
      name: location.name,
    });

    res.json({
      location: {
        id: location.id,
        name: location.name,
        latitude: location.latitude,
        longitude: location.longitude,
      },
      weather: weatherData,
    });
  } catch (error) {
    console.error('Error fetching current weather:', error);
    res.status(500).json({
      error: 'Failed to fetch weather data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get weather data for default/first enabled location
router.get('/current', async (req: Request, res: Response) => {
  try {
    const enabledLocation = weatherLocations.find(l => l.enabled);

    if (!enabledLocation) {
      return res.status(404).json({
        error: 'No enabled weather locations found. Please add a location first.'
      });
    }

    const weatherData = await metNoWeatherService.getWeatherData({
      latitude: enabledLocation.latitude,
      longitude: enabledLocation.longitude,
      name: enabledLocation.name,
    });

    res.json({
      location: {
        id: enabledLocation.id,
        name: enabledLocation.name,
        latitude: enabledLocation.latitude,
        longitude: enabledLocation.longitude,
      },
      weather: weatherData,
    });
  } catch (error) {
    console.error('Error fetching current weather:', error);
    res.status(500).json({
      error: 'Failed to fetch weather data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test connection to a location (without saving)
router.post('/test-location', async (req: Request, res: Response) => {
  try {
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: latitude, longitude'
      });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        error: 'Invalid coordinates. Latitude must be -90 to 90, longitude -180 to 180'
      });
    }

    const testLocation = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    };

    const weatherData = await metNoWeatherService.getWeatherData(testLocation);

    res.json({
      success: true,
      message: 'Successfully connected to weather service',
      sampleData: {
        temperature: weatherData.temperature,
        condition: weatherData.condition,
        humidity: weatherData.humidity,
      },
    });
  } catch (error) {
    console.error('Weather service test failed:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to connect to weather service',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Clear weather cache
router.post('/clear-cache', (req: Request, res: Response) => {
  metNoWeatherService.clearCache();
  res.json({
    success: true,
    message: 'Weather cache cleared successfully'
  });
});

// Get available weather data fields for template configuration
router.get('/data-fields', (req: Request, res: Response) => {
  const fields = [
    { key: 'weather.temperature', label: 'Temperature', format: '##°F', example: '72°F' },
    { key: 'weather.humidity', label: 'Humidity', format: '##%', example: '65%' },
    { key: 'weather.condition', label: 'Condition', format: 'text', example: 'Partly Cloudy' },
    { key: 'weather.conditionCode', label: 'Condition Code', format: 'text', example: 'partlycloudy_day' },
    { key: 'weather.windSpeed', label: 'Wind Speed', format: '## mph', example: '5 mph' },
    { key: 'weather.windDirection', label: 'Wind Direction', format: '##°', example: '245°' },
    { key: 'weather.pressure', label: 'Pressure', format: '## hPa', example: '1013 hPa' },
    { key: 'weather.cloudCoverage', label: 'Cloud Coverage', format: '##%', example: '30%' },
    { key: 'weather.precipitation', label: 'Precipitation', format: '## mm', example: '0.5 mm' },
    { key: 'weather.precipitationProbability', label: 'Rain Probability', format: '##%', example: '20%' },
    { key: 'weather.uvIndex', label: 'UV Index', format: '##', example: '3' },
    { key: 'weather.sunrise', label: 'Sunrise', format: 'time', example: '06:30' },
    { key: 'weather.sunset', label: 'Sunset', format: 'time', example: '18:45' },
  ];

  res.json(fields);
});

export default router;