import { BackgroundConfig, BackgroundParticle, DISPLAY_WIDTH, TOTAL_DISPLAY_HEIGHT } from '../../types';
import { BaseBackground } from '../BaseBackground';
import { ICanvasContext, IPlatformUtils } from '../types';

interface PlantPosition {
  x: number;
  height: number;
  swayPhase: number;
}

export class FishTankBackground extends BaseBackground {
  private config!: NonNullable<BackgroundConfig['fishtank']>;
  private fishParticles: BackgroundParticle[] = [];
  private plantPositions: PlantPosition[] = [];

  constructor(platformUtils: IPlatformUtils = {}) {
    super(platformUtils);
  }

  initialize(config: BackgroundConfig): void {
    if (config.type === 'fishtank' && config.fishtank) {
      this.config = config.fishtank;

      this.fishParticles = [];
      this.particles = []; // For bubbles
      this.plantPositions = [];

      // Initialize fish
      for (let i = 0; i < this.config.fishCount; i++) {
        const size = Math.random() * (this.config.fishMaxSize - this.config.fishMinSize) + this.config.fishMinSize;
        const particle = this.acquireParticle();

        particle.id = `fish_${i}`;
        particle.position = {
          x: Math.random() * DISPLAY_WIDTH,
          y: Math.random() * (TOTAL_DISPLAY_HEIGHT - 10) + 5
        };
        particle.velocity = {
          x: (Math.random() > 0.5 ? 1 : -1) * this.config.swimSpeed,
          y: (Math.random() - 0.5) * this.config.swimSpeed * 0.3
        };
        particle.color = this.config.fishColors[Math.floor(Math.random() * this.config.fishColors.length)];
        particle.life = Infinity;
        particle.maxLife = Infinity;
        particle.size = size;
        particle.opacity = 1;
        particle.direction = 'right';
        particle.swimPhase = Math.random() * Math.PI * 2;
        particle.fishType = Math.floor(Math.random() * 3);

        this.fishParticles.push(particle);
      }

      // Initialize bubbles
      for (let i = 0; i < this.config.bubbleCount; i++) {
        const bubble = this.acquireParticle();

        bubble.id = `bubble_${i}`;
        bubble.position = {
          x: Math.random() * DISPLAY_WIDTH,
          y: TOTAL_DISPLAY_HEIGHT + Math.random() * 20
        };
        bubble.velocity = {
          x: (Math.random() - 0.5) * 0.2,
          y: -this.config.bubbleSpeed
        };
        bubble.color = 'rgba(255, 255, 255, 0.4)';
        bubble.life = Infinity;
        bubble.maxLife = Infinity;
        bubble.size = Math.random() * 2 + 1;
        bubble.opacity = 0.6;

        this.particles.push(bubble);
      }

      // Initialize plants
      for (let i = 0; i < this.config.plantCount; i++) {
        this.plantPositions.push({
          x: Math.random() * DISPLAY_WIDTH,
          height: Math.random() * 10 + 5,
          swayPhase: Math.random() * Math.PI * 2
        });
      }
    }
  }

  update(deltaTime: number): void {
    if (!this.config) return;

    // Skip updates if deltaTime is too small or too large
    if (deltaTime < 5 || deltaTime > 100) return;

    const deltaSeconds = deltaTime / 1000;

    // Update fish
    this.fishParticles.forEach(fish => {
      // Swimming animation
      if (fish.swimPhase !== undefined) {
        fish.swimPhase += deltaSeconds * 4;
        if (fish.swimPhase > Math.PI * 2) {
          fish.swimPhase -= Math.PI * 2;
        }
      }

      // Movement
      fish.position.x += fish.velocity.x * deltaSeconds * 60;
      fish.position.y += fish.velocity.y * deltaSeconds * 60;

      // Bounce off walls
      if (fish.position.x <= 0 || fish.position.x >= DISPLAY_WIDTH - fish.size) {
        fish.velocity.x *= -1;
        fish.direction = fish.velocity.x > 0 ? 'right' : 'left';
      }
      if (fish.position.y <= 0 || fish.position.y >= TOTAL_DISPLAY_HEIGHT - fish.size) {
        fish.velocity.y *= -1;
      }

      // Keep fish in bounds
      fish.position.x = Math.max(0, Math.min(DISPLAY_WIDTH - fish.size, fish.position.x));
      fish.position.y = Math.max(0, Math.min(TOTAL_DISPLAY_HEIGHT - fish.size, fish.position.y));

      // Occasional direction changes
      if (Math.random() < 0.005) {
        fish.velocity.x = (Math.random() > 0.5 ? 1 : -1) * this.config.swimSpeed;
        fish.velocity.y = (Math.random() - 0.5) * this.config.swimSpeed * 0.3;
      }
    });

    // Update bubbles
    this.particles.forEach(bubble => {
      bubble.position.x += bubble.velocity.x * deltaSeconds * 60;
      bubble.position.y += bubble.velocity.y * deltaSeconds * 60;

      // Reset bubbles that reach the top
      if (bubble.position.y < -bubble.size) {
        bubble.position.y = TOTAL_DISPLAY_HEIGHT + bubble.size;
        bubble.position.x = Math.random() * DISPLAY_WIDTH;
      }

      // Wrap around horizontally
      if (bubble.position.x < -bubble.size) {
        bubble.position.x = DISPLAY_WIDTH + bubble.size;
      } else if (bubble.position.x > DISPLAY_WIDTH + bubble.size) {
        bubble.position.x = -bubble.size;
      }
    });

    // Update plants
    this.plantPositions.forEach(plant => {
      plant.swayPhase += deltaSeconds * 2;
      if (plant.swayPhase > Math.PI * 2) {
        plant.swayPhase -= Math.PI * 2;
      }
    });

    this.lastUpdate = Date.now();
  }

  render(ctx: ICanvasContext, width: number, height: number): void {
    // Clear with aquarium background color
    ctx.fillStyle = '#004080';
    ctx.fillRect(0, 0, width, height);

    // Render plants
    ctx.save();
    this.plantPositions.forEach(plant => {
      const sway = Math.sin(plant.swayPhase) * 2;
      ctx.fillStyle = '#008000';

      // Simple plant rendering as rectangles
      for (let i = 0; i < plant.height; i++) {
        const x = plant.x + sway * (i / plant.height);
        const y = TOTAL_DISPLAY_HEIGHT - i - 1;
        ctx.fillRect(x, y, 1, 1);
      }
    });
    ctx.restore();

    // Render bubbles
    this.renderParticles(ctx, this.particles, undefined, 'circle');

    // Render fish
    ctx.save();
    this.fishParticles.forEach(fish => {
      ctx.globalAlpha = fish.opacity;
      ctx.fillStyle = fish.color;

      // Simple fish rendering as rectangles/ellipses
      const swimOffset = fish.swimPhase !== undefined ? Math.sin(fish.swimPhase) * 0.5 : 0;
      const fishWidth = fish.size;
      const fishHeight = fish.size * 0.6;

      ctx.fillRect(
        fish.position.x,
        fish.position.y + swimOffset,
        fishWidth,
        fishHeight
      );
    });
    ctx.restore();
  }

  cleanup(): void {
    super.cleanup();
    if (this.platformUtils) {
      this.releaseMultipleParticles(this.fishParticles);
    }
    this.fishParticles = [];
    this.plantPositions = [];
  }

  getState(): any {
    return {
      ...super.getState(),
      config: this.config,
      fishCount: this.fishParticles.length,
      bubbleCount: this.particles.length,
      plantCount: this.plantPositions.length
    };
  }
}