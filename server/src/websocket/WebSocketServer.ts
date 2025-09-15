import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { Server } from 'http';

export class WebSocketServer {
  private wss: WSServer | null = null;
  private clients: Set<WebSocket> = new Set();

  public initialize(server: Server): void {
    this.wss = new WSServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('New WebSocket client connected');
      this.clients.add(ws);

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log('WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      // Send initial connection confirmation
      ws.send(JSON.stringify({ type: 'connected', timestamp: Date.now() }));
    });
  }

  private handleMessage(ws: WebSocket, data: any): void {
    switch (data.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;
      case 'subscribe':
        // Handle subscription to specific templates or updates
        console.log('Client subscribed to updates');
        break;
      case 'template_update':
        // Handle template updates from frontend
        this.handleTemplateUpdate(data.templateId, data.template);
        break;
      case 'start_publishing':
        // Forward publishing control to other clients
        this.broadcastUpdate('publishing_started', { templateId: data.templateId });
        break;
      case 'stop_publishing':
        // Forward publishing control to other clients
        this.broadcastUpdate('publishing_stopped', { templateId: data.templateId });
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  private handleTemplateUpdate(templateId: number, templateData: any): void {
    console.log(`Received template update for template ${templateId}`);

    // Broadcast template update to all connected clients
    this.broadcastUpdate('template_updated', {
      templateId,
      template: templateData,
      timestamp: Date.now()
    });

    // Update the in-memory template store
    this.updateInMemoryTemplate(templateId, templateData);
  }

  private updateInMemoryTemplate(templateId: number, templateData: any): void {
    // This is a workaround since we can't directly import the templates array
    // In a real application, this would be handled through a proper service layer
    const { updateTemplateInStore } = require('../api/routes/templates');
    if (updateTemplateInStore) {
      updateTemplateInStore(templateId, templateData);
    }
  }

  public broadcastFrame(frameData: Buffer): void {
    // Convert frame to base64 for transmission
    const base64Frame = frameData.toString('base64');
    const message = JSON.stringify({
      type: 'frame',
      data: base64Frame,
      timestamp: Date.now(),
    });

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  public broadcastDualFrame(display1Data: Buffer, display2Data: Buffer): void {
    // Combine both display frames into a single dual frame buffer
    const dualFrameData = Buffer.concat([display1Data, display2Data]);

    // Convert combined frame to base64 for transmission
    const base64Frame = dualFrameData.toString('base64');
    const message = JSON.stringify({
      type: 'frame',
      data: base64Frame,
      isDualFrame: true,
      timestamp: Date.now(),
    });

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  public broadcastUpdate(updateType: string, data: any): void {
    const message = JSON.stringify({
      type: 'update',
      updateType,
      data,
      timestamp: Date.now(),
    });

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

export const websocketServer = new WebSocketServer();