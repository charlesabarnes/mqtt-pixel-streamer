import { BackgroundConfig } from '@mqtt-pixel-streamer/shared';
import { BaseClientBackground } from './Background';

export class SolidBackground extends BaseClientBackground {
  private config!: NonNullable<BackgroundConfig['solid']>;

  initialize(config: BackgroundConfig): void {
    if (config.type === 'solid' && config.solid) {
      this.config = config.solid;
      this.particles = [];
    }
  }

  update(deltaTime: number): void {
    // Solid backgrounds don't need updates
    this.lastUpdate = Date.now();
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, brightness: number): void {
    const color = this.applyBrightness(this.config.color || '#000000', brightness);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
  }

  cleanup(): void {
    super.cleanup();
  }

  getState(): any {
    return {
      ...super.getState(),
      config: this.config
    };
  }
}