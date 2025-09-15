import dotenv from 'dotenv';
import { MQTTConfig } from '@mqtt-pixel-streamer/shared';

dotenv.config();

export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT) : 3001,
  nodeEnv: process.env.NODE_ENV || 'development',

  mqtt: {
    broker: process.env.MQTT_BROKER || 'mqtt://192.168.1.147:1883',
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    topic: process.env.MQTT_TOPIC || 'scrollie/frame/raw/display1',
    display1Topic: process.env.MQTT_TOPIC || 'scrollie/frame/raw/display1',
    display2Topic: process.env.MQTT_TOPIC_DISPLAY2 || 'scrollie/frame/raw/display2',
    qos: 0,
  } as MQTTConfig,

  database: {
    path: process.env.DATABASE_PATH || './data.sqlite',
  },

  apis: {
    openWeatherApiKey: process.env.OPENWEATHER_API_KEY,
    sportsApiKey: process.env.SPORTS_API_KEY,
    googleCalendarApiKey: process.env.GOOGLE_CALENDAR_API_KEY,
  },
};