import { createCanvas, Canvas, CanvasRenderingContext2D, loadImage } from 'canvas';
import {
  Template,
  Element,
  DISPLAY_WIDTH,
  DISPLAY_HEIGHT,
  FRAME_SIZE,
  Animation,
  Position
} from '@mqtt-pixel-streamer/shared';
import path from 'path';

export class CanvasRenderer {
  private canvas: Canvas;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = createCanvas(DISPLAY_WIDTH, DISPLAY_HEIGHT);
    this.ctx = this.canvas.getContext('2d');
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

    // Get raw RGBA buffer
    return this.canvas.toBuffer('raw');
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
    this.ctx.font = `${style.fontSize || 12}px ${style.fontFamily || 'sans-serif'}`;
    this.ctx.fillText(element.text, pos.x, pos.y);
  }

  private renderDataField(element: Element, pos: Position, dataValues?: Record<string, any>): void {
    if (!element.dataSource) return;

    let value = this.getDataValue(element.dataSource, dataValues);

    // Apply format if provided
    if (element.format) {
      value = this.formatValue(value, element.format);
    }

    const style = element.style || {};
    this.ctx.fillStyle = style.color || '#FFFFFF';
    this.ctx.font = `${style.fontSize || 12}px ${style.fontFamily || 'sans-serif'}`;
    this.ctx.fillText(String(value), pos.x, pos.y);
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

  private getDataValue(dataSource: string, dataValues?: Record<string, any>): any {
    if (!dataValues) return dataSource;

    const parts = dataSource.split('.');
    let value: any = dataValues;

    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) return dataSource;
    }

    return value;
  }

  private formatValue(value: any, format: string): string {
    // Simple formatting logic
    if (format === 'HH:MM' && value instanceof Date) {
      return value.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }

    if (format.includes('°F') && typeof value === 'number') {
      return `${value}°F`;
    }

    return String(value);
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

    return this.canvas.toBuffer('raw');
  }
}

export const canvasRenderer = new CanvasRenderer();