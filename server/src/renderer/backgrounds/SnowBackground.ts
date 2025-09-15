import { CanvasRenderingContext2D } from 'canvas';
import { BackgroundConfig, DISPLAY_WIDTH, TOTAL_DISPLAY_HEIGHT } from '@mqtt-pixel-streamer/shared';
import { BaseBackground } from './Background';

export class SnowBackground extends BaseBackground {
  private config!: NonNullable<BackgroundConfig['snow']>;

  initialize(config: BackgroundConfig): void {
    if (config.type === 'snow' && config.snow) {
      this.config = config.snow;

      // Release existing particles back to pool
      this.releaseMultipleParticles(this.particles);
      this.particles = [];

      // Limit snow flake count for better performance
      const flakeCount = Math.min(this.config.flakeCount, 20);

      for (let i = 0; i < flakeCount; i++) {
        const size = Math.random() * (this.config.maxSize - this.config.minSize) + this.config.minSize;
        const particle = this.acquireParticle();

        particle.id = `snowflake_${i}`;
        particle.position.x = Math.random() * DISPLAY_WIDTH;
        particle.position.y = Math.random() * TOTAL_DISPLAY_HEIGHT - TOTAL_DISPLAY_HEIGHT; // Start above screen
        particle.velocity.x = this.config.windSpeed * (Math.random() - 0.5);
        particle.velocity.y = this.config.fallSpeed * (0.5 + Math.random() * 0.5);
        particle.color = this.config.colors[Math.floor(Math.random() * this.config.colors.length)];
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
      // Frame-rate independent movement
      particle.position.x += particle.velocity.x * deltaSeconds * 60;
      particle.position.y += particle.velocity.y * deltaSeconds * 60;

      // Reset snowflakes that fall off screen
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

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Clear with black background first
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Render snowflakes as rectangles
    this.batchRenderParticles(ctx, this.particles, 'rect');
  }

  getState(): any {
    return {
      ...super.getState(),
      config: this.config
    };
  }
}