import { BackgroundConfig, DISPLAY_WIDTH, TOTAL_DISPLAY_HEIGHT } from '../../types';
import { BaseBackground } from '../BaseBackground';
import { ICanvasContext, IPlatformUtils } from '../types';

export class SnowBackground extends BaseBackground {
  private config!: NonNullable<BackgroundConfig['snow']>;

  constructor(platformUtils: IPlatformUtils = {}) {
    super(platformUtils);
  }

  initialize(config: BackgroundConfig): void {
    if (config.type === 'snow' && config.snow) {
      this.config = config.snow;

      // Release existing particles back to pool if available
      if (this.platformUtils) {
        this.releaseMultipleParticles(this.particles);
      }
      this.particles = [];

      // Limit snowflake count for better performance
      const snowflakeCount = Math.min(this.config.flakeCount, 15);

      for (let i = 0; i < snowflakeCount; i++) {
        const particle = this.acquireParticle();
        
        particle.id = `snowflake_${i}`;
        particle.position = {
          x: Math.random() * DISPLAY_WIDTH,
          y: Math.random() * TOTAL_DISPLAY_HEIGHT - TOTAL_DISPLAY_HEIGHT
        };
        particle.velocity = {
          x: (Math.random() - 0.5) * this.config.windSpeed,
          y: this.config.fallSpeed * (0.8 + Math.random() * 0.4)
        };
        particle.size = Math.random() * (this.config.maxSize - this.config.minSize) + this.config.minSize;
        particle.color = '#ffffff';
        particle.life = Infinity;
        particle.maxLife = Infinity;
        particle.opacity = 0.8;

        this.particles.push(particle);
      }
    }
  }

  update(deltaTime: number): void {
    if (!this.config) return;

    // Skip updates if deltaTime is too small or too large
    if (deltaTime < 5 || deltaTime > 100) return;

    const deltaSeconds = deltaTime / 1000;

    this.particles.forEach(particle => {
      // Frame-rate independent movement
      particle.position.x += particle.velocity.x * deltaSeconds * 60;
      particle.position.y += particle.velocity.y * deltaSeconds * 60;

      // Wrap around horizontally
      if (particle.position.x < -particle.size) {
        particle.position.x = DISPLAY_WIDTH + particle.size;
      } else if (particle.position.x > DISPLAY_WIDTH + particle.size) {
        particle.position.x = -particle.size;
      }

      // Reset to top when reaching bottom
      if (particle.position.y > TOTAL_DISPLAY_HEIGHT + particle.size) {
        particle.position.y = -particle.size;
        particle.position.x = Math.random() * DISPLAY_WIDTH;
      }
    });

    this.lastUpdate = Date.now();
  }

  render(ctx: ICanvasContext, width: number, height: number): void {
    // Clear with black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Render snowflakes as circles
    this.renderParticles(ctx, this.particles, undefined, 'circle');
  }

  getState(): any {
    return {
      ...super.getState(),
      config: this.config
    };
  }
}