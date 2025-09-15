import { BackgroundConfig, DISPLAY_WIDTH, TOTAL_DISPLAY_HEIGHT } from '../../types';
import { BaseBackground } from '../BaseBackground';
import { ICanvasContext, IRenderOptions, IPlatformUtils } from '../types';

export class StarsBackground extends BaseBackground {
  private config!: NonNullable<BackgroundConfig['stars']>;

  constructor(platformUtils: IPlatformUtils = {}) {
    super(platformUtils);
  }

  initialize(config: BackgroundConfig): void {
    if (config.type === 'stars' && config.stars) {
      this.config = config.stars;

      // Release existing particles back to pool if available
      if (this.platformUtils) {
        this.releaseMultipleParticles(this.particles);
      }
      this.particles = [];

      // Limit star count for better performance
      const starCount = Math.min(this.config.count, 20);

      for (let i = 0; i < starCount; i++) {
        const particle = this.acquireParticle();
        
        particle.id = `star_${i}`;
        particle.position = {
          x: Math.random() * DISPLAY_WIDTH,
          y: Math.random() * TOTAL_DISPLAY_HEIGHT
        };
        particle.velocity = { x: 0, y: 0 }; // Stars are stationary
        // Use fixed size since config doesn't have size properties
        particle.size = 1 + Math.random();
        particle.color = this.config.colors[Math.floor(Math.random() * this.config.colors.length)];
        particle.life = Infinity;
        particle.maxLife = Infinity;
        particle.opacity = 0.8;
        particle.twinklePhase = Math.random() * Math.PI * 2; // Random starting phase

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
      // Update twinkle effect
      if (particle.twinklePhase !== undefined) {
        particle.twinklePhase += this.config.twinkleSpeed * deltaSeconds * 2 * Math.PI;
        if (particle.twinklePhase > Math.PI * 2) {
          particle.twinklePhase -= Math.PI * 2;
        }
        // Animate opacity based on sine wave
        particle.opacity = 0.3 + 0.7 * (Math.sin(particle.twinklePhase) * 0.5 + 0.5);
      }
    });

    this.lastUpdate = Date.now();
  }

  render(ctx: ICanvasContext, width: number, height: number, options?: IRenderOptions): void {
    // Clear with black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Render stars as circles
    this.renderParticles(ctx, this.particles, options, 'circle');
  }

  getState(): any {
    return {
      ...super.getState(),
      config: this.config
    };
  }
}