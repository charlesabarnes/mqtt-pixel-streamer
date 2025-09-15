import express from 'express';
import cors from 'cors';
import http from 'http';
import { config } from './config';
import { websocketServer } from './websocket/WebSocketServer';
import { mqttPublisher } from './mqtt/MQTTClient';
import { canvasRenderer } from './renderer/CanvasRenderer';
import { dataIntegrationManager } from './services/DataIntegrationManager';

// Import routes
import templatesRouter from './api/routes/templates';
import previewRouter from './api/routes/preview';
import statusRouter from './api/routes/status';
import weatherRouter from './api/routes/weather';

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/templates', templatesRouter);
app.use('/api/preview', previewRouter);
app.use('/api/status', statusRouter);
app.use('/api/weather', weatherRouter);

// Initialize WebSocket server
websocketServer.initialize(server);

// Initialize data integrations
const defaultWeatherLocation = {
  latitude: 40.7128,
  longitude: -74.0060,
  name: 'Default Location',
};

// Start weather integration with 15-minute updates
dataIntegrationManager.startWeatherIntegration(defaultWeatherLocation, 900000);

// Test endpoint
app.get('/api/test', async (req, res) => {
  try {
    // Generate test frame
    const frameData = await canvasRenderer.renderTestFrame();

    // Publish to MQTT
    await mqttPublisher.publishFrame(frameData);

    // Broadcast to WebSocket clients
    websocketServer.broadcastFrame(frameData);

    res.json({
      success: true,
      message: 'Test frame published',
      mqttConnected: mqttPublisher.isConnected(),
      frameSize: frameData.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
server.listen(config.port, () => {
  console.log(`
🚀 MQTT Pixel Streamer Server
   Port: ${config.port}
   Environment: ${config.nodeEnv}
   MQTT Broker: ${config.mqtt.broker}
   MQTT Topic: ${config.mqtt.topic}

   API Endpoints:
   - GET  /api/status
   - GET  /api/test
   - GET  /api/templates
   - POST /api/templates/:id/publish
   - GET  /api/preview/test
   - GET  /api/weather/current
   - GET  /api/weather/locations
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  dataIntegrationManager.shutdown();
  mqttPublisher.disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});