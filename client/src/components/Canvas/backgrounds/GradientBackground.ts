import { BackgroundConfig } from '@mqtt-pixel-streamer/shared';
import { BaseClientBackground } from './Background';

export class GradientBackground extends BaseClientBackground {
  private config!: NonNullable<BackgroundConfig['gradient']>;
  private gradientPhase: number = 0;

  initialize(config: BackgroundConfig): void {
    if (config.type === 'gradient' && config.gradient) {
      this.config = config.gradient;
      this.gradientPhase = 0;
      this.particles = [];
    }
  }

  update(deltaTime: number): void {
    if (!this.config) return;

    this.gradientPhase += this.config.speed * deltaTime / 1000;
    if (this.gradientPhase > 1 && this.config.cyclic) {
      this.gradientPhase = 0;
    }

    this.lastUpdate = Date.now();
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, brightness: number): void {
    if (!this.config) return;

    let gradient: CanvasGradient;

    switch (this.config.direction) {
      case 'horizontal':
        gradient = ctx.createLinearGradient(0, 0, width, 0);
        break;
      case 'vertical':
        gradient = ctx.createLinearGradient(0, 0, 0, height);
        break;
      case 'diagonal':
        gradient = ctx.createLinearGradient(0, 0, width, height);
        break;
      case 'radial':
        gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height)/2);
        break;
      default:
        gradient = ctx.createLinearGradient(0, 0, width, 0);
    }

    // Apply colors with animation phase and brightness
    this.config.colors.forEach((color, index) => {
      let position = index / (this.config.colors.length - 1);
      if (this.config.cyclic) {
        position = (position + this.gradientPhase) % 1;
      }
      const adjustedColor = this.applyBrightness(color, brightness);
      gradient.addColorStop(Math.max(0, Math.min(1, position)), adjustedColor);
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  cleanup(): void {
    super.cleanup();
    this.gradientPhase = 0;
  }

  getState(): any {
    return {
      ...super.getState(),
      config: this.config,
      gradientPhase: this.gradientPhase
    };
  }
}