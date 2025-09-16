# LED Dashboard System

Dashboard system optimized for 128x64 LED displays (dual 128x32 setup).

## Quick Start

1. **Start the dashboard server:**
   ```bash
   npm run dashboards
   ```

2. **Access the weather/time dashboard:**
   - URL: `http://localhost:3002/dashboard/weather-time`
   - Display: Weather on top (32px), Time on bottom (32px)

## OBS Configuration

### Browser Source Settings:
- **URL:** `http://localhost:3002/dashboard/weather-time`
- **Width:** 128
- **Height:** 64
- **FPS:** 1-5 (recommended for dashboards)
- **Custom CSS:** None needed

### OBS Scene Setup:
1. Add Browser Source
2. Set URL and dimensions above
3. Position in your scene
4. Stream to your MQTT pixel streamer

## Weather Configuration (Optional)

Add to `.env` file:
```bash
WEATHER_API_KEY=your_openweathermap_api_key
WEATHER_LOCATION=New York,NY
```

Get API key from: https://openweathermap.org/api

## Available Dashboards

- **weather-time**: Weather (top) + Time (bottom)

## Creating New Dashboards

1. **Create HTML page:** `dashboards/pages/your-dashboard.html`
2. **Add route:** Update `dashboards/server.ts`
3. **Use LED-optimized CSS:** Include `../public/css/led-display.css`

### Template Structure:
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=128, height=64, initial-scale=1.0, user-scalable=no">
    <link rel="stylesheet" href="../public/css/led-display.css">
</head>
<body>
    <!-- Your 128x64 content here -->
    <script src="../public/js/dashboard.js"></script>
</body>
</html>
```

## Display Specifications

- **Total Size:** 128x64 pixels
- **Dual Mode:** Split into two 128x32 displays
- **Font:** Monospace, bold, no anti-aliasing
- **Colors:** High contrast (white on black)
- **Updates:** Real-time for time, 5-minute intervals for weather

## API Endpoints

- `GET /` - Dashboard info and available dashboards
- `GET /dashboard/weather-time` - Weather/time dashboard page
- `GET /api/weather` - Weather data JSON
- `GET /health` - Health check

## Development

```bash
# Development mode with auto-reload
npm run dashboards:dev

# Production mode
npm run dashboards
```

## File Structure

```
dashboards/
├── server.ts              # Express server
├── public/
│   ├── css/
│   │   └── led-display.css # LED-optimized styles
│   └── js/
│       └── dashboard.js    # Common functionality
├── pages/
│   └── weather-time.html   # Weather/time dashboard
└── README.md              # This file
```