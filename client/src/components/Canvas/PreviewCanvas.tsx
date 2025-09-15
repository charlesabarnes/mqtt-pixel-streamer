import React, { useRef, useEffect, useState } from 'react';
import { Box, Typography, Button, IconButton, Switch, FormControlLabel, Chip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RefreshIcon from '@mui/icons-material/Refresh';
import RadioIcon from '@mui/icons-material/Radio';
import { Template, DISPLAY_WIDTH, DISPLAY_HEIGHT, TOTAL_DISPLAY_HEIGHT, DataFormatter } from '@mqtt-pixel-streamer/shared';
import { websocketService } from '../../services/websocketService';
import { templateService } from '../../services/templateService';

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
  const canvas2Ref = useRef<HTMLCanvasElement>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [isLivePublishing, setIsLivePublishing] = useState(false);
  const [publishingFrameCount, setPublishingFrameCount] = useState(0);
  const animationRef = useRef<number>();

  // Check if template is in dual display mode
  const isDualDisplay = template?.displayMode === 'dual';

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

    const ctx1 = canvas1.getContext('2d');
    if (!ctx1) return;

    if (isDualDisplay && canvas2) {
      const ctx2 = canvas2.getContext('2d');
      if (!ctx2) return;

      // For dual display, expect a 128x64 frame (32,768 bytes)
      if (bytes.length === DISPLAY_WIDTH * TOTAL_DISPLAY_HEIGHT * 4) {
        // Split the frame into two 128x32 sections
        const display1Bytes = bytes.slice(0, DISPLAY_WIDTH * DISPLAY_HEIGHT * 4);
        const display2Bytes = bytes.slice(DISPLAY_WIDTH * DISPLAY_HEIGHT * 4);

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
          new Uint8ClampedArray(bytes.buffer),
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
        new Uint8ClampedArray(bytes.buffer),
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

    // Clear display1
    ctx1.fillStyle = template.background || '#000000';
    ctx1.fillRect(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);

    let ctx2: CanvasRenderingContext2D | null = null;
    if (isDualDisplay && canvas2) {
      ctx2 = canvas2.getContext('2d');
      if (ctx2) {
        // Clear display2
        ctx2.fillStyle = template.background || '#000000';
        ctx2.fillRect(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);
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
    ctx.fillStyle = style.color || '#FFFFFF';
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
          element.format
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