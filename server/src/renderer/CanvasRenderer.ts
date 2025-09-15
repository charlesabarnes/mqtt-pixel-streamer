import { createCanvas, Canvas, CanvasRenderingContext2D, loadImage } from 'canvas';
import {
  Template,
  Element,
  DISPLAY_WIDTH,
  DISPLAY_HEIGHT,
  TOTAL_DISPLAY_HEIGHT,
  FRAME_SIZE,
  DUAL_FRAME_SIZE,
  Animation,
  Position,
  DataFormatter,
  AnimationState,
  Particle,
  EffectConfig
} from '@mqtt-pixel-streamer/shared';
import path from 'path';

class AnimationManager {
  private animationStates: Map<string, AnimationState> = new Map();
  private static instance: AnimationManager;

  static getInstance(): AnimationManager {
    if (!AnimationManager.instance) {
      AnimationManager.instance = new AnimationManager();
    }
    return AnimationManager.instance;
  }

  public getAnimationState(elementId: string): AnimationState | undefined {
    return this.animationStates.get(elementId);
  }

  public updateAnimationState(elementId: string, state: AnimationState): void {
    this.animationStates.set(elementId, state);
  }

  public removeAnimationState(elementId: string): void {
    this.animationStates.delete(elementId);
  }

  public clearAllAnimationStates(): void {
    this.animationStates.clear();
  }

  public createOrUpdateState(element: Element, currentTime: number): AnimationState {
    let state = this.getAnimationState(element.id);

    if (!state) {
      // Initialize new animation state
      state = {
        elementId: element.id,
        startTime: currentTime,
        currentTime,
        velocity: { x: 0, y: 0 },
        phase: 0,
        bounceCount: 0,
        lastPosition: { ...element.position }
      };

      // Initialize based on animation type
      if (element.animation?.type === 'dvd-logo') {
        const speed = element.animation.speed || 2;
        state.velocity = {
          x: speed * (Math.random() > 0.5 ? 1 : -1),
          y: speed * (Math.random() > 0.5 ? 1 : -1)
        };
        // For dual display mode, ensure we start with velocity that can reach all areas
        // If starting near the boundary between displays (y: 32), ensure it moves toward bottom display
        if (element.position.y >= 30 && element.position.y <= 35) {
          state.velocity.y = speed; // Move down toward display 2
        }
      } else if (element.animation?.type === 'fireworks') {
        state.particles = [];
      }
    } else {
      state.currentTime = currentTime;
    }

    this.updateAnimationState(element.id, state);
    return state;
  }

  public spawnFireworksParticles(state: AnimationState, config: EffectConfig['fireworks'], spawnPos: Position): void {
    if (!config) return;

    const particleCount = config.particleCount || 15;
    const explosionSize = config.explosionSize || 20;
    const colors = config.colors || ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = Math.random() * 3 + 1;

      const particle: Particle = {
        id: `${state.elementId}_particle_${Date.now()}_${i}`,
        position: { ...spawnPos },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed
        },
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 60, // 60 frames at 60fps = 1 second
        maxLife: 60,
        size: Math.random() * 2 + 1
      };

      if (!state.particles) state.particles = [];
      state.particles.push(particle);
    }
  }

  public updateParticles(state: AnimationState, gravity: number = 0.1): void {
    if (!state.particles) return;

    state.particles = state.particles.filter(particle => {
      // Update position
      particle.position.x += particle.velocity.x;
      particle.position.y += particle.velocity.y;

      // Apply gravity
      particle.velocity.y += gravity;

      // Decrease life
      particle.life--;

      // Remove dead particles
      return particle.life > 0;
    });
  }
}

export class CanvasRenderer {
  private canvas: Canvas;
  private ctx: CanvasRenderingContext2D;
  private dualCanvas: Canvas;
  private dualCtx: CanvasRenderingContext2D;
  private animationManager: AnimationManager;

  constructor() {
    this.canvas = createCanvas(DISPLAY_WIDTH, DISPLAY_HEIGHT);
    this.ctx = this.canvas.getContext('2d');

    // Canvas for dual display rendering (128x64)
    this.dualCanvas = createCanvas(DISPLAY_WIDTH, TOTAL_DISPLAY_HEIGHT);
    this.dualCtx = this.dualCanvas.getContext('2d');

    this.animationManager = AnimationManager.getInstance();
  }

  public clearAnimationStates(): void {
    this.animationManager.clearAllAnimationStates();
  }

  public async renderTemplate(template: Template, dataValues?: Record<string, any>): Promise<Buffer> {
    // Clear canvas with background
    this.ctx.fillStyle = template.background || '#000000';
    this.ctx.fillRect(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);

    // Sort elements by z-index if needed
    const sortedElements = [...template.elements].sort((a, b) => {
      const aZ = (a as any).zIndex || 0;
      const bZ = (b as any).zIndex || 0;
      return aZ - bZ;
    });

    // Render each element
    for (const element of sortedElements) {
      if (!element.visible) continue;

      await this.renderElement(element, dataValues);
    }

    // Get raw RGBA buffer and swap red/blue channels to fix color display
    const rawBuffer = this.canvas.toBuffer('raw');
    return this.swapRedBlueChannels(rawBuffer);
  }

  private async renderElement(element: Element, dataValues?: Record<string, any>): Promise<void> {
    const pos = this.applyAnimation(element);

    switch (element.type) {
      case 'text':
        this.renderText(element, pos);
        break;
      case 'data':
        this.renderDataField(element, pos, dataValues);
        break;
      case 'icon':
        await this.renderIcon(element, pos);
        break;
      case 'shape':
        this.renderShape(element, pos);
        break;
    }
  }

  private async renderElementToDualCanvas(element: Element, dataValues?: Record<string, any>, displayMode?: string): Promise<void> {
    // Save current context
    const originalCtx = this.ctx;

    // Switch to dual canvas context for unified rendering
    this.ctx = this.dualCtx;

    const pos = this.applyAnimation(element, displayMode);

    switch (element.type) {
      case 'text':
        this.renderText(element, pos);
        break;
      case 'data':
        this.renderDataField(element, pos, dataValues);
        break;
      case 'icon':
        await this.renderIcon(element, pos);
        break;
      case 'shape':
        this.renderShape(element, pos);
        break;
    }

    // Restore original context
    this.ctx = originalCtx;
  }

  private renderText(element: Element, pos: Position): void {
    if (!element.text) return;

    const style = element.style || {};
    let color = style.color || '#FFFFFF';

    // Apply animation-based color changes
    if (element.animation) {
      color = this.getAnimatedColor(element, color);
    }

    this.ctx.fillStyle = color;
    // Use monospace as default to match template specification
    this.ctx.font = `${style.fontSize || 12}px ${style.fontFamily || 'monospace'}`;
    this.ctx.fillText(element.text, pos.x, pos.y);
  }

  private getAnimatedColor(element: Element, baseColor: string): string {
    if (!element.animation) return baseColor;

    const state = this.animationManager.getAnimationState(element.id);
    if (!state) return baseColor;

    switch (element.animation.type) {
      case 'dvd-logo':
        return this.getDVDLogoColor(element, state, baseColor);

      case 'rainbow':
        return this.getRainbowColor(element, state);

      default:
        return baseColor;
    }
  }

  private getDVDLogoColor(element: Element, state: AnimationState, baseColor: string): string {
    const config = element.effectConfig?.dvdLogo;
    if (!config || !config.bounceColorChange) return baseColor;

    const colors = config.colors || ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
    const colorIndex = state.bounceCount % colors.length;
    return colors[colorIndex];
  }

  private getRainbowColor(element: Element, state: AnimationState): string {
    const config = element.effectConfig?.rainbow;
    if (!config) return '#FFFFFF';

    const currentTime = Date.now();
    const speed = config.speed || 1;
    const hueRange = config.hueRange || [0, 360];
    const saturation = config.saturation || 100;
    const brightness = config.brightness || 50;

    // Calculate hue based on time
    const hue = ((currentTime / 1000 * speed * 60) % (hueRange[1] - hueRange[0])) + hueRange[0];

    return `hsl(${hue}, ${saturation}%, ${brightness}%)`;
  }

  private renderDataField(element: Element, pos: Position, dataValues?: Record<string, any>): void {
    if (!element.dataSource) return;

    // Use shared formatter for consistent rendering
    const value = DataFormatter.processDataElement(
      element.dataSource,
      dataValues,
      (element as any).format
    );

    const style = element.style || {};
    this.ctx.fillStyle = style.color || '#FFFFFF';
    // Use monospace as default to match template specification
    this.ctx.font = `${style.fontSize || 12}px ${style.fontFamily || 'monospace'}`;
    this.ctx.fillText(value, pos.x, pos.y);
  }

  private async renderIcon(element: Element, pos: Position): Promise<void> {
    if (!element.src) return;

    try {
      const imagePath = path.join(process.cwd(), 'server', 'assets', element.src);
      const image = await loadImage(imagePath);

      const size = element.size || { width: 16, height: 16 };
      this.ctx.drawImage(image, pos.x, pos.y, size.width, size.height);
    } catch (error) {
      console.error(`Failed to load icon: ${element.src}`, error);
    }
  }

  private renderShape(element: Element, pos: Position): void {
    const style = element.style || {};
    const size = element.size || { width: 10, height: 10 };

    this.ctx.strokeStyle = style.borderColor || style.color || '#FFFFFF';
    this.ctx.lineWidth = style.borderWidth || 1;

    if (style.backgroundColor) {
      this.ctx.fillStyle = style.backgroundColor;
    }

    switch (element.shape) {
      case 'rectangle':
        if (style.backgroundColor) {
          this.ctx.fillRect(pos.x, pos.y, size.width, size.height);
        }
        this.ctx.strokeRect(pos.x, pos.y, size.width, size.height);
        break;
      case 'circle':
        const radius = Math.min(size.width, size.height) / 2;
        this.ctx.beginPath();
        this.ctx.arc(pos.x + radius, pos.y + radius, radius, 0, Math.PI * 2);
        if (style.backgroundColor) {
          this.ctx.fill();
        }
        this.ctx.stroke();
        break;
      case 'line':
        this.ctx.beginPath();
        this.ctx.moveTo(pos.x, pos.y);
        this.ctx.lineTo(pos.x + size.width, pos.y + size.height);
        this.ctx.stroke();
        break;
    }
  }

  private applyAnimation(element: Element, displayMode?: string): Position {
    if (!element.animation || element.animation.type === 'none') {
      return element.position;
    }

    const currentTime = Date.now();
    const state = this.animationManager.createOrUpdateState(element, currentTime);
    const deltaTime = currentTime - state.startTime;

    switch (element.animation.type) {
      case 'dvd-logo':
        return this.applyDVDLogoAnimation(element, state, displayMode);

      case 'bounce':
        return this.applyBounceAnimation(element, state, deltaTime);

      case 'rainbow':
        // Rainbow doesn't change position, just affects rendering color
        return element.position;

      case 'slide':
        return this.applySlideAnimation(element, state, deltaTime);

      default:
        return element.position;
    }
  }

  private applyDVDLogoAnimation(element: Element, state: AnimationState, displayMode?: string): Position {
    const speed = element.animation?.speed || 2;

    // Calculate new position
    let newX = state.lastPosition!.x + state.velocity.x;
    let newY = state.lastPosition!.y + state.velocity.y;

    // Check for boundary collisions
    const textWidth = element.text ? element.text.length * (element.style?.fontSize || 12) * 0.6 : 20;
    const textHeight = element.style?.fontSize || 12;

    // Get display bounds based on display mode - use full space for cross-display animations
    const maxX = DISPLAY_WIDTH - textWidth;
    const maxY = (displayMode === 'dual') ? TOTAL_DISPLAY_HEIGHT : DISPLAY_HEIGHT;

    // For text rendering, Y position is the baseline, so we need to account for this:
    // - To reach the very top, we need to allow baseline to be closer to 0
    // - To reach the very bottom, baseline should be at maxY
    const minY = Math.max(1, textHeight * 0.8); // Allow text to reach very close to top
    const actualMaxY = maxY;

    // Debug logging
    if (element.id === 'dvd-logo') {
      console.log(`DVD Logo: displayMode=${displayMode}, minY=${minY}, maxY=${actualMaxY}, currentY=${newY}, textHeight=${textHeight}`);
    }

    let bounced = false;

    // X boundary collision
    if (newX <= 0) {
      newX = 0;
      state.velocity.x = Math.abs(state.velocity.x);
      bounced = true;
    } else if (newX >= maxX) {
      newX = maxX;
      state.velocity.x = -Math.abs(state.velocity.x);
      bounced = true;
    }

    // Y boundary collision - account for text baseline positioning
    if (newY <= minY) {
      newY = minY;
      state.velocity.y = Math.abs(state.velocity.y);
      bounced = true;
    } else if (newY >= actualMaxY) {
      newY = actualMaxY;
      state.velocity.y = -Math.abs(state.velocity.y);
      bounced = true;
    }

    if (bounced) {
      state.bounceCount++;
    }

    // Update state
    state.lastPosition = { x: newX, y: newY };
    this.animationManager.updateAnimationState(element.id, state);

    return { x: newX, y: newY };
  }

  private applyBounceAnimation(element: Element, state: AnimationState, deltaTime: number): Position {
    const amplitude = element.animation?.amplitude || 10;
    const speed = element.animation?.speed || 1;

    const bounceY = Math.sin((deltaTime / 1000) * speed * Math.PI * 2) * amplitude;

    return {
      x: element.position.x,
      y: element.position.y + bounceY
    };
  }

  private applySlideAnimation(element: Element, state: AnimationState, deltaTime: number): Position {
    const speed = element.animation?.speed || 30; // pixels per second
    const direction = element.animation?.direction || 'normal';

    let offsetX = (deltaTime / 1000) * speed;

    if (direction === 'reverse') {
      offsetX = -offsetX;
    }

    return {
      x: element.position.x + offsetX,
      y: element.position.y
    };
  }

  private swapRedBlueChannels(buffer: Buffer): Buffer {
    // Create a copy of the buffer to avoid modifying the original
    const swappedBuffer = Buffer.from(buffer);

    // RGBA format: each pixel is 4 bytes (R, G, B, A)
    // We need to swap R (index 0) with B (index 2) for each pixel
    for (let i = 0; i < swappedBuffer.length; i += 4) {
      const red = swappedBuffer[i];     // Original red channel
      const blue = swappedBuffer[i + 2]; // Original blue channel

      swappedBuffer[i] = blue;      // Put blue in red position
      swappedBuffer[i + 2] = red;   // Put red in blue position
      // Green (i + 1) and Alpha (i + 3) remain unchanged
    }

    return swappedBuffer;
  }


  public async renderTemplateForDisplay(template: Template, displayId: 'display1' | 'display2', dataValues?: Record<string, any>): Promise<Buffer> {
    // Use single display canvas
    this.ctx.fillStyle = template.background || '#000000';
    this.ctx.fillRect(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);

    // Filter elements based on position only (seamless based on Y coordinate)
    const relevantElements = template.elements.filter(element => {
      if (!element.visible) return false;

      // Check position bounds for the display
      if (displayId === 'display1') {
        return element.position.y >= 0 && element.position.y < DISPLAY_HEIGHT;
      } else {
        // For display2, elements should be positioned for the second display (y: 32-63)
        return element.position.y >= DISPLAY_HEIGHT && element.position.y < TOTAL_DISPLAY_HEIGHT;
      }
    });

    // Sort elements by z-index if needed
    const sortedElements = [...relevantElements].sort((a, b) => {
      const aZ = (a as any).zIndex || 0;
      const bZ = (b as any).zIndex || 0;
      return aZ - bZ;
    });

    // Render each relevant element
    for (const element of sortedElements) {
      // Adjust position for display2 elements (shift y position)
      const adjustedElement = { ...element };
      if (displayId === 'display2' && element.position.y >= DISPLAY_HEIGHT) {
        adjustedElement.position = {
          ...element.position,
          y: element.position.y - DISPLAY_HEIGHT
        };
      }

      await this.renderElement(adjustedElement, dataValues);
    }

    // Get raw RGBA buffer and swap red/blue channels to fix color display
    const rawBuffer = this.canvas.toBuffer('raw');
    return this.swapRedBlueChannels(rawBuffer);
  }

  public async renderDualDisplayTemplate(template: Template, dataValues?: Record<string, any>): Promise<{ display1: Buffer; display2: Buffer }> {
    // Use unified 128x64 canvas for cross-display rendering
    this.dualCtx.fillStyle = template.background || '#000000';
    this.dualCtx.fillRect(0, 0, DISPLAY_WIDTH, TOTAL_DISPLAY_HEIGHT);

    // Render all visible elements to the unified canvas
    // No filtering by display bounds - elements can naturally overlap both displays
    const visibleElements = template.elements.filter(element => element.visible);

    // Sort elements by z-index if needed
    const sortedElements = [...visibleElements].sort((a, b) => {
      const aZ = (a as any).zIndex || 0;
      const bZ = (b as any).zIndex || 0;
      return aZ - bZ;
    });

    // Render each element in the unified 128x64 coordinate space
    for (const element of sortedElements) {
      await this.renderElementToDualCanvas(element, dataValues, template.displayMode);
    }

    // Extract display portions from the unified canvas
    const unifiedBuffer = this.dualCanvas.toBuffer('raw');
    const swappedUnifiedBuffer = this.swapRedBlueChannels(unifiedBuffer);

    // Extract top half (display1: 0,0,128,32)
    const display1Buffer = Buffer.alloc(FRAME_SIZE);
    for (let y = 0; y < DISPLAY_HEIGHT; y++) {
      const sourceRowStart = y * DISPLAY_WIDTH * 4;
      const destRowStart = y * DISPLAY_WIDTH * 4;
      swappedUnifiedBuffer.copy(display1Buffer, destRowStart, sourceRowStart, sourceRowStart + DISPLAY_WIDTH * 4);
    }

    // Extract bottom half (display2: 0,32,128,32)
    const display2Buffer = Buffer.alloc(FRAME_SIZE);
    for (let y = 0; y < DISPLAY_HEIGHT; y++) {
      const sourceRowStart = (y + DISPLAY_HEIGHT) * DISPLAY_WIDTH * 4;
      const destRowStart = y * DISPLAY_WIDTH * 4;
      swappedUnifiedBuffer.copy(display2Buffer, destRowStart, sourceRowStart, sourceRowStart + DISPLAY_WIDTH * 4);
    }

    return {
      display1: display1Buffer,
      display2: display2Buffer
    };
  }

  public async renderTestFrame(): Promise<Buffer> {
    // Clear canvas
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);

    // Draw test pattern
    this.ctx.fillStyle = '#00FF00';
    this.ctx.font = '14px monospace';
    this.ctx.fillText('MQTT LED', 2, 16);

    this.ctx.fillStyle = '#FFFF00';
    this.ctx.font = '10px monospace';
    const time = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    this.ctx.fillText(time, 2, 28);

    // Draw border
    this.ctx.strokeStyle = '#FF0000';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(0, 0, DISPLAY_WIDTH - 1, DISPLAY_HEIGHT - 1);

    // Get raw RGBA buffer and swap red/blue channels to fix color display
    const rawBuffer = this.canvas.toBuffer('raw');
    return this.swapRedBlueChannels(rawBuffer);
  }

  public async renderTestFrameForDisplay(displayId: 'display1' | 'display2'): Promise<Buffer> {
    // Clear canvas
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);

    // Draw test pattern specific to display
    this.ctx.fillStyle = displayId === 'display1' ? '#00FF00' : '#0000FF';
    this.ctx.font = '14px monospace';
    this.ctx.fillText(displayId.toUpperCase(), 2, 16);

    this.ctx.fillStyle = '#FFFF00';
    this.ctx.font = '10px monospace';
    const time = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    this.ctx.fillText(time, 2, 28);

    // Draw border in different colors
    this.ctx.strokeStyle = displayId === 'display1' ? '#FF0000' : '#FF00FF';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(0, 0, DISPLAY_WIDTH - 1, DISPLAY_HEIGHT - 1);

    // Get raw RGBA buffer and swap red/blue channels to fix color display
    const rawBuffer = this.canvas.toBuffer('raw');
    return this.swapRedBlueChannels(rawBuffer);
  }
}

export const canvasRenderer = new CanvasRenderer();