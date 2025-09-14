# MQTT Pixel Streamer

Full-stack application for creating and streaming LED display templates (128×32 pixels) via MQTT to BeagleBone Black hardware.

## Features

- 🎨 **Visual Template Editor** - Drag-and-drop interface for creating display templates
- 📡 **MQTT Streaming** - Real-time frame publishing to LED hardware
- 🎬 **Live Preview** - 4× scaled canvas preview with real-time updates
- 🔌 **WebSocket Support** - Live frame updates in the browser
- 📊 **Data Sources** - Dynamic content (time, weather, sports scores, etc.)
- 🎯 **Element Types** - Text, shapes, icons, and data fields

## Architecture

- **Backend**: Node.js/Express with TypeScript
- **Frontend**: React with Material-UI
- **Canvas Rendering**: node-canvas for server-side frame generation
- **MQTT**: mqtt.js for publishing frames
- **Real-time Updates**: WebSocket for live preview

## Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- System dependencies for canvas (automatically installed in devcontainer)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mqtt-pixel-streamer
```

2. Install dependencies:
```bash
npm install
```

3. Configure MQTT connection:
```bash
cp server/.env.example server/.env
# Edit server/.env with your MQTT broker details
```

### Running the Application

Start both server and client in development mode:

```bash
npm run dev
```

This will start:
- Backend server on http://localhost:3001
- React frontend on http://localhost:3000

### Individual Commands

```bash
# Start server only
npm run dev:server

# Start client only
npm run dev:client

# Build for production
npm run build
```

## API Endpoints

### Templates
- `GET /api/templates` - List all templates
- `GET /api/templates/:id` - Get template by ID
- `POST /api/templates` - Create new template
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template
- `POST /api/templates/:id/publish` - Publish template frame

### Preview
- `GET /api/preview/test` - Generate test frame
- `GET /api/preview/:templateId` - Get current frame for template

### Status
- `GET /api/status` - Get system status and MQTT connection info
- `GET /api/test` - Test MQTT publishing

## Frame Format

- **Resolution**: 128 × 32 pixels
- **Color format**: RGBA8888 (32 bits per pixel)
- **Total size**: 16,384 bytes
- **Data order**: Row-major, top to bottom

## Template Structure

```json
{
  "name": "My Template",
  "background": "#000000",
  "updateInterval": 1000,
  "elements": [
    {
      "id": "time",
      "type": "data",
      "position": { "x": 2, "y": 16 },
      "dataSource": "time",
      "style": {
        "color": "#00FF00",
        "fontSize": 14
      }
    }
  ]
}
```

## Development

### Project Structure

```
mqtt-pixel-streamer/
├── server/              # Backend Node.js application
│   ├── src/
│   │   ├── api/        # REST API routes
│   │   ├── mqtt/       # MQTT publisher
│   │   ├── renderer/   # Canvas rendering
│   │   └── websocket/  # WebSocket server
│   └── assets/         # Icons and fonts
├── client/             # React frontend
│   └── src/
│       ├── components/ # UI components
│       └── services/   # API clients
└── shared/             # Shared TypeScript types
```

### Adding Data Sources

To add a new data source (e.g., weather API):

1. Create a new file in `server/src/datasources/`
2. Implement the data fetching logic
3. Register it in the renderer
4. Add UI controls in the client

### Testing MQTT Publishing

Test frame publishing with curl:

```bash
# Test connection
curl http://localhost:3001/api/status

# Publish test frame
curl http://localhost:3001/api/test

# Publish template
curl -X POST http://localhost:3001/api/templates/1/publish
```

## Troubleshooting

### Canvas Installation Issues

If you encounter issues with canvas installation:

```bash
# Install system dependencies
sudo apt-get update
sudo apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

### MQTT Connection Failed

1. Check your `.env` file configuration
2. Verify MQTT broker is running
3. Check network connectivity
4. Verify credentials

## License

MIT

## Contributing

Pull requests are welcome! Please read the contributing guidelines first.

## Support

For issues and questions, please open a GitHub issue.