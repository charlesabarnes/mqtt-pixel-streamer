import { CanvasRenderingContext2D } from 'canvas';
import { BackgroundConfig, BackgroundParticle, Position } from '@mqtt-pixel-streamer/shared';

export interface IBackground {
  /**
   * Initialize the background with the given configuration
   */
  initialize(config: BackgroundConfig): void;

  /**
   * Update the background state with frame-rate independent movement
   * @param deltaTime Time elapsed since last update in milliseconds
   */
  update(deltaTime: number): void;

  /**
   * Render the background to the canvas
   */
  render(ctx: CanvasRenderingContext2D, width: number, height: number): void;

  /**
   * Clean up any resources
   */
  cleanup(): void;

  /**
   * Get the current state for inspection/debugging
   */
  getState?(): any;
}

export abstract class BaseBackground implements IBackground {
  protected particles: BackgroundParticle[] = [];
  protected lastUpdate: number = Date.now();
  protected particlePool: BackgroundParticle[] = [];
  protected maxPoolSize: number = 100;

  abstract initialize(config: BackgroundConfig): void;
  abstract update(deltaTime: number): void;
  abstract render(ctx: CanvasRenderingContext2D, width: number, height: number): void;

  /**
   * Acquire a particle from the pool or create a new one
   */
  protected acquireParticle(): BackgroundParticle {
    if (this.particlePool.length > 0) {
      return this.particlePool.pop()!;
    }

    return {
      id: '',
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      color: '#ffffff',
      life: 0,
      maxLife: 0,
      size: 1,
      opacity: 1
    };
  }

  /**
   * Release a particle back to the pool
   */
  protected releaseParticle(particle: BackgroundParticle): void {
    if (this.particlePool.length < this.maxPoolSize) {
      // Reset particle properties
      particle.life = 0;
      particle.maxLife = 0;
      particle.opacity = 1;
      particle.character = undefined;
      particle.twinklePhase = undefined;
      particle.direction = undefined;
      particle.segments = undefined;
      particle.isGrowing = undefined;
      particle.swimPhase = undefined;
      particle.fishType = undefined;
      this.particlePool.push(particle);
    }
  }

  /**
   * Release multiple particles back to the pool
   */
  protected releaseMultipleParticles(particles: BackgroundParticle[]): void {
    particles.forEach(particle => this.releaseParticle(particle));
  }

  /**
   * Update particle physics with frame-rate independent movement
   */
  protected updateParticlePhysics(particle: BackgroundParticle, deltaTime: number, gravity: number = 0): void {
    const deltaSeconds = deltaTime / 1000;

    // Frame-rate independent movement
    particle.position.x += particle.velocity.x * deltaSeconds * 60;
    particle.position.y += particle.velocity.y * deltaSeconds * 60;

    // Apply gravity if specified
    if (gravity !== 0) {
      particle.velocity.y += gravity * deltaSeconds * 60;
    }

    // Update life if finite
    if (particle.life !== Infinity) {
      particle.life -= deltaSeconds * 60;
    }

    // Update opacity based on life
    if (particle.maxLife > 0 && particle.life !== Infinity) {
      particle.opacity = Math.max(0, particle.life / particle.maxLife);
    }
  }

  /**
   * Batch render particles by color/opacity to reduce context switches
   */
  protected batchRenderParticles(
    ctx: CanvasRenderingContext2D,
    particles: BackgroundParticle[],
    renderType: 'circle' | 'rect' = 'rect'
  ): void {
    // Group particles by color and opacity
    const particlesByStyle = new Map<string, BackgroundParticle[]>();

    particles.forEach(particle => {
      const key = `${particle.color}_${particle.opacity.toFixed(2)}`;
      if (!particlesByStyle.has(key)) {
        particlesByStyle.set(key, []);
      }
      particlesByStyle.get(key)!.push(particle);
    });

    // Render particles in batches by style
    particlesByStyle.forEach((styleParticles, styleKey) => {
      if (styleParticles.length === 0) return;

      const firstParticle = styleParticles[0];
      ctx.globalAlpha = firstParticle.opacity;
      ctx.fillStyle = firstParticle.color;

      if (renderType === 'circle') {
        ctx.beginPath();
        styleParticles.forEach(particle => {
          ctx.moveTo(particle.position.x + particle.size, particle.position.y);
          ctx.arc(particle.position.x, particle.position.y, particle.size, 0, Math.PI * 2);
        });
        ctx.fill();
      } else {
        styleParticles.forEach(particle => {
          ctx.fillRect(particle.position.x, particle.position.y, particle.size, particle.size);
        });
      }
    });

    // Reset alpha
    ctx.globalAlpha = 1.0;
  }

  cleanup(): void {
    // Return all particles to pool
    this.releaseMultipleParticles(this.particles);
    this.particles = [];
  }

  getState(): any {
    return {
      particleCount: this.particles.length,
      lastUpdate: this.lastUpdate
    };
  }
}