import { BackgroundConfig, BackgroundParticle, Position } from '../types';

/**
 * Platform-agnostic canvas context interface
 * This allows us to abstract over browser CanvasRenderingContext2D and node-canvas
 */
export interface ICanvasContext {
  // Drawing rectangles
  fillRect(x: number, y: number, width: number, height: number): void;
  clearRect(x: number, y: number, width: number, height: number): void;

  // Path API
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterClockwise?: boolean): void;
  fill(): void;

  // State
  save(): void;
  restore(): void;

  // Styles
  fillStyle: string | CanvasGradient | CanvasPattern;
  globalAlpha: number;

  // Gradients (platform-specific implementation)
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient;
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): CanvasGradient;

  // Image operations (for GIF and image backgrounds)
  drawImage?(image: any, dx: number, dy: number, dw?: number, dh?: number): void;
  putImageData?(imageData: ImageData, dx: number, dy: number): void;
  getImageData?(sx: number, sy: number, sw: number, sh: number): ImageData;
  createImageData?(width: number, height: number): ImageData;
}

/**
 * Background rendering configuration
 */
export interface IRenderOptions {
  /**
   * Whether to use batch rendering optimizations (server-only)
   */
  useBatchRendering?: boolean;

  /**
   * Whether to use particle pooling (server optimization)
   */
  useParticlePooling?: boolean;
}

/**
 * Generic background interface that works on both client and server
 */
export interface IBackground {
  /**
   * Initialize the background with the given configuration
   */
  initialize(config: BackgroundConfig): void;

  /**
   * Update the background state with frame-rate independent movement
   * @param deltaTime Time elapsed since last update in milliseconds
   */
  update(deltaTime: number): void;

  /**
   * Render the background to the canvas
   * @param ctx Canvas rendering context
   * @param width Canvas width
   * @param height Canvas height
   */
  render(ctx: ICanvasContext, width: number, height: number): void;

  /**
   * Clean up any resources
   */
  cleanup(): void;

  /**
   * Get the current state for inspection/debugging
   */
  getState?(): any;
}

/**
 * Platform-specific utilities interface
 */
export interface IPlatformUtils {
  /**
   * Get optimized particle renderer (server-only feature)
   */
  getBatchParticleRenderer?(): (ctx: ICanvasContext, particles: BackgroundParticle[], renderType?: 'circle' | 'rect') => void;
}