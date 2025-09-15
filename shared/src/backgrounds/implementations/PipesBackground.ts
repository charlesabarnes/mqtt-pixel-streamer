import { BackgroundConfig, BackgroundParticle, DISPLAY_WIDTH, TOTAL_DISPLAY_HEIGHT, Position } from '../../types';
import { BaseBackground } from '../BaseBackground';
import { ICanvasContext, IRenderOptions, IPlatformUtils } from '../types';

export class PipesBackground extends BaseBackground {
  private config!: NonNullable<BackgroundConfig['pipes']>;
  private pipeSegments: BackgroundParticle[] = [];
  private deadPipes: BackgroundParticle[] = []; // pipes that stopped growing but persist

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
        let shouldWrap = false;

        if (newX < 0 || newX >= DISPLAY_WIDTH || newY < 0 || newY >= TOTAL_DISPLAY_HEIGHT) {
          if (this.config.wrapAround) {
            shouldWrap = true;
          } else {
            shouldTurn = true;
          }
        } else if (Math.random() < this.config.turnProbability) {
          shouldTurn = true;
        }

        if (shouldWrap) {
          // Wrap around screen edges
          newX = ((newX % DISPLAY_WIDTH) + DISPLAY_WIDTH) % DISPLAY_WIDTH;
          newY = ((newY % TOTAL_DISPLAY_HEIGHT) + TOTAL_DISPLAY_HEIGHT) % TOTAL_DISPLAY_HEIGHT;
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

        // Limit segment length
        const maxLength = this.config.maxSegments || 60;
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

    // Handle persistence - move stopped pipes to deadPipes if persistence is enabled
    if (this.config.persistence) {
      const stoppedPipes = this.pipeSegments.filter(pipe => !pipe.isGrowing);
      stoppedPipes.forEach(pipe => {
        if (!this.deadPipes.find(dp => dp.id === pipe.id)) {
          // Copy pipe to deadPipes with full opacity for persistence
          const persistedPipe = { ...pipe };
          persistedPipe.opacity = 1.0; // Reset opacity for fade out
          this.deadPipes.push(persistedPipe);
        }
      });
    }

    // Remove dead pipes (only if they're both not growing AND out of life)
    const usePooling = !!this.platformUtils;
    if (usePooling) {
      const deadPipes = this.pipeSegments.filter(pipe => pipe.life <= 0 && !pipe.isGrowing && !this.config.persistence);
      if (!this.config.persistence) {
        this.pipeSegments = this.pipeSegments.filter(pipe => !(pipe.life <= 0 && !pipe.isGrowing));
      } else {
        // With persistence, only remove pipes that have been moved to deadPipes
        this.pipeSegments = this.pipeSegments.filter(pipe => pipe.isGrowing || pipe.life > 0);
      }
      this.releaseMultipleParticles(deadPipes);
    } else {
      if (!this.config.persistence) {
        this.pipeSegments = this.pipeSegments.filter(pipe => !(pipe.life <= 0 && !pipe.isGrowing));
      } else {
        // With persistence, only remove pipes that have been moved to deadPipes
        this.pipeSegments = this.pipeSegments.filter(pipe => pipe.isGrowing || pipe.life > 0);
      }
    }

    // Handle fade out for dead pipes
    if (this.config.fadeOut) {
      this.deadPipes = this.deadPipes.filter(pipe => {
        pipe.opacity = Math.max(0, pipe.opacity - (this.config.fadeSpeed || 0.02) * deltaSeconds);
        return pipe.opacity > 0.01; // Keep pipes until almost completely faded
      });
    }

    // Spawn new pipes if needed
    const spawnRate = this.config.spawnRate || 0.05;
    if (this.pipeSegments.length < this.config.maxPipes && Math.random() < spawnRate) {
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

    // Render growing pipes
    this.renderPipes(ctx, this.pipeSegments, brightness);

    // Render dead/fading pipes if persistence is enabled
    if (this.config.persistence || this.config.fadeOut) {
      this.renderPipes(ctx, this.deadPipes, brightness);
    }
  }

  private renderPipes(ctx: ICanvasContext, pipes: BackgroundParticle[], brightness: number): void {
    pipes.forEach(pipe => {
      if (!pipe.segments || pipe.segments.length === 0) return;

      ctx.save();

      // Render pipe segments with gradient effect
      pipe.segments.forEach((segment, index) => {
        const segmentAge = (pipe.segments!.length - index) / pipe.segments!.length;
        let segmentOpacity = pipe.opacity;

        // Apply gradient fade along the pipe length
        if (this.config.fadeOut) {
          segmentOpacity *= Math.max(0.2, segmentAge);
        }

        ctx.globalAlpha = segmentOpacity * (brightness / 100);

        // Apply glow effect if enabled
        if (this.config.glowEffect) {
          this.renderGlowSegment(ctx, segment, pipe, brightness);
        } else {
          ctx.fillStyle = this.applyBrightness(pipe.color, brightness);
          ctx.fillRect(segment.x, segment.y, pipe.size, pipe.size);
        }

        // Render connectors at turns
        if (index > 0) {
          this.renderConnector(ctx, pipe.segments![index - 1], segment, pipe, brightness);
        }
      });

      ctx.restore();
    });
  }

  private renderGlowSegment(ctx: ICanvasContext, segment: Position, pipe: BackgroundParticle, brightness: number): void {
    const glowSize = pipe.size + 2;
    const glowX = segment.x - 1;
    const glowY = segment.y - 1;

    // Create glow gradient
    const gradient = ctx.createRadialGradient(
      segment.x + pipe.size / 2, segment.y + pipe.size / 2, 0,
      segment.x + pipe.size / 2, segment.y + pipe.size / 2, glowSize
    );

    const baseColor = this.applyBrightness(pipe.color, brightness);
    gradient.addColorStop(0, baseColor);
    gradient.addColorStop(0.7, baseColor + '80'); // 50% opacity
    gradient.addColorStop(1, baseColor + '00'); // transparent

    // Render glow
    ctx.fillStyle = gradient;
    ctx.fillRect(glowX, glowY, glowSize, glowSize);

    // Render solid center
    ctx.fillStyle = baseColor;
    ctx.fillRect(segment.x, segment.y, pipe.size, pipe.size);
  }

  private renderConnector(ctx: ICanvasContext, prevSegment: Position, currentSegment: Position, pipe: BackgroundParticle, brightness: number): void {
    // Only render connectors at turns (when direction changes)
    const dx = currentSegment.x - prevSegment.x;
    const dy = currentSegment.y - prevSegment.y;

    if (Math.abs(dx) === pipe.size && Math.abs(dy) === 0) return; // horizontal move
    if (Math.abs(dy) === pipe.size && Math.abs(dx) === 0) return; // vertical move

    // This is a turn, render a small connector
    ctx.fillStyle = this.applyBrightness(pipe.color, brightness);
    const connectorSize = Math.max(1, pipe.size - 1);
    const connectorX = prevSegment.x + (pipe.size - connectorSize) / 2;
    const connectorY = prevSegment.y + (pipe.size - connectorSize) / 2;

    ctx.fillRect(connectorX, connectorY, connectorSize, connectorSize);
  }

  cleanup(): void {
    super.cleanup();
    if (this.platformUtils) {
      this.releaseMultipleParticles(this.pipeSegments);
      this.releaseMultipleParticles(this.deadPipes);
    }
    this.pipeSegments = [];
    this.deadPipes = [];
  }

  getState(): any {
    return {
      ...super.getState(),
      config: this.config,
      pipeCount: this.pipeSegments.length
    };
  }
}