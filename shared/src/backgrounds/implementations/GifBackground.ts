import { BackgroundConfig } from '../../types';
import { BaseBackground } from '../BaseBackground';
import { ICanvasContext, IPlatformUtils } from '../types';
import { parseGIF, decompressFrames, ParsedGif } from 'gifuct-js';

interface GifFrame {
  imageData: any | null; // ImageData in browser, compatible object in Node.js
  canvas: any; // HTMLCanvasElement or node-canvas Canvas
  delay: number;
  width: number;
  height: number;
  blackPixelRatio: number; // Ratio of black/dark pixels in this frame
  isSkippable: boolean; // Whether this frame should be skipped due to being mostly black
}

export class GifBackground extends BaseBackground {
  private config!: NonNullable<BackgroundConfig['gif']>;
  private frames: GifFrame[] = [];
  private currentFrameIndex: number = 0;
  private frameStartTime: number = 0;
  private isLoaded: boolean = false;
  private isLoading: boolean = false;
  private loadError: string | null = null;
  private needsCanvasClear: boolean = false;

  constructor(platformUtils: IPlatformUtils = {}) {
    super(platformUtils);
  }

  initialize(config: BackgroundConfig): void {
    if (config.type === 'gif' && config.gif) {
      this.config = config.gif;
      this.frames = [];
      this.currentFrameIndex = 0;
      this.frameStartTime = Date.now();
      this.isLoaded = false;
      this.isLoading = false;
      this.loadError = null;
      this.needsCanvasClear = false;

      console.log('Initializing GIF background with config:', {
        src: this.config.src,
        scaleMode: this.config.scaleMode,
        speed: this.config.speed,
        loop: this.config.loop
      });

      // Only load if we have a source
      if (this.config.src) {
        this.loadGif(this.config.src);
      } else {
        console.warn('GIF background initialized without source URL');
      }
    }
  }

  private async loadGif(src: string): Promise<void> {
    if (this.isLoading) return;

    this.isLoading = true;
    this.loadError = null;

    try {
      let arrayBuffer: ArrayBuffer;

      if (src.startsWith('http://') || src.startsWith('https://')) {
        // Load from URL
        const response = await fetch(src);
        if (!response.ok) {
          throw new Error(`Failed to fetch GIF: ${response.statusText}`);
        }
        arrayBuffer = await response.arrayBuffer();
      } else {
        // Load from file (Node.js environment)
        try {
          const fs = await import('fs');
          const path = await import('path');
          const resolvedPath = path.resolve(src);
          const buffer = fs.readFileSync(resolvedPath);
          arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        } catch (e) {
          // Browser environment - fetch from public path
          const response = await fetch(src);
          if (!response.ok) {
            throw new Error(`Failed to fetch GIF: ${response.statusText}`);
          }
          arrayBuffer = await response.arrayBuffer();
        }
      }

      // Parse GIF
      const gif: ParsedGif = parseGIF(arrayBuffer);
      const frames = decompressFrames(gif, true);

      // Process and cache frames
      this.frames = await Promise.all(frames.map(frame => this.processFrame(frame)));

      this.isLoaded = true;
      this.isLoading = false;

      // Log detailed frame information for debugging
      console.log(`GIF loaded successfully: ${this.frames.length} frames`);
      if (this.frames.length > 0) {
        const delays = this.frames.map(f => f.delay);
        const avgDelay = delays.reduce((a, b) => a + b, 0) / delays.length;
        const minDelay = Math.min(...delays);
        const maxDelay = Math.max(...delays);

        const skippableFrames = this.frames.filter(f => f.isSkippable).length;
        const blackRatios = this.frames.map(f => f.blackPixelRatio);
        const avgBlackRatio = blackRatios.reduce((a, b) => a + b, 0) / blackRatios.length;

        console.log(`Frame delays - min: ${minDelay}ms, max: ${maxDelay}ms, avg: ${avgDelay.toFixed(1)}ms`);
        const blackThreshold = this.config.blackThreshold ?? 0.8;
        const skipBlackFrames = this.config.skipBlackFrames ?? true;
        console.log(`Black frame analysis - ${skippableFrames}/${this.frames.length} frames skippable (>${(blackThreshold * 100)}% black, filtering: ${skipBlackFrames})`);
        console.log(`Average black pixel ratio: ${(avgBlackRatio * 100).toFixed(1)}%`);
        console.log(`First few frame delays: ${delays.slice(0, 5).join(', ')}ms`);
      }
    } catch (error) {
      console.error('Failed to load GIF:', error);
      this.loadError = error instanceof Error ? error.message : 'Unknown error';
      this.isLoading = false;
      this.isLoaded = false;
    }
  }

  private async processFrame(frame: any): Promise<GifFrame> {
    const width = frame.dims.width;
    const height = frame.dims.height;
    const pixels = new Uint8ClampedArray(frame.patch || frame.pixels);

    // Analyze frame content for empty pixel ratio
    const emptyPixelRatio = this.analyzeFrameBlackness(pixels);
    const blackThreshold = this.config.blackThreshold ?? 0.95;
    const skipBlackFrames = this.config.skipBlackFrames ?? true;
    const debugFrameSkipping = this.config.debugFrameSkipping ?? false;
    const isSkippable = skipBlackFrames && emptyPixelRatio > blackThreshold;

    if (debugFrameSkipping) {
      console.log(`Frame analysis: empty ratio ${(emptyPixelRatio * 100).toFixed(1)}%, skippable: ${isSkippable}`);
    }

    // Create a canvas for this frame
    let canvas: any;
    let ctx: any;

    if (typeof globalThis !== 'undefined' && 'document' in globalThis) {
      // Browser environment
      canvas = (globalThis as any).document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      ctx = canvas.getContext('2d');
    } else {
      // Node.js environment
      try {
        const { createCanvas } = require('canvas');
        canvas = createCanvas(width, height);
        ctx = canvas.getContext('2d');
      } catch (e) {
        // If canvas is not available, store raw data
        return {
          imageData: null,
          canvas: null,
          delay: frame.delay || 100,
          width,
          height,
          blackPixelRatio: emptyPixelRatio,
          isSkippable
        };
      }
    }

    // Create ImageData and put it on the canvas
    const imageData = ctx.createImageData(width, height);
    imageData.data.set(pixels);
    ctx.putImageData(imageData, 0, 0);

    return {
      imageData,
      canvas,
      delay: frame.delay || 100,
      width,
      height,
      blackPixelRatio: emptyPixelRatio,
      isSkippable
    };
  }

  private analyzeFrameBlackness(pixels: Uint8ClampedArray): number {
    let emptyPixelCount = 0;
    let transparentPixelCount = 0;
    let veryDarkPixelCount = 0;
    const totalPixels = pixels.length / 4; // RGBA = 4 bytes per pixel

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];

      // Count transparent pixels
      if (a < 10) {
        transparentPixelCount++;
        emptyPixelCount++;
        continue;
      }

      // Count very dark pixels (almost black)
      const brightness = (r + g + b) / 3;
      if (brightness < 5) {
        veryDarkPixelCount++;
        emptyPixelCount++;
      }
    }

    // Log detailed analysis for debugging
    const transparentRatio = transparentPixelCount / totalPixels;
    const veryDarkRatio = veryDarkPixelCount / totalPixels;
    const emptyRatio = emptyPixelCount / totalPixels;

    // Only consider truly empty frames (transparent + nearly black pixels)
    return emptyRatio;
  }

  private getNextValidFrame(currentIndex: number): number {
    let nextIndex = currentIndex + 1;
    let searchAttempts = 0;
    const maxAttempts = this.frames.length; // Prevent infinite loop
    let loopRestarted = false;

    // Handle end of frames
    if (nextIndex >= this.frames.length) {
      if (this.config.loop) {
        nextIndex = 0;
        loopRestarted = true;
      } else {
        return this.frames.length - 1;
      }
    }

    // Find next non-skippable frame
    while (searchAttempts < maxAttempts) {
      const frame = this.frames[nextIndex];

      // If frame is not skippable, use it
      if (!frame.isSkippable) {
        return nextIndex;
      }

      // Move to next frame
      nextIndex++;
      searchAttempts++;

      // Handle looping
      if (nextIndex >= this.frames.length) {
        if (this.config.loop) {
          nextIndex = 0;
          loopRestarted = true;
        } else {
          // If we can't loop and all remaining frames are skippable, stay on last non-skippable
          break;
        }
      }

      // If we've gone full circle, break to avoid infinite loop
      if (nextIndex === currentIndex + 1 && searchAttempts > 1) {
        break;
      }
    }

    // Set clear flag if we're looping back to start
    if (loopRestarted || (nextIndex === 0 && currentIndex === this.frames.length - 1)) {
      this.needsCanvasClear = true;
    }

    // Fallback: return the original next frame even if it's skippable
    const finalIndex = nextIndex < this.frames.length ? nextIndex : (currentIndex + 1) % this.frames.length;
    return finalIndex;
  }

  update(_deltaTime: number): void {
    if (!this.isLoaded || this.frames.length === 0) return;

    // Check if it's time to advance to the next frame
    const currentTime = Date.now();
    const currentFrame = this.frames[this.currentFrameIndex];

    // Enforce minimum frame delay of 50ms (20fps max) to prevent flashing
    const minDelay = 50;
    const rawDelay = Math.max(currentFrame.delay, minDelay);
    const adjustedDelay = rawDelay / this.config.speed;

    if (currentTime - this.frameStartTime >= adjustedDelay) {
      const previousFrameIndex = this.currentFrameIndex;

      // Advance to next frame, skipping black frames
      this.currentFrameIndex = this.getNextValidFrame(this.currentFrameIndex);

      // Check if we've looped back to the beginning
      if (previousFrameIndex > this.currentFrameIndex || (previousFrameIndex === this.frames.length - 1 && this.currentFrameIndex === 0)) {
        this.needsCanvasClear = true;
      }

      // Debug logging for frame timing
      const currentFrame = this.frames[this.currentFrameIndex];
      console.log(`GIF frame ${previousFrameIndex} -> ${this.currentFrameIndex}, delay: ${rawDelay}ms (adjusted: ${adjustedDelay}ms), empty ratio: ${(currentFrame.blackPixelRatio * 100).toFixed(1)}%, skippable: ${currentFrame.isSkippable}`);

      this.frameStartTime = currentTime;
    }

    this.lastUpdate = currentTime;
  }

  render(ctx: ICanvasContext, width: number, height: number): void {
    // Show loading or error state
    if (!this.isLoaded) {
      if (this.isLoading) {
        // Show loading indicator (dark gray, less jarring than black)
        ctx.fillStyle = '#222222';
        ctx.fillRect(0, 0, width, height);
        console.log('GIF loading...');
      } else if (this.loadError) {
        // Show error state (dark red)
        ctx.fillStyle = '#330000';
        ctx.fillRect(0, 0, width, height);
        console.error('GIF load error:', this.loadError);
      } else {
        // Not loaded and not loading - clear to black once
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
      }
      return;
    }

    if (this.frames.length === 0) {
      console.warn('GIF loaded but no frames available');
      return;
    }

    const frame = this.frames[this.currentFrameIndex];

    // Clear canvas when starting a new loop or if explicitly needed
    if (this.needsCanvasClear || (this.currentFrameIndex === 0 && Date.now() - this.frameStartTime < 100)) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      this.needsCanvasClear = false; // Reset the flag after clearing
      console.log('Canvas cleared for GIF loop restart');
    }

    // If we don't have a canvas (no canvas library available), fall back to pixel rendering
    if (!frame.canvas) {
      this.renderFallback(ctx, frame, width, height);
      return;
    }

    // Use drawImage if available
    if (ctx.drawImage) {
      this.renderWithDrawImage(ctx, frame, width, height);
    } else {
      // Fall back to pixel-by-pixel if drawImage is not available
      this.renderFallback(ctx, frame, width, height);
    }
  }

  private renderWithDrawImage(ctx: ICanvasContext, frame: GifFrame, width: number, height: number): void {
    if (!ctx.drawImage || !frame.canvas) return;

    const canvasWidth = width;
    const canvasHeight = height;

    switch (this.config.scaleMode) {
      case 'stretch':
        // Scale to fill entire canvas, may distort aspect ratio
        ctx.drawImage(frame.canvas, 0, 0, canvasWidth, canvasHeight);
        break;

      case 'fit':
        // Scale to fit while maintaining aspect ratio
        const scale = Math.min(canvasWidth / frame.width, canvasHeight / frame.height);
        const scaledWidth = Math.floor(frame.width * scale);
        const scaledHeight = Math.floor(frame.height * scale);
        const offsetX = Math.floor(this.config.position.x + (canvasWidth - scaledWidth) / 2);
        const offsetY = Math.floor(this.config.position.y + (canvasHeight - scaledHeight) / 2);

        ctx.drawImage(frame.canvas, offsetX, offsetY, scaledWidth, scaledHeight);
        break;

      case 'crop':
        // Scale and crop to fill canvas
        const cropScale = Math.max(canvasWidth / frame.width, canvasHeight / frame.height);
        const cropWidth = Math.floor(frame.width * cropScale);
        const cropHeight = Math.floor(frame.height * cropScale);
        const cropOffsetX = Math.floor((canvasWidth - cropWidth) / 2);
        const cropOffsetY = Math.floor((canvasHeight - cropHeight) / 2);

        ctx.drawImage(frame.canvas, cropOffsetX, cropOffsetY, cropWidth, cropHeight);
        break;

      case 'tile':
        // Repeat the image across the canvas
        for (let y = 0; y < canvasHeight; y += frame.height) {
          for (let x = 0; x < canvasWidth; x += frame.width) {
            const drawWidth = Math.min(frame.width, canvasWidth - x);
            const drawHeight = Math.min(frame.height, canvasHeight - y);
            ctx.drawImage(frame.canvas, x, y, drawWidth, drawHeight);
          }
        }
        break;
    }
  }

  private renderFallback(ctx: ICanvasContext, frame: GifFrame, width: number, height: number): void {
    // Fallback rendering when drawImage is not available
    // This is much slower but ensures compatibility

    if (!frame.imageData) return;

    // For fallback, we'll just render at 1:1 scale in the top-left
    // A full implementation would need to handle scaling, but that's very expensive
    const data = frame.imageData.data;
    const frameWidth = Math.min(frame.width, width);
    const frameHeight = Math.min(frame.height, height);

    // Draw pixels in batches by color to reduce context switches
    const pixelsByColor = new Map<string, Array<{x: number, y: number}>>();

    for (let y = 0; y < frameHeight; y++) {
      for (let x = 0; x < frameWidth; x++) {
        const idx = (y * frame.width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        if (a > 0) {
          const color = `rgba(${r},${g},${b},${a / 255})`;
          if (!pixelsByColor.has(color)) {
            pixelsByColor.set(color, []);
          }
          pixelsByColor.get(color)!.push({x, y});
        }
      }
    }

    // Draw all pixels of the same color at once
    pixelsByColor.forEach((pixels, color) => {
      ctx.fillStyle = color;
      pixels.forEach(({x, y}) => {
        ctx.fillRect(x, y, 1, 1);
      });
    });
  }

  cleanup(): void {
    super.cleanup();
    this.frames = [];
    this.isLoaded = false;
    this.isLoading = false;
    this.loadError = null;
    this.needsCanvasClear = false;
  }

  getState(): any {
    return {
      ...super.getState(),
      config: this.config,
      frameCount: this.frames.length,
      currentFrame: this.currentFrameIndex,
      isLoaded: this.isLoaded,
      isLoading: this.isLoading,
      loadError: this.loadError
    };
  }
}