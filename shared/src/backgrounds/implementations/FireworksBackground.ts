import { BackgroundConfig, DISPLAY_WIDTH, TOTAL_DISPLAY_HEIGHT } from '../../types';
import { BaseBackground } from '../BaseBackground';
import { ICanvasContext, IRenderOptions, IPlatformUtils } from '../types';

export class FireworksBackground extends BaseBackground {
  private config!: NonNullable<BackgroundConfig['fireworks']>;

  constructor(platformUtils: IPlatformUtils = {}) {
    super(platformUtils);
  }

  initialize(config: BackgroundConfig): void {
    if (config.type === 'fireworks' && config.fireworks) {
      this.config = config.fireworks;
      this.particles = [];
    }
  }

  update(deltaTime: number): void {
    if (!this.config) return;

    // Skip updates if deltaTime is too small or too large (avoid performance issues)
    if (deltaTime < 5 || deltaTime > 100) return;

    // Remove expired particles - use pooling if available
    const usePooling = this.platformUtils && 'useParticlePooling' !== undefined;
    this.removeExpiredParticles(usePooling);

    // Update existing particles with frame-rate independent movement
    const deltaSeconds = deltaTime / 1000;
    this.particles.forEach(particle => {
      this.updateParticlePhysics(particle, deltaTime, this.config.gravity);
    });

    // Spawn new fireworks much more frequently for spectacular display
    // Multiply frequency by 3 for much more frequent explosions
    if (Math.random() < this.config.frequency * deltaSeconds * 3) {
      this.spawnFirework();
    }

    this.lastUpdate = Date.now();
  }

  render(ctx: ICanvasContext, width: number, height: number, options?: IRenderOptions): void {
    // Clear with black background first
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Render particles using platform-specific optimizations
    this.renderParticles(ctx, this.particles, options, 'rect');
  }

  private spawnFirework(): void {
    // Significantly increase particle limit for spectacular fireworks
    if (this.particles.length > 300) return;

    const explosionX = Math.random() * DISPLAY_WIDTH;
    const explosionY = Math.random() * TOTAL_DISPLAY_HEIGHT * 0.7; // Allow more of screen

    // Dramatically increase particle count per explosion
    const particleCount = Math.min(this.config.particleCount, 20);

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      // Add random angle variation for more natural spread
      const finalAngle = angle + (Math.random() - 0.5) * 0.3;

      const speed = 2 + Math.random() * 4; // Increased speed for more dramatic effect

      const particle = this.acquireParticle();
      particle.id = `firework_${Date.now()}_${i}`;
      particle.position = { x: explosionX, y: explosionY };
      particle.velocity = {
        x: Math.cos(finalAngle) * speed,
        y: Math.sin(finalAngle) * speed
      };
      particle.color = this.config.colors[Math.floor(Math.random() * this.config.colors.length)];
      particle.life = 60 + Math.random() * 20; // Variable lifetime for more variety
      particle.maxLife = particle.life;
      particle.size = Math.max(1, Math.floor(this.config.explosionSize));
      particle.opacity = 1;

      this.particles.push(particle);
    }
  }

  getState(): any {
    return {
      ...super.getState(),
      config: this.config
    };
  }
}