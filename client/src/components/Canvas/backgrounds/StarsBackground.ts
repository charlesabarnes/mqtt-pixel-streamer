import { BackgroundConfig, DISPLAY_WIDTH, TOTAL_DISPLAY_HEIGHT } from '@mqtt-pixel-streamer/shared';
import { BaseClientBackground } from './Background';

export class StarsBackground extends BaseClientBackground {
  private config!: NonNullable<BackgroundConfig['stars']>;

  initialize(config: BackgroundConfig): void {
    if (config.type === 'stars' && config.stars) {
      this.config = config.stars;
      this.particles = [];

      const starCount = Math.min(config.stars.count, 20);

      for (let i = 0; i < starCount; i++) {
        const particle = this.acquireParticle();

        particle.id = `star_${i}`;
        particle.position = {
          x: Math.random() * DISPLAY_WIDTH,
          y: Math.random() * TOTAL_DISPLAY_HEIGHT
        };
        particle.velocity = { x: 0, y: 0 };
        particle.color = config.stars.colors[Math.floor(Math.random() * config.stars.colors.length)];
        particle.life = Infinity;
        particle.maxLife = Infinity;
        particle.size = 1;
        particle.opacity = Math.random() * (config.stars.maxBrightness - config.stars.minBrightness) + config.stars.minBrightness;
        particle.twinklePhase = Math.random() * Math.PI * 2;

        this.particles.push(particle);
      }
    }
  }

  update(deltaTime: number): void {
    if (!this.config) return;

    // Skip updates if deltaTime is too small or too large (avoid performance issues)
    if (deltaTime < 5 || deltaTime > 100) return;

    const deltaSeconds = deltaTime / 1000;

    this.particles.forEach(particle => {
      if (particle.twinklePhase !== undefined) {
        particle.twinklePhase += this.config.twinkleSpeed * deltaSeconds;

        const sinValue = Math.sin(particle.twinklePhase);
        particle.opacity = this.config.minBrightness +
          (this.config.maxBrightness - this.config.minBrightness) *
          (sinValue + 1) * 0.5;
      }
    });

    this.lastUpdate = Date.now();
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, brightness: number): void {
    // Clear with black background first
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    this.particles.forEach(particle => {
      ctx.save();
      ctx.globalAlpha = particle.opacity * (brightness / 100);
      ctx.fillStyle = this.applyBrightness(particle.color, brightness);

      // Render particles as small rectangles/pixels
      ctx.fillRect(particle.position.x, particle.position.y, particle.size, particle.size);

      ctx.restore();
    });
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