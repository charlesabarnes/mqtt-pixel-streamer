import {
  BackgroundFactory,
  SolidBackground,
  GradientBackground,
  FireworksBackground,
  BubblesBackground,
  SnowBackground,
  StarsBackground,
  MatrixBackground,
  PipesBackground,
  FishTankBackground,
  GifBackground
} from '@mqtt-pixel-streamer/shared';
import { ServerCanvasAdapter, ServerPlatformUtils } from './ServerCanvasAdapter';

// Initialize the factory with server-specific utilities
BackgroundFactory.initialize(new ServerPlatformUtils());

// Register all background implementations
BackgroundFactory.registerBackground('solid', SolidBackground);
BackgroundFactory.registerBackground('gradient', GradientBackground);
BackgroundFactory.registerBackground('fireworks', FireworksBackground);
BackgroundFactory.registerBackground('bubbles', BubblesBackground);
BackgroundFactory.registerBackground('snow', SnowBackground);
BackgroundFactory.registerBackground('stars', StarsBackground);
BackgroundFactory.registerBackground('matrix', MatrixBackground);
BackgroundFactory.registerBackground('pipes', PipesBackground);
BackgroundFactory.registerBackground('fishtank', FishTankBackground);
BackgroundFactory.registerBackground('gif', GifBackground);

// Re-export what we need
export { BackgroundFactory, ServerCanvasAdapter };