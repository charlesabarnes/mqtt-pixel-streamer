import { ICanvasContext, IPlatformUtils } from '@mqtt-pixel-streamer/shared';

/**
 * Adapter to make browser CanvasRenderingContext2D work with ICanvasContext
 */
export class ClientCanvasAdapter implements ICanvasContext {
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
}

/**
 * Client-specific platform utilities
 */
export class ClientPlatformUtils implements IPlatformUtils {
  /**
   * Apply brightness to a color (client-only feature)
   */
  applyBrightness(color: string, brightness: number): string {
    const brightnessFactor = brightness / 100;

    // Handle hex colors
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);

      const dimmedR = Math.round(r * brightnessFactor);
      const dimmedG = Math.round(g * brightnessFactor);
      const dimmedB = Math.round(b * brightnessFactor);

      return `#${dimmedR.toString(16).padStart(2, '0')}${dimmedG.toString(16).padStart(2, '0')}${dimmedB.toString(16).padStart(2, '0')}`;
    }

    // Handle rgb/rgba colors
    if (color.startsWith('rgb')) {
      const matches = color.match(/\d+/g);
      if (matches && matches.length >= 3) {
        const r = Math.round(parseInt(matches[0]) * brightnessFactor);
        const g = Math.round(parseInt(matches[1]) * brightnessFactor);
        const b = Math.round(parseInt(matches[2]) * brightnessFactor);
        const a = matches[3] ? parseInt(matches[3]) : 255;

        return matches.length > 3 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`;
      }
    }

    // Handle hsl colors
    if (color.startsWith('hsl')) {
      const matches = color.match(/\d+/g);
      if (matches && matches.length >= 3) {
        const h = matches[0];
        const s = matches[1];
        const l = Math.round(parseInt(matches[2]) * brightnessFactor);
        const a = matches[3] ? parseInt(matches[3]) : 1;

        return matches.length > 3 ? `hsla(${h}, ${s}%, ${l}%, ${a})` : `hsl(${h}, ${s}%, ${l}%)`;
      }
    }

    // Return original color if we can't parse it
    return color;
  }
}