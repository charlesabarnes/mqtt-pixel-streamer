import { CanvasRenderingContext2D } from 'canvas';
import { BackgroundConfig, DISPLAY_WIDTH, TOTAL_DISPLAY_HEIGHT } from '@mqtt-pixel-streamer/shared';
import { BaseBackground } from './Background';

export class StarsBackground extends BaseBackground {
  private config!: NonNullable<BackgroundConfig['stars']>;

  initialize(config: BackgroundConfig): void {
    if (config.type === 'stars' && config.stars) {
      this.config = config.stars;

      // Release existing particles back to pool
      this.releaseMultipleParticles(this.particles);
      this.particles = [];

      // Limit star count for better performance
      const starCount = Math.min(this.config.count, 20);

      for (let i = 0; i < starCount; i++) {
        const particle = this.acquireParticle();

        particle.id = `star_${i}`;
        particle.position.x = Math.random() * DISPLAY_WIDTH;
        particle.position.y = Math.random() * TOTAL_DISPLAY_HEIGHT;
        particle.velocity.x = 0;
        particle.velocity.y = 0;
        particle.color = this.config.colors[Math.floor(Math.random() * this.config.colors.length)];
        particle.life = Infinity;
        particle.maxLife = Infinity;
        particle.size = 1;
        particle.opacity = Math.random() * (this.config.maxBrightness - this.config.minBrightness) + this.config.minBrightness;
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

        // Cache sin calculation for better performance
        const sinValue = Math.sin(particle.twinklePhase);
        particle.opacity = this.config.minBrightness +
          (this.config.maxBrightness - this.config.minBrightness) *
          (sinValue + 1) * 0.5; // Multiply by 0.5 instead of divide by 2
      }
    });

    this.lastUpdate = Date.now();
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Clear with black background first
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Render stars as small rectangles
    this.batchRenderParticles(ctx, this.particles, 'rect');
  }

  getState(): any {
    return {
      ...super.getState(),
      config: this.config
    };
  }
}