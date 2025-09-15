export interface Template {
  id?: number;
  name: string;
  background: string; // Keep for backward compatibility
  backgroundConfig?: BackgroundConfig;
  updateInterval: number;
  enabled: boolean;
  elements: Element[];
  displayMode: 'single' | 'dual' | 'display1' | 'display2';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Element {
  id: string;
  type: ElementType;
  position: Position;
  visible: boolean;
  targetDisplay?: 'display1' | 'display2' | 'both';
  animation?: Animation;
  style?: ElementStyle;
  // Type-specific properties
  text?: string;
  dataSource?: string;
  format?: string;
  src?: string;
  size?: Size;
  shape?: ShapeType;
  // Location for timezone-dependent data (time, date, weather)
  locationId?: number;
  // Timezone for time/date formatting (e.g., 'America/New_York', 'America/Chicago')
  timezone?: string;
  // Effect-specific properties
  effectType?: EffectType;
  effectConfig?: EffectConfig;
  // Weather icon animation properties
  weatherIconType?: 'condition' | 'sunrise' | 'sunset';
  animated?: boolean;
}

export type ElementType = 'text' | 'icon' | 'shape' | 'data' | 'effect';
export type ShapeType = 'rectangle' | 'circle' | 'line';
export type AnimationType = 'none' | 'slide' | 'fade' | 'blink' | 'scroll' | 'bounce' | 'dvd-logo' | 'fireworks' | 'rainbow';
export type EffectType = 'dvd-logo' | 'fireworks' | 'rainbow' | 'matrix' | 'snow';
export type BackgroundType = 'solid' | 'fireworks' | 'bubbles' | 'gradient' | 'matrix' | 'snow' | 'stars' | 'pipes' | 'fishtank' | 'gif';

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
  speed?: number;
  amplitude?: number;
}

export interface AnimationState {
  elementId: string;
  startTime: number;
  currentTime: number;
  velocity: { x: number; y: number };
  phase: number;
  bounceCount: number;
  particles?: Particle[];
  lastPosition?: Position;
}

export interface Particle {
  id: string;
  position: Position;
  velocity: { x: number; y: number };
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export interface EffectConfig {
  // DVD Logo specific
  dvdLogo?: {
    text: string;
    speed: number;
    colors: string[];
    bounceColorChange: boolean;
  };
  // Fireworks specific
  fireworks?: {
    particleCount: number;
    explosionSize: number;
    colors: string[];
    gravity: number;
    spawnRate: number;
  };
  // Rainbow specific
  rainbow?: {
    speed: number;
    hueRange: [number, number];
    saturation: number;
    brightness: number;
    mode: 'background' | 'text' | 'border';
  };
}

export interface BackgroundConfig {
  type: BackgroundType;
  solid?: {
    color: string;
  };
  fireworks?: {
    frequency: number; // explosions per second
    particleCount: number;
    explosionSize: number;
    colors: string[];
    gravity: number;
    trailLength: number;
  };
  bubbles?: {
    count: number;
    minSize: number;
    maxSize: number;
    speed: number;
    colors: string[];
    opacity: number;
  };
  gradient?: {
    colors: string[];
    direction: 'horizontal' | 'vertical' | 'diagonal' | 'radial';
    speed: number; // transition speed
    cyclic: boolean; // whether to cycle through colors
  };
  matrix?: {
    characterDensity: number; // 0-1, how many columns have active streams
    fallSpeed: number;
    colors: string[];
    trailLength: number;
    characters: string; // character set to use
  };
  snow?: {
    flakeCount: number;
    minSize: number;
    maxSize: number;
    fallSpeed: number;
    windSpeed: number;
    colors: string[];
  };
  stars?: {
    count: number;
    twinkleSpeed: number;
    colors: string[];
    minBrightness: number;
    maxBrightness: number;
  };
  pipes?: {
    pipeWidth: number;
    growthSpeed: number;
    maxPipes: number;
    turnProbability: number;
    colors: string[];
    pipeLifetime: number; // frames before a pipe stops growing
    maxSegments: number; // maximum segments per pipe
    fadeOut: boolean; // enable gradual fade out
    fadeSpeed: number; // fade speed (0-1)
    persistence: boolean; // keep pipes visible after growing stops
    glowEffect: boolean; // enable glow rendering
    spawnRate: number; // probability of spawning new pipes (0-1)
    wrapAround: boolean; // allow pipes to wrap around screen edges
  };
  fishtank?: {
    fishCount: number;
    fishMinSize: number;
    fishMaxSize: number;
    swimSpeed: number;
    bubbleCount: number;
    bubbleSpeed: number;
    plantCount: number;
    waterColor: string;
    fishColors: string[];
  };
  gif?: {
    src: string; // Path to GIF file or URL
    scaleMode: 'stretch' | 'fit' | 'tile' | 'crop';
    speed: number; // Animation speed multiplier (1.0 = normal)
    position: { x: number; y: number }; // For 'fit' mode positioning
    loop: boolean; // Whether to loop animation
    skipBlackFrames?: boolean; // Whether to skip frames that are mostly black (default: true)
    blackThreshold?: number; // Threshold for considering a frame "black" (0.0-1.0, default: 0.95)
    debugFrameSkipping?: boolean; // Log detailed frame analysis for debugging
  };
}

export interface BackgroundParticle {
  id: string;
  position: Position;
  velocity: { x: number; y: number };
  color: string;
  life: number;
  maxLife: number;
  size: number;
  opacity: number;
  // Type-specific properties
  character?: string; // for matrix effect
  twinklePhase?: number; // for stars
  direction?: 'up' | 'down' | 'left' | 'right'; // for pipes and fish
  segments?: Position[]; // for pipes - track the path
  isGrowing?: boolean; // for pipes
  swimPhase?: number; // for fish animation
  fishType?: number; // for different fish sprites
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
  display1Topic: string;
  display2Topic: string;
  qos: 0 | 1 | 2;
}

export const DISPLAY_WIDTH = 128;
export const DISPLAY_HEIGHT = 32;
export const DISPLAY_COUNT = 2;
export const TOTAL_DISPLAY_HEIGHT = DISPLAY_HEIGHT * DISPLAY_COUNT; // 64 for dual display
export const BYTES_PER_PIXEL = 4; // RGBA8888
export const FRAME_SIZE = DISPLAY_WIDTH * DISPLAY_HEIGHT * BYTES_PER_PIXEL;
export const DUAL_FRAME_SIZE = DISPLAY_WIDTH * TOTAL_DISPLAY_HEIGHT * BYTES_PER_PIXEL;