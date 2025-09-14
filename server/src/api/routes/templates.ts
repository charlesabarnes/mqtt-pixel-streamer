import { Router, Request, Response } from 'express';
import { Template } from '@mqtt-pixel-streamer/shared';
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

// Publish template frame
router.post('/:id/publish', async (req: Request, res: Response) => {
  const template = templates.find(t => t.id === parseInt(req.params.id));
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  try {
    // Get current data values
    const dataValues = {
      time: new Date(),
      date: new Date(),
      weather: {
        temp: 72,
        condition: 'Sunny'
      }
    };

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

export default router;