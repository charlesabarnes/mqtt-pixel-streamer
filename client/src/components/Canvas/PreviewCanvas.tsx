import React, { useRef, useEffect, useState } from 'react';
import { Box, Typography, Button, IconButton } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Template, DISPLAY_WIDTH, DISPLAY_HEIGHT } from '@mqtt-pixel-streamer/shared';
import { websocketService } from '../../services/websocketService';

interface PreviewCanvasProps {
  template: Template | null;
  isRunning: boolean;
  onTogglePreview: () => void;
}

const PreviewCanvas: React.FC<PreviewCanvasProps> = ({
  template,
  isRunning,
  onTogglePreview,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frameCount, setFrameCount] = useState(0);
  const animationRef = useRef<number>();

  useEffect(() => {
    // Subscribe to WebSocket frame updates
    const unsubscribe = websocketService.onFrame((frameData) => {
      renderFrame(frameData);
      setFrameCount((prev) => prev + 1);
    });

    return () => {
      unsubscribe();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

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
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Decode base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create ImageData from RGBA bytes
    const imageData = new ImageData(
      new Uint8ClampedArray(bytes.buffer),
      DISPLAY_WIDTH,
      DISPLAY_HEIGHT
    );

    // Draw to canvas
    ctx.putImageData(imageData, 0, 0);
  };

  const renderTemplate = () => {
    const canvas = canvasRef.current;
    if (!canvas || !template) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = template.background || '#000000';
    ctx.fillRect(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);

    // Render elements
    template.elements.forEach((element) => {
      if (!element.visible) return;

      const style = element.style || {};
      ctx.fillStyle = style.color || '#FFFFFF';
      ctx.font = `${style.fontSize || 12}px ${style.fontFamily || 'monospace'}`;

      switch (element.type) {
        case 'text':
          if (element.text) {
            ctx.fillText(element.text, element.position.x, element.position.y);
          }
          break;
        case 'data':
          const value = getDataValue(element.dataSource);
          ctx.fillText(value, element.position.x, element.position.y);
          break;
        case 'shape':
          renderShape(ctx, element);
          break;
      }
    });
  };

  const getDataValue = (dataSource?: string): string => {
    if (!dataSource) return '';

    switch (dataSource) {
      case 'time':
        return new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });
      case 'date':
        return new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
      default:
        return dataSource;
    }
  };

  const renderShape = (ctx: CanvasRenderingContext2D, element: any) => {
    const size = element.size || { width: 10, height: 10 };
    const style = element.style || {};

    ctx.strokeStyle = style.borderColor || style.color || '#FFFFFF';
    ctx.lineWidth = style.borderWidth || 1;

    if (style.backgroundColor) {
      ctx.fillStyle = style.backgroundColor;
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

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Preview (128×32)
        </Typography>
        <Typography variant="body2" sx={{ mr: 2 }}>
          Frames: {frameCount}
        </Typography>
        <IconButton onClick={handleRefresh}>
          <RefreshIcon />
        </IconButton>
        <IconButton onClick={onTogglePreview}>
          {isRunning ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
      </Box>

      <Box
        sx={{
          backgroundColor: '#000',
          padding: 2,
          borderRadius: 1,
          display: 'inline-block',
        }}
      >
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
      </Box>

      <Typography variant="caption" sx={{ mt: 2, display: 'block' }}>
        4× scaled for visibility | Frame Size: 16,384 bytes
      </Typography>
    </Box>
  );
};

export default PreviewCanvas;