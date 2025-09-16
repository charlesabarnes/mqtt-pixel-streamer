import express from 'express';
import { config } from './config';
import { rtmpServer } from './rtmp/RTMPServer';
import { mqttPublisher } from './mqtt/MQTTClient';
import { frameProcessor } from './processors/FrameProcessor';

const app = express();

// Middleware
app.use(express.json());

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    mqtt: mqttPublisher.getStats(),
    rtmp: rtmpServer.getStatus(),
    processor: frameProcessor.getStatus(),
    config: {
      display: config.display,
      streamUrl: `rtmp://localhost:${config.rtmp.port}/live/${config.rtmp.streamKey}`,
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start servers
const server = app.listen(config.server.port, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                     OBS PIXEL STREAMER v2.0                      ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  🎥 OBS Configuration:                                           ║
║     Settings -> Stream                                           ║
║     Service: Custom...                                           ║
║     Server: rtmp://localhost:${config.rtmp.port}/live                        ║
║     Stream Key: ${config.rtmp.streamKey}                                     ║
║                                                                   ║
║  📐 OBS Canvas Settings:                                         ║
║     Settings -> Video                                            ║
║     Base Resolution: ${config.display.width}x${config.display.height}                               ║
║     Output Resolution: ${config.display.width}x${config.display.height}                             ║
║     FPS: 30                                                       ║
║                                                                   ║
║  📡 MQTT Output:                                                  ║
║     Broker: ${config.mqtt.broker}                    ║
║     Display 1: ${config.mqtt.display1Topic}                            ║
║     Display 2: ${config.mqtt.display2Topic}                            ║
║     Mode: ${config.display.mode}                                        ║
║     Brightness: ${config.display.brightness}%                                     ║
║                                                                   ║
║  🌐 Status API:                                                   ║
║     http://localhost:${config.server.port}/api/status                          ║
║                                                                   ║
╚══════════════════════════════════════════════════════════════════╝
  `);

  // Start RTMP server
  rtmpServer.start();
});

// Graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

function shutdown() {
  console.log('\n🛑 Shutting down gracefully...');

  frameProcessor.stopProcessing();
  rtmpServer.stop();
  mqttPublisher.disconnect();

  server.close(() => {
    console.log('👋 Server closed');
    process.exit(0);
  });

  // Force exit after 5 seconds
  setTimeout(() => {
    console.error('⚠️ Forced shutdown');
    process.exit(1);
  }, 5000);
}

export default app;