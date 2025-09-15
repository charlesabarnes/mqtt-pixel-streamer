import mqtt, { MqttClient } from 'mqtt';
import { config } from '../config';
import { Frame, FRAME_SIZE } from '@mqtt-pixel-streamer/shared';

export class MQTTPublisher {
  private client: MqttClient | null = null;
  private connected: boolean = false;

  constructor() {
    this.connect();
  }

  private connect(): void {
    console.log('Connecting to MQTT broker:', config.mqtt.broker);

    this.client = mqtt.connect(config.mqtt.broker, {
      username: config.mqtt.username,
      password: config.mqtt.password,
      reconnectPeriod: 5000,
    });

    this.client.on('connect', () => {
      console.log('✅ Connected to MQTT broker');
      this.connected = true;
    });

    this.client.on('error', (error) => {
      console.error('MQTT error:', error);
      this.connected = false;
    });

    this.client.on('offline', () => {
      console.log('MQTT client offline');
      this.connected = false;
    });

    this.client.on('reconnect', () => {
      console.log('Reconnecting to MQTT broker...');
    });
  }

  public publishFrame(frameData: Buffer, displayId: 'display1' | 'display2' = 'display1'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.connected) {
        reject(new Error('MQTT client not connected'));
        return;
      }

      if (frameData.length !== FRAME_SIZE) {
        reject(new Error(`Invalid frame size: ${frameData.length} bytes (expected ${FRAME_SIZE})`));
        return;
      }

      const topic = displayId === 'display1' ? config.mqtt.display1Topic : config.mqtt.display2Topic;

      this.client.publish(
        topic,
        frameData,
        { qos: config.mqtt.qos },
        (error) => {
          if (error) {
            console.error(`Failed to publish frame to ${displayId}:`, error);
            reject(error);
          } else {
            console.log(`Published frame to ${displayId}: ${frameData.length} bytes`);
            resolve();
          }
        }
      );
    });
  }

  public publishFrameToBothDisplays(display1Data: Buffer, display2Data: Buffer): Promise<void[]> {
    return Promise.all([
      this.publishFrame(display1Data, 'display1'),
      this.publishFrame(display2Data, 'display2')
    ]);
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public disconnect(): void {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.connected = false;
    }
  }
}

export const mqttPublisher = new MQTTPublisher();