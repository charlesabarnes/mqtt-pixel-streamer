// Core types and interfaces
export { IBackground, ICanvasContext, IRenderOptions, IPlatformUtils } from './types';

// Base classes
export { BaseBackground } from './BaseBackground';

// Factory
export { BackgroundFactory } from './BackgroundFactory';

// Background implementations
export { SolidBackground } from './implementations/SolidBackground';
export { GradientBackground } from './implementations/GradientBackground';
export { FireworksBackground } from './implementations/FireworksBackground';
export { BubblesBackground } from './implementations/BubblesBackground';
export { SnowBackground } from './implementations/SnowBackground';
export { StarsBackground } from './implementations/StarsBackground';
export { MatrixBackground } from './implementations/MatrixBackground';
export { PipesBackground } from './implementations/PipesBackground';
export { FishTankBackground } from './implementations/FishTankBackground';
export { GifBackground } from './implementations/GifBackground';