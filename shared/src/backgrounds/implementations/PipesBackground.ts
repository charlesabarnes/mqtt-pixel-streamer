import { BackgroundConfig, BackgroundParticle, DISPLAY_WIDTH, TOTAL_DISPLAY_HEIGHT, Position } from '../../types';
import { BaseBackground } from '../BaseBackground';
import { ICanvasContext, IRenderOptions, IPlatformUtils } from '../types';

export class PipesBackground extends BaseBackground {
  private config!: NonNullable<BackgroundConfig['pipes']>;
  private pipeSegments: BackgroundParticle[] = [];

  constructor(platformUtils: IPlatformUtils = {}) {
    super(platformUtils);
  }

  initialize(config: BackgroundConfig): void {
    if (config.type === 'pipes' && config.pipes) {
      this.config = config.pipes;
      this.pipeSegments = [];

      // Start with a few initial pipes
      const initialPipes = Math.min(2, this.config.maxPipes);
      for (let i = 0; i < initialPipes; i++) {
        const startX = Math.floor(Math.random() * (DISPLAY_WIDTH / this.config.pipeWidth)) * this.config.pipeWidth;
        const startY = Math.floor(Math.random() * (TOTAL_DISPLAY_HEIGHT / this.config.pipeWidth)) * this.config.pipeWidth;
        const directions: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right'];

        const particle = this.acquireParticle();
        particle.id = `pipe_${i}`;
        particle.position = { x: startX, y: startY };
        particle.color = this.config.colors[Math.floor(Math.random() * this.config.colors.length)];
        particle.life = this.config.pipeLifetime;
        particle.maxLife = this.config.pipeLifetime;
        particle.size = this.config.pipeWidth;
        particle.opacity = 1;
        particle.direction = directions[Math.floor(Math.random() * directions.length)];
        particle.segments = [{ x: startX, y: startY }];
        particle.isGrowing = true;

        this.pipeSegments.push(particle);
      }
    }
  }

  update(deltaTime: number): void {
    if (!this.config || this.pipeSegments.length === 0) return;

    // Skip updates if deltaTime is too small or too large
    if (deltaTime < 5 || deltaTime > 100) return;

    const deltaSeconds = deltaTime / 1000;
    const growthFrames = Math.ceil(deltaSeconds * 60 / this.config.growthSpeed);

    // Update existing pipes
    this.pipeSegments.forEach(pipe => {
      if (!pipe.isGrowing || !pipe.segments) return;

      for (let i = 0; i < growthFrames; i++) {
        const lastSegment = pipe.segments[pipe.segments.length - 1];
        let newX = lastSegment.x;
        let newY = lastSegment.y;

        // Move in current direction
        switch (pipe.direction) {
          case 'up':
            newY -= this.config.pipeWidth;
            break;
          case 'down':
            newY += this.config.pipeWidth;
            break;
          case 'left':
            newX -= this.config.pipeWidth;
            break;
          case 'right':
            newX += this.config.pipeWidth;
            break;
        }

        // Check bounds and possibly turn
        let shouldTurn = false;
        if (newX < 0 || newX >= DISPLAY_WIDTH || newY < 0 || newY >= TOTAL_DISPLAY_HEIGHT) {
          shouldTurn = true;
        } else if (Math.random() < this.config.turnProbability) {
          shouldTurn = true;
        }

        if (shouldTurn) {
          // Choose a new valid direction
          const validDirections: Array<'up' | 'down' | 'left' | 'right'> = [];
          if (lastSegment.x >= this.config.pipeWidth) validDirections.push('left');
          if (lastSegment.x < DISPLAY_WIDTH - this.config.pipeWidth) validDirections.push('right');
          if (lastSegment.y >= this.config.pipeWidth) validDirections.push('up');
          if (lastSegment.y < TOTAL_DISPLAY_HEIGHT - this.config.pipeWidth) validDirections.push('down');

          if (validDirections.length > 0) {
            pipe.direction = validDirections[Math.floor(Math.random() * validDirections.length)];
            // Recalculate position with new direction
            newX = lastSegment.x;
            newY = lastSegment.y;
            switch (pipe.direction) {
              case 'up':
                newY -= this.config.pipeWidth;
                break;
              case 'down':
                newY += this.config.pipeWidth;
                break;
              case 'left':
                newX -= this.config.pipeWidth;
                break;
              case 'right':
                newX += this.config.pipeWidth;
                break;
            }
          } else {
            pipe.isGrowing = false;
            continue;
          }
        }

        // Add the new segment if valid
        if (newX >= 0 && newX < DISPLAY_WIDTH && newY >= 0 && newY < TOTAL_DISPLAY_HEIGHT) {
          pipe.segments.push({ x: newX, y: newY });
        } else {
          pipe.isGrowing = false;
        }

        // Limit segment length (use fixed value since config doesn't have maxLength)
        const maxLength = 20;
        if (pipe.segments.length > maxLength) {
          pipe.segments.shift();
        }
      }

      // Update pipe lifecycle
      pipe.life -= deltaSeconds * 60;
      if (pipe.life <= 0) {
        pipe.isGrowing = false;
      }
    });

    // Remove dead pipes and spawn new ones
    const usePooling = !!this.platformUtils;
    if (usePooling) {
      const deadPipes = this.pipeSegments.filter(pipe => pipe.life <= 0 && !pipe.isGrowing);
      this.pipeSegments = this.pipeSegments.filter(pipe => pipe.life > 0 || pipe.isGrowing);
      this.releaseMultipleParticles(deadPipes);
    } else {
      this.pipeSegments = this.pipeSegments.filter(pipe => pipe.life > 0 || pipe.isGrowing);
    }

    // Spawn new pipes if needed
    if (this.pipeSegments.length < this.config.maxPipes && Math.random() < 0.02) {
      this.spawnNewPipe();
    }

    this.lastUpdate = Date.now();
  }

  private spawnNewPipe(): void {
    const startX = Math.floor(Math.random() * (DISPLAY_WIDTH / this.config.pipeWidth)) * this.config.pipeWidth;
    const startY = Math.floor(Math.random() * (TOTAL_DISPLAY_HEIGHT / this.config.pipeWidth)) * this.config.pipeWidth;
    const directions: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right'];

    const particle = this.acquireParticle();
    particle.id = `pipe_${Date.now()}`;
    particle.position = { x: startX, y: startY };
    particle.color = this.config.colors[Math.floor(Math.random() * this.config.colors.length)];
    particle.life = this.config.pipeLifetime;
    particle.maxLife = this.config.pipeLifetime;
    particle.size = this.config.pipeWidth;
    particle.opacity = 1;
    particle.direction = directions[Math.floor(Math.random() * directions.length)];
    particle.segments = [{ x: startX, y: startY }];
    particle.isGrowing = true;

    this.pipeSegments.push(particle);
  }

  render(ctx: ICanvasContext, width: number, height: number, options?: IRenderOptions): void {
    // Clear with black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    const brightness = options?.brightness ?? 100;

    this.pipeSegments.forEach(pipe => {
      if (!pipe.segments) return;

      ctx.save();
      ctx.globalAlpha = pipe.opacity * (brightness / 100);
      ctx.fillStyle = this.applyBrightness(pipe.color, brightness);

      pipe.segments.forEach(segment => {
        ctx.fillRect(segment.x, segment.y, pipe.size, pipe.size);
      });

      ctx.restore();
    });
  }

  cleanup(): void {
    super.cleanup();
    if (this.platformUtils) {
      this.releaseMultipleParticles(this.pipeSegments);
    }
    this.pipeSegments = [];
  }

  getState(): any {
    return {
      ...super.getState(),
      config: this.config,
      pipeCount: this.pipeSegments.length
    };
  }
}