import { CanvasRenderingContext2D } from 'canvas';
import { BackgroundConfig, DISPLAY_WIDTH, TOTAL_DISPLAY_HEIGHT } from '@mqtt-pixel-streamer/shared';
import { BaseBackground } from './Background';

export class FireworksBackground extends BaseBackground {
  private config!: NonNullable<BackgroundConfig['fireworks']>;

  initialize(config: BackgroundConfig): void {
    if (config.type === 'fireworks' && config.fireworks) {
      this.config = config.fireworks;
    }
  }

  update(deltaTime: number): void {
    if (!this.config) return;

    // Skip updates if deltaTime is too small or too large (avoid performance issues)
    if (deltaTime < 5 || deltaTime > 100) return;

    // Remove expired particles and return them to pool (batch operation)
    const expiredParticles = this.particles.filter(particle => particle.life <= 0);
    this.particles = this.particles.filter(particle => particle.life > 0);
    this.releaseMultipleParticles(expiredParticles);

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

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Clear with black background first
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Render particles using batch rendering
    this.batchRenderParticles(ctx, this.particles, 'rect');
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
      const angleVariation = (Math.random() - 0.5) * 0.5;
      const finalAngle = angle + angleVariation;

      const speed = Math.random() * 3 + 1; // Increase speed range for more dynamic movement

      const particle = this.acquireParticle();
      particle.id = `firework_${Date.now()}_${i}`;
      particle.position.x = explosionX;
      particle.position.y = explosionY;
      particle.velocity.x = Math.cos(finalAngle) * speed;
      particle.velocity.y = Math.sin(finalAngle) * speed;
      particle.color = this.config.colors[Math.floor(Math.random() * this.config.colors.length)];
      particle.life = 60 + Math.random() * 20; // Variable lifetime for more variety
      particle.maxLife = particle.life;
      particle.size = Math.random() > 0.7 ? 2 : 1; // Some larger particles
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