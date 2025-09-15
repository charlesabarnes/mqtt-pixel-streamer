import { BackgroundConfig, DISPLAY_WIDTH, TOTAL_DISPLAY_HEIGHT } from '../../types';
import { BaseBackground } from '../BaseBackground';
import { ICanvasContext, IRenderOptions, IPlatformUtils } from '../types';

interface MatrixColumn {
  x: number;
  y: number;
  speed: number;
  pixelSize: number;
}

export class MatrixBackground extends BaseBackground {
  private config!: NonNullable<BackgroundConfig['matrix']>;
  private matrixColumns: MatrixColumn[] = [];

  constructor(platformUtils: IPlatformUtils = {}) {
    super(platformUtils);
  }

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

  render(ctx: ICanvasContext, width: number, height: number, options?: IRenderOptions): void {
    // Clear with black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    if (this.matrixColumns.length === 0) return;

    const brightness = options?.brightness ?? 100;

    this.matrixColumns.forEach(column => {
      // Render trail of pixel squares
      for (let i = 0; i < this.config.trailLength; i++) {
        const y = column.y - i * column.pixelSize;
        if (y >= -column.pixelSize && y <= TOTAL_DISPLAY_HEIGHT) {
          const alpha = (1 - i / this.config.trailLength) * 0.8;
          
          ctx.save();
          ctx.globalAlpha = alpha * (brightness / 100);
          
          // Use primary color with fade effect
          const baseColor = this.config.colors[0] || '#00ff00';
          ctx.fillStyle = this.applyBrightness(baseColor, brightness);
          
          ctx.fillRect(column.x, y, column.pixelSize, column.pixelSize);
          ctx.restore();
        }
      }
    });
  }

  cleanup(): void {
    super.cleanup();
    this.matrixColumns = [];
  }

  getState(): any {
    return {
      ...super.getState(),
      config: this.config,
      columnCount: this.matrixColumns.length
    };
  }
}