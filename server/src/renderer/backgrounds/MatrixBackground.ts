import { CanvasRenderingContext2D } from 'canvas';
import { BackgroundConfig, DISPLAY_WIDTH, TOTAL_DISPLAY_HEIGHT } from '@mqtt-pixel-streamer/shared';
import { BaseBackground } from './Background';

interface MatrixColumn {
  x: number;
  y: number;
  speed: number;
  pixelSize: number;
}

export class MatrixBackground extends BaseBackground {
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
      const effectiveDensity = Math.min(this.config.characterDensity, 0.4);
      const activeColumns = Math.floor(columnCount * effectiveDensity);

      for (let i = 0; i < activeColumns; i++) {
        const x = Math.floor(Math.random() * columnCount) * columnSpacing;
        this.matrixColumns.push({
          x,
          y: Math.random() * TOTAL_DISPLAY_HEIGHT - this.config.trailLength * pixelSize,
          speed: this.config.fallSpeed * (0.5 + Math.random() * 0.5),
          pixelSize
        });
      }
    }
  }

  update(deltaTime: number): void {
    if (!this.config || this.matrixColumns.length === 0) return;

    // Skip updates if deltaTime is too small or too large (avoid performance issues)
    if (deltaTime < 5 || deltaTime > 100) return;

    const deltaSeconds = deltaTime / 1000;

    this.matrixColumns.forEach(column => {
      // Frame-rate independent movement
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

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Clear with black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    if (this.matrixColumns.length === 0) return;

    // Batch render by color/alpha to reduce context switches
    const renderBatches = new Map<string, Array<{x: number, y: number, size: number}>>();

    this.matrixColumns.forEach(column => {
      // Render trail of pixel squares
      for (let i = 0; i < this.config.trailLength; i++) {
        const y = column.y - i * (column.pixelSize + 1);
        if (y >= 0 && y < height) {
          const alpha = 1 - (i / this.config.trailLength);
          const colorIndex = Math.floor(alpha * (this.config.colors.length - 1));
          const color = this.config.colors[colorIndex] || this.config.colors[0];
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

  getState(): any {
    return {
      ...super.getState(),
      config: this.config,
      columnCount: this.matrixColumns.length
    };
  }
}