import { CanvasRenderingContext2D } from 'canvas';
import { BackgroundConfig, BackgroundParticle, DISPLAY_WIDTH, TOTAL_DISPLAY_HEIGHT, Position } from '@mqtt-pixel-streamer/shared';
import { BaseBackground } from './Background';

export class PipesBackground extends BaseBackground {
  private config!: NonNullable<BackgroundConfig['pipes']>;
  private pipeSegments: BackgroundParticle[] = [];

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

    // Skip updates if deltaTime is too small or too large (avoid performance issues)
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
          } else {
            pipe.isGrowing = false;
            continue;
          }

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
        }

        // Add new segment if within bounds
        if (newX >= 0 && newX < DISPLAY_WIDTH && newY >= 0 && newY < TOTAL_DISPLAY_HEIGHT) {
          pipe.segments.push({ x: newX, y: newY });
          pipe.life--;

          if (pipe.life <= 0) {
            pipe.isGrowing = false;
          }
        } else {
          pipe.isGrowing = false;
        }
      }
    });

    // Remove old pipes and start new ones
    this.pipeSegments = this.pipeSegments.filter(pipe => pipe.segments && pipe.segments.length > 0);

    // Add new pipes if below max
    if (this.pipeSegments.length < this.config.maxPipes && Math.random() < 0.02) {
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

    this.lastUpdate = Date.now();
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Clear with black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    if (this.pipeSegments.length === 0) return;

    // Render all pipe segments
    this.pipeSegments.forEach(pipe => {
      if (!pipe.segments) return;

      ctx.fillStyle = pipe.color;

      // Draw each segment
      pipe.segments.forEach((segment, index) => {
        ctx.fillRect(segment.x, segment.y, this.config.pipeWidth, this.config.pipeWidth);

        // Draw corner connectors for turns
        if (index > 0) {
          const prevSegment = pipe.segments![index - 1];
          const dx = segment.x - prevSegment.x;
          const dy = segment.y - prevSegment.y;

          // Draw a corner piece if there's a turn
          if (dx !== 0 && dy !== 0) {
            // This creates a smooth corner
            ctx.fillRect(
              Math.min(segment.x, prevSegment.x),
              Math.min(segment.y, prevSegment.y),
              this.config.pipeWidth,
              this.config.pipeWidth
            );
          }
        }
      });

      // Draw end cap for growing pipes
      if (pipe.isGrowing && pipe.segments.length > 0) {
        const lastSegment = pipe.segments[pipe.segments.length - 1];
        ctx.fillStyle = '#FFFFFF';
        const capSize = Math.floor(this.config.pipeWidth / 3);
        ctx.fillRect(
          lastSegment.x + Math.floor((this.config.pipeWidth - capSize) / 2),
          lastSegment.y + Math.floor((this.config.pipeWidth - capSize) / 2),
          capSize,
          capSize
        );
      }
    });
  }

  cleanup(): void {
    super.cleanup();
    this.releaseMultipleParticles(this.pipeSegments);
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