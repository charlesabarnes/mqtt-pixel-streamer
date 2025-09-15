import { BackgroundConfig, BackgroundType } from '../types';
import { IBackground, IPlatformUtils } from './types';

export class BackgroundFactory {
  private static backgroundInstances = new Map<string, IBackground>();
  private static lastConfigs = new Map<string, BackgroundConfig>();
  private static platformUtils: IPlatformUtils = {};
  private static backgroundClasses = new Map<BackgroundType, new (utils: IPlatformUtils) => IBackground>();

  /**
   * Initialize the factory with platform-specific utilities
   */
  static initialize(platformUtils: IPlatformUtils): void {
    BackgroundFactory.platformUtils = platformUtils;
  }

  /**
   * Register a background class for a specific type
   */
  static registerBackground<T extends IBackground>(
    type: BackgroundType,
    backgroundClass: new (utils: IPlatformUtils) => T
  ): void {
    BackgroundFactory.backgroundClasses.set(type, backgroundClass);
  }

  /**
   * Get or create a background instance for the given template ID and configuration
   */
  static getBackground(templateId: string, config: BackgroundConfig): IBackground {
    const key = `${templateId}_${config.type}`;

    // Check if we have an existing background of the correct type
    let background = BackgroundFactory.backgroundInstances.get(key);
    const lastConfig = BackgroundFactory.lastConfigs.get(key);

    // Create new background if none exists or type has changed
    if (!background || BackgroundFactory.getBackgroundType(background) !== config.type) {
      // Clean up old background if it exists
      if (background) {
        background.cleanup();
        BackgroundFactory.backgroundInstances.delete(key);
      }

      // Create new background
      background = BackgroundFactory.createBackground(config.type);
      if (!background) {
        throw new Error(`Failed to create background of type: ${config.type}`);
      }
      BackgroundFactory.backgroundInstances.set(key, background);
    }

    // Re-initialize if config has changed or this is a new background
    const configChanged = !lastConfig || JSON.stringify(lastConfig) !== JSON.stringify(config);
    if (configChanged) {
      background.initialize(config);
      BackgroundFactory.lastConfigs.set(key, JSON.parse(JSON.stringify(config))); // Deep copy
    }

    return background;
  }

  /**
   * Create a new background instance for the given type
   */
  private static createBackground(type: BackgroundType): IBackground {
    const BackgroundClass = BackgroundFactory.backgroundClasses.get(type);

    if (BackgroundClass) {
      return new BackgroundClass(BackgroundFactory.platformUtils);
    }

    console.warn(`Unknown background type: ${type}, no implementation registered`);

    // Try to fall back to solid background
    const SolidClass = BackgroundFactory.backgroundClasses.get('solid');
    if (SolidClass) {
      console.warn(`Falling back to solid background`);
      return new SolidClass(BackgroundFactory.platformUtils);
    }

    throw new Error(`No background implementation found for type: ${type} and no solid fallback available`);
  }

  /**
   * Get the type of a background instance (for type checking)
   */
  private static getBackgroundType(background: IBackground): BackgroundType {
    // Find the background type by checking which class it is an instance of
    for (const [type, BackgroundClass] of BackgroundFactory.backgroundClasses) {
      if (background instanceof BackgroundClass) {
        return type;
      }
    }

    return 'solid'; // Default fallback
  }

  /**
   * Clear background state for a specific template
   */
  static clearTemplateBackground(templateId: string): void {
    const keysToDelete: string[] = [];

    BackgroundFactory.backgroundInstances.forEach((background, key) => {
      if (key.startsWith(`${templateId}_`)) {
        background.cleanup();
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      BackgroundFactory.backgroundInstances.delete(key);
      BackgroundFactory.lastConfigs.delete(key);
    });
  }

  /**
   * Clear all background states
   */
  static clearAllBackgrounds(): void {
    BackgroundFactory.backgroundInstances.forEach(background => {
      background.cleanup();
    });

    BackgroundFactory.backgroundInstances.clear();
    BackgroundFactory.lastConfigs.clear();
  }

  /**
   * Get the current number of active background instances
   */
  static getActiveBackgroundCount(): number {
    return BackgroundFactory.backgroundInstances.size;
  }

  /**
   * Get debug information about active backgrounds
   */
  static getDebugInfo(): Record<string, any> {
    const info: Record<string, any> = {};

    BackgroundFactory.backgroundInstances.forEach((background, key) => {
      info[key] = {
        type: BackgroundFactory.getBackgroundType(background),
        state: background.getState?.() || 'No state available'
      };
    });

    return info;
  }

  /**
   * Get list of registered background types
   */
  static getRegisteredTypes(): BackgroundType[] {
    return Array.from(BackgroundFactory.backgroundClasses.keys());
  }
}