import React, { useRef, useEffect, useState } from 'react';
import { Box, Typography, Button, IconButton, Switch, FormControlLabel, Chip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RefreshIcon from '@mui/icons-material/Refresh';
import RadioIcon from '@mui/icons-material/Radio';
import { Template, DISPLAY_WIDTH, DISPLAY_HEIGHT, TOTAL_DISPLAY_HEIGHT, DataFormatter, AnimationState, BackgroundConfig, BackgroundParticle, BackgroundType } from '@mqtt-pixel-streamer/shared';
import { websocketService } from '../../services/websocketService';
import { templateService } from '../../services/templateService';

interface ClientBackgroundAnimationState {
  backgroundType: BackgroundType;
  particles: BackgroundParticle[];
  lastUpdate: number;
  gradientPhase?: number;
  matrixColumns?: { x: number; y: number; speed: number; pixelSize: number }[];
  pipeSegments?: BackgroundParticle[]; // Active pipe segments
  fishParticles?: BackgroundParticle[]; // Fish in the tank
  plantPositions?: { x: number; height: number; swayPhase: number }[]; // Plants/seaweed
}

class ClientBackgroundAnimationManager {
  private backgroundState: ClientBackgroundAnimationState | null = null;

  public createOrUpdateBackgroundState(backgroundConfig: BackgroundConfig): ClientBackgroundAnimationState {
    const currentTime = Date.now();

    if (!this.backgroundState || this.backgroundState.backgroundType !== backgroundConfig.type) {
      // Create new state or reset if background type changed
      this.backgroundState = {
        backgroundType: backgroundConfig.type,
        particles: [],
        lastUpdate: currentTime, // Set initial time for new states
        gradientPhase: 0
      };

      // Initialize type-specific state
      this.initializeBackgroundState(this.backgroundState, backgroundConfig);
    }

    return this.backgroundState;
  }

  private initializeBackgroundState(state: ClientBackgroundAnimationState, config: BackgroundConfig): void {
    switch (config.type) {
      case 'bubbles':
        this.initializeBubbles(state, config.bubbles!);
        break;
      case 'snow':
        this.initializeSnow(state, config.snow!);
        break;
      case 'stars':
        this.initializeStars(state, config.stars!);
        break;
      case 'matrix':
        this.initializeMatrix(state, config.matrix!);
        break;
      case 'pipes':
        this.initializePipes(state, config.pipes!);
        break;
      case 'fishtank':
        this.initializeFishTank(state, config.fishtank!);
        break;
    }
  }

  private initializeBubbles(state: ClientBackgroundAnimationState, config: NonNullable<BackgroundConfig['bubbles']>): void {
    state.particles = [];
    const bubbleCount = Math.min(config.count, 12);

    for (let i = 0; i < bubbleCount; i++) {
      const size = Math.random() * (config.maxSize - config.minSize) + config.minSize;
      state.particles.push({
        id: `bubble_${i}`,
        position: {
          x: Math.random() * DISPLAY_WIDTH,
          y: Math.random() * TOTAL_DISPLAY_HEIGHT + TOTAL_DISPLAY_HEIGHT
        },
        velocity: {
          x: (Math.random() - 0.5) * 0.5,
          y: -config.speed * (0.5 + Math.random() * 0.5)
        },
        color: config.colors[Math.floor(Math.random() * config.colors.length)],
        life: Infinity,
        maxLife: Infinity,
        size,
        opacity: config.opacity
      });
    }
  }

  private initializeSnow(state: ClientBackgroundAnimationState, config: NonNullable<BackgroundConfig['snow']>): void {
    state.particles = [];
    const flakeCount = Math.min(config.flakeCount, 20);

    for (let i = 0; i < flakeCount; i++) {
      const size = Math.random() * (config.maxSize - config.minSize) + config.minSize;
      state.particles.push({
        id: `snowflake_${i}`,
        position: {
          x: Math.random() * DISPLAY_WIDTH,
          y: Math.random() * TOTAL_DISPLAY_HEIGHT - TOTAL_DISPLAY_HEIGHT
        },
        velocity: {
          x: config.windSpeed * (Math.random() - 0.5),
          y: config.fallSpeed * (0.5 + Math.random() * 0.5)
        },
        color: config.colors[Math.floor(Math.random() * config.colors.length)],
        life: Infinity,
        maxLife: Infinity,
        size,
        opacity: 0.8
      });
    }
  }

  private initializeStars(state: ClientBackgroundAnimationState, config: NonNullable<BackgroundConfig['stars']>): void {
    state.particles = [];
    const starCount = Math.min(config.count, 20);

    for (let i = 0; i < starCount; i++) {
      state.particles.push({
        id: `star_${i}`,
        position: {
          x: Math.random() * DISPLAY_WIDTH,
          y: Math.random() * TOTAL_DISPLAY_HEIGHT
        },
        velocity: { x: 0, y: 0 },
        color: config.colors[Math.floor(Math.random() * config.colors.length)],
        life: Infinity,
        maxLife: Infinity,
        size: 1,
        opacity: Math.random() * (config.maxBrightness - config.minBrightness) + config.minBrightness,
        twinklePhase: Math.random() * Math.PI * 2
      });
    }
  }

  private initializeMatrix(state: ClientBackgroundAnimationState, config: NonNullable<BackgroundConfig['matrix']>): void {
    state.particles = [];
    state.matrixColumns = [];

    const pixelSize = 2; // Size of each matrix pixel/square
    const columnSpacing = pixelSize + 1; // Space between columns
    const columnCount = Math.floor(DISPLAY_WIDTH / columnSpacing);

    // Increase density for more dynamic pixel matrix effect
    const effectiveDensity = Math.min(config.characterDensity, 0.4);
    const activeColumns = Math.floor(columnCount * effectiveDensity);

    for (let i = 0; i < activeColumns; i++) {
      const x = Math.floor(Math.random() * columnCount) * columnSpacing;
      state.matrixColumns.push({
        x,
        y: Math.random() * TOTAL_DISPLAY_HEIGHT - config.trailLength * pixelSize,
        speed: config.fallSpeed * (0.5 + Math.random() * 0.5),
        pixelSize
      });
    }
  }

  private initializePipes(state: ClientBackgroundAnimationState, config: NonNullable<BackgroundConfig['pipes']>): void {
    state.pipeSegments = [];

    // Start with a few initial pipes
    const initialPipes = Math.min(2, config.maxPipes);
    for (let i = 0; i < initialPipes; i++) {
      const startX = Math.floor(Math.random() * (DISPLAY_WIDTH / config.pipeWidth)) * config.pipeWidth;
      const startY = Math.floor(Math.random() * (TOTAL_DISPLAY_HEIGHT / config.pipeWidth)) * config.pipeWidth;
      const directions: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right'];

      state.pipeSegments.push({
        id: `pipe_${i}`,
        position: { x: startX, y: startY },
        velocity: { x: 0, y: 0 },
        color: config.colors[Math.floor(Math.random() * config.colors.length)],
        life: config.pipeLifetime,
        maxLife: config.pipeLifetime,
        size: config.pipeWidth,
        opacity: 1,
        direction: directions[Math.floor(Math.random() * directions.length)],
        segments: [{ x: startX, y: startY }],
        isGrowing: true
      });
    }
  }

  private initializeFishTank(state: ClientBackgroundAnimationState, config: NonNullable<BackgroundConfig['fishtank']>): void {
    state.fishParticles = [];
    state.particles = []; // For bubbles
    state.plantPositions = [];

    // Initialize fish
    for (let i = 0; i < config.fishCount; i++) {
      const size = Math.random() * (config.fishMaxSize - config.fishMinSize) + config.fishMinSize;
      state.fishParticles.push({
        id: `fish_${i}`,
        position: {
          x: Math.random() * DISPLAY_WIDTH,
          y: Math.random() * (TOTAL_DISPLAY_HEIGHT - 10) + 5 // Keep fish away from very top and bottom
        },
        velocity: {
          x: (Math.random() > 0.5 ? 1 : -1) * config.swimSpeed,
          y: (Math.random() - 0.5) * config.swimSpeed * 0.3
        },
        color: config.fishColors[Math.floor(Math.random() * config.fishColors.length)],
        life: Infinity,
        maxLife: Infinity,
        size,
        opacity: 1,
        direction: 'right',
        swimPhase: Math.random() * Math.PI * 2,
        fishType: Math.floor(Math.random() * 3) // 3 different fish types
      });
    }

    // Initialize bubbles
    for (let i = 0; i < config.bubbleCount; i++) {
      state.particles.push({
        id: `bubble_${i}`,
        position: {
          x: Math.random() * DISPLAY_WIDTH,
          y: TOTAL_DISPLAY_HEIGHT + Math.random() * 20
        },
        velocity: {
          x: (Math.random() - 0.5) * 0.2,
          y: -config.bubbleSpeed
        },
        color: 'rgba(255, 255, 255, 0.4)',
        life: Infinity,
        maxLife: Infinity,
        size: Math.random() * 2 + 1,
        opacity: 0.6
      });
    }

    // Initialize plants
    for (let i = 0; i < config.plantCount; i++) {
      state.plantPositions.push({
        x: Math.random() * DISPLAY_WIDTH,
        height: Math.random() * 10 + 5,
        swayPhase: Math.random() * Math.PI * 2
      });
    }
  }

  public updateBackground(config: BackgroundConfig, deltaTime: number): void {
    if (!this.backgroundState) return;

    // Skip updates if deltaTime is too small or too large (avoid performance issues)
    if (deltaTime < 5 || deltaTime > 100) return;

    switch (config.type) {
      case 'fireworks':
        this.updateFireworks(this.backgroundState, config.fireworks!, deltaTime);
        break;
      case 'bubbles':
        this.updateBubbles(this.backgroundState, config.bubbles!, deltaTime);
        break;
      case 'gradient':
        this.updateGradient(this.backgroundState, config.gradient!, deltaTime);
        break;
      case 'matrix':
        this.updateMatrix(this.backgroundState, config.matrix!, deltaTime);
        break;
      case 'snow':
        this.updateSnow(this.backgroundState, config.snow!, deltaTime);
        break;
      case 'stars':
        this.updateStars(this.backgroundState, config.stars!, deltaTime);
        break;
      case 'pipes':
        this.updatePipes(this.backgroundState, config.pipes!, deltaTime);
        break;
      case 'fishtank':
        this.updateFishTank(this.backgroundState, config.fishtank!, deltaTime);
        break;
    }

    // Update the state's last update time
    this.backgroundState.lastUpdate = Date.now();
  }

  private updateFireworks(state: ClientBackgroundAnimationState, config: NonNullable<BackgroundConfig['fireworks']>, deltaTime: number): void {
    // Remove expired particles
    state.particles = state.particles.filter(particle => particle.life > 0);

    // Update existing particles with frame-rate independent movement
    const deltaSeconds = deltaTime / 1000;
    state.particles.forEach(particle => {
      particle.position.x += particle.velocity.x * deltaSeconds * 60;
      particle.position.y += particle.velocity.y * deltaSeconds * 60;
      particle.velocity.y += config.gravity * deltaSeconds * 60;
      particle.life -= deltaSeconds * 60;
      particle.opacity = Math.max(0, particle.life / particle.maxLife);
    });

    // Spawn new fireworks much more frequently for spectacular display
    // Multiply frequency by 3 for much more frequent explosions
    if (Math.random() < config.frequency * deltaSeconds * 3) {
      this.spawnFirework(state, config);
    }
  }

  private spawnFirework(state: ClientBackgroundAnimationState, config: NonNullable<BackgroundConfig['fireworks']>): void {
    // Significantly increase particle limit for spectacular fireworks
    if (state.particles.length > 300) return;

    const explosionX = Math.random() * DISPLAY_WIDTH;
    const explosionY = Math.random() * TOTAL_DISPLAY_HEIGHT * 0.7; // Allow more of screen

    // Dramatically increase particle count per explosion
    const particleCount = Math.min(config.particleCount, 20);

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      // Add random angle variation for more natural spread
      const angleVariation = (Math.random() - 0.5) * 0.5;
      const finalAngle = angle + angleVariation;

      const speed = Math.random() * 3 + 1; // Increase speed range for more dynamic movement

      state.particles.push({
        id: `firework_${Date.now()}_${i}`,
        position: { x: explosionX, y: explosionY },
        velocity: {
          x: Math.cos(finalAngle) * speed,
          y: Math.sin(finalAngle) * speed
        },
        color: config.colors[Math.floor(Math.random() * config.colors.length)],
        life: 60 + Math.random() * 20, // Variable lifetime for more variety
        maxLife: 60 + Math.random() * 20,
        size: Math.random() > 0.7 ? 2 : 1, // Some larger particles
        opacity: 1
      });
    }
  }

  private updateBubbles(state: ClientBackgroundAnimationState, config: NonNullable<BackgroundConfig['bubbles']>, deltaTime: number): void {
    const deltaSeconds = deltaTime / 1000;

    state.particles.forEach(particle => {
      particle.position.x += particle.velocity.x * deltaSeconds * 60;
      particle.position.y += particle.velocity.y * deltaSeconds * 60;

      if (particle.position.y < -particle.size) {
        particle.position.y = TOTAL_DISPLAY_HEIGHT + particle.size;
        particle.position.x = Math.random() * DISPLAY_WIDTH;
      }
      if (particle.position.x < -particle.size || particle.position.x > DISPLAY_WIDTH + particle.size) {
        particle.position.x = Math.random() * DISPLAY_WIDTH;
      }
    });
  }

  private updateGradient(state: ClientBackgroundAnimationState, config: NonNullable<BackgroundConfig['gradient']>, deltaTime: number): void {
    if (!state.gradientPhase) state.gradientPhase = 0;
    state.gradientPhase += config.speed * deltaTime / 1000;
    if (state.gradientPhase > 1 && config.cyclic) {
      state.gradientPhase = 0;
    }
  }

  private updateMatrix(state: ClientBackgroundAnimationState, config: NonNullable<BackgroundConfig['matrix']>, deltaTime: number): void {
    if (!state.matrixColumns) return;

    const deltaSeconds = deltaTime / 1000;

    state.matrixColumns.forEach(column => {
      column.y += column.speed * deltaSeconds * 60;

      if (column.y > TOTAL_DISPLAY_HEIGHT + config.trailLength * column.pixelSize) {
        column.y = -config.trailLength * column.pixelSize;
        // Occasionally change position for more variety
        if (Math.random() < 0.05) {
          const columnSpacing = column.pixelSize + 1;
          const columnCount = Math.floor(DISPLAY_WIDTH / columnSpacing);
          column.x = Math.floor(Math.random() * columnCount) * columnSpacing;
        }
      }
    });
  }

  private updateSnow(state: ClientBackgroundAnimationState, config: NonNullable<BackgroundConfig['snow']>, deltaTime: number): void {
    const deltaSeconds = deltaTime / 1000;

    state.particles.forEach(particle => {
      particle.position.x += particle.velocity.x * deltaSeconds * 60;
      particle.position.y += particle.velocity.y * deltaSeconds * 60;

      if (particle.position.y > TOTAL_DISPLAY_HEIGHT + particle.size) {
        particle.position.y = -particle.size;
        particle.position.x = Math.random() * DISPLAY_WIDTH;
      }
      if (particle.position.x < -particle.size || particle.position.x > DISPLAY_WIDTH + particle.size) {
        particle.position.x = Math.random() * DISPLAY_WIDTH;
      }
    });
  }

  private updateStars(state: ClientBackgroundAnimationState, config: NonNullable<BackgroundConfig['stars']>, deltaTime: number): void {
    const deltaSeconds = deltaTime / 1000;

    state.particles.forEach(particle => {
      if (particle.twinklePhase !== undefined) {
        particle.twinklePhase += config.twinkleSpeed * deltaSeconds;

        const sinValue = Math.sin(particle.twinklePhase);
        particle.opacity = config.minBrightness +
          (config.maxBrightness - config.minBrightness) *
          (sinValue + 1) * 0.5;
      }
    });
  }

  private updatePipes(state: ClientBackgroundAnimationState, config: NonNullable<BackgroundConfig['pipes']>, deltaTime: number): void {
    if (!state.pipeSegments) return;

    const deltaSeconds = deltaTime / 1000;
    const growthFrames = Math.ceil(deltaSeconds * 60 / config.growthSpeed);

    // Update existing pipes
    state.pipeSegments.forEach(pipe => {
      if (!pipe.isGrowing || !pipe.segments) return;

      for (let i = 0; i < growthFrames; i++) {
        const lastSegment = pipe.segments[pipe.segments.length - 1];
        let newX = lastSegment.x;
        let newY = lastSegment.y;

        // Move in current direction
        switch (pipe.direction) {
          case 'up':
            newY -= config.pipeWidth;
            break;
          case 'down':
            newY += config.pipeWidth;
            break;
          case 'left':
            newX -= config.pipeWidth;
            break;
          case 'right':
            newX += config.pipeWidth;
            break;
        }

        // Check bounds and possibly turn
        let shouldTurn = false;
        if (newX < 0 || newX >= DISPLAY_WIDTH || newY < 0 || newY >= TOTAL_DISPLAY_HEIGHT) {
          shouldTurn = true;
        } else if (Math.random() < config.turnProbability) {
          shouldTurn = true;
        }

        if (shouldTurn) {
          // Choose a new valid direction
          const validDirections: Array<'up' | 'down' | 'left' | 'right'> = [];
          if (lastSegment.x >= config.pipeWidth) validDirections.push('left');
          if (lastSegment.x < DISPLAY_WIDTH - config.pipeWidth) validDirections.push('right');
          if (lastSegment.y >= config.pipeWidth) validDirections.push('up');
          if (lastSegment.y < TOTAL_DISPLAY_HEIGHT - config.pipeWidth) validDirections.push('down');

          if (validDirections.length > 0) {
            pipe.direction = validDirections[Math.floor(Math.random() * validDirections.length)];
          } else {
            pipe.isGrowing = false;
            continue;
          }

          // Recalculate position with new direction
          newX = lastSegment.x;
          newY = lastSegment.y;
          switch (pipe.direction) {
            case 'up':
              newY -= config.pipeWidth;
              break;
            case 'down':
              newY += config.pipeWidth;
              break;
            case 'left':
              newX -= config.pipeWidth;
              break;
            case 'right':
              newX += config.pipeWidth;
              break;
          }
        }

        // Add new segment if within bounds
        if (newX >= 0 && newX < DISPLAY_WIDTH && newY >= 0 && newY < TOTAL_DISPLAY_HEIGHT) {
          pipe.segments.push({ x: newX, y: newY });
          pipe.life--;

          if (pipe.life <= 0) {
            pipe.isGrowing = false;
          }
        } else {
          pipe.isGrowing = false;
        }
      }
    });

    // Remove old pipes and start new ones
    state.pipeSegments = state.pipeSegments.filter(pipe => pipe.segments && pipe.segments.length > 0);

    // Add new pipes if below max
    if (state.pipeSegments.length < config.maxPipes && Math.random() < 0.02) {
      const startX = Math.floor(Math.random() * (DISPLAY_WIDTH / config.pipeWidth)) * config.pipeWidth;
      const startY = Math.floor(Math.random() * (TOTAL_DISPLAY_HEIGHT / config.pipeWidth)) * config.pipeWidth;
      const directions: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right'];

      state.pipeSegments.push({
        id: `pipe_${Date.now()}`,
        position: { x: startX, y: startY },
        velocity: { x: 0, y: 0 },
        color: config.colors[Math.floor(Math.random() * config.colors.length)],
        life: config.pipeLifetime,
        maxLife: config.pipeLifetime,
        size: config.pipeWidth,
        opacity: 1,
        direction: directions[Math.floor(Math.random() * directions.length)],
        segments: [{ x: startX, y: startY }],
        isGrowing: true
      });
    }
  }

  private updateFishTank(state: ClientBackgroundAnimationState, config: NonNullable<BackgroundConfig['fishtank']>, deltaTime: number): void {
    const deltaSeconds = deltaTime / 1000;

    // Update fish
    if (state.fishParticles) {
      state.fishParticles.forEach(fish => {
        // Update position
        fish.position.x += fish.velocity.x * deltaSeconds * 60;
        fish.position.y += fish.velocity.y * deltaSeconds * 60;

        // Update swim animation phase
        if (fish.swimPhase !== undefined) {
          fish.swimPhase += 3 * deltaSeconds;
        }

        // Bounce off walls
        if (fish.position.x <= 0 || fish.position.x >= DISPLAY_WIDTH - fish.size) {
          fish.velocity.x *= -1;
          fish.direction = fish.velocity.x > 0 ? 'right' : 'left';
        }
        if (fish.position.y <= 0 || fish.position.y >= TOTAL_DISPLAY_HEIGHT - fish.size) {
          fish.velocity.y *= -1;
        }

        // Occasional random direction change
        if (Math.random() < 0.01) {
          fish.velocity.y = (Math.random() - 0.5) * config.swimSpeed * 0.3;
        }
      });
    }

    // Update bubbles
    state.particles.forEach(bubble => {
      bubble.position.x += bubble.velocity.x * deltaSeconds * 60;
      bubble.position.y += bubble.velocity.y * deltaSeconds * 60;

      // Reset bubbles that reach the top
      if (bubble.position.y < -bubble.size) {
        bubble.position.y = TOTAL_DISPLAY_HEIGHT + bubble.size;
        bubble.position.x = Math.random() * DISPLAY_WIDTH;
      }
    });

    // Update plant sway
    if (state.plantPositions) {
      state.plantPositions.forEach(plant => {
        plant.swayPhase += deltaSeconds * 2;
      });
    }
  }

  public getBackgroundState(): ClientBackgroundAnimationState | null {
    return this.backgroundState;
  }

  public clearState(): void {
    this.backgroundState = null;
  }
}

interface PreviewCanvasProps {
  template: Template | null;
  isRunning: boolean;
  onTogglePreview: () => void;
  brightness: number;
}

const PreviewCanvas: React.FC<PreviewCanvasProps> = ({
  template,
  isRunning,
  onTogglePreview,
  brightness,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvas2Ref = useRef<HTMLCanvasElement>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [isLivePublishing, setIsLivePublishing] = useState(false);
  const [publishingFrameCount, setPublishingFrameCount] = useState(0);
  const animationRef = useRef<number>();
  const backgroundAnimationManager = useRef(new ClientBackgroundAnimationManager());

  // Check if template is in dual display mode
  const isDualDisplay = template?.displayMode === 'dual';

  // Helper to get background config with fallback
  const getBackgroundConfig = (template: Template): BackgroundConfig => {
    if (template.backgroundConfig) {
      return template.backgroundConfig;
    }
    // Default solid background for backward compatibility
    return {
      type: 'solid',
      solid: {
        color: template.background || '#000000'
      }
    };
  };

  // Helper function to apply brightness to colors
  const applyBrightness = (color: string): string => {
    const brightnessFactor = brightness / 100;

    // Handle hex colors
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);

      const dimmedR = Math.round(r * brightnessFactor);
      const dimmedG = Math.round(g * brightnessFactor);
      const dimmedB = Math.round(b * brightnessFactor);

      return `#${dimmedR.toString(16).padStart(2, '0')}${dimmedG.toString(16).padStart(2, '0')}${dimmedB.toString(16).padStart(2, '0')}`;
    }

    // Handle rgb/rgba colors
    if (color.startsWith('rgb')) {
      const matches = color.match(/\d+/g);
      if (matches && matches.length >= 3) {
        const r = Math.round(parseInt(matches[0]) * brightnessFactor);
        const g = Math.round(parseInt(matches[1]) * brightnessFactor);
        const b = Math.round(parseInt(matches[2]) * brightnessFactor);
        const a = matches[3] ? parseInt(matches[3]) : 255;

        return matches.length > 3 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`;
      }
    }

    // Handle hsl colors
    if (color.startsWith('hsl')) {
      const matches = color.match(/\d+/g);
      if (matches && matches.length >= 3) {
        const h = matches[0];
        const s = matches[1];
        const l = Math.round(parseInt(matches[2]) * brightnessFactor);
        const a = matches[3] ? parseInt(matches[3]) : 1;

        return matches.length > 3 ? `hsla(${h}, ${s}%, ${l}%, ${a})` : `hsl(${h}, ${s}%, ${l}%)`;
      }
    }

    // Return original color if we can't parse it
    return color;
  };

  // Render background based on configuration
  const renderBackground = (ctx: CanvasRenderingContext2D, template: Template, width: number, height: number): void => {
    const backgroundConfig = getBackgroundConfig(template);

    // Update background animation state
    if (backgroundConfig.type !== 'solid') {
      const currentTime = Date.now();

      // Get or create state without updating lastUpdate yet
      let state = backgroundAnimationManager.current.getBackgroundState();
      if (!state || state.backgroundType !== backgroundConfig.type) {
        state = backgroundAnimationManager.current.createOrUpdateBackgroundState(backgroundConfig);
      }

      const deltaTime = currentTime - state.lastUpdate;
      const effectiveDeltaTime = deltaTime > 0 ? Math.min(deltaTime, 100) : 16;

      backgroundAnimationManager.current.updateBackground(backgroundConfig, effectiveDeltaTime);
    }

    // Render background based on type
    switch (backgroundConfig.type) {
      case 'solid':
        const solidColor = applyBrightness(backgroundConfig.solid?.color || '#000000');
        ctx.fillStyle = solidColor;
        ctx.fillRect(0, 0, width, height);
        break;

      case 'gradient':
        renderGradientBackground(ctx, backgroundConfig.gradient!, width, height);
        break;

      case 'fireworks':
      case 'bubbles':
      case 'snow':
      case 'stars':
        // Clear with black background first
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
        renderParticleBackground(ctx, backgroundConfig);
        break;

      case 'matrix':
        renderMatrixBackground(ctx, backgroundConfig.matrix!, width, height);
        break;

      case 'pipes':
        renderPipesBackground(ctx, backgroundConfig.pipes!, width, height);
        break;

      case 'fishtank':
        renderFishTankBackground(ctx, backgroundConfig.fishtank!, width, height);
        break;
    }
  };

  const renderGradientBackground = (ctx: CanvasRenderingContext2D, config: NonNullable<BackgroundConfig['gradient']>, width: number, height: number): void => {
    const state = backgroundAnimationManager.current.getBackgroundState();
    const phase = state?.gradientPhase || 0;

    let gradient: CanvasGradient;

    switch (config.direction) {
      case 'horizontal':
        gradient = ctx.createLinearGradient(0, 0, width, 0);
        break;
      case 'vertical':
        gradient = ctx.createLinearGradient(0, 0, 0, height);
        break;
      case 'diagonal':
        gradient = ctx.createLinearGradient(0, 0, width, height);
        break;
      case 'radial':
        gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height)/2);
        break;
      default:
        gradient = ctx.createLinearGradient(0, 0, width, 0);
    }

    // Apply colors with animation phase and brightness
    config.colors.forEach((color, index) => {
      let position = index / (config.colors.length - 1);
      if (config.cyclic) {
        position = (position + phase) % 1;
      }
      const adjustedColor = applyBrightness(color);
      gradient.addColorStop(Math.max(0, Math.min(1, position)), adjustedColor);
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  };

  const renderParticleBackground = (ctx: CanvasRenderingContext2D, config: BackgroundConfig): void => {
    const state = backgroundAnimationManager.current.getBackgroundState();
    if (!state?.particles) return;

    state.particles.forEach(particle => {
      ctx.save();
      ctx.globalAlpha = particle.opacity * (brightness / 100);
      ctx.fillStyle = applyBrightness(particle.color);

      if (config.type === 'bubbles') {
        // Render bubbles as circles
        ctx.beginPath();
        ctx.arc(particle.position.x, particle.position.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Render other particles as small rectangles/pixels
        ctx.fillRect(particle.position.x, particle.position.y, particle.size, particle.size);
      }

      ctx.restore();
    });
  };

  const renderMatrixBackground = (ctx: CanvasRenderingContext2D, config: NonNullable<BackgroundConfig['matrix']>, width: number, height: number): void => {
    // Clear with black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    const state = backgroundAnimationManager.current.getBackgroundState();
    if (!state?.matrixColumns) return;

    state.matrixColumns.forEach(column => {
      // Render trail of pixel squares
      for (let i = 0; i < config.trailLength; i++) {
        const y = column.y - i * (column.pixelSize + 1);
        if (y >= 0 && y < height) {
          const alpha = (1 - (i / config.trailLength)) * (brightness / 100);
          const colorIndex = Math.floor(alpha * (config.colors.length - 1));
          ctx.globalAlpha = alpha;
          ctx.fillStyle = applyBrightness(config.colors[colorIndex] || config.colors[0]);
          ctx.fillRect(column.x, y, column.pixelSize, column.pixelSize);
        }
      }
    });

    ctx.globalAlpha = 1;
  };

  const renderPipesBackground = (ctx: CanvasRenderingContext2D, config: NonNullable<BackgroundConfig['pipes']>, width: number, height: number): void => {
    // Clear with black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    const state = backgroundAnimationManager.current.getBackgroundState();
    if (!state?.pipeSegments) return;

    // Render all pipe segments
    state.pipeSegments.forEach(pipe => {
      if (!pipe.segments) return;

      ctx.fillStyle = applyBrightness(pipe.color);

      // Draw each segment
      pipe.segments.forEach((segment, index) => {
        ctx.fillRect(segment.x, segment.y, config.pipeWidth, config.pipeWidth);

        // Draw corner connectors for turns
        if (index > 0) {
          const prevSegment = pipe.segments![index - 1];
          const dx = segment.x - prevSegment.x;
          const dy = segment.y - prevSegment.y;

          // Draw a corner piece if there's a turn
          if (dx !== 0 && dy !== 0) {
            // This creates a smooth corner
            ctx.fillRect(
              Math.min(segment.x, prevSegment.x),
              Math.min(segment.y, prevSegment.y),
              config.pipeWidth,
              config.pipeWidth
            );
          }
        }
      });

      // Draw end cap for growing pipes
      if (pipe.isGrowing && pipe.segments.length > 0) {
        const lastSegment = pipe.segments[pipe.segments.length - 1];
        ctx.fillStyle = applyBrightness('#FFFFFF');
        const capSize = Math.floor(config.pipeWidth / 3);
        ctx.fillRect(
          lastSegment.x + Math.floor((config.pipeWidth - capSize) / 2),
          lastSegment.y + Math.floor((config.pipeWidth - capSize) / 2),
          capSize,
          capSize
        );
      }
    });
  };

  const renderFishTankBackground = (ctx: CanvasRenderingContext2D, config: NonNullable<BackgroundConfig['fishtank']>, width: number, height: number): void => {
    // Clear with water color
    const waterColor = applyBrightness(config.waterColor);
    ctx.fillStyle = waterColor;
    ctx.fillRect(0, 0, width, height);

    const state = backgroundAnimationManager.current.getBackgroundState();
    if (!state) return;

    // Render plants/seaweed
    if (state.plantPositions) {
      ctx.fillStyle = applyBrightness('#004400');
      state.plantPositions.forEach(plant => {
        const swayOffset = Math.sin(plant.swayPhase) * 2;

        // Draw simple seaweed using rectangles
        for (let y = 0; y < plant.height; y++) {
          const segmentSway = swayOffset * (y / plant.height);
          ctx.fillRect(
            plant.x + segmentSway,
            TOTAL_DISPLAY_HEIGHT - y - 1,
            2,
            1
          );
        }
      });
    }

    // Render fish
    if (state.fishParticles) {
      state.fishParticles.forEach(fish => {
        ctx.fillStyle = applyBrightness(fish.color);

        // Simple fish shape (rectangular body with tail)
        const bodyLength = Math.floor(fish.size * 0.7);
        const tailLength = Math.floor(fish.size * 0.3);

        // Body
        ctx.fillRect(fish.position.x, fish.position.y, bodyLength, Math.floor(fish.size / 2));

        // Tail (triangle approximation with rectangles)
        if (fish.direction === 'right') {
          // Tail on left
          ctx.fillRect(fish.position.x - tailLength, fish.position.y + Math.floor(fish.size / 4), tailLength, 1);
        } else {
          // Tail on right
          ctx.fillRect(fish.position.x + bodyLength, fish.position.y + Math.floor(fish.size / 4), tailLength, 1);
        }

        // Eye
        ctx.fillStyle = '#FFFFFF';
        const eyeX = fish.direction === 'right' ? fish.position.x + bodyLength - 2 : fish.position.x + 1;
        ctx.fillRect(eyeX, fish.position.y, 1, 1);
      });
    }

    // Render bubbles
    if (state.particles) {
      state.particles.forEach(bubble => {
        ctx.save();
        ctx.globalAlpha = bubble.opacity * (brightness / 100);
        ctx.fillStyle = applyBrightness('#FFFFFF');

        // Draw bubble as a small circle (approximated with rect for pixel art)
        ctx.fillRect(bubble.position.x, bubble.position.y, bubble.size, bubble.size);

        ctx.restore();
      });
    }
  };

  useEffect(() => {
    // Subscribe to WebSocket frame updates
    const unsubscribeFrames = websocketService.onFrame((frameData) => {
      renderFrame(frameData);
      setFrameCount((prev) => prev + 1);
      if (isLivePublishing) {
        setPublishingFrameCount((prev) => prev + 1);
      }
    });

    // Subscribe to publishing status updates
    const unsubscribeUpdates = websocketService.onUpdate((type, data) => {
      if (type === 'publishing_started' && data.templateId === template?.id) {
        setIsLivePublishing(true);
      } else if (type === 'publishing_stopped' && data.templateId === template?.id) {
        setIsLivePublishing(false);
      }
    });

    return () => {
      unsubscribeFrames();
      unsubscribeUpdates();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [template?.id, isLivePublishing]);

  useEffect(() => {
    if (isRunning && template) {
      startAnimation();
    } else {
      stopAnimation();
    }

    return () => {
      stopAnimation();
    };
  }, [isRunning, template]);

  const startAnimation = () => {
    const animate = () => {
      renderTemplate();
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();
  };

  const stopAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
  };

  const renderFrame = (base64Data: string) => {
    const canvas1 = canvasRef.current;
    const canvas2 = canvas2Ref.current;
    if (!canvas1) return;

    // Decode base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Apply brightness to the frame data
    const brightnessFactor = brightness / 100;
    const dimmedBytes = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i += 4) {
      dimmedBytes[i] = Math.round(bytes[i] * brightnessFactor);     // R
      dimmedBytes[i + 1] = Math.round(bytes[i + 1] * brightnessFactor); // G
      dimmedBytes[i + 2] = Math.round(bytes[i + 2] * brightnessFactor); // B
      dimmedBytes[i + 3] = bytes[i + 3]; // A (keep alpha unchanged)
    }

    const ctx1 = canvas1.getContext('2d');
    if (!ctx1) return;

    if (isDualDisplay && canvas2) {
      const ctx2 = canvas2.getContext('2d');
      if (!ctx2) return;

      // For dual display, expect a 128x64 frame (32,768 bytes)
      if (dimmedBytes.length === DISPLAY_WIDTH * TOTAL_DISPLAY_HEIGHT * 4) {
        // Split the frame into two 128x32 sections
        const display1Bytes = dimmedBytes.slice(0, DISPLAY_WIDTH * DISPLAY_HEIGHT * 4);
        const display2Bytes = dimmedBytes.slice(DISPLAY_WIDTH * DISPLAY_HEIGHT * 4);

        // Create ImageData for display1 (top)
        const imageData1 = new ImageData(
          new Uint8ClampedArray(display1Bytes.buffer),
          DISPLAY_WIDTH,
          DISPLAY_HEIGHT
        );
        ctx1.putImageData(imageData1, 0, 0);

        // Create ImageData for display2 (bottom)
        const imageData2 = new ImageData(
          new Uint8ClampedArray(display2Bytes.buffer),
          DISPLAY_WIDTH,
          DISPLAY_HEIGHT
        );
        ctx2.putImageData(imageData2, 0, 0);
      } else {
        // Fallback: treat as single display frame, show on display1 only
        const imageData = new ImageData(
          new Uint8ClampedArray(dimmedBytes.buffer),
          DISPLAY_WIDTH,
          DISPLAY_HEIGHT
        );
        ctx1.putImageData(imageData, 0, 0);

        // Clear display2
        ctx2.fillStyle = '#000000';
        ctx2.fillRect(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);
      }
    } else {
      // Single display mode
      const imageData = new ImageData(
        new Uint8ClampedArray(dimmedBytes.buffer),
        DISPLAY_WIDTH,
        DISPLAY_HEIGHT
      );
      ctx1.putImageData(imageData, 0, 0);
    }
  };

  const renderTemplate = () => {
    const canvas1 = canvasRef.current;
    const canvas2 = canvas2Ref.current;
    if (!canvas1 || !template) return;

    const ctx1 = canvas1.getContext('2d');
    if (!ctx1) return;

    // Render background for display1
    renderBackground(ctx1, template, DISPLAY_WIDTH, DISPLAY_HEIGHT);

    let ctx2: CanvasRenderingContext2D | null = null;
    if (isDualDisplay && canvas2) {
      ctx2 = canvas2.getContext('2d');
      if (ctx2) {
        // Render background for display2
        renderBackground(ctx2, template, DISPLAY_WIDTH, DISPLAY_HEIGHT);
      }
    }

    // Get current data values for data elements
    const dataValues = DataFormatter.getCurrentDataValues();

    // Render elements
    template.elements.forEach((element) => {
      if (!element.visible) return;

      // Determine which display(s) to render on based purely on position
      const renderOnDisplay1 = element.position.y >= 0 && element.position.y < DISPLAY_HEIGHT;

      const renderOnDisplay2 = isDualDisplay && ctx2 &&
                               element.position.y >= DISPLAY_HEIGHT && element.position.y < TOTAL_DISPLAY_HEIGHT;

      // Render on display1
      if (renderOnDisplay1) {
        renderElementOnContext(ctx1, element, dataValues);
      }

      // Render on display2
      if (renderOnDisplay2) {
        // Adjust position for display2 (shift y position down by DISPLAY_HEIGHT)
        const adjustedElement = { ...element };
        if (element.position.y >= DISPLAY_HEIGHT) {
          adjustedElement.position = {
            ...element.position,
            y: element.position.y - DISPLAY_HEIGHT
          };
        }
        renderElementOnContext(ctx2!, adjustedElement, dataValues);
      }
    });
  };

  const renderElementOnContext = (
    ctx: CanvasRenderingContext2D,
    element: any,
    dataValues: Record<string, any>
  ) => {
    const style = element.style || {};
    const baseColor = style.color || '#FFFFFF';
    ctx.fillStyle = applyBrightness(baseColor);
    ctx.font = `${style.fontSize || 12}px ${style.fontFamily || 'monospace'}`;

    switch (element.type) {
      case 'text':
        if (element.text) {
          ctx.fillText(element.text, element.position.x, element.position.y);
        }
        break;
      case 'data':
        // Use shared formatter for consistent rendering with backend
        const value = DataFormatter.processDataElement(
          element.dataSource || '',
          dataValues,
          element.format,
          element.timezone
        );
        ctx.fillText(value, element.position.x, element.position.y);
        break;
      case 'shape':
        renderShape(ctx, element);
        break;
    }
  };


  const renderShape = (ctx: CanvasRenderingContext2D, element: any) => {
    const size = element.size || { width: 10, height: 10 };
    const style = element.style || {};

    const strokeColor = style.borderColor || style.color || '#FFFFFF';
    ctx.strokeStyle = applyBrightness(strokeColor);
    ctx.lineWidth = style.borderWidth || 1;

    if (style.backgroundColor) {
      ctx.fillStyle = applyBrightness(style.backgroundColor);
    }

    switch (element.shape) {
      case 'rectangle':
        if (style.backgroundColor) {
          ctx.fillRect(element.position.x, element.position.y, size.width, size.height);
        }
        ctx.strokeRect(element.position.x, element.position.y, size.width, size.height);
        break;
      case 'circle':
        const radius = Math.min(size.width, size.height) / 2;
        ctx.beginPath();
        ctx.arc(
          element.position.x + radius,
          element.position.y + radius,
          radius,
          0,
          Math.PI * 2
        );
        if (style.backgroundColor) {
          ctx.fill();
        }
        ctx.stroke();
        break;
    }
  };

  const handleRefresh = () => {
    renderTemplate();
  };

  const handleToggleLivePublishing = async () => {
    if (!template?.id) return;

    try {
      if (isLivePublishing) {
        await templateService.stopPublishing(template.id);
        websocketService.stopPublishing(template.id);
        setIsLivePublishing(false);
        setPublishingFrameCount(0);
      } else {
        await templateService.startPublishing(template.id);
        websocketService.startPublishing(template.id);
        setIsLivePublishing(true);
      }
    } catch (error) {
      console.error('Failed to toggle live publishing:', error);
    }
  };

  // Check publishing status when template changes
  useEffect(() => {
    const checkPublishingStatus = async () => {
      if (template?.id) {
        try {
          const status = await templateService.getPublishingStatus(template.id);
          setIsLivePublishing(status.isPublishing);
          if (!status.isPublishing) {
            setPublishingFrameCount(0);
          }
        } catch (error) {
          console.error('Failed to check publishing status:', error);
        }
      }
    };

    checkPublishingStatus();
  }, [template?.id]);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Preview ({isDualDisplay ? '128×64 (Dual)' : '128×32'})
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2">
            Preview: {frameCount} frames
          </Typography>
          {isLivePublishing && (
            <Chip
              icon={<RadioIcon />}
              label={`Live: ${publishingFrameCount}`}
              color="success"
              size="small"
            />
          )}
          <FormControlLabel
            control={
              <Switch
                checked={isLivePublishing}
                onChange={handleToggleLivePublishing}
                color="primary"
                disabled={!template?.id}
              />
            }
            label="Live"
            sx={{ mr: 1 }}
          />
          <IconButton onClick={handleRefresh}>
            <RefreshIcon />
          </IconButton>
          <IconButton onClick={onTogglePreview}>
            {isRunning ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
        </Box>
      </Box>

      <Box
        sx={{
          backgroundColor: '#000',
          padding: 2,
          borderRadius: 1,
          display: 'inline-block',
        }}
      >
        {isDualDisplay ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#fff', mb: 1, display: 'block' }}>
                Display 1 (Top)
              </Typography>
              <canvas
                ref={canvasRef}
                width={DISPLAY_WIDTH}
                height={DISPLAY_HEIGHT}
                style={{
                  border: '2px solid #666',
                  imageRendering: 'pixelated',
                  transform: 'scale(4)',
                  transformOrigin: 'top left',
                  marginRight: DISPLAY_WIDTH * 3,
                  marginBottom: DISPLAY_HEIGHT * 3,
                  display: 'block',
                }}
              />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#fff', mb: 1, display: 'block' }}>
                Display 2 (Bottom)
              </Typography>
              <canvas
                ref={canvas2Ref}
                width={DISPLAY_WIDTH}
                height={DISPLAY_HEIGHT}
                style={{
                  border: '2px solid #666',
                  imageRendering: 'pixelated',
                  transform: 'scale(4)',
                  transformOrigin: 'top left',
                  marginRight: DISPLAY_WIDTH * 3,
                  marginBottom: DISPLAY_HEIGHT * 3,
                  display: 'block',
                }}
              />
            </Box>
          </Box>
        ) : (
          <canvas
            ref={canvasRef}
            width={DISPLAY_WIDTH}
            height={DISPLAY_HEIGHT}
            style={{
              border: '2px solid #666',
              imageRendering: 'pixelated',
              transform: 'scale(4)',
              transformOrigin: 'top left',
              marginRight: DISPLAY_WIDTH * 3,
              marginBottom: DISPLAY_HEIGHT * 3,
            }}
          />
        )}
      </Box>

      <Typography variant="caption" sx={{ mt: 2, display: 'block' }}>
        4× scaled for visibility | Frame Size: {isDualDisplay ? '32,768' : '16,384'} bytes
      </Typography>
    </Box>
  );
};

export default PreviewCanvas;