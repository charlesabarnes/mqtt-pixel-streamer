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
    id: 3,
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
    id: 4,
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
    id: 5,
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
  }
];

// Get all templates
router.get('/', (req: Request, res: Response) => {
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