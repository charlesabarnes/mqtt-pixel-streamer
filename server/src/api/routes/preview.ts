import { Router, Request, Response } from 'express';
import { canvasRenderer } from '../../renderer/CanvasRenderer';
import { websocketServer } from '../../websocket/WebSocketServer';

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

export default router;