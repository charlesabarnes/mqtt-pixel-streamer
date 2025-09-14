import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private ws: WebSocket | null = null;
  private frameCallbacks: ((frameData: string) => void)[] = [];
  private updateCallbacks: ((type: string, data: any) => void)[] = [];

  connect(): void {
    if (this.ws) return;

    // Connect to WebSocket using native WebSocket (not Socket.IO)
    this.initializeWebSocket();
  }

  private initializeWebSocket(): void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.ws!.send(JSON.stringify({ type: 'subscribe' }));
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.ws = null;
      // Attempt to reconnect after 5 seconds
      setTimeout(() => this.initializeWebSocket(), 5000);
    };
  }

  private handleMessage(data: any): void {
    switch (data.type) {
      case 'frame':
        this.frameCallbacks.forEach((callback) => callback(data.data));
        break;
      case 'connected':
        console.log('WebSocket connection confirmed');
        break;
      case 'update':
        console.log('Received update:', data);
        this.updateCallbacks.forEach((callback) => callback(data.updateType, data.data));
        break;
      case 'publishing_started':
      case 'publishing_stopped':
      case 'template_updated':
        this.updateCallbacks.forEach((callback) => callback(data.type, data));
        break;
    }
  }

  onFrame(callback: (frameData: string) => void): () => void {
    this.frameCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.frameCallbacks.indexOf(callback);
      if (index > -1) {
        this.frameCallbacks.splice(index, 1);
      }
    };
  }

  onUpdate(callback: (type: string, data: any) => void): () => void {
    this.updateCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.updateCallbacks.indexOf(callback);
      if (index > -1) {
        this.updateCallbacks.splice(index, 1);
      }
    };
  }

  sendTemplateUpdate(templateId: number, template: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'template_update',
        templateId,
        template
      }));
    }
  }

  startPublishing(templateId: number): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'start_publishing',
        templateId
      }));
    }
  }

  stopPublishing(templateId: number): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'stop_publishing',
        templateId
      }));
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    }
  }
}

export const websocketService = new WebSocketService();