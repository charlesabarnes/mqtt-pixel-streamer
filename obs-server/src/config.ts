import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  mqtt: {
    broker: process.env.MQTT_BROKER || 'mqtt://localhost:1883',
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    display1Topic: process.env.MQTT_TOPIC_DISPLAY1 || 'led/display1',
    display2Topic: process.env.MQTT_TOPIC_DISPLAY2 || 'led/display2',
    qos: 1 as 0 | 1 | 2,
  },
  rtmp: {
    port: parseInt(process.env.RTMP_PORT || '1935'),
    httpPort: parseInt(process.env.HTTP_PORT || '8000'),
    mediaRoot: process.env.MEDIA_ROOT || '/tmp/obs-stream',
    streamKey: process.env.STREAM_KEY || 'pixelmatrix',
  },
  display: {
    width: parseInt(process.env.CANVAS_WIDTH || '128'),
    height: parseInt(process.env.CANVAS_HEIGHT || '32'),
    mode: process.env.DISPLAY_MODE || 'single', // 'single' or 'dual'
    brightness: parseInt(process.env.BRIGHTNESS || '50'),
  },
  server: {
    port: parseInt(process.env.PORT || '3001'),
  }
};