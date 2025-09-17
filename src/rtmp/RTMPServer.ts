import NodeMediaServer from 'node-media-server';
import { config } from '../config';
import { frameProcessor } from '../processors/FrameProcessor';
import path from 'path';
import fs from 'fs';

export class RTMPServer {
  private nms: NodeMediaServer;
  private isStreaming: boolean = false;

  constructor() {
    // Ensure media root directory exists
    if (!fs.existsSync(config.rtmp.mediaRoot)) {
      fs.mkdirSync(config.rtmp.mediaRoot, { recursive: true });
    }

    const nmsConfig = {
      rtmp: {
        port: config.rtmp.port,
        chunk_size: 60000,
        gop_cache: true,
        ping: 30,
        ping_timeout: 60
      },
      http: {
        port: config.rtmp.httpPort,
        mediaroot: config.rtmp.mediaRoot,
        allow_origin: '*'
      }
    };

    this.nms = new NodeMediaServer(nmsConfig);

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.nms.on('preConnect', (id: string, args: any) => {
      console.log('[NodeEvent on preConnect]', `id=${id} args=${JSON.stringify(args)}`);
    });

    this.nms.on('postConnect', (id: string, args: any) => {
      console.log('[NodeEvent on postConnect]', `id=${id} args=${JSON.stringify(args)}`);
    });

    this.nms.on('doneConnect', (id: string, args: any) => {
      console.log('[NodeEvent on doneConnect]', `id=${id} args=${JSON.stringify(args)}`);
    });

    this.nms.on('prePublish', (id: string, StreamPath: string, args: any) => {
      console.log('[NodeEvent on prePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);

      // Check if this is our expected stream
      if (StreamPath === `/live/${config.rtmp.streamKey}`) {
        console.log('✅ OBS stream started!');
        this.isStreaming = true;
        // Start processing frames
        frameProcessor.startProcessing(StreamPath);
      }
    });

    this.nms.on('postPublish', (id: string, StreamPath: string, args: any) => {
      console.log('[NodeEvent on postPublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
    });

    this.nms.on('donePublish', (id: string, StreamPath: string, args: any) => {
      console.log('[NodeEvent on donePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);

      if (StreamPath === `/live/${config.rtmp.streamKey}`) {
        console.log('⏹️ OBS stream stopped');
        this.isStreaming = false;
        frameProcessor.stopProcessing();
      }
    });

    this.nms.on('prePlay', (id: string, StreamPath: string, args: any) => {
      console.log('[NodeEvent on prePlay]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
    });

    this.nms.on('postPlay', (id: string, StreamPath: string, args: any) => {
      console.log('[NodeEvent on postPlay]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
    });

    this.nms.on('donePlay', (id: string, StreamPath: string, args: any) => {
      console.log('[NodeEvent on donePlay]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
    });
  }

  public start(): void {
    this.nms.run();
    console.log(`🎥 RTMP Server started on port ${config.rtmp.port}`);
    console.log(`📺 HTTP Server started on port ${config.rtmp.httpPort}`);
    console.log(`\n🔗 OBS Stream Settings:`);
    console.log(`   Server: rtmp://localhost:${config.rtmp.port}/live`);
    console.log(`   Stream Key: ${config.rtmp.streamKey}`);
    console.log(`   Resolution: ${config.display.width}x${config.display.height}`);
    console.log(`   FPS: 30 (recommended)\n`);
  }

  public stop(): void {
    this.nms.stop();
    console.log('🛑 RTMP Server stopped');
  }

  public getStatus() {
    return {
      isStreaming: this.isStreaming,
      rtmpPort: config.rtmp.port,
      httpPort: config.rtmp.httpPort,
      streamKey: config.rtmp.streamKey,
    };
  }
}

export const rtmpServer = new RTMPServer();