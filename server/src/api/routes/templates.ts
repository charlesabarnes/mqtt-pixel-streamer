import { Router, Request, Response } from 'express';
import { Template, DataFormatter } from '@mqtt-pixel-streamer/shared';
import { canvasRenderer } from '../../renderer/CanvasRenderer';
import { mqttPublisher } from '../../mqtt/MQTTClient';
import { websocketServer } from '../../websocket/WebSocketServer';

const router = Router();

// In-memory storage for now (will be replaced with SQLite)
let templates: Template[] = [
  {
    id: 1,
    name: 'Default Clock',
    background: '#000000',
    updateInterval: 1000,
    enabled: true,
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
    // Get current data values using shared utility
    const dataValues = DataFormatter.getCurrentDataValues();

    // Render frame
    const frameData = await canvasRenderer.renderTemplate(template, dataValues);

    // Publish to MQTT
    await mqttPublisher.publishFrame(frameData);

    // Broadcast to WebSocket clients
    websocketServer.broadcastFrame(frameData);

    res.json({
      success: true,
      message: 'Frame published successfully',
      frameSize: frameData.length
    });
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

  const publishFrame = async () => {
    try {
      // Get current data values using shared utility
      const dataValues = DataFormatter.getCurrentDataValues();

      // Get fresh template data in case it was updated
      const currentTemplate = templates.find(t => t.id === templateId);
      if (!currentTemplate) return;

      // Render frame
      const frameData = await canvasRenderer.renderTemplate(currentTemplate, dataValues);

      // Publish to MQTT
      await mqttPublisher.publishFrame(frameData);

      // Broadcast to WebSocket clients
      websocketServer.broadcastFrame(frameData);
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