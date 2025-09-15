import { BackgroundConfig } from '../../types';
import { BaseBackground } from '../BaseBackground';
import { ICanvasContext, IPlatformUtils } from '../types';

export class SolidBackground extends BaseBackground {
  private color: string = '#000000';

  constructor(platformUtils: IPlatformUtils = {}) {
    super(platformUtils);
  }

  initialize(config: BackgroundConfig): void {
    if (config.type === 'solid' && config.solid) {
      this.color = config.solid.color;
    }
    // Clear particles for solid backgrounds
    this.particles = [];
  }

  update(deltaTime: number): void {
    // Solid backgrounds don't need updates
    this.lastUpdate = Date.now();
  }

  render(ctx: ICanvasContext, width: number, height: number): void {
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