import { Router, Request, Response } from 'express';
import { mqttPublisher } from '../../mqtt/MQTTClient';

const router = Router();

// Get system status
router.get('/', (req: Request, res: Response) => {
  res.json({
    server: 'running',
    mqtt: {
      connected: mqttPublisher.isConnected(),
      broker: process.env.MQTT_BROKER,
      topic: process.env.MQTT_TOPIC
    },
    display: {
      width: 128,
      height: 32,
      format: 'RGBA8888',
      frameSize: 16384
    },
    timestamp: Date.now()
  });
});

export default router;