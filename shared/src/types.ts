export interface Template {
  id?: number;
  name: string;
  background: string;
  updateInterval: number;
  enabled: boolean;
  elements: Element[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Element {
  id: string;
  type: ElementType;
  position: Position;
  visible: boolean;
  animation?: Animation;
  style?: ElementStyle;
  // Type-specific properties
  text?: string;
  dataSource?: string;
  format?: string;
  src?: string;
  size?: Size;
  shape?: ShapeType;
}

export type ElementType = 'text' | 'icon' | 'shape' | 'data';
export type ShapeType = 'rectangle' | 'circle' | 'line';
export type AnimationType = 'none' | 'slide' | 'fade' | 'blink' | 'scroll' | 'bounce';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface ElementStyle {
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

export interface Animation {
  type: AnimationType;
  duration?: number;
  delay?: number;
  repeat?: boolean;
  direction?: 'normal' | 'reverse' | 'alternate';
}

export interface Frame {
  width: number;
  height: number;
  data: Buffer | Uint8Array;
  timestamp: number;
}

export interface DataSource {
  id?: number;
  type: 'weather' | 'sports' | 'calendar' | 'custom';
  name: string;
  config: Record<string, any>;
  credentials?: Record<string, any>;
  enabled: boolean;
}

export interface MQTTConfig {
  broker: string;
  username?: string;
  password?: string;
  topic: string;
  qos: 0 | 1 | 2;
}

export const DISPLAY_WIDTH = 128;
export const DISPLAY_HEIGHT = 32;
export const BYTES_PER_PIXEL = 4; // RGBA8888
export const FRAME_SIZE = DISPLAY_WIDTH * DISPLAY_HEIGHT * BYTES_PER_PIXEL;