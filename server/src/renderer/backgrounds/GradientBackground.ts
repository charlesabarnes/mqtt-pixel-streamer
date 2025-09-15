import { CanvasRenderingContext2D, CanvasGradient } from 'canvas';
import { BackgroundConfig } from '@mqtt-pixel-streamer/shared';
import { BaseBackground } from './Background';

export class GradientBackground extends BaseBackground {
  private config!: NonNullable<BackgroundConfig['gradient']>;
  private gradientPhase: number = 0;
  private gradientCache = new Map<string, CanvasGradient>();

  initialize(config: BackgroundConfig): void {
    if (config.type === 'gradient' && config.gradient) {
      this.config = config.gradient;
      this.gradientPhase = 0;
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

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.config) return;

    // Create cache key based on direction and dimensions
    const baseCacheKey = `${this.config.direction}_${width}_${height}`;

    let gradient: CanvasGradient;

    // For animated gradients, create new gradient each time
    if (this.config.cyclic && this.gradientPhase > 0) {
      gradient = this.createGradient(ctx, this.config.direction, width, height);

      // Apply colors with animation phase
      this.config.colors.forEach((color, index) => {
        let position = index / (this.config.colors.length - 1);
        position = (position + this.gradientPhase) % 1;
        gradient.addColorStop(Math.max(0, Math.min(1, position)), color);
      });
    } else {
      // Use cached gradient for static gradients
      gradient = this.getOrCreateGradient(ctx, baseCacheKey, this.config.direction, width, height);

      this.config.colors.forEach((color, index) => {
        const position = index / (this.config.colors.length - 1);
        gradient.addColorStop(Math.max(0, Math.min(1, position)), color);
      });
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  private getOrCreateGradient(
    ctx: CanvasRenderingContext2D,
    cacheKey: string,
    direction: string,
    width: number,
    height: number
  ): CanvasGradient {
    if (this.gradientCache.has(cacheKey)) {
      return this.gradientCache.get(cacheKey)!;
    }

    const gradient = this.createGradient(ctx, direction, width, height);
    this.gradientCache.set(cacheKey, gradient);
    return gradient;
  }

  private createGradient(
    ctx: CanvasRenderingContext2D,
    direction: string,
    width: number,
    height: number
  ): CanvasGradient {
    switch (direction) {
      case 'horizontal':
        return ctx.createLinearGradient(0, 0, width, 0);
      case 'vertical':
        return ctx.createLinearGradient(0, 0, 0, height);
      case 'diagonal':
        return ctx.createLinearGradient(0, 0, width, height);
      case 'radial':
        return ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height)/2);
      default:
        return ctx.createLinearGradient(0, 0, width, 0);
    }
  }

  cleanup(): void {
    super.cleanup();
    this.gradientCache.clear();
  }

  getState(): any {
    return {
      ...super.getState(),
      gradientPhase: this.gradientPhase,
      config: this.config
    };
  }
}