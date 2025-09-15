import { BackgroundConfig, BackgroundType } from '@mqtt-pixel-streamer/shared';
import { IBackground } from './Background';
import { SolidBackground } from './SolidBackground';
import { GradientBackground } from './GradientBackground';
import { FireworksBackground } from './FireworksBackground';
import { BubblesBackground } from './BubblesBackground';
import { SnowBackground } from './SnowBackground';
import { StarsBackground } from './StarsBackground';
import { MatrixBackground } from './MatrixBackground';
import { PipesBackground } from './PipesBackground';
import { FishTankBackground } from './FishTankBackground';

export class BackgroundFactory {
  private static backgroundInstances = new Map<string, IBackground>();
  private static lastConfigs = new Map<string, BackgroundConfig>();

  /**
   * Get or create a background instance for the given template ID and configuration
   */
  static getBackground(templateId: string, config: BackgroundConfig): IBackground {
    const key = `${templateId}_${config.type}`;

    // Check if we have an existing background of the correct type
    let background = this.backgroundInstances.get(key);
    const lastConfig = this.lastConfigs.get(key);

    // Create new background if none exists or type has changed
    if (!background || this.getBackgroundType(background) !== config.type) {
      // Clean up old background if it exists
      if (background) {
        background.cleanup();
        this.backgroundInstances.delete(key);
      }

      // Create new background
      background = this.createBackground(config.type);
      this.backgroundInstances.set(key, background);
    }

    // Re-initialize if config has changed or this is a new background
    const configChanged = !lastConfig || JSON.stringify(lastConfig) !== JSON.stringify(config);
    if (configChanged) {
      background.initialize(config);
      this.lastConfigs.set(key, JSON.parse(JSON.stringify(config))); // Deep copy
    }

    return background;
  }

  /**
   * Create a new background instance for the given type
   */
  private static createBackground(type: BackgroundType): IBackground {
    switch (type) {
      case 'solid':
        return new SolidBackground();
      case 'gradient':
        return new GradientBackground();
      case 'fireworks':
        return new FireworksBackground();
      case 'bubbles':
        return new BubblesBackground();
      case 'snow':
        return new SnowBackground();
      case 'stars':
        return new StarsBackground();
      case 'matrix':
        return new MatrixBackground();
      case 'pipes':
        return new PipesBackground();
      case 'fishtank':
        return new FishTankBackground();
      default:
        console.warn(`Unknown background type: ${type}, falling back to solid`);
        return new SolidBackground();
    }
  }

  /**
   * Get the type of a background instance (for type checking)
   */
  private static getBackgroundType(background: IBackground): BackgroundType {
    const constructor = background.constructor;

    switch (constructor) {
      case SolidBackground:
        return 'solid';
      case GradientBackground:
        return 'gradient';
      case FireworksBackground:
        return 'fireworks';
      case BubblesBackground:
        return 'bubbles';
      case SnowBackground:
        return 'snow';
      case StarsBackground:
        return 'stars';
      case MatrixBackground:
        return 'matrix';
      case PipesBackground:
        return 'pipes';
      case FishTankBackground:
        return 'fishtank';
      default:
        return 'solid';
    }
  }

  /**
   * Clear background state for a specific template
   */
  static clearTemplateBackground(templateId: string): void {
    const keysToDelete: string[] = [];

    this.backgroundInstances.forEach((background, key) => {
      if (key.startsWith(`${templateId}_`)) {
        background.cleanup();
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.backgroundInstances.delete(key);
      this.lastConfigs.delete(key);
    });
  }

  /**
   * Clear all background states
   */
  static clearAllBackgrounds(): void {
    this.backgroundInstances.forEach(background => {
      background.cleanup();
    });

    this.backgroundInstances.clear();
    this.lastConfigs.clear();
  }

  /**
   * Get the current number of active background instances
   */
  static getActiveBackgroundCount(): number {
    return this.backgroundInstances.size;
  }

  /**
   * Get debug information about active backgrounds
   */
  static getDebugInfo(): Record<string, any> {
    const info: Record<string, any> = {};

    this.backgroundInstances.forEach((background, key) => {
      info[key] = {
        type: this.getBackgroundType(background),
        state: background.getState?.() || 'No state available'
      };
    });

    return info;
  }
}