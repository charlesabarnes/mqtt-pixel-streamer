import mqtt, { MqttClient } from 'mqtt';
import { config } from '../config';

export class MQTTPublisher {
  private client: MqttClient | null = null;
  private connected: boolean = false;
  private frameCount: number = 0;
  private lastPublishTime: number = Date.now();

  constructor() {
    this.connect();
  }

  private connect(): void {
    console.log('📡 Connecting to MQTT broker:', config.mqtt.broker);

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
      console.error('❌ MQTT error:', error);
      this.connected = false;
    });

    this.client.on('offline', () => {
      console.log('🔌 MQTT client offline');
      this.connected = false;
    });

    this.client.on('reconnect', () => {
      console.log('🔄 Reconnecting to MQTT broker...');
    });
  }

  public publishFrame(frameData: Buffer, displayId: 'display1' | 'display2' = 'display1', isDualMode: boolean = false): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.connected) {
        reject(new Error('MQTT client not connected'));
        return;
      }

      // In dual mode, each display gets half the configured height
      const displayHeight = isDualMode ? config.display.height / 2 : config.display.height;
      const expectedSize = config.display.width * displayHeight * 4; // RGBA
      if (frameData.length !== expectedSize) {
        reject(new Error(`Invalid frame size: ${frameData.length} bytes (expected ${expectedSize})`));
        return;
      }

      const topic = displayId === 'display1' ? config.mqtt.display1Topic : config.mqtt.display2Topic;

      this.client.publish(
        topic,
        frameData,
        { qos: config.mqtt.qos },
        (error) => {
          if (error) {
            console.error(`❌ Failed to publish frame to ${displayId}:`, error);
            reject(error);
          } else {
            this.frameCount++;
            const now = Date.now();
            if (now - this.lastPublishTime > 1000) {
              console.log(`📊 Published ${this.frameCount} frames (${Math.round(this.frameCount / ((now - this.lastPublishTime) / 1000))} fps)`);
              this.frameCount = 0;
              this.lastPublishTime = now;
            }
            resolve();
          }
        }
      );
    });
  }

  public publishDualFrames(display1Data: Buffer, display2Data: Buffer): Promise<void[]> {
    return Promise.all([
      this.publishFrame(display1Data, 'display1', true),
      this.publishFrame(display2Data, 'display2', true)
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
      console.log('👋 MQTT client disconnected');
    }
  }

  public getStats() {
    return {
      connected: this.connected,
      broker: config.mqtt.broker,
      frameCount: this.frameCount,
    };
  }
}

export const mqttPublisher = new MQTTPublisher();