import { BackgroundConfig, DISPLAY_WIDTH, TOTAL_DISPLAY_HEIGHT } from '@mqtt-pixel-streamer/shared';
import { BaseClientBackground } from './Background';

interface MatrixColumn {
  x: number;
  y: number;
  speed: number;
  pixelSize: number;
}

export class MatrixBackground extends BaseClientBackground {
  private config!: NonNullable<BackgroundConfig['matrix']>;
  private matrixColumns: MatrixColumn[] = [];

  initialize(config: BackgroundConfig): void {
    if (config.type === 'matrix' && config.matrix) {
      this.config = config.matrix;
      this.particles = [];
      this.matrixColumns = [];

      const pixelSize = 2; // Size of each matrix pixel/square
      const columnSpacing = pixelSize + 1; // Space between columns
      const columnCount = Math.floor(DISPLAY_WIDTH / columnSpacing);

      // Increase density for more dynamic pixel matrix effect
      const effectiveDensity = Math.min(config.matrix.characterDensity, 0.4);
      const activeColumns = Math.floor(columnCount * effectiveDensity);

      for (let i = 0; i < activeColumns; i++) {
        const x = Math.floor(Math.random() * columnCount) * columnSpacing;
        this.matrixColumns.push({
          x,
          y: Math.random() * TOTAL_DISPLAY_HEIGHT - config.matrix.trailLength * pixelSize,
          speed: config.matrix.fallSpeed * (0.5 + Math.random() * 0.5),
          pixelSize
        });
      }
    }
  }

  update(deltaTime: number): void {
    if (!this.config || !this.matrixColumns) return;

    // Skip updates if deltaTime is too small or too large (avoid performance issues)
    if (deltaTime < 5 || deltaTime > 100) return;

    const deltaSeconds = deltaTime / 1000;

    this.matrixColumns.forEach(column => {
      column.y += column.speed * deltaSeconds * 60;

      if (column.y > TOTAL_DISPLAY_HEIGHT + this.config.trailLength * column.pixelSize) {
        column.y = -this.config.trailLength * column.pixelSize;
        // Occasionally change position for more variety
        if (Math.random() < 0.05) {
          const columnSpacing = column.pixelSize + 1;
          const columnCount = Math.floor(DISPLAY_WIDTH / columnSpacing);
          column.x = Math.floor(Math.random() * columnCount) * columnSpacing;
        }
      }
    });

    this.lastUpdate = Date.now();
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, brightness: number): void {
    // Clear with black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    if (!this.matrixColumns) return;

    this.matrixColumns.forEach(column => {
      // Render trail of pixel squares
      for (let i = 0; i < this.config.trailLength; i++) {
        const y = column.y - i * (column.pixelSize + 1);
        if (y >= 0 && y < height) {
          const alpha = (1 - (i / this.config.trailLength)) * (brightness / 100);
          const colorIndex = Math.floor(alpha * (this.config.colors.length - 1));
          ctx.globalAlpha = alpha;
          ctx.fillStyle = this.applyBrightness(this.config.colors[colorIndex] || this.config.colors[0], brightness);
          ctx.fillRect(column.x, y, column.pixelSize, column.pixelSize);
        }
      }
    });

    ctx.globalAlpha = 1;
  }

  cleanup(): void {
    super.cleanup();
    this.matrixColumns = [];
  }

  getState(): any {
    return {
      ...super.getState(),
      config: this.config,
      matrixColumnCount: this.matrixColumns.length
    };
  }
}