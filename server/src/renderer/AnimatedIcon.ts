import { loadImage } from 'canvas';
import path from 'path';

export interface AnimatedIconFrame {
  image: any;
  duration: number;
}

export interface AnimatedIconConfig {
  name: string;
  frameCount: number;
  basePath: string;
  defaultFrameDuration: number;
}

export class AnimatedIcon {
  private frames: AnimatedIconFrame[] = [];
  private currentFrameIndex: number = 0;
  private lastFrameTime: number = 0;
  private frameLoadPromise: Promise<void>;

  constructor(private config: AnimatedIconConfig) {
    this.frameLoadPromise = this.loadFrames();
  }

  private async loadFrames(): Promise<void> {
    const framePromises: Promise<AnimatedIconFrame | null>[] = [];

    for (let i = 0; i < this.config.frameCount; i++) {
      const framePath = path.join(
        process.cwd(),
        'server',
        'assets',
        'icons',
        'weather',
        `${this.config.name}-${i}.png`
      );

      const framePromise = loadImage(framePath)
        .then(image => ({
          image,
          duration: this.config.defaultFrameDuration
        }))
        .catch(error => {
          console.warn(`Failed to load frame ${i} for ${this.config.name}:`, error);
          return null;
        });

      framePromises.push(framePromise);
    }

    const loadedFrames = await Promise.all(framePromises);
    this.frames = loadedFrames.filter(frame => frame !== null) as AnimatedIconFrame[];

    if (this.frames.length === 0) {
      console.warn(`No frames loaded for animated icon: ${this.config.name}`);
    }
  }

  public async ensureLoaded(): Promise<void> {
    await this.frameLoadPromise;
  }

  public updateFrame(currentTime: number): void {
    if (this.frames.length === 0) return;

    const currentFrame = this.frames[this.currentFrameIndex];
    if (!currentFrame) return;

    if (currentTime - this.lastFrameTime >= currentFrame.duration) {
      this.currentFrameIndex = (this.currentFrameIndex + 1) % this.frames.length;
      this.lastFrameTime = currentTime;
    }
  }

  public getCurrentFrame(): any | null {
    if (this.frames.length === 0) return null;
    return this.frames[this.currentFrameIndex]?.image || null;
  }

  public hasFrames(): boolean {
    return this.frames.length > 0;
  }
}

export class WeatherAnimatedIconManager {
  private static instance: WeatherAnimatedIconManager;
  private iconCache: Map<string, AnimatedIcon> = new Map();
  private updateInterval: number = 5000; // Default 5 seconds

  static getInstance(): WeatherAnimatedIconManager {
    if (!WeatherAnimatedIconManager.instance) {
      WeatherAnimatedIconManager.instance = new WeatherAnimatedIconManager();
    }
    return WeatherAnimatedIconManager.instance;
  }

  public setUpdateInterval(interval: number): void {
    this.updateInterval = interval;
  }

  public getAnimatedIcon(conditionCode: string, iconType: 'condition' | 'sunrise' | 'sunset'): AnimatedIcon | null {
    const iconName = this.getIconName(conditionCode, iconType);
    if (!iconName) return null;

    const cacheKey = `${iconType}-${iconName}`;

    if (!this.iconCache.has(cacheKey)) {
      const config: AnimatedIconConfig = {
        name: iconName,
        frameCount: this.getFrameCount(iconName),
        basePath: 'weather',
        defaultFrameDuration: Math.max(this.updateInterval / 3, 1000) // Cycle through frames during update interval
      };

      this.iconCache.set(cacheKey, new AnimatedIcon(config));
    }

    return this.iconCache.get(cacheKey) || null;
  }

  private getIconName(conditionCode: string, iconType: 'condition' | 'sunrise' | 'sunset'): string | null {
    if (iconType === 'sunrise') {
      return 'sunrise';
    }

    if (iconType === 'sunset') {
      return 'sunset';
    }

    // Map weather condition codes to icon names
    const conditionMap: Record<string, string> = {
      'clearsky_day': 'clear-day',
      'clearsky_night': 'clear-night',
      'fair_day': 'clear-day',
      'fair_night': 'clear-night',
      'partlycloudy_day': 'partly-cloudy-day',
      'partlycloudy_night': 'partly-cloudy-night',
      'cloudy': 'cloudy',
      'rainshowers_day': 'rain',
      'rainshowers_night': 'rain',
      'rain': 'rain',
      'lightrain': 'rain',
      'heavyrain': 'rain',
      'snow': 'snow',
      'snowshowers_day': 'snow',
      'snowshowers_night': 'snow',
      'fog': 'fog',
      'sleet': 'sleet',
      'thunderstorm': 'thunderstorm',
    };

    // Remove time suffix and polartwilight prefixes for mapping
    const baseCode = conditionCode.replace(/_day|_night$/, '').replace(/^polartwilight_/, '');
    return conditionMap[baseCode] || conditionMap[conditionCode] || 'cloudy';
  }

  private getFrameCount(iconName: string): number {
    // Define frame counts for different icon types
    const frameCounts: Record<string, number> = {
      'clear-day': 3,
      'clear-night': 3,
      'partly-cloudy-day': 3,
      'partly-cloudy-night': 3,
      'cloudy': 2,
      'rain': 3,
      'snow': 3,
      'thunderstorm': 3,
      'fog': 2,
      'sleet': 3,
      'sunrise': 3,
      'sunset': 3,
    };

    return frameCounts[iconName] || 2;
  }

  public updateAllIcons(currentTime: number): void {
    for (const icon of this.iconCache.values()) {
      icon.updateFrame(currentTime);
    }
  }

  public async preloadIcon(conditionCode: string, iconType: 'condition' | 'sunrise' | 'sunset'): Promise<void> {
    const icon = this.getAnimatedIcon(conditionCode, iconType);
    if (icon) {
      await icon.ensureLoaded();
    }
  }

  public clearCache(): void {
    this.iconCache.clear();
  }
}

export const weatherAnimatedIconManager = WeatherAnimatedIconManager.getInstance();