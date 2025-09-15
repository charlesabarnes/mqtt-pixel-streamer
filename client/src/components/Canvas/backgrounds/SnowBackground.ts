import { BackgroundConfig, DISPLAY_WIDTH, TOTAL_DISPLAY_HEIGHT } from '@mqtt-pixel-streamer/shared';
import { BaseClientBackground } from './Background';

export class SnowBackground extends BaseClientBackground {
  private config!: NonNullable<BackgroundConfig['snow']>;

  initialize(config: BackgroundConfig): void {
    if (config.type === 'snow' && config.snow) {
      this.config = config.snow;
      this.particles = [];

      const flakeCount = Math.min(config.snow.flakeCount, 20);

      for (let i = 0; i < flakeCount; i++) {
        const size = Math.random() * (config.snow.maxSize - config.snow.minSize) + config.snow.minSize;
        const particle = this.acquireParticle();

        particle.id = `snowflake_${i}`;
        particle.position = {
          x: Math.random() * DISPLAY_WIDTH,
          y: Math.random() * TOTAL_DISPLAY_HEIGHT - TOTAL_DISPLAY_HEIGHT
        };
        particle.velocity = {
          x: config.snow.windSpeed * (Math.random() - 0.5),
          y: config.snow.fallSpeed * (0.5 + Math.random() * 0.5)
        };
        particle.color = config.snow.colors[Math.floor(Math.random() * config.snow.colors.length)];
        particle.life = Infinity;
        particle.maxLife = Infinity;
        particle.size = size;
        particle.opacity = 0.8;

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
      particle.position.x += particle.velocity.x * deltaSeconds * 60;
      particle.position.y += particle.velocity.y * deltaSeconds * 60;

      if (particle.position.y > TOTAL_DISPLAY_HEIGHT + particle.size) {
        particle.position.y = -particle.size;
        particle.position.x = Math.random() * DISPLAY_WIDTH;
      }
      if (particle.position.x < -particle.size || particle.position.x > DISPLAY_WIDTH + particle.size) {
        particle.position.x = Math.random() * DISPLAY_WIDTH;
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