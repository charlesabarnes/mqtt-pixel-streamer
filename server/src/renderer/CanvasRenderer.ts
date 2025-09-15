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
  DataFormatter
} from '@mqtt-pixel-streamer/shared';
import path from 'path';

export class CanvasRenderer {
  private canvas: Canvas;
  private ctx: CanvasRenderingContext2D;
  private dualCanvas: Canvas;
  private dualCtx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = createCanvas(DISPLAY_WIDTH, DISPLAY_HEIGHT);
    this.ctx = this.canvas.getContext('2d');

    // Canvas for dual display rendering (128x64)
    this.dualCanvas = createCanvas(DISPLAY_WIDTH, TOTAL_DISPLAY_HEIGHT);
    this.dualCtx = this.dualCanvas.getContext('2d');
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

  private renderText(element: Element, pos: Position): void {
    if (!element.text) return;

    const style = element.style || {};
    this.ctx.fillStyle = style.color || '#FFFFFF';
    // Use monospace as default to match template specification
    this.ctx.font = `${style.fontSize || 12}px ${style.fontFamily || 'monospace'}`;
    this.ctx.fillText(element.text, pos.x, pos.y);
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

  private applyAnimation(element: Element): Position {
    // For now, return the original position
    // Animation logic will be implemented later
    return element.position;
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
    const display1Buffer = await this.renderTemplateForDisplay(template, 'display1', dataValues);
    const display2Buffer = await this.renderTemplateForDisplay(template, 'display2', dataValues);

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