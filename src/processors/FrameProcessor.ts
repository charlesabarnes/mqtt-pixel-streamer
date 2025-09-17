import ffmpeg from 'fluent-ffmpeg';
import { config } from '../config';
import { mqttPublisher } from '../mqtt/MQTTClient';
import { Readable } from 'stream';
import path from 'path';

export class FrameProcessor {
  private ffmpegCommand: ffmpeg.FfmpegCommand | null = null;
  private isProcessing: boolean = false;
  private frameBuffer: Buffer = Buffer.alloc(0);
  private expectedFrameSize: number;
  private processedFrames: number = 0;
  private lastStatsTime: number = Date.now();

  constructor() {
    this.expectedFrameSize = config.display.width * config.display.height * 4; // RGBA
  }

  public startProcessing(streamPath: string): void {
    if (this.isProcessing) {
      console.log('⚠️ Frame processing already running');
      return;
    }

    const rtmpUrl = `rtmp://localhost:${config.rtmp.port}${streamPath}`;
    console.log(`🎬 Starting frame extraction from: ${rtmpUrl}`);

    this.isProcessing = true;
    this.processedFrames = 0;
    this.lastStatsTime = Date.now();

    // Create ffmpeg command to extract raw frames
    this.ffmpegCommand = ffmpeg(rtmpUrl)
      .inputOptions([
        '-fflags', 'nobuffer',
        '-flags', 'low_delay',
        '-strict', 'experimental',
      ])
      .outputOptions([
        '-f', 'rawvideo',
        '-pix_fmt', 'rgba',
        '-s', `${config.display.width}x${config.display.height}`,
        '-r', '75', // Target 75 fps
      ])
      .on('start', (commandLine) => {
        console.log('🚀 FFmpeg started:', commandLine);
      })
      .on('codecData', (data) => {
        console.log('📹 Input stream codec data:', data);
      })
      .on('error', (err) => {
        console.error('❌ FFmpeg error:', err.message);
        this.stopProcessing();
      })
      .on('end', () => {
        console.log('✅ FFmpeg processing finished');
        this.stopProcessing();
      });

    // Pipe to stdout and process raw frames
    const stream = this.ffmpegCommand.pipe() as Readable;

    stream.on('data', (chunk: Buffer) => {
      this.processChunk(chunk);
    });

    stream.on('error', (err) => {
      console.error('❌ Stream error:', err);
      this.stopProcessing();
    });
  }

  private processChunk(chunk: Buffer): void {
    // Append chunk to frame buffer
    this.frameBuffer = Buffer.concat([this.frameBuffer, chunk]);

    // Process complete frames
    while (this.frameBuffer.length >= this.expectedFrameSize) {
      // Extract one complete frame
      const frame = this.frameBuffer.slice(0, this.expectedFrameSize);
      this.frameBuffer = this.frameBuffer.slice(this.expectedFrameSize);

      // Process the frame
      this.processFrame(frame);
    }
  }

  private processFrame(frame: Buffer): void {
    // Apply brightness adjustment
    const processedFrame = this.applyBrightness(frame, config.display.brightness);

    // Swap red and blue channels (RGBA to BGRA) if needed for LED matrix
    const finalFrame = processedFrame;

    // Publish frame based on display mode
    if (config.display.mode === 'dual') {
      // Split frame into two displays (top and bottom halves)
      const halfHeight = config.display.height / 2;
      const halfSize = config.display.width * halfHeight * 4;

      const display1Frame = Buffer.alloc(halfSize);
      const display2Frame = Buffer.alloc(halfSize);

      // Copy top half to display1
      for (let y = 0; y < halfHeight; y++) {
        const sourceOffset = y * config.display.width * 4;
        const destOffset = y * config.display.width * 4;
        finalFrame.copy(display1Frame, destOffset, sourceOffset, sourceOffset + config.display.width * 4);
      }

      // Copy bottom half to display2
      for (let y = 0; y < halfHeight; y++) {
        const sourceOffset = (y + halfHeight) * config.display.width * 4;
        const destOffset = y * config.display.width * 4;
        finalFrame.copy(display2Frame, destOffset, sourceOffset, sourceOffset + config.display.width * 4);
      }

      mqttPublisher.publishDualFrames(display1Frame, display2Frame).catch(err => {
        console.error('Failed to publish dual frames:', err);
      });
    } else {
      // Single display mode
      mqttPublisher.publishFrame(finalFrame, 'display1').catch(err => {
        console.error('Failed to publish frame:', err);
      });
    }

    this.processedFrames++;
    this.logStats();
  }

  private applyBrightness(buffer: Buffer, brightness: number): Buffer {
    const adjusted = Buffer.from(buffer);
    const factor = brightness / 100;

    for (let i = 0; i < adjusted.length; i += 4) {
      adjusted[i] = Math.round(adjusted[i] * factor);       // R
      adjusted[i + 1] = Math.round(adjusted[i + 1] * factor); // G
      adjusted[i + 2] = Math.round(adjusted[i + 2] * factor); // B
      // Alpha channel (i + 3) remains unchanged
    }

    return adjusted;
  }

  private swapRedBlueChannels(buffer: Buffer): Buffer {
    const swapped = Buffer.from(buffer);

    for (let i = 0; i < swapped.length; i += 4) {
      const red = swapped[i];
      const blue = swapped[i + 2];
      swapped[i] = blue;     // Put blue in red position
      swapped[i + 2] = red;  // Put red in blue position
      // Green (i + 1) and Alpha (i + 3) remain unchanged
    }

    return swapped;
  }

  private logStats(): void {
    const now = Date.now();
    const elapsed = (now - this.lastStatsTime) / 1000;

    if (elapsed >= 5) { // Log stats every 5 seconds
      const fps = Math.round(this.processedFrames / elapsed);
      console.log(`📊 Processing stats: ${fps} fps, ${this.processedFrames} total frames`);
      this.processedFrames = 0;
      this.lastStatsTime = now;
    }
  }

  public stopProcessing(): void {
    if (this.ffmpegCommand) {
      this.ffmpegCommand.kill('SIGKILL');
      this.ffmpegCommand = null;
    }

    this.isProcessing = false;
    this.frameBuffer = Buffer.alloc(0);
    console.log('⏹️ Frame processing stopped');
  }

  public getStatus() {
    return {
      isProcessing: this.isProcessing,
      bufferSize: this.frameBuffer.length,
      expectedFrameSize: this.expectedFrameSize,
    };
  }
}

export const frameProcessor = new FrameProcessor();