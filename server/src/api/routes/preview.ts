import { Router, Request, Response } from 'express';
import { canvasRenderer } from '../../renderer/CanvasRenderer';
import { websocketServer } from '../../websocket/WebSocketServer';
import { mqttPublisher } from '../../mqtt/MQTTClient';

const router = Router();

// Generate test frame
router.get('/test', async (req: Request, res: Response) => {
  try {
    const frameData = await canvasRenderer.renderTestFrame();

    // Broadcast to WebSocket clients
    websocketServer.broadcastFrame(frameData);

    // Return as base64 for JSON response
    res.json({
      success: true,
      frame: frameData.toString('base64'),
      size: frameData.length,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to generate test frame:', error);
    res.status(500).json({
      error: 'Failed to generate test frame',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get current frame for a template
router.get('/:templateId', async (req: Request, res: Response) => {
  try {
    // This will be connected to the template system
    const frameData = await canvasRenderer.renderTestFrame();

    res.json({
      success: true,
      frame: frameData.toString('base64'),
      size: frameData.length,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate frame',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test dual displays
router.get('/test/dual', async (req: Request, res: Response) => {
  try {
    const display1Data = await canvasRenderer.renderTestFrameForDisplay('display1');
    const display2Data = await canvasRenderer.renderTestFrameForDisplay('display2');

    // Publish to both MQTT topics
    await mqttPublisher.publishFrameToBothDisplays(display1Data, display2Data);

    // Broadcast dual frame to WebSocket clients for preview
    websocketServer.broadcastDualFrame(display1Data, display2Data);

    res.json({
      success: true,
      frames: {
        display1: display1Data.toString('base64'),
        display2: display2Data.toString('base64')
      },
      sizes: {
        display1: display1Data.length,
        display2: display2Data.length
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to generate dual test frames:', error);
    res.status(500).json({
      error: 'Failed to generate dual test frames',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test specific display
router.get('/test/:displayId', async (req: Request, res: Response) => {
  const displayId = req.params.displayId as 'display1' | 'display2';

  if (displayId !== 'display1' && displayId !== 'display2') {
    return res.status(400).json({ error: 'Invalid display ID. Use display1 or display2.' });
  }

  try {
    const frameData = await canvasRenderer.renderTestFrameForDisplay(displayId);

    // Publish to specific MQTT topic
    await mqttPublisher.publishFrame(frameData, displayId);

    // Broadcast to WebSocket clients
    websocketServer.broadcastFrame(frameData);

    res.json({
      success: true,
      frame: frameData.toString('base64'),
      size: frameData.length,
      displayId,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error(`Failed to generate test frame for ${displayId}:`, error);
    res.status(500).json({
      error: `Failed to generate test frame for ${displayId}`,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;