import { BackgroundConfig, BackgroundParticle } from '@mqtt-pixel-streamer/shared';

export interface IClientBackground {
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
   * @param ctx Canvas rendering context
   * @param width Canvas width
   * @param height Canvas height
   * @param brightness Brightness factor (0-100)
   */
  render(ctx: CanvasRenderingContext2D, width: number, height: number, brightness: number): void;

  /**
   * Clean up any resources
   */
  cleanup(): void;

  /**
   * Get the current state for inspection/debugging
   */
  getState?(): any;
}

export abstract class BaseClientBackground implements IClientBackground {
  protected particles: BackgroundParticle[] = [];
  protected lastUpdate: number = Date.now();
  protected particlePool: BackgroundParticle[] = [];
  protected maxPoolSize: number = 100;

  abstract initialize(config: BackgroundConfig): void;
  abstract update(deltaTime: number): void;
  abstract render(ctx: CanvasRenderingContext2D, width: number, height: number, brightness: number): void;

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
   * Helper function to apply brightness to colors
   */
  protected applyBrightness(color: string, brightness: number): string {
    const brightnessFactor = brightness / 100;

    // Handle hex colors
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);

      const dimmedR = Math.round(r * brightnessFactor);
      const dimmedG = Math.round(g * brightnessFactor);
      const dimmedB = Math.round(b * brightnessFactor);

      return `#${dimmedR.toString(16).padStart(2, '0')}${dimmedG.toString(16).padStart(2, '0')}${dimmedB.toString(16).padStart(2, '0')}`;
    }

    // Handle rgb/rgba colors
    if (color.startsWith('rgb')) {
      const matches = color.match(/\d+/g);
      if (matches && matches.length >= 3) {
        const r = Math.round(parseInt(matches[0]) * brightnessFactor);
        const g = Math.round(parseInt(matches[1]) * brightnessFactor);
        const b = Math.round(parseInt(matches[2]) * brightnessFactor);
        const a = matches[3] ? parseInt(matches[3]) : 255;

        return matches.length > 3 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`;
      }
    }

    // Handle hsl colors
    if (color.startsWith('hsl')) {
      const matches = color.match(/\d+/g);
      if (matches && matches.length >= 3) {
        const h = matches[0];
        const s = matches[1];
        const l = Math.round(parseInt(matches[2]) * brightnessFactor);
        const a = matches[3] ? parseInt(matches[3]) : 1;

        return matches.length > 3 ? `hsla(${h}, ${s}%, ${l}%, ${a})` : `hsl(${h}, ${s}%, ${l}%)`;
      }
    }

    // Return original color if we can't parse it
    return color;
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