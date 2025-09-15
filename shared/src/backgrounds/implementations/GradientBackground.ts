import { BackgroundConfig } from '../../types';
import { BaseBackground } from '../BaseBackground';
import { ICanvasContext, IRenderOptions, IPlatformUtils } from '../types';

export class GradientBackground extends BaseBackground {
  private config!: NonNullable<BackgroundConfig['gradient']>;
  private gradientPhase: number = 0;
  private gradientCache = new Map<string, CanvasGradient>();

  constructor(platformUtils: IPlatformUtils = {}) {
    super(platformUtils);
  }

  initialize(config: BackgroundConfig): void {
    if (config.type === 'gradient' && config.gradient) {
      this.config = config.gradient;
      this.gradientPhase = 0;
    }
    // Clear particles for gradient backgrounds
    this.particles = [];
  }

  update(deltaTime: number): void {
    if (!this.config) return;

    this.gradientPhase += this.config.speed * deltaTime / 1000;
    if (this.gradientPhase > 1 && this.config.cyclic) {
      this.gradientPhase = 0;
    }

    this.lastUpdate = Date.now();
  }

  render(ctx: ICanvasContext, width: number, height: number, options?: IRenderOptions): void {
    if (!this.config) return;

    const brightness = options?.brightness ?? 100;

    // Create gradient based on direction
    let gradient: CanvasGradient;

    // For server with caching optimization
    const baseCacheKey = `${this.config.direction}_${width}_${height}`;

    if (this.config.cyclic && this.gradientPhase > 0) {
      // For animated gradients, create new gradient each time
      gradient = this.createGradient(ctx, this.config.direction, width, height);

      // Apply colors with animation phase and brightness
      this.config.colors.forEach((color, index) => {
        let position = index / (this.config.colors.length - 1);
        position = (position + this.gradientPhase) % 1;
        const adjustedColor = this.applyBrightness(color, brightness);
        gradient.addColorStop(Math.max(0, Math.min(1, position)), adjustedColor);
      });
    } else {
      // Use cached gradient for static gradients (server optimization)
      // Client will just recreate each time (simpler approach)
      gradient = this.getOrCreateGradient(ctx, baseCacheKey, this.config.direction, width, height);

      // Apply colors with brightness
      this.config.colors.forEach((color, index) => {
        const position = index / (this.config.colors.length - 1);
        const adjustedColor = this.applyBrightness(color, brightness);
        gradient.addColorStop(Math.max(0, Math.min(1, position)), adjustedColor);
      });
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  private getOrCreateGradient(
    ctx: ICanvasContext,
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
    ctx: ICanvasContext,
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
    this.gradientPhase = 0;
  }

  getState(): any {
    return {
      ...super.getState(),
      gradientPhase: this.gradientPhase,
      config: this.config
    };
  }
}