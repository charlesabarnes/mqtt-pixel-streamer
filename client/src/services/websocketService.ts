import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private frameCallbacks: ((frameData: string) => void)[] = [];

  connect(): void {
    if (this.socket) return;

    // Connect to WebSocket using native WebSocket (not Socket.IO)
    this.initializeWebSocket();
  }

  private initializeWebSocket(): void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => {
      console.log('WebSocket connected');
      ws.send(JSON.stringify({ type: 'subscribe' }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
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

  disconnect(): void {
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