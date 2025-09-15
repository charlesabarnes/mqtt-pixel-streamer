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
import { ClientCanvasAdapter, ClientPlatformUtils } from './ClientCanvasAdapter';

// Initialize the factory with client-specific utilities
BackgroundFactory.initialize(new ClientPlatformUtils());

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
export { BackgroundFactory, ClientCanvasAdapter };