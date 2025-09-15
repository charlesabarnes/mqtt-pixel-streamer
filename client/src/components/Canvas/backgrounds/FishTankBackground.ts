import { BackgroundConfig, BackgroundParticle, DISPLAY_WIDTH, TOTAL_DISPLAY_HEIGHT } from '@mqtt-pixel-streamer/shared';
import { BaseClientBackground } from './Background';

interface PlantPosition {
  x: number;
  height: number;
  swayPhase: number;
}

export class FishTankBackground extends BaseClientBackground {
  private config!: NonNullable<BackgroundConfig['fishtank']>;
  private fishParticles: BackgroundParticle[] = [];
  private plantPositions: PlantPosition[] = [];

  initialize(config: BackgroundConfig): void {
    if (config.type === 'fishtank' && config.fishtank) {
      this.config = config.fishtank;
      this.fishParticles = [];
      this.particles = []; // For bubbles
      this.plantPositions = [];

      // Initialize fish
      for (let i = 0; i < config.fishtank.fishCount; i++) {
        const size = Math.random() * (config.fishtank.fishMaxSize - config.fishtank.fishMinSize) + config.fishtank.fishMinSize;
        const fish = this.acquireParticle();

        fish.id = `fish_${i}`;
        fish.position = {
          x: Math.random() * DISPLAY_WIDTH,
          y: Math.random() * (TOTAL_DISPLAY_HEIGHT - 10) + 5 // Keep fish away from very top and bottom
        };
        fish.velocity = {
          x: (Math.random() > 0.5 ? 1 : -1) * config.fishtank.swimSpeed,
          y: (Math.random() - 0.5) * config.fishtank.swimSpeed * 0.3
        };
        fish.color = config.fishtank.fishColors[Math.floor(Math.random() * config.fishtank.fishColors.length)];
        fish.life = Infinity;
        fish.maxLife = Infinity;
        fish.size = size;
        fish.opacity = 1;
        fish.direction = 'right';
        fish.swimPhase = Math.random() * Math.PI * 2;
        fish.fishType = Math.floor(Math.random() * 3); // 3 different fish types

        this.fishParticles.push(fish);
      }

      // Initialize bubbles
      for (let i = 0; i < config.fishtank.bubbleCount; i++) {
        const bubble = this.acquireParticle();

        bubble.id = `bubble_${i}`;
        bubble.position = {
          x: Math.random() * DISPLAY_WIDTH,
          y: TOTAL_DISPLAY_HEIGHT + Math.random() * 20
        };
        bubble.velocity = {
          x: (Math.random() - 0.5) * 0.2,
          y: -config.fishtank.bubbleSpeed
        };
        bubble.color = 'rgba(255, 255, 255, 0.4)';
        bubble.life = Infinity;
        bubble.maxLife = Infinity;
        bubble.size = Math.random() * 2 + 1;
        bubble.opacity = 0.6;

        this.particles.push(bubble);
      }

      // Initialize plants
      for (let i = 0; i < config.fishtank.plantCount; i++) {
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

    // Skip updates if deltaTime is too small or too large (avoid performance issues)
    if (deltaTime < 5 || deltaTime > 100) return;

    const deltaSeconds = deltaTime / 1000;

    // Update fish
    this.fishParticles.forEach(fish => {
      // Update position
      fish.position.x += fish.velocity.x * deltaSeconds * 60;
      fish.position.y += fish.velocity.y * deltaSeconds * 60;

      // Update swim animation phase
      if (fish.swimPhase !== undefined) {
        fish.swimPhase += 3 * deltaSeconds;
      }

      // Bounce off walls
      if (fish.position.x <= 0 || fish.position.x >= DISPLAY_WIDTH - fish.size) {
        fish.velocity.x *= -1;
        fish.direction = fish.velocity.x > 0 ? 'right' : 'left';
      }
      if (fish.position.y <= 0 || fish.position.y >= TOTAL_DISPLAY_HEIGHT - fish.size) {
        fish.velocity.y *= -1;
      }

      // Occasional random direction change
      if (Math.random() < 0.01) {
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
    });

    // Update plant sway
    this.plantPositions.forEach(plant => {
      plant.swayPhase += deltaSeconds * 2;
    });

    this.lastUpdate = Date.now();
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, brightness: number): void {
    // Clear with water color
    const waterColor = this.applyBrightness(this.config.waterColor, brightness);
    ctx.fillStyle = waterColor;
    ctx.fillRect(0, 0, width, height);

    // Render plants/seaweed
    ctx.fillStyle = this.applyBrightness('#004400', brightness);
    this.plantPositions.forEach(plant => {
      const swayOffset = Math.sin(plant.swayPhase) * 2;

      // Draw simple seaweed using rectangles
      for (let y = 0; y < plant.height; y++) {
        const segmentSway = swayOffset * (y / plant.height);
        ctx.fillRect(
          plant.x + segmentSway,
          TOTAL_DISPLAY_HEIGHT - y - 1,
          2,
          1
        );
      }
    });

    // Render fish
    this.fishParticles.forEach(fish => {
      ctx.fillStyle = this.applyBrightness(fish.color, brightness);

      // Simple fish shape (rectangular body with tail)
      const bodyLength = Math.floor(fish.size * 0.7);
      const tailLength = Math.floor(fish.size * 0.3);

      // Body
      ctx.fillRect(fish.position.x, fish.position.y, bodyLength, Math.floor(fish.size / 2));

      // Tail (triangle approximation with rectangles)
      if (fish.direction === 'right') {
        // Tail on left
        ctx.fillRect(fish.position.x - tailLength, fish.position.y + Math.floor(fish.size / 4), tailLength, 1);
      } else {
        // Tail on right
        ctx.fillRect(fish.position.x + bodyLength, fish.position.y + Math.floor(fish.size / 4), tailLength, 1);
      }

      // Eye
      ctx.fillStyle = this.applyBrightness('#FFFFFF', brightness);
      const eyeX = fish.direction === 'right' ? fish.position.x + bodyLength - 2 : fish.position.x + 1;
      ctx.fillRect(eyeX, fish.position.y, 1, 1);
    });

    // Render bubbles
    this.particles.forEach(bubble => {
      ctx.save();
      ctx.globalAlpha = bubble.opacity * (brightness / 100);
      ctx.fillStyle = this.applyBrightness('#FFFFFF', brightness);

      // Draw bubble as a small circle (approximated with rect for pixel art)
      ctx.fillRect(bubble.position.x, bubble.position.y, bubble.size, bubble.size);

      ctx.restore();
    });
  }

  cleanup(): void {
    super.cleanup();
    this.releaseMultipleParticles(this.fishParticles);
    this.fishParticles = [];
    this.plantPositions = [];
  }

  getState(): any {
    return {
      ...super.getState(),
      config: this.config,
      fishCount: this.fishParticles.length,
      plantCount: this.plantPositions.length
    };
  }
}