import { BackgroundConfig, DISPLAY_WIDTH, TOTAL_DISPLAY_HEIGHT } from '../../types';
import { BaseBackground } from '../BaseBackground';
import { ICanvasContext, IRenderOptions, IPlatformUtils } from '../types';

export class BubblesBackground extends BaseBackground {
  private config!: NonNullable<BackgroundConfig['bubbles']>;

  constructor(platformUtils: IPlatformUtils = {}) {
    super(platformUtils);
  }

  initialize(config: BackgroundConfig): void {
    if (config.type === 'bubbles' && config.bubbles) {
      this.config = config.bubbles;

      // Release existing particles back to pool if available
      if (this.platformUtils) {
        this.releaseMultipleParticles(this.particles);
      }
      this.particles = [];

      // Limit bubble count for better performance
      const bubbleCount = Math.min(this.config.count, 12);

      for (let i = 0; i < bubbleCount; i++) {
        const size = Math.random() * (this.config.maxSize - this.config.minSize) + this.config.minSize;
        const particle = this.acquireParticle();

        particle.id = `bubble_${i}`;
        particle.position = {
          x: Math.random() * DISPLAY_WIDTH,
          y: Math.random() * TOTAL_DISPLAY_HEIGHT + TOTAL_DISPLAY_HEIGHT // Start below screen
        };
        particle.velocity = {
          x: (Math.random() - 0.5) * 0.5,
          y: -this.config.speed * (0.5 + Math.random() * 0.5)
        };
        particle.color = this.config.colors[Math.floor(Math.random() * this.config.colors.length)];
        particle.life = Infinity;
        particle.maxLife = Infinity;
        particle.size = size;
        particle.opacity = this.config.opacity;

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

      // Wrap around horizontally
      if (particle.position.x < -particle.size) {
        particle.position.x = DISPLAY_WIDTH + particle.size;
      } else if (particle.position.x > DISPLAY_WIDTH + particle.size) {
        particle.position.x = -particle.size;
      }

      // Reset to bottom when reaching top
      if (particle.position.y < -particle.size) {
        particle.position.y = TOTAL_DISPLAY_HEIGHT + particle.size;
        particle.position.x = Math.random() * DISPLAY_WIDTH;
      }
    });

    this.lastUpdate = Date.now();
  }

  render(ctx: ICanvasContext, width: number, height: number, options?: IRenderOptions): void {
    // Clear with black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Render bubbles as circles
    this.renderParticles(ctx, this.particles, options, 'circle');
  }

  getState(): any {
    return {
      ...super.getState(),
      config: this.config
    };
  }
}