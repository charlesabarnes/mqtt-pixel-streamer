import { BackgroundConfig, BackgroundParticle } from '../types';
import { IBackground, ICanvasContext, IRenderOptions, IPlatformUtils } from './types';

export abstract class BaseBackground implements IBackground {
  protected particles: BackgroundParticle[] = [];
  protected lastUpdate: number = Date.now();
  protected particlePool: BackgroundParticle[] = [];
  protected maxPoolSize: number = 100;
  protected platformUtils: IPlatformUtils;

  constructor(platformUtils: IPlatformUtils = {}) {
    this.platformUtils = platformUtils;
  }

  abstract initialize(config: BackgroundConfig): void;
  abstract update(deltaTime: number): void;
  abstract render(ctx: ICanvasContext, width: number, height: number, options?: IRenderOptions): void;

  /**
   * Acquire a particle from the pool or create a new one
   */
  protected acquireParticle(): BackgroundParticle {
    // Use pooling only if platform supports it
    if (this.platformUtils && this.particlePool.length > 0) {
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
   * Render particles using platform-specific optimizations
   */
  protected renderParticles(
    ctx: ICanvasContext,
    particles: BackgroundParticle[],
    options?: IRenderOptions,
    renderType: 'circle' | 'rect' = 'rect'
  ): void {
    // Use batch rendering if available and enabled
    if (options?.useBatchRendering && this.platformUtils.getBatchParticleRenderer) {
      const batchRenderer = this.platformUtils.getBatchParticleRenderer();
      batchRenderer(ctx, particles, renderType);
      return;
    }

    // Fall back to individual particle rendering
    particles.forEach(particle => {
      ctx.save();

      ctx.globalAlpha = particle.opacity;
      ctx.fillStyle = particle.color;

      if (renderType === 'circle') {
        ctx.beginPath();
        ctx.arc(particle.position.x, particle.position.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(particle.position.x, particle.position.y, particle.size, particle.size);
      }

      ctx.restore();
    });
  }

  /**
   * Remove expired particles and optionally return them to pool
   */
  protected removeExpiredParticles(usePooling: boolean = true): void {
    if (usePooling && this.platformUtils) {
      // Return expired particles to pool (server optimization)
      const expiredParticles = this.particles.filter(particle => particle.life <= 0);
      this.particles = this.particles.filter(particle => particle.life > 0);
      this.releaseMultipleParticles(expiredParticles);
    } else {
      // Simple filtering (client approach)
      this.particles = this.particles.filter(particle => particle.life > 0);
    }
  }

  cleanup(): void {
    // Return all particles to pool if pooling is supported
    if (this.platformUtils) {
      this.releaseMultipleParticles(this.particles);
    }
    this.particles = [];
  }

  getState(): any {
    return {
      particleCount: this.particles.length,
      lastUpdate: this.lastUpdate,
      poolSize: this.particlePool.length
    };
  }
}