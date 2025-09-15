import { CanvasRenderingContext2D } from 'canvas';
import { BackgroundConfig } from '@mqtt-pixel-streamer/shared';
import { BaseBackground } from './Background';

export class SolidBackground extends BaseBackground {
  private color: string = '#000000';

  initialize(config: BackgroundConfig): void {
    if (config.type === 'solid' && config.solid) {
      this.color = config.solid.color;
    }
  }

  update(deltaTime: number): void {
    // Solid backgrounds don't need updates
    this.lastUpdate = Date.now();
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = this.color;
    ctx.fillRect(0, 0, width, height);
  }

  getState(): any {
    return {
      ...super.getState(),
      color: this.color
    };
  }
}