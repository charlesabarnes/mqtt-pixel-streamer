import { Router, Request, Response } from 'express';
import { Template, DataFormatter } from '@mqtt-pixel-streamer/shared';
import { canvasRenderer } from '../../renderer/CanvasRenderer';
import { mqttPublisher } from '../../mqtt/MQTTClient';
import { websocketServer } from '../../websocket/WebSocketServer';
import { dataIntegrationManager } from '../../services/DataIntegrationManager';

const router = Router();

// Helper function to get current data values from integration manager
function getCurrentDataValues(): Record<string, any> {
  return dataIntegrationManager.getCurrentDataValues();
}

// In-memory storage for now (will be replaced with SQLite)
let templates: Template[] = [
  {
    id: 1,
    name: 'Default Clock',
    background: '#000000',
    updateInterval: 1000,
    enabled: true,
    displayMode: 'single' as const,
    elements: [
      {
        id: 'time',
        type: 'data',
        position: { x: 2, y: 16 },
        dataSource: 'time',
        format: 'time',
        style: {
          color: '#00FF00',
          fontSize: 14,
          fontFamily: 'monospace'
        },
        visible: true
      },
      {
        id: 'date',
        type: 'data',
        position: { x: 2, y: 28 },
        dataSource: 'date',
        format: 'date',
        style: {
          color: '#FFFF00',
          fontSize: 10,
          fontFamily: 'monospace'
        },
        visible: true
      }
    ]
  },
  {
    id: 2,
    name: 'Retro Pipes',
    backgroundConfig: {
      type: 'pipes',
      pipes: {
        pipeWidth: 3,
        growthSpeed: 2,
        maxPipes: 5,
        turnProbability: 0.15,
        colors: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF'],
        pipeLifetime: 80
      }
    },
    background: '#000000',
    updateInterval: 50,
    enabled: true,
    displayMode: 'single' as const,
    elements: [
      {
        id: 'pipes-title',
        type: 'text',
        position: { x: 35, y: 10 },
        text: 'PIPES SCREENSAVER',
        style: {
          color: '#FFFFFF',
          fontSize: 8,
          fontFamily: 'monospace'
        },
        visible: true
      }
    ]
  },
  {
    id: 3,
    name: 'Aquarium',
    backgroundConfig: {
      type: 'fishtank',
      fishtank: {
        fishCount: 6,
        fishMinSize: 4,
        fishMaxSize: 8,
        swimSpeed: 1.2,
        bubbleCount: 15,
        bubbleSpeed: 0.6,
        plantCount: 4,
        waterColor: '#001844',
        fishColors: ['#FFA500', '#FFD700', '#FF6347', '#FF1493', '#00CED1', '#32CD32']
      }
    },
    background: '#001844',
    updateInterval: 50,
    enabled: true,
    displayMode: 'single' as const,
    elements: [
      {
        id: 'aquarium-title',
        type: 'text',
        position: { x: 45, y: 8 },
        text: 'AQUARIUM',
        style: {
          color: '#00FFFF',
          fontSize: 8,
          fontFamily: 'monospace'
        },
        visible: true
      }
    ]
  },
  {
    id: 4,
    name: 'Dual Display Clock',
    background: '#000000',
    updateInterval: 1000,
    enabled: true,
    displayMode: 'dual' as const,
    elements: [
      {
        id: 'time-top',
        type: 'data',
        position: { x: 2, y: 16 },
        dataSource: 'time',
        format: 'time',
        targetDisplay: 'display1',
        style: {
          color: '#00FF00',
          fontSize: 14,
          fontFamily: 'monospace'
        },
        visible: true
      },
      {
        id: 'date-bottom',
        type: 'data',
        position: { x: 2, y: 48 }, // y: 32+16 for display2
        dataSource: 'date',
        format: 'date',
        targetDisplay: 'display2',
        style: {
          color: '#0000FF',
          fontSize: 12,
          fontFamily: 'monospace'
        },
        visible: true
      },
      {
        id: 'status-bottom',
        type: 'text',
        position: { x: 2, y: 60 }, // y: 32+28 for display2
        text: 'DISPLAY2',
        targetDisplay: 'display2',
        style: {
          color: '#FFFF00',
          fontSize: 8,
          fontFamily: 'monospace'
        },
        visible: true
      }
    ]
  },
  {
    id: 5,
    name: 'DVD Logo Bouncer',
    background: '#000000',
    updateInterval: 50, // 20 FPS for smooth animation
    enabled: true,
    displayMode: 'dual' as const,
    elements: [
      {
        id: 'dvd-logo',
        type: 'text',
        position: { x: 30, y: 32 },
        text: 'DVD',
        animation: {
          type: 'dvd-logo',
          speed: 2,
          repeat: true
        },
        effectConfig: {
          dvdLogo: {
            text: 'DVD',
            speed: 2,
            colors: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'],
            bounceColorChange: true
          }
        },
        style: {
          color: '#FFFFFF',
          fontSize: 16,
          fontFamily: 'monospace'
        },
        visible: true
      }
    ]
  },
  {
    id: 6,
    name: 'Rainbow Text Demo',
    background: '#000000',
    updateInterval: 100,
    enabled: true,
    displayMode: 'single' as const,
    elements: [
      {
        id: 'rainbow-text',
        type: 'text',
        position: { x: 10, y: 16 },
        text: 'RAINBOW!',
        animation: {
          type: 'rainbow',
          speed: 1,
          repeat: true
        },
        effectConfig: {
          rainbow: {
            speed: 1,
            hueRange: [0, 360],
            saturation: 100,
            brightness: 50,
            mode: 'text'
          }
        },
        style: {
          fontSize: 14,
          fontFamily: 'monospace'
        },
        visible: true
      }
    ]
  },
  {
    id: 7,
    name: 'Weather Display',
    background: '#000000',
    updateInterval: 1000, // 1 second (weather data updates independently)
    enabled: true,
    displayMode: 'single' as const,
    elements: [
      {
        id: 'weather-temp',
        type: 'data',
        position: { x: 2, y: 16 },
        dataSource: 'weather.temperature',
        format: '##°F',
        style: {
          color: '#FF6600',
          fontSize: 14,
          fontFamily: 'monospace'
        },
        visible: true
      },
      {
        id: 'weather-condition',
        type: 'data',
        position: { x: 2, y: 28 },
        dataSource: 'weather.condition',
        format: 'text',
        style: {
          color: '#00FFFF',
          fontSize: 8,
          fontFamily: 'monospace'
        },
        visible: true
      },
      {
        id: 'weather-humidity',
        type: 'data',
        position: { x: 70, y: 16 },
        dataSource: 'weather.humidity',
        format: '##%',
        style: {
          color: '#0099FF',
          fontSize: 10,
          fontFamily: 'monospace'
        },
        visible: true
      },
      {
        id: 'weather-wind',
        type: 'data',
        position: { x: 70, y: 28 },
        dataSource: 'weather.windSpeed',
        format: '## mph',
        style: {
          color: '#99FF99',
          fontSize: 8,
          fontFamily: 'monospace'
        },
        visible: true
      }
    ]
  },
  {
    id: 8,
    name: 'Fireworks Background',
    background: '#000000', // Legacy fallback
    backgroundConfig: {
      type: 'fireworks',
      fireworks: {
        frequency: 0.5,
        particleCount: 6,
        explosionSize: 20,
        colors: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'],
        gravity: 0.1,
        trailLength: 8
      }
    },
    updateInterval: 50,
    enabled: true,
    displayMode: 'single' as const,
    elements: [
      {
        id: 'fireworks-text',
        type: 'text',
        position: { x: 30, y: 16 },
        text: 'FIREWORKS!',
        style: {
          color: '#FFFFFF',
          fontSize: 12,
          fontFamily: 'monospace'
        },
        visible: true
      }
    ]
  },
  {
    id: 9,
    name: 'Bubble Effect',
    background: '#001122', // Legacy fallback
    backgroundConfig: {
      type: 'bubbles',
      bubbles: {
        count: 12,
        minSize: 2,
        maxSize: 5,
        speed: 0.8,
        colors: ['#0080FF', '#00FFFF', '#8080FF', '#80FFFF', '#ADD8E6'],
        opacity: 0.6
      }
    },
    updateInterval: 50,
    enabled: true,
    displayMode: 'single' as const,
    elements: [
      {
        id: 'bubble-time',
        type: 'data',
        position: { x: 25, y: 20 },
        dataSource: 'time',
        format: 'time',
        style: {
          color: '#FFFFFF',
          fontSize: 14,
          fontFamily: 'monospace'
        },
        visible: true
      }
    ]
  },
  {
    id: 10,
    name: 'Matrix Background',
    background: '#000000', // Legacy fallback
    backgroundConfig: {
      type: 'matrix',
      matrix: {
        characterDensity: 0.2,
        fallSpeed: 2.5,
        colors: ['#00FF00', '#80FF80', '#40FF40'],
        trailLength: 10,
        characters: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'
      }
    },
    updateInterval: 100,
    enabled: true,
    displayMode: 'single' as const,
    elements: [
      {
        id: 'matrix-text',
        type: 'text',
        position: { x: 35, y: 20 },
        text: 'THE MATRIX',
        style: {
          color: '#00FF00',
          fontSize: 8,
          fontFamily: 'monospace'
        },
        visible: true
      }
    ]
  },
  {
    id: 11,
    name: 'Gradient Waves',
    background: '#000000', // Legacy fallback
    backgroundConfig: {
      type: 'gradient',
      gradient: {
        colors: ['#FF0080', '#8000FF', '#0080FF', '#00FF80'],
        direction: 'horizontal',
        speed: 1.5,
        cyclic: true
      }
    },
    updateInterval: 50,
    enabled: true,
    displayMode: 'dual' as const,
    elements: [
      {
        id: 'gradient-title',
        type: 'text',
        position: { x: 30, y: 16 },
        text: 'GRADIENT',
        style: {
          color: '#FFFFFF',
          fontSize: 12,
          fontFamily: 'monospace'
        },
        visible: true
      },
      {
        id: 'gradient-time',
        type: 'data',
        position: { x: 35, y: 48 },
        dataSource: 'time',
        format: 'time',
        style: {
          color: '#FFFFFF',
          fontSize: 10,
          fontFamily: 'monospace'
        },
        visible: true
      }
    ]
  },
  {
    id: 12,
    name: 'Starfield',
    background: '#000000', // Legacy fallback
    backgroundConfig: {
      type: 'stars',
      stars: {
        count: 20,
        twinkleSpeed: 1.5,
        colors: ['#FFFFFF', '#FFFF80', '#80FFFF', '#FF8080', '#FFB6C1'],
        minBrightness: 0.3,
        maxBrightness: 1.0
      }
    },
    updateInterval: 100,
    enabled: true,
    displayMode: 'single' as const,
    elements: [
      {
        id: 'stars-text',
        type: 'text',
        position: { x: 40, y: 16 },
        text: '✦ STARS ✦',
        style: {
          color: '#FFFFFF',
          fontSize: 10,
          fontFamily: 'monospace'
        },
        visible: true
      }
    ]
  },
  {
    id: 13,
    name: 'Multi-Timezone Display',
    background: '#000000',
    updateInterval: 1000,
    enabled: true,
    displayMode: 'dual' as const,
    elements: [
      {
        id: 'est-time',
        type: 'data',
        position: { x: 2, y: 12 },
        dataSource: 'time',
        format: 'HH:MM',
        timezone: 'America/New_York',
        style: {
          color: '#00FF00',
          fontSize: 10,
          fontFamily: 'monospace'
        },
        visible: true
      },
      {
        id: 'est-label',
        type: 'text',
        position: { x: 50, y: 12 },
        text: 'EST',
        style: {
          color: '#888888',
          fontSize: 8,
          fontFamily: 'monospace'
        },
        visible: true
      },
      {
        id: 'central-time',
        type: 'data',
        position: { x: 2, y: 24 },
        dataSource: 'time',
        format: 'HH:MM',
        timezone: 'America/Chicago',
        style: {
          color: '#FFFF00',
          fontSize: 10,
          fontFamily: 'monospace'
        },
        visible: true
      },
      {
        id: 'central-label',
        type: 'text',
        position: { x: 50, y: 24 },
        text: 'CST',
        style: {
          color: '#888888',
          fontSize: 8,
          fontFamily: 'monospace'
        },
        visible: true
      },
      {
        id: 'date-display',
        type: 'data',
        position: { x: 2, y: 44 },
        dataSource: 'date',
        format: 'date',
        style: {
          color: '#00FFFF',
          fontSize: 12,
          fontFamily: 'monospace'
        },
        visible: true,
        targetDisplay: 'display2'
      },
      {
        id: 'date-label',
        type: 'text',
        position: { x: 2, y: 56 },
        text: 'Today',
        style: {
          color: '#888888',
          fontSize: 8,
          fontFamily: 'monospace'
        },
        visible: true,
        targetDisplay: 'display2'
      }
    ]
  }
];

// Get all templates
router.get('/', (_req: Request, res: Response) => {
  res.json(templates);
});

// Get template by ID
router.get('/:id', (req: Request, res: Response) => {
  const template = templates.find(t => t.id === parseInt(req.params.id));
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }
  res.json(template);
});

// Create new template
router.post('/', (req: Request, res: Response) => {
  const newTemplate: Template = {
    ...req.body,
    id: templates.length + 1,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  templates.push(newTemplate);
  res.status(201).json(newTemplate);
});

// Update template
router.put('/:id', (req: Request, res: Response) => {
  const index = templates.findIndex(t => t.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Template not found' });
  }

  templates[index] = {
    ...templates[index],
    ...req.body,
    id: templates[index].id,
    updatedAt: new Date()
  };

  res.json(templates[index]);
});

// Delete template
router.delete('/:id', (req: Request, res: Response) => {
  const index = templates.findIndex(t => t.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Template not found' });
  }

  templates.splice(index, 1);
  res.status(204).send();
});

// Active publishing intervals
const activePublishers = new Map<number, NodeJS.Timeout>();

// Publish template frame (single frame)
router.post('/:id/publish', async (req: Request, res: Response) => {
  const template = templates.find(t => t.id === parseInt(req.params.id));
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  try {
    // Get current data values from integration manager
    const dataValues = getCurrentDataValues();

    // Handle different display modes
    if (template.displayMode === 'dual') {
      // Render both displays
      const { display1, display2 } = await canvasRenderer.renderDualDisplayTemplate(template, dataValues);

      // Publish to both MQTT topics
      await mqttPublisher.publishFrameToBothDisplays(display1, display2);

      // Broadcast dual frame to WebSocket clients for preview
      websocketServer.broadcastDualFrame(display1, display2);

      res.json({
        success: true,
        message: 'Frames published to both displays successfully',
        frameSize: {
          display1: display1.length,
          display2: display2.length
        }
      });
    } else if (template.displayMode === 'display2') {
      // Render only for display2
      const frameData = await canvasRenderer.renderTemplateForDisplay(template, 'display2', dataValues);

      // Publish to display2 MQTT topic
      await mqttPublisher.publishFrame(frameData, 'display2');

      // Broadcast to WebSocket clients
      websocketServer.broadcastFrame(frameData);

      res.json({
        success: true,
        message: 'Frame published to display2 successfully',
        frameSize: frameData.length
      });
    } else {
      // Default behavior: single display or display1
      const frameData = await canvasRenderer.renderTemplate(template, dataValues);

      // Publish to display1 MQTT topic
      await mqttPublisher.publishFrame(frameData, 'display1');

      // Broadcast to WebSocket clients
      websocketServer.broadcastFrame(frameData);

      res.json({
        success: true,
        message: 'Frame published to display1 successfully',
        frameSize: frameData.length
      });
    }
  } catch (error) {
    console.error('Failed to publish frame:', error);
    res.status(500).json({
      error: 'Failed to publish frame',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start continuous publishing
router.post('/:id/start-publishing', async (req: Request, res: Response) => {
  const templateId = parseInt(req.params.id);
  const template = templates.find(t => t.id === templateId);

  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  // Stop existing publisher if running
  if (activePublishers.has(templateId)) {
    clearInterval(activePublishers.get(templateId)!);
  }

  // Clear animation states to reset animation for the new session
  canvasRenderer.clearAnimationStates();

  const publishFrame = async () => {
    try {
      // Get current data values from integration manager
      const dataValues = getCurrentDataValues();

      // Get fresh template data in case it was updated
      const currentTemplate = templates.find(t => t.id === templateId);
      if (!currentTemplate) return;

      // Handle different display modes
      if (currentTemplate.displayMode === 'dual') {
        // Render both displays
        const { display1, display2 } = await canvasRenderer.renderDualDisplayTemplate(currentTemplate, dataValues);

        // Publish to both MQTT topics
        await mqttPublisher.publishFrameToBothDisplays(display1, display2);

        // Broadcast dual frame to WebSocket clients
        websocketServer.broadcastDualFrame(display1, display2);
      } else if (currentTemplate.displayMode === 'display2') {
        // Render only for display2
        const frameData = await canvasRenderer.renderTemplateForDisplay(currentTemplate, 'display2', dataValues);

        // Publish to display2 MQTT topic
        await mqttPublisher.publishFrame(frameData, 'display2');

        // Broadcast to WebSocket clients
        websocketServer.broadcastFrame(frameData);
      } else {
        // Default behavior: single display or display1
        const frameData = await canvasRenderer.renderTemplate(currentTemplate, dataValues);

        // Publish to display1 MQTT topic
        await mqttPublisher.publishFrame(frameData, 'display1');

        // Broadcast to WebSocket clients
        websocketServer.broadcastFrame(frameData);
      }
    } catch (error) {
      console.error('Failed to publish frame in continuous mode:', error);
    }
  };

  // Start publishing at template's update interval
  const interval = setInterval(publishFrame, template.updateInterval || 1000);
  activePublishers.set(templateId, interval);

  // Publish first frame immediately
  await publishFrame();

  res.json({
    success: true,
    message: 'Continuous publishing started',
    interval: template.updateInterval || 1000
  });
});

// Stop continuous publishing
router.post('/:id/stop-publishing', (req: Request, res: Response) => {
  const templateId = parseInt(req.params.id);

  if (activePublishers.has(templateId)) {
    clearInterval(activePublishers.get(templateId)!);
    activePublishers.delete(templateId);

    res.json({
      success: true,
      message: 'Continuous publishing stopped'
    });
  } else {
    res.status(404).json({ error: 'No active publishing found for this template' });
  }
});

// Get publishing status
router.get('/:id/publishing-status', (req: Request, res: Response) => {
  const templateId = parseInt(req.params.id);
  const isPublishing = activePublishers.has(templateId);

  res.json({
    isPublishing,
    templateId
  });
});

// Export function to update templates from WebSocket
export const updateTemplateInStore = (templateId: number, templateData: any) => {
  const index = templates.findIndex(t => t.id === templateId);
  if (index !== -1) {
    templates[index] = {
      ...templates[index],
      ...templateData,
      id: templateId,
      updatedAt: new Date()
    };
    console.log(`Updated template ${templateId} in store`);
  }
};

export default router;