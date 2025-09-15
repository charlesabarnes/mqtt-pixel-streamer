import { CanvasRenderingContext2D, CanvasGradient, CanvasPattern, ImageData } from 'canvas';
import { ICanvasContext, IPlatformUtils, BackgroundParticle } from '@mqtt-pixel-streamer/shared';

/**
 * Adapter to make node-canvas CanvasRenderingContext2D work with ICanvasContext
 */
export class ServerCanvasAdapter implements ICanvasContext {
  constructor(private ctx: CanvasRenderingContext2D) {}

  // Drawing rectangles
  fillRect(x: number, y: number, width: number, height: number): void {
    this.ctx.fillRect(x, y, width, height);
  }

  clearRect(x: number, y: number, width: number, height: number): void {
    this.ctx.clearRect(x, y, width, height);
  }

  // Path API
  beginPath(): void {
    this.ctx.beginPath();
  }

  moveTo(x: number, y: number): void {
    this.ctx.moveTo(x, y);
  }

  lineTo(x: number, y: number): void {
    this.ctx.lineTo(x, y);
  }

  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterClockwise?: boolean): void {
    this.ctx.arc(x, y, radius, startAngle, endAngle, counterClockwise);
  }

  fill(): void {
    this.ctx.fill();
  }

  // State
  save(): void {
    this.ctx.save();
  }

  restore(): void {
    this.ctx.restore();
  }

  // Styles
  get fillStyle(): string | CanvasGradient | CanvasPattern {
    return this.ctx.fillStyle;
  }

  set fillStyle(value: string | CanvasGradient | CanvasPattern) {
    this.ctx.fillStyle = value;
  }

  get globalAlpha(): number {
    return this.ctx.globalAlpha;
  }

  set globalAlpha(value: number) {
    this.ctx.globalAlpha = value;
  }

  // Gradients
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient {
    return this.ctx.createLinearGradient(x0, y0, x1, y1);
  }

  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): CanvasGradient {
    return this.ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
  }

  // Image operations
  drawImage(image: any, dx: number, dy: number, dw?: number, dh?: number): void {
    if (dw !== undefined && dh !== undefined) {
      this.ctx.drawImage(image, dx, dy, dw, dh);
    } else {
      this.ctx.drawImage(image, dx, dy);
    }
  }

  putImageData(imageData: ImageData, dx: number, dy: number): void {
    this.ctx.putImageData(imageData, dx, dy);
  }

  getImageData(sx: number, sy: number, sw: number, sh: number): ImageData {
    return this.ctx.getImageData(sx, sy, sw, sh);
  }

  createImageData(width: number, height: number): ImageData {
    return this.ctx.createImageData(width, height);
  }
}

/**
 * Server-specific platform utilities
 */
export class ServerPlatformUtils implements IPlatformUtils {
  /**
   * Batch render particles by color/opacity to reduce context switches
   */
  getBatchParticleRenderer(): (ctx: ICanvasContext, particles: BackgroundParticle[], renderType?: 'circle' | 'rect') => void {
    return (ctx: ICanvasContext, particles: BackgroundParticle[], renderType: 'circle' | 'rect' = 'rect') => {
      // Group particles by color and opacity for batch rendering
      const particlesByStyle = new Map<string, BackgroundParticle[]>();

      particles.forEach(particle => {
        const key = `${particle.color}_${particle.opacity.toFixed(2)}`;
        if (!particlesByStyle.has(key)) {
          particlesByStyle.set(key, []);
        }
        particlesByStyle.get(key)!.push(particle);
      });

      // Render particles in batches by style
      particlesByStyle.forEach((styleParticles) => {
        if (styleParticles.length === 0) return;

        const firstParticle = styleParticles[0];
        ctx.globalAlpha = firstParticle.opacity;
        ctx.fillStyle = firstParticle.color;

        if (renderType === 'circle') {
          ctx.beginPath();
          styleParticles.forEach(particle => {
            ctx.moveTo(particle.position.x + particle.size, particle.position.y);
            ctx.arc(particle.position.x, particle.position.y, particle.size, 0, Math.PI * 2);
          });
          ctx.fill();
        } else {
          styleParticles.forEach(particle => {
            ctx.fillRect(particle.position.x, particle.position.y, particle.size, particle.size);
          });
        }
      });

      // Reset alpha
      ctx.globalAlpha = 1.0;
    };
  }
}