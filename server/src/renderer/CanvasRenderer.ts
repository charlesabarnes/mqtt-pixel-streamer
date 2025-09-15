import { createCanvas, Canvas, CanvasRenderingContext2D, loadImage, CanvasGradient } from 'canvas';
import {
  Template,
  Element,
  DISPLAY_WIDTH,
  DISPLAY_HEIGHT,
  TOTAL_DISPLAY_HEIGHT,
  FRAME_SIZE,
  DUAL_FRAME_SIZE,
  Animation,
  Position,
  DataFormatter,
  AnimationState,
  Particle,
  EffectConfig,
  BackgroundConfig,
  BackgroundParticle,
  BackgroundType
} from '@mqtt-pixel-streamer/shared';
import path from 'path';
import { weatherAnimatedIconManager } from './AnimatedIcon';
import { websocketServer } from '../websocket/WebSocketServer';

interface BackgroundAnimationState {
  templateId: string;
  backgroundType: BackgroundType;
  particles: BackgroundParticle[];
  lastUpdate: number;
  gradientPhase?: number;
  matrixColumns?: { x: number; y: number; speed: number; pixelSize: number }[];
}

class ParticlePool {
  private pool: BackgroundParticle[] = [];
  private maxPoolSize = 100;

  acquire(): BackgroundParticle {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }

    // Create new particle if pool is empty
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

  release(particle: BackgroundParticle): void {
    if (this.pool.length < this.maxPoolSize) {
      // Reset particle properties
      particle.life = 0;
      particle.maxLife = 0;
      particle.opacity = 1;
      particle.character = undefined;
      particle.twinklePhase = undefined;
      this.pool.push(particle);
    }
  }

  releaseMultiple(particles: BackgroundParticle[]): void {
    particles.forEach(particle => this.release(particle));
  }
}

class BackgroundAnimationManager {
  private backgroundStates: Map<string, BackgroundAnimationState> = new Map();
  private particlePool = new ParticlePool();
  private gradientCache = new Map<string, CanvasGradient>();
  private static instance: BackgroundAnimationManager;

  static getInstance(): BackgroundAnimationManager {
    if (!BackgroundAnimationManager.instance) {
      BackgroundAnimationManager.instance = new BackgroundAnimationManager();
    }
    return BackgroundAnimationManager.instance;
  }

  public getBackgroundState(templateId: string): BackgroundAnimationState | undefined {
    return this.backgroundStates.get(templateId);
  }

  public clearTemplateState(templateId: string): void {
    const state = this.backgroundStates.get(templateId);
    if (state) {
      // Return all particles to pool before clearing
      this.particlePool.releaseMultiple(state.particles);
      this.backgroundStates.delete(templateId);
    }
  }

  public clearAllStates(): void {
    // Return all particles to pool before clearing all states
    this.backgroundStates.forEach(state => {
      this.particlePool.releaseMultiple(state.particles);
    });
    this.backgroundStates.clear();
    this.gradientCache.clear();
  }

  public getOrCreateGradient(ctx: CanvasRenderingContext2D, cacheKey: string, direction: string, width: number, height: number): CanvasGradient {
    if (this.gradientCache.has(cacheKey)) {
      return this.gradientCache.get(cacheKey)!;
    }

    let gradient: CanvasGradient;
    switch (direction) {
      case 'horizontal':
        gradient = ctx.createLinearGradient(0, 0, width, 0);
        break;
      case 'vertical':
        gradient = ctx.createLinearGradient(0, 0, 0, height);
        break;
      case 'diagonal':
        gradient = ctx.createLinearGradient(0, 0, width, height);
        break;
      case 'radial':
        gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height)/2);
        break;
      default:
        gradient = ctx.createLinearGradient(0, 0, width, 0);
    }

    this.gradientCache.set(cacheKey, gradient);
    return gradient;
  }

  public createOrUpdateBackgroundState(templateId: string, backgroundConfig: BackgroundConfig): BackgroundAnimationState {
    let state = this.backgroundStates.get(templateId);
    const currentTime = Date.now();

    if (!state || state.backgroundType !== backgroundConfig.type) {
      // Create new state or reset if background type changed
      state = {
        templateId,
        backgroundType: backgroundConfig.type,
        particles: [],
        lastUpdate: currentTime, // Set initial time for new states
        gradientPhase: 0
      };

      // Initialize type-specific state
      this.initializeBackgroundState(state, backgroundConfig);
      this.backgroundStates.set(templateId, state);
    }

    return state;
  }

  private initializeBackgroundState(state: BackgroundAnimationState, config: BackgroundConfig): void {
    switch (config.type) {
      case 'bubbles':
        this.initializeBubbles(state, config.bubbles!);
        break;
      case 'snow':
        this.initializeSnow(state, config.snow!);
        break;
      case 'stars':
        this.initializeStars(state, config.stars!);
        break;
      case 'matrix':
        this.initializeMatrix(state, config.matrix!);
        break;
    }
  }

  private initializeBubbles(state: BackgroundAnimationState, config: NonNullable<BackgroundConfig['bubbles']>): void {
    // Release existing particles back to pool
    this.particlePool.releaseMultiple(state.particles);
    state.particles = [];

    // Limit bubble count for better performance
    const bubbleCount = Math.min(config.count, 12);

    for (let i = 0; i < bubbleCount; i++) {
      const size = Math.random() * (config.maxSize - config.minSize) + config.minSize;
      const particle = this.particlePool.acquire();

      particle.id = `bubble_${i}`;
      particle.position.x = Math.random() * DISPLAY_WIDTH;
      particle.position.y = Math.random() * TOTAL_DISPLAY_HEIGHT + TOTAL_DISPLAY_HEIGHT; // Start below screen
      particle.velocity.x = (Math.random() - 0.5) * 0.5;
      particle.velocity.y = -config.speed * (0.5 + Math.random() * 0.5);
      particle.color = config.colors[Math.floor(Math.random() * config.colors.length)];
      particle.life = Infinity;
      particle.maxLife = Infinity;
      particle.size = size;
      particle.opacity = config.opacity;

      state.particles.push(particle);
    }
  }

  private initializeSnow(state: BackgroundAnimationState, config: NonNullable<BackgroundConfig['snow']>): void {
    // Release existing particles back to pool
    this.particlePool.releaseMultiple(state.particles);
    state.particles = [];

    // Limit snow flake count for better performance
    const flakeCount = Math.min(config.flakeCount, 20);

    for (let i = 0; i < flakeCount; i++) {
      const size = Math.random() * (config.maxSize - config.minSize) + config.minSize;
      const particle = this.particlePool.acquire();

      particle.id = `snowflake_${i}`;
      particle.position.x = Math.random() * DISPLAY_WIDTH;
      particle.position.y = Math.random() * TOTAL_DISPLAY_HEIGHT - TOTAL_DISPLAY_HEIGHT; // Start above screen
      particle.velocity.x = config.windSpeed * (Math.random() - 0.5);
      particle.velocity.y = config.fallSpeed * (0.5 + Math.random() * 0.5);
      particle.color = config.colors[Math.floor(Math.random() * config.colors.length)];
      particle.life = Infinity;
      particle.maxLife = Infinity;
      particle.size = size;
      particle.opacity = 0.8;

      state.particles.push(particle);
    }
  }

  private initializeStars(state: BackgroundAnimationState, config: NonNullable<BackgroundConfig['stars']>): void {
    // Release existing particles back to pool
    this.particlePool.releaseMultiple(state.particles);
    state.particles = [];

    // Limit star count for better performance
    const starCount = Math.min(config.count, 20);

    for (let i = 0; i < starCount; i++) {
      const particle = this.particlePool.acquire();

      particle.id = `star_${i}`;
      particle.position.x = Math.random() * DISPLAY_WIDTH;
      particle.position.y = Math.random() * TOTAL_DISPLAY_HEIGHT;
      particle.velocity.x = 0;
      particle.velocity.y = 0;
      particle.color = config.colors[Math.floor(Math.random() * config.colors.length)];
      particle.life = Infinity;
      particle.maxLife = Infinity;
      particle.size = 1;
      particle.opacity = Math.random() * (config.maxBrightness - config.minBrightness) + config.minBrightness;
      particle.twinklePhase = Math.random() * Math.PI * 2;

      state.particles.push(particle);
    }
  }

  private initializeMatrix(state: BackgroundAnimationState, config: NonNullable<BackgroundConfig['matrix']>): void {
    state.particles = [];
    state.matrixColumns = [];

    const pixelSize = 2; // Size of each matrix pixel/square
    const columnSpacing = pixelSize + 1; // Space between columns
    const columnCount = Math.floor(DISPLAY_WIDTH / columnSpacing);

    // Increase density for more dynamic pixel matrix effect
    const effectiveDensity = Math.min(config.characterDensity, 0.4);
    const activeColumns = Math.floor(columnCount * effectiveDensity);

    for (let i = 0; i < activeColumns; i++) {
      const x = Math.floor(Math.random() * columnCount) * columnSpacing;
      state.matrixColumns.push({
        x,
        y: Math.random() * TOTAL_DISPLAY_HEIGHT - config.trailLength * pixelSize,
        speed: config.fallSpeed * (0.5 + Math.random() * 0.5),
        pixelSize
      });
    }
  }

  public updateBackground(templateId: string, config: BackgroundConfig, deltaTime: number): void {
    const state = this.backgroundStates.get(templateId);
    if (!state) return;

    // Skip updates if deltaTime is too small or too large (avoid performance issues)
    if (deltaTime < 5 || deltaTime > 100) return;

    switch (config.type) {
      case 'fireworks':
        this.updateFireworks(state, config.fireworks!, deltaTime);
        break;
      case 'bubbles':
        this.updateBubbles(state, config.bubbles!, deltaTime);
        break;
      case 'gradient':
        this.updateGradient(state, config.gradient!, deltaTime);
        break;
      case 'matrix':
        this.updateMatrix(state, config.matrix!, deltaTime);
        break;
      case 'snow':
        this.updateSnow(state, config.snow!, deltaTime);
        break;
      case 'stars':
        this.updateStars(state, config.stars!, deltaTime);
        break;
    }

    // Update the state's last update time
    state.lastUpdate = Date.now();
  }

  private updateFireworks(state: BackgroundAnimationState, config: NonNullable<BackgroundConfig['fireworks']>, deltaTime: number): void {
    // Remove expired particles and return them to pool (batch operation)
    const expiredParticles: BackgroundParticle[] = [];
    state.particles = state.particles.filter(particle => {
      if (particle.life <= 0) {
        expiredParticles.push(particle);
        return false;
      }
      return true;
    });

    // Return expired particles to pool
    this.particlePool.releaseMultiple(expiredParticles);

    // Update existing particles with frame-rate independent movement
    const deltaSeconds = deltaTime / 1000;
    state.particles.forEach(particle => {
      particle.position.x += particle.velocity.x * deltaSeconds * 60; // 60fps normalization
      particle.position.y += particle.velocity.y * deltaSeconds * 60;
      particle.velocity.y += config.gravity * deltaSeconds * 60;
      particle.life -= deltaSeconds * 60;
      particle.opacity = Math.max(0, particle.life / particle.maxLife);
    });

    // Spawn new fireworks much more frequently for spectacular display
    // Multiply frequency by 3 for much more frequent explosions
    if (Math.random() < config.frequency * deltaSeconds * 3) {
      this.spawnFirework(state, config);
    }
  }

  private spawnFirework(state: BackgroundAnimationState, config: NonNullable<BackgroundConfig['fireworks']>): void {
    // Significantly increase particle limit for spectacular fireworks
    if (state.particles.length > 300) return;

    const explosionX = Math.random() * DISPLAY_WIDTH;
    const explosionY = Math.random() * TOTAL_DISPLAY_HEIGHT * 0.7; // Allow more of screen

    // Dramatically increase particle count per explosion
    const particleCount = Math.min(config.particleCount, 20);

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      // Add random angle variation for more natural spread
      const angleVariation = (Math.random() - 0.5) * 0.5;
      const finalAngle = angle + angleVariation;

      const speed = Math.random() * 3 + 1; // Increase speed range for more dynamic movement

      const particle = this.particlePool.acquire();
      particle.id = `firework_${Date.now()}_${i}`;
      particle.position.x = explosionX;
      particle.position.y = explosionY;
      particle.velocity.x = Math.cos(finalAngle) * speed;
      particle.velocity.y = Math.sin(finalAngle) * speed;
      particle.color = config.colors[Math.floor(Math.random() * config.colors.length)];
      particle.life = 60 + Math.random() * 20; // Variable lifetime for more variety
      particle.maxLife = particle.life;
      particle.size = Math.random() > 0.7 ? 2 : 1; // Some larger particles
      particle.opacity = 1;

      state.particles.push(particle);
    }
  }

  private updateBubbles(state: BackgroundAnimationState, config: NonNullable<BackgroundConfig['bubbles']>, deltaTime: number): void {
    const deltaSeconds = deltaTime / 1000;

    state.particles.forEach(particle => {
      // Frame-rate independent movement
      particle.position.x += particle.velocity.x * deltaSeconds * 60;
      particle.position.y += particle.velocity.y * deltaSeconds * 60;

      // Reset bubbles that go off screen
      if (particle.position.y < -particle.size) {
        particle.position.y = TOTAL_DISPLAY_HEIGHT + particle.size;
        particle.position.x = Math.random() * DISPLAY_WIDTH;
      }
      if (particle.position.x < -particle.size || particle.position.x > DISPLAY_WIDTH + particle.size) {
        particle.position.x = Math.random() * DISPLAY_WIDTH;
      }
    });
  }

  private updateGradient(state: BackgroundAnimationState, config: NonNullable<BackgroundConfig['gradient']>, deltaTime: number): void {
    if (!state.gradientPhase) state.gradientPhase = 0;
    state.gradientPhase += config.speed * deltaTime / 1000;
    if (state.gradientPhase > 1 && config.cyclic) {
      state.gradientPhase = 0;
    }
  }

  private updateMatrix(state: BackgroundAnimationState, config: NonNullable<BackgroundConfig['matrix']>, deltaTime: number): void {
    if (!state.matrixColumns) return;

    const deltaSeconds = deltaTime / 1000;

    state.matrixColumns.forEach(column => {
      // Frame-rate independent movement
      column.y += column.speed * deltaSeconds * 60;

      if (column.y > TOTAL_DISPLAY_HEIGHT + config.trailLength * column.pixelSize) {
        column.y = -config.trailLength * column.pixelSize;
        // Occasionally change position for more variety
        if (Math.random() < 0.05) {
          const columnSpacing = column.pixelSize + 1;
          const columnCount = Math.floor(DISPLAY_WIDTH / columnSpacing);
          column.x = Math.floor(Math.random() * columnCount) * columnSpacing;
        }
      }
    });
  }

  private updateSnow(state: BackgroundAnimationState, config: NonNullable<BackgroundConfig['snow']>, deltaTime: number): void {
    const deltaSeconds = deltaTime / 1000;

    state.particles.forEach(particle => {
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
  }

  private updateStars(state: BackgroundAnimationState, config: NonNullable<BackgroundConfig['stars']>, deltaTime: number): void {
    const deltaSeconds = deltaTime / 1000;

    state.particles.forEach(particle => {
      if (particle.twinklePhase !== undefined) {
        particle.twinklePhase += config.twinkleSpeed * deltaSeconds;

        // Cache sin calculation for better performance
        const sinValue = Math.sin(particle.twinklePhase);
        particle.opacity = config.minBrightness +
          (config.maxBrightness - config.minBrightness) *
          (sinValue + 1) * 0.5; // Multiply by 0.5 instead of divide by 2
      }
    });
  }

  public clearBackgroundState(templateId: string): void {
    this.backgroundStates.delete(templateId);
  }

  public clearAllBackgroundStates(): void {
    this.backgroundStates.clear();
  }
}

class AnimationManager {
  private animationStates: Map<string, AnimationState> = new Map();
  private static instance: AnimationManager;

  static getInstance(): AnimationManager {
    if (!AnimationManager.instance) {
      AnimationManager.instance = new AnimationManager();
    }
    return AnimationManager.instance;
  }

  public getAnimationState(elementId: string): AnimationState | undefined {
    return this.animationStates.get(elementId);
  }

  public updateAnimationState(elementId: string, state: AnimationState): void {
    this.animationStates.set(elementId, state);
  }

  public removeAnimationState(elementId: string): void {
    this.animationStates.delete(elementId);
  }

  public clearAllAnimationStates(): void {
    this.animationStates.clear();
  }

  public createOrUpdateState(element: Element, currentTime: number): AnimationState {
    let state = this.getAnimationState(element.id);

    if (!state) {
      // Initialize new animation state
      state = {
        elementId: element.id,
        startTime: currentTime,
        currentTime,
        velocity: { x: 0, y: 0 },
        phase: 0,
        bounceCount: 0,
        lastPosition: { ...element.position }
      };

      // Initialize based on animation type
      if (element.animation?.type === 'dvd-logo') {
        const speed = element.animation.speed || 2;
        state.velocity = {
          x: speed * (Math.random() > 0.5 ? 1 : -1),
          y: speed * (Math.random() > 0.5 ? 1 : -1)
        };
        // For dual display mode, ensure we start with velocity that can reach all areas
        // If starting near the boundary between displays (y: 32), ensure it moves toward bottom display
        if (element.position.y >= 30 && element.position.y <= 35) {
          state.velocity.y = speed; // Move down toward display 2
        }
      } else if (element.animation?.type === 'fireworks') {
        state.particles = [];
      }
    } else {
      state.currentTime = currentTime;
    }

    this.updateAnimationState(element.id, state);
    return state;
  }

  public spawnFireworksParticles(state: AnimationState, config: EffectConfig['fireworks'], spawnPos: Position): void {
    if (!config) return;

    const particleCount = config.particleCount || 15;
    const explosionSize = config.explosionSize || 20;
    const colors = config.colors || ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = Math.random() * 3 + 1;

      const particle: Particle = {
        id: `${state.elementId}_particle_${Date.now()}_${i}`,
        position: { ...spawnPos },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed
        },
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 60, // 60 frames at 60fps = 1 second
        maxLife: 60,
        size: Math.random() * 2 + 1
      };

      if (!state.particles) state.particles = [];
      state.particles.push(particle);
    }
  }

  public updateParticles(state: AnimationState, gravity: number = 0.1): void {
    if (!state.particles) return;

    state.particles = state.particles.filter(particle => {
      // Update position
      particle.position.x += particle.velocity.x;
      particle.position.y += particle.velocity.y;

      // Apply gravity
      particle.velocity.y += gravity;

      // Decrease life
      particle.life--;

      // Remove dead particles
      return particle.life > 0;
    });
  }
}

export class CanvasRenderer {
  private canvas: Canvas;
  private ctx: CanvasRenderingContext2D;
  private dualCanvas: Canvas;
  private dualCtx: CanvasRenderingContext2D;
  private animationManager: AnimationManager;
  private backgroundAnimationManager: BackgroundAnimationManager;

  constructor() {
    this.canvas = createCanvas(DISPLAY_WIDTH, DISPLAY_HEIGHT);
    this.ctx = this.canvas.getContext('2d');

    // Canvas for dual display rendering (128x64)
    this.dualCanvas = createCanvas(DISPLAY_WIDTH, TOTAL_DISPLAY_HEIGHT);
    this.dualCtx = this.dualCanvas.getContext('2d');

    this.animationManager = AnimationManager.getInstance();
    this.backgroundAnimationManager = BackgroundAnimationManager.getInstance();
  }

  public clearAnimationStates(): void {
    this.animationManager.clearAllAnimationStates();
  }

  private getBackgroundConfig(template: Template): BackgroundConfig {
    // Use new backgroundConfig if available, otherwise fall back to legacy background color
    if (template.backgroundConfig) {
      return template.backgroundConfig;
    }

    // Default solid background for backward compatibility
    return {
      type: 'solid',
      solid: {
        color: template.background || '#000000'
      }
    };
  }

  private renderBackground(ctx: CanvasRenderingContext2D, template: Template, width: number, height: number): void {
    const backgroundConfig = this.getBackgroundConfig(template);
    const templateId = template.id?.toString() || 'preview';

    // Update background animation state
    if (backgroundConfig.type !== 'solid') {
      const currentTime = Date.now();

      // Get or create state without updating lastUpdate yet
      let state = this.backgroundAnimationManager.getBackgroundState(templateId);
      if (!state || state.backgroundType !== backgroundConfig.type) {
        state = this.backgroundAnimationManager.createOrUpdateBackgroundState(templateId, backgroundConfig);
      }

      const deltaTime = currentTime - state.lastUpdate;
      const effectiveDeltaTime = deltaTime > 0 ? Math.min(deltaTime, 100) : 16;

      this.backgroundAnimationManager.updateBackground(templateId, backgroundConfig, effectiveDeltaTime);
    }

    // Render background based on type
    switch (backgroundConfig.type) {
      case 'solid':
        ctx.fillStyle = backgroundConfig.solid?.color || '#000000';
        ctx.fillRect(0, 0, width, height);
        break;

      case 'gradient':
        this.renderGradientBackground(ctx, backgroundConfig.gradient!, width, height, templateId);
        break;

      case 'fireworks':
      case 'bubbles':
      case 'snow':
      case 'stars':
        // Clear with black background first
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
        this.renderParticleBackground(ctx, backgroundConfig, templateId);
        break;

      case 'matrix':
        this.renderMatrixBackground(ctx, backgroundConfig.matrix!, width, height, templateId);
        break;
    }
  }

  private renderGradientBackground(ctx: CanvasRenderingContext2D, config: NonNullable<BackgroundConfig['gradient']>, width: number, height: number, templateId: string): void {
    const state = this.backgroundAnimationManager.getBackgroundState(templateId);
    const phase = state?.gradientPhase || 0;

    // Create cache key based on direction and dimensions
    const baseCacheKey = `${config.direction}_${width}_${height}`;
    const gradient = this.backgroundAnimationManager.getOrCreateGradient(ctx, baseCacheKey, config.direction, width, height);

    // Clear previous color stops if cached gradient exists (Canvas doesn't support this, so we create new if animated)
    if (config.cyclic && phase > 0) {
      // For animated gradients, we can't cache them effectively, create new each time
      let animatedGradient: CanvasGradient;
      switch (config.direction) {
        case 'horizontal':
          animatedGradient = ctx.createLinearGradient(0, 0, width, 0);
          break;
        case 'vertical':
          animatedGradient = ctx.createLinearGradient(0, 0, 0, height);
          break;
        case 'diagonal':
          animatedGradient = ctx.createLinearGradient(0, 0, width, height);
          break;
        case 'radial':
          animatedGradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height)/2);
          break;
        default:
          animatedGradient = ctx.createLinearGradient(0, 0, width, 0);
      }

      // Apply colors with animation phase
      config.colors.forEach((color, index) => {
        let position = index / (config.colors.length - 1);
        position = (position + phase) % 1;
        animatedGradient.addColorStop(Math.max(0, Math.min(1, position)), color);
      });

      ctx.fillStyle = animatedGradient;
    } else {
      // Use cached gradient for static gradients
      config.colors.forEach((color, index) => {
        let position = index / (config.colors.length - 1);
        gradient.addColorStop(Math.max(0, Math.min(1, position)), color);
      });

      ctx.fillStyle = gradient;
    }

    ctx.fillRect(0, 0, width, height);
  }

  private renderParticleBackground(ctx: CanvasRenderingContext2D, config: BackgroundConfig, templateId: string): void {
    const state = this.backgroundAnimationManager.getBackgroundState(templateId);
    if (!state?.particles || state.particles.length === 0) return;

    // Batch rendering by particle type and color to reduce context switches
    const particlesByColor = new Map<string, BackgroundParticle[]>();

    state.particles.forEach(particle => {
      const key = `${particle.color}_${particle.opacity}`;
      if (!particlesByColor.has(key)) {
        particlesByColor.set(key, []);
      }
      particlesByColor.get(key)!.push(particle);
    });

    // Render particles in batches by color/opacity
    particlesByColor.forEach((particles, colorKey) => {
      if (particles.length === 0) return;

      const firstParticle = particles[0];
      ctx.globalAlpha = firstParticle.opacity;
      ctx.fillStyle = firstParticle.color;

      if (config.type === 'bubbles') {
        // Batch render circles
        ctx.beginPath();
        particles.forEach(particle => {
          ctx.moveTo(particle.position.x + particle.size, particle.position.y);
          ctx.arc(particle.position.x, particle.position.y, particle.size, 0, Math.PI * 2);
        });
        ctx.fill();
      } else {
        // Batch render rectangles
        particles.forEach(particle => {
          ctx.fillRect(particle.position.x, particle.position.y, particle.size, particle.size);
        });
      }
    });

    // Reset alpha
    ctx.globalAlpha = 1.0;
  }

  private renderMatrixBackground(ctx: CanvasRenderingContext2D, config: NonNullable<BackgroundConfig['matrix']>, width: number, height: number, templateId: string): void {
    // Clear with black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    const state = this.backgroundAnimationManager.getBackgroundState(templateId);
    if (!state?.matrixColumns || state.matrixColumns.length === 0) return;

    // Batch render by color/alpha to reduce context switches
    const renderBatches = new Map<string, Array<{x: number, y: number, size: number}>>();

    state.matrixColumns.forEach(column => {
      // Render trail of pixel squares
      for (let i = 0; i < config.trailLength; i++) {
        const y = column.y - i * (column.pixelSize + 1);
        if (y >= 0 && y < height) {
          const alpha = 1 - (i / config.trailLength);
          const colorIndex = Math.floor(alpha * (config.colors.length - 1));
          const color = config.colors[colorIndex] || config.colors[0];
          const key = `${color}_${alpha.toFixed(2)}`;

          if (!renderBatches.has(key)) {
            renderBatches.set(key, []);
          }
          renderBatches.get(key)!.push({x: column.x, y, size: column.pixelSize});
        }
      }
    });

    // Render pixel squares in batches by color/alpha
    renderBatches.forEach((pixels, key) => {
      const [color, alphaStr] = key.split('_');
      ctx.globalAlpha = parseFloat(alphaStr);
      ctx.fillStyle = color;

      pixels.forEach(({x, y, size}) => {
        ctx.fillRect(x, y, size, size);
      });
    });

    ctx.globalAlpha = 1;
  }

  public async renderTemplate(template: Template, dataValues?: Record<string, any>): Promise<Buffer> {
    // Configure animated icon manager with template's update interval
    weatherAnimatedIconManager.setUpdateInterval(template.updateInterval);

    // Update all animated icons
    weatherAnimatedIconManager.updateAllIcons(Date.now());

    // Render background
    this.renderBackground(this.ctx, template, DISPLAY_WIDTH, DISPLAY_HEIGHT);

    // Sort elements by z-index if needed
    const sortedElements = [...template.elements].sort((a, b) => {
      const aZ = (a as any).zIndex || 0;
      const bZ = (b as any).zIndex || 0;
      return aZ - bZ;
    });

    // Render each element
    for (const element of sortedElements) {
      if (!element.visible) continue;

      await this.renderElement(element, dataValues);
    }

    // Get raw RGBA buffer and swap red/blue channels to fix color display
    const rawBuffer = this.canvas.toBuffer('raw');
    const brightness = websocketServer.getBrightness();
    return this.swapRedBlueChannels(rawBuffer, brightness);
  }

  private async renderElement(element: Element, dataValues?: Record<string, any>): Promise<void> {
    const pos = this.applyAnimation(element);

    switch (element.type) {
      case 'text':
        this.renderText(element, pos);
        break;
      case 'data':
        this.renderDataField(element, pos, dataValues);
        break;
      case 'icon':
        await this.renderIcon(element, pos, dataValues);
        break;
      case 'shape':
        this.renderShape(element, pos);
        break;
    }
  }

  private async renderElementToDualCanvas(element: Element, dataValues?: Record<string, any>, displayMode?: string): Promise<void> {
    // Save current context
    const originalCtx = this.ctx;

    // Switch to dual canvas context for unified rendering
    this.ctx = this.dualCtx;

    const pos = this.applyAnimation(element, displayMode);

    switch (element.type) {
      case 'text':
        this.renderText(element, pos);
        break;
      case 'data':
        this.renderDataField(element, pos, dataValues);
        break;
      case 'icon':
        await this.renderIcon(element, pos, dataValues);
        break;
      case 'shape':
        this.renderShape(element, pos);
        break;
    }

    // Restore original context
    this.ctx = originalCtx;
  }

  private renderText(element: Element, pos: Position): void {
    if (!element.text) return;

    const style = element.style || {};
    let color = style.color || '#FFFFFF';

    // Apply animation-based color changes
    if (element.animation) {
      color = this.getAnimatedColor(element, color);
    }

    this.ctx.fillStyle = color;
    // Use monospace as default to match template specification
    this.ctx.font = `${style.fontSize || 12}px ${style.fontFamily || 'monospace'}`;
    this.ctx.fillText(element.text, pos.x, pos.y);
  }

  private getAnimatedColor(element: Element, baseColor: string): string {
    if (!element.animation) return baseColor;

    const state = this.animationManager.getAnimationState(element.id);
    if (!state) return baseColor;

    switch (element.animation.type) {
      case 'dvd-logo':
        return this.getDVDLogoColor(element, state, baseColor);

      case 'rainbow':
        return this.getRainbowColor(element, state);

      default:
        return baseColor;
    }
  }

  private getDVDLogoColor(element: Element, state: AnimationState, baseColor: string): string {
    const config = element.effectConfig?.dvdLogo;
    if (!config || !config.bounceColorChange) return baseColor;

    const colors = config.colors || ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
    const colorIndex = state.bounceCount % colors.length;
    return colors[colorIndex];
  }

  private getRainbowColor(element: Element, state: AnimationState): string {
    const config = element.effectConfig?.rainbow;
    if (!config) return '#FFFFFF';

    const currentTime = Date.now();
    const speed = config.speed || 1;
    const hueRange = config.hueRange || [0, 360];
    const saturation = config.saturation || 100;
    const brightness = config.brightness || 50;

    // Calculate hue based on time
    const hue = ((currentTime / 1000 * speed * 60) % (hueRange[1] - hueRange[0])) + hueRange[0];

    return `hsl(${hue}, ${saturation}%, ${brightness}%)`;
  }

  private renderDataField(element: Element, pos: Position, dataValues?: Record<string, any>): void {
    if (!element.dataSource) return;

    // Use shared formatter for consistent rendering
    const value = DataFormatter.processDataElement(
      element.dataSource,
      dataValues,
      (element as any).format,
      element.timezone
    );

    const style = element.style || {};
    this.ctx.fillStyle = style.color || '#FFFFFF';
    // Use monospace as default to match template specification
    this.ctx.font = `${style.fontSize || 12}px ${style.fontFamily || 'monospace'}`;
    this.ctx.fillText(value, pos.x, pos.y);
  }

  private async renderIcon(element: Element, pos: Position, dataValues?: Record<string, any>): Promise<void> {
    const size = element.size || { width: 16, height: 16 };

    // Check if this is an animated weather icon
    if (element.animated && element.weatherIconType) {
      await this.renderAnimatedWeatherIcon(element, pos, size, dataValues);
      return;
    }

    // Fallback to regular icon rendering
    if (!element.src) return;

    try {
      const imagePath = path.join(process.cwd(), 'server', 'assets', element.src);
      const image = await loadImage(imagePath);
      this.ctx.drawImage(image, pos.x, pos.y, size.width, size.height);
    } catch (error) {
      console.error(`Failed to load icon: ${element.src}`, error);
    }
  }

  private async renderAnimatedWeatherIcon(element: Element, pos: Position, size: { width: number; height: number }, dataValues?: Record<string, any>): Promise<void> {
    // Get weather condition code from data source or fallback
    let conditionCode = 'clearsky_day';

    if (element.dataSource && dataValues) {
      // Use shared formatter to get the actual condition code
      const value = DataFormatter.getDataValue(element.dataSource, dataValues);
      if (value && typeof value === 'string') {
        conditionCode = value;
      }
    }

    // For sunrise/sunset, we don't need condition code from data
    if (element.weatherIconType === 'sunrise' || element.weatherIconType === 'sunset') {
      conditionCode = element.weatherIconType;
    }

    try {
      const animatedIcon = weatherAnimatedIconManager.getAnimatedIcon(conditionCode, element.weatherIconType!);

      if (animatedIcon) {
        await animatedIcon.ensureLoaded();
        const currentFrame = animatedIcon.getCurrentFrame();

        if (currentFrame) {
          this.ctx.drawImage(currentFrame, pos.x, pos.y, size.width, size.height);
          return;
        }
      }
    } catch (error) {
      console.warn(`Failed to render animated weather icon for ${element.weatherIconType}:`, error);
    }

    // Fallback to static icon if animated version fails
    if (element.src) {
      try {
        const imagePath = path.join(process.cwd(), 'server', 'assets', element.src);
        const image = await loadImage(imagePath);
        this.ctx.drawImage(image, pos.x, pos.y, size.width, size.height);
      } catch (error) {
        console.error(`Failed to load fallback icon: ${element.src}`, error);
      }
    }
  }

  private renderShape(element: Element, pos: Position): void {
    const style = element.style || {};
    const size = element.size || { width: 10, height: 10 };

    this.ctx.strokeStyle = style.borderColor || style.color || '#FFFFFF';
    this.ctx.lineWidth = style.borderWidth || 1;

    if (style.backgroundColor) {
      this.ctx.fillStyle = style.backgroundColor;
    }

    switch (element.shape) {
      case 'rectangle':
        if (style.backgroundColor) {
          this.ctx.fillRect(pos.x, pos.y, size.width, size.height);
        }
        this.ctx.strokeRect(pos.x, pos.y, size.width, size.height);
        break;
      case 'circle':
        const radius = Math.min(size.width, size.height) / 2;
        this.ctx.beginPath();
        this.ctx.arc(pos.x + radius, pos.y + radius, radius, 0, Math.PI * 2);
        if (style.backgroundColor) {
          this.ctx.fill();
        }
        this.ctx.stroke();
        break;
      case 'line':
        this.ctx.beginPath();
        this.ctx.moveTo(pos.x, pos.y);
        this.ctx.lineTo(pos.x + size.width, pos.y + size.height);
        this.ctx.stroke();
        break;
    }
  }

  private applyAnimation(element: Element, displayMode?: string): Position {
    if (!element.animation || element.animation.type === 'none') {
      return element.position;
    }

    const currentTime = Date.now();
    const state = this.animationManager.createOrUpdateState(element, currentTime);
    const deltaTime = currentTime - state.startTime;

    switch (element.animation.type) {
      case 'dvd-logo':
        return this.applyDVDLogoAnimation(element, state, displayMode);

      case 'bounce':
        return this.applyBounceAnimation(element, state, deltaTime);

      case 'rainbow':
        // Rainbow doesn't change position, just affects rendering color
        return element.position;

      case 'slide':
        return this.applySlideAnimation(element, state, deltaTime);

      default:
        return element.position;
    }
  }

  private applyDVDLogoAnimation(element: Element, state: AnimationState, displayMode?: string): Position {
    const speed = element.animation?.speed || 2;

    // Calculate new position
    let newX = state.lastPosition!.x + state.velocity.x;
    let newY = state.lastPosition!.y + state.velocity.y;

    // Check for boundary collisions
    const textWidth = element.text ? element.text.length * (element.style?.fontSize || 12) * 0.6 : 20;
    const textHeight = element.style?.fontSize || 12;

    // Get display bounds based on display mode - use full space for cross-display animations
    const maxX = DISPLAY_WIDTH - textWidth;
    const maxY = (displayMode === 'dual') ? TOTAL_DISPLAY_HEIGHT : DISPLAY_HEIGHT;

    // For text rendering, Y position is the baseline, so we need to account for this:
    // - To reach the very top, we need to allow baseline to be closer to 0
    // - To reach the very bottom, baseline should be at maxY
    const minY = Math.max(1, textHeight * 0.8); // Allow text to reach very close to top
    const actualMaxY = maxY;

    // Debug logging
    if (element.id === 'dvd-logo') {
      console.log(`DVD Logo: displayMode=${displayMode}, minY=${minY}, maxY=${actualMaxY}, currentY=${newY}, textHeight=${textHeight}`);
    }

    let bounced = false;

    // X boundary collision
    if (newX <= 0) {
      newX = 0;
      state.velocity.x = Math.abs(state.velocity.x);
      bounced = true;
    } else if (newX >= maxX) {
      newX = maxX;
      state.velocity.x = -Math.abs(state.velocity.x);
      bounced = true;
    }

    // Y boundary collision - account for text baseline positioning
    if (newY <= minY) {
      newY = minY;
      state.velocity.y = Math.abs(state.velocity.y);
      bounced = true;
    } else if (newY >= actualMaxY) {
      newY = actualMaxY;
      state.velocity.y = -Math.abs(state.velocity.y);
      bounced = true;
    }

    if (bounced) {
      state.bounceCount++;
    }

    // Update state
    state.lastPosition = { x: newX, y: newY };
    this.animationManager.updateAnimationState(element.id, state);

    return { x: newX, y: newY };
  }

  private applyBounceAnimation(element: Element, state: AnimationState, deltaTime: number): Position {
    const amplitude = element.animation?.amplitude || 10;
    const speed = element.animation?.speed || 1;

    const bounceY = Math.sin((deltaTime / 1000) * speed * Math.PI * 2) * amplitude;

    return {
      x: element.position.x,
      y: element.position.y + bounceY
    };
  }

  private applySlideAnimation(element: Element, state: AnimationState, deltaTime: number): Position {
    const speed = element.animation?.speed || 30; // pixels per second
    const direction = element.animation?.direction || 'normal';

    let offsetX = (deltaTime / 1000) * speed;

    if (direction === 'reverse') {
      offsetX = -offsetX;
    }

    return {
      x: element.position.x + offsetX,
      y: element.position.y
    };
  }

  private swapRedBlueChannels(buffer: Buffer, brightness?: number): Buffer {
    // Create a copy of the buffer to avoid modifying the original
    const swappedBuffer = Buffer.from(buffer);

    // Calculate brightness factor (default to 100% if not provided)
    const brightnessFactor = brightness ? brightness / 100 : 1.0;

    // RGBA format: each pixel is 4 bytes (R, G, B, A)
    // We need to swap R (index 0) with B (index 2) for each pixel and apply brightness
    for (let i = 0; i < swappedBuffer.length; i += 4) {
      const red = swappedBuffer[i];     // Original red channel
      const green = swappedBuffer[i + 1]; // Original green channel
      const blue = swappedBuffer[i + 2]; // Original blue channel

      // Apply brightness and swap red/blue channels
      swappedBuffer[i] = Math.round(blue * brightnessFactor);      // Put dimmed blue in red position
      swappedBuffer[i + 1] = Math.round(green * brightnessFactor); // Apply brightness to green
      swappedBuffer[i + 2] = Math.round(red * brightnessFactor);   // Put dimmed red in blue position
      // Alpha (i + 3) remains unchanged
    }

    return swappedBuffer;
  }


  public async renderTemplateForDisplay(template: Template, displayId: 'display1' | 'display2', dataValues?: Record<string, any>): Promise<Buffer> {
    // Configure animated icon manager with template's update interval
    weatherAnimatedIconManager.setUpdateInterval(template.updateInterval);

    // Update all animated icons
    weatherAnimatedIconManager.updateAllIcons(Date.now());

    // Render background
    this.renderBackground(this.ctx, template, DISPLAY_WIDTH, DISPLAY_HEIGHT);

    // Filter elements based on position only (seamless based on Y coordinate)
    const relevantElements = template.elements.filter(element => {
      if (!element.visible) return false;

      // Check position bounds for the display
      if (displayId === 'display1') {
        return element.position.y >= 0 && element.position.y < DISPLAY_HEIGHT;
      } else {
        // For display2, elements should be positioned for the second display (y: 32-63)
        return element.position.y >= DISPLAY_HEIGHT && element.position.y < TOTAL_DISPLAY_HEIGHT;
      }
    });

    // Sort elements by z-index if needed
    const sortedElements = [...relevantElements].sort((a, b) => {
      const aZ = (a as any).zIndex || 0;
      const bZ = (b as any).zIndex || 0;
      return aZ - bZ;
    });

    // Render each relevant element
    for (const element of sortedElements) {
      // Adjust position for display2 elements (shift y position)
      const adjustedElement = { ...element };
      if (displayId === 'display2' && element.position.y >= DISPLAY_HEIGHT) {
        adjustedElement.position = {
          ...element.position,
          y: element.position.y - DISPLAY_HEIGHT
        };
      }

      await this.renderElement(adjustedElement, dataValues);
    }

    // Get raw RGBA buffer and swap red/blue channels to fix color display
    const rawBuffer = this.canvas.toBuffer('raw');
    const brightness = websocketServer.getBrightness();
    return this.swapRedBlueChannels(rawBuffer, brightness);
  }

  public async renderDualDisplayTemplate(template: Template, dataValues?: Record<string, any>): Promise<{ display1: Buffer; display2: Buffer }> {
    // Configure animated icon manager with template's update interval
    weatherAnimatedIconManager.setUpdateInterval(template.updateInterval);

    // Update all animated icons
    weatherAnimatedIconManager.updateAllIcons(Date.now());

    // Render background on dual canvas
    this.renderBackground(this.dualCtx, template, DISPLAY_WIDTH, TOTAL_DISPLAY_HEIGHT);

    // Render all visible elements to the unified canvas
    // No filtering by display bounds - elements can naturally overlap both displays
    const visibleElements = template.elements.filter(element => element.visible);

    // Sort elements by z-index if needed
    const sortedElements = [...visibleElements].sort((a, b) => {
      const aZ = (a as any).zIndex || 0;
      const bZ = (b as any).zIndex || 0;
      return aZ - bZ;
    });

    // Render each element in the unified 128x64 coordinate space
    for (const element of sortedElements) {
      await this.renderElementToDualCanvas(element, dataValues, template.displayMode);
    }

    // Extract display portions from the unified canvas
    const unifiedBuffer = this.dualCanvas.toBuffer('raw');
    const brightness = websocketServer.getBrightness();
    const swappedUnifiedBuffer = this.swapRedBlueChannels(unifiedBuffer, brightness);

    // Extract top half (display1: 0,0,128,32)
    const display1Buffer = Buffer.alloc(FRAME_SIZE);
    for (let y = 0; y < DISPLAY_HEIGHT; y++) {
      const sourceRowStart = y * DISPLAY_WIDTH * 4;
      const destRowStart = y * DISPLAY_WIDTH * 4;
      swappedUnifiedBuffer.copy(display1Buffer, destRowStart, sourceRowStart, sourceRowStart + DISPLAY_WIDTH * 4);
    }

    // Extract bottom half (display2: 0,32,128,32)
    const display2Buffer = Buffer.alloc(FRAME_SIZE);
    for (let y = 0; y < DISPLAY_HEIGHT; y++) {
      const sourceRowStart = (y + DISPLAY_HEIGHT) * DISPLAY_WIDTH * 4;
      const destRowStart = y * DISPLAY_WIDTH * 4;
      swappedUnifiedBuffer.copy(display2Buffer, destRowStart, sourceRowStart, sourceRowStart + DISPLAY_WIDTH * 4);
    }

    return {
      display1: display1Buffer,
      display2: display2Buffer
    };
  }

  public async renderTestFrame(): Promise<Buffer> {
    // Clear canvas
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);

    // Draw test pattern
    this.ctx.fillStyle = '#00FF00';
    this.ctx.font = '14px monospace';
    this.ctx.fillText('MQTT LED', 2, 16);

    this.ctx.fillStyle = '#FFFF00';
    this.ctx.font = '10px monospace';
    const time = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    this.ctx.fillText(time, 2, 28);

    // Draw border
    this.ctx.strokeStyle = '#FF0000';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(0, 0, DISPLAY_WIDTH - 1, DISPLAY_HEIGHT - 1);

    // Get raw RGBA buffer and swap red/blue channels to fix color display
    const rawBuffer = this.canvas.toBuffer('raw');
    const brightness = websocketServer.getBrightness();
    return this.swapRedBlueChannels(rawBuffer, brightness);
  }

  public async renderTestFrameForDisplay(displayId: 'display1' | 'display2'): Promise<Buffer> {
    // Clear canvas
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);

    // Draw test pattern specific to display
    this.ctx.fillStyle = displayId === 'display1' ? '#00FF00' : '#0000FF';
    this.ctx.font = '14px monospace';
    this.ctx.fillText(displayId.toUpperCase(), 2, 16);

    this.ctx.fillStyle = '#FFFF00';
    this.ctx.font = '10px monospace';
    const time = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    this.ctx.fillText(time, 2, 28);

    // Draw border in different colors
    this.ctx.strokeStyle = displayId === 'display1' ? '#FF0000' : '#FF00FF';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(0, 0, DISPLAY_WIDTH - 1, DISPLAY_HEIGHT - 1);

    // Get raw RGBA buffer and swap red/blue channels to fix color display
    const rawBuffer = this.canvas.toBuffer('raw');
    const brightness = websocketServer.getBrightness();
    return this.swapRedBlueChannels(rawBuffer, brightness);
  }
}

export const canvasRenderer = new CanvasRenderer();