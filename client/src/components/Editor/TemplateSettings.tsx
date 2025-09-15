import React from 'react';
import {
  Box,
  TextField,
  Typography,
  Slider,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  IconButton,
  Grid,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { Template, DISPLAY_WIDTH, DISPLAY_HEIGHT, TOTAL_DISPLAY_HEIGHT, BackgroundConfig, BackgroundType } from '@mqtt-pixel-streamer/shared';

interface TemplateSettingsProps {
  template: Template | null;
  onUpdate: (updates: Partial<Template>) => void;
}

const TemplateSettings: React.FC<TemplateSettingsProps> = ({ template, onUpdate }) => {
  if (!template) {
    return (
      <Box>
        <Typography variant="h6">Template Settings</Typography>
        <Typography variant="body2" color="text.secondary">
          No template selected
        </Typography>
      </Box>
    );
  }

  // Helper to get current background config with fallback
  const getBackgroundConfig = (): BackgroundConfig => {
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

  // Helper to update background config
  const updateBackgroundConfig = (updates: Partial<BackgroundConfig>) => {
    const currentConfig = getBackgroundConfig();
    const newConfig = { ...currentConfig, ...updates };
    onUpdate({ backgroundConfig: newConfig });
  };

  // Default configurations for each background type
  const getDefaultConfigForType = (type: BackgroundType): BackgroundConfig => {
    const defaults: Record<BackgroundType, BackgroundConfig> = {
      solid: {
        type: 'solid',
        solid: { color: '#000000' }
      },
      fireworks: {
        type: 'fireworks',
        fireworks: {
          frequency: 0.5,
          particleCount: 15,
          explosionSize: 20,
          colors: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'],
          gravity: 0.1,
          trailLength: 10
        }
      },
      bubbles: {
        type: 'bubbles',
        bubbles: {
          count: 20,
          minSize: 2,
          maxSize: 6,
          speed: 0.5,
          colors: ['#0080FF', '#00FFFF', '#8080FF', '#80FFFF'],
          opacity: 0.7
        }
      },
      gradient: {
        type: 'gradient',
        gradient: {
          colors: ['#FF0000', '#0000FF'],
          direction: 'horizontal',
          speed: 1,
          cyclic: true
        }
      },
      matrix: {
        type: 'matrix',
        matrix: {
          characterDensity: 0.3,
          fallSpeed: 2,
          colors: ['#00FF00', '#80FF80'],
          trailLength: 15,
          characters: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'
        }
      },
      snow: {
        type: 'snow',
        snow: {
          flakeCount: 30,
          minSize: 1,
          maxSize: 3,
          fallSpeed: 1,
          windSpeed: 0.3,
          colors: ['#FFFFFF', '#F0F0F0', '#E0E0E0']
        }
      },
      stars: {
        type: 'stars',
        stars: {
          count: 50,
          twinkleSpeed: 2,
          colors: ['#FFFFFF', '#FFFF80', '#80FFFF', '#FF8080'],
          minBrightness: 0.2,
          maxBrightness: 1.0
        }
      },
      pipes: {
        type: 'pipes',
        pipes: {
          pipeWidth: 3,
          growthSpeed: 2,
          maxPipes: 5,
          turnProbability: 0.1,
          colors: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'],
          pipeLifetime: 100
        }
      },
      fishtank: {
        type: 'fishtank',
        fishtank: {
          fishCount: 5,
          fishMinSize: 4,
          fishMaxSize: 8,
          swimSpeed: 1,
          bubbleCount: 10,
          bubbleSpeed: 0.5,
          plantCount: 3,
          waterColor: '#001844',
          fishColors: ['#FFA500', '#FFD700', '#FF6347', '#FF1493', '#00CED1']
        }
      }
    };
    return defaults[type];
  };

  const backgroundConfig = getBackgroundConfig();

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Template Settings
      </Typography>

      <TextField
        fullWidth
        margin="normal"
        label="Template Name"
        value={template.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
      />

      <FormControl fullWidth margin="normal">
        <InputLabel>Display Mode</InputLabel>
        <Select
          value={template.displayMode || 'single'}
          label="Display Mode"
          onChange={(e) => onUpdate({ displayMode: e.target.value as any })}
        >
          <MenuItem value="single">Single Display (128×32)</MenuItem>
          <MenuItem value="dual">Dual Display (128×64)</MenuItem>
          <MenuItem value="display1">Display 1 Only</MenuItem>
          <MenuItem value="display2">Display 2 Only</MenuItem>
        </Select>
      </FormControl>

      {/* Background Configuration */}
      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Background</Typography>
          <Chip
            label={backgroundConfig.type}
            color="primary"
            size="small"
            sx={{ ml: 2 }}
          />
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <FormControl fullWidth margin="normal">
              <InputLabel>Background Type</InputLabel>
              <Select
                value={backgroundConfig.type}
                label="Background Type"
                onChange={(e) => {
                  const newType = e.target.value as BackgroundType;
                  const newConfig = getDefaultConfigForType(newType);
                  updateBackgroundConfig(newConfig);
                }}
              >
                <MenuItem value="solid">Solid Color</MenuItem>
                <MenuItem value="fireworks">Fireworks</MenuItem>
                <MenuItem value="bubbles">Bubbles</MenuItem>
                <MenuItem value="gradient">Gradient</MenuItem>
                <MenuItem value="matrix">Matrix</MenuItem>
                <MenuItem value="snow">Snow</MenuItem>
                <MenuItem value="stars">Stars</MenuItem>
                <MenuItem value="pipes">Pipes</MenuItem>
                <MenuItem value="fishtank">Fish Tank</MenuItem>
              </Select>
            </FormControl>

            {/* Solid background configuration */}
            {backgroundConfig.type === 'solid' && backgroundConfig.solid && (
              <TextField
                fullWidth
                margin="normal"
                label="Background Color"
                type="color"
                value={backgroundConfig.solid.color}
                onChange={(e) => updateBackgroundConfig({
                  solid: { color: e.target.value }
                })}
                InputLabelProps={{ shrink: true }}
              />
            )}

            {/* Fireworks background configuration */}
            {backgroundConfig.type === 'fireworks' && backgroundConfig.fireworks && (
              <Box>
                <Typography gutterBottom sx={{ mt: 2 }}>
                  Frequency: {backgroundConfig.fireworks.frequency} explosions/sec
                </Typography>
                <Slider
                  value={backgroundConfig.fireworks.frequency}
                  onChange={(_, value) => updateBackgroundConfig({
                    fireworks: { ...backgroundConfig.fireworks!, frequency: value as number }
                  })}
                  min={0.1}
                  max={2}
                  step={0.1}
                />

                <Typography gutterBottom sx={{ mt: 2 }}>
                  Particle Count: {backgroundConfig.fireworks.particleCount}
                </Typography>
                <Slider
                  value={backgroundConfig.fireworks.particleCount}
                  onChange={(_, value) => updateBackgroundConfig({
                    fireworks: { ...backgroundConfig.fireworks!, particleCount: value as number }
                  })}
                  min={5}
                  max={30}
                  step={1}
                />

                <Typography gutterBottom sx={{ mt: 2 }}>
                  Gravity: {backgroundConfig.fireworks.gravity}
                </Typography>
                <Slider
                  value={backgroundConfig.fireworks.gravity}
                  onChange={(_, value) => updateBackgroundConfig({
                    fireworks: { ...backgroundConfig.fireworks!, gravity: value as number }
                  })}
                  min={0}
                  max={0.5}
                  step={0.01}
                />
              </Box>
            )}

            {/* Bubbles background configuration */}
            {backgroundConfig.type === 'bubbles' && backgroundConfig.bubbles && (
              <Box>
                <Typography gutterBottom sx={{ mt: 2 }}>
                  Bubble Count: {backgroundConfig.bubbles.count}
                </Typography>
                <Slider
                  value={backgroundConfig.bubbles.count}
                  onChange={(_, value) => updateBackgroundConfig({
                    bubbles: { ...backgroundConfig.bubbles!, count: value as number }
                  })}
                  min={5}
                  max={50}
                  step={1}
                />

                <Typography gutterBottom sx={{ mt: 2 }}>
                  Speed: {backgroundConfig.bubbles.speed}
                </Typography>
                <Slider
                  value={backgroundConfig.bubbles.speed}
                  onChange={(_, value) => updateBackgroundConfig({
                    bubbles: { ...backgroundConfig.bubbles!, speed: value as number }
                  })}
                  min={0.1}
                  max={2}
                  step={0.1}
                />

                <Typography gutterBottom sx={{ mt: 2 }}>
                  Opacity: {backgroundConfig.bubbles.opacity}
                </Typography>
                <Slider
                  value={backgroundConfig.bubbles.opacity}
                  onChange={(_, value) => updateBackgroundConfig({
                    bubbles: { ...backgroundConfig.bubbles!, opacity: value as number }
                  })}
                  min={0.1}
                  max={1}
                  step={0.1}
                />
              </Box>
            )}

            {/* Gradient background configuration */}
            {backgroundConfig.type === 'gradient' && backgroundConfig.gradient && (
              <Box>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Direction</InputLabel>
                  <Select
                    value={backgroundConfig.gradient.direction}
                    label="Direction"
                    onChange={(e) => updateBackgroundConfig({
                      gradient: { ...backgroundConfig.gradient!, direction: e.target.value as any }
                    })}
                  >
                    <MenuItem value="horizontal">Horizontal</MenuItem>
                    <MenuItem value="vertical">Vertical</MenuItem>
                    <MenuItem value="diagonal">Diagonal</MenuItem>
                    <MenuItem value="radial">Radial</MenuItem>
                  </Select>
                </FormControl>

                <Typography gutterBottom sx={{ mt: 2 }}>
                  Speed: {backgroundConfig.gradient.speed}
                </Typography>
                <Slider
                  value={backgroundConfig.gradient.speed}
                  onChange={(_, value) => updateBackgroundConfig({
                    gradient: { ...backgroundConfig.gradient!, speed: value as number }
                  })}
                  min={0.1}
                  max={5}
                  step={0.1}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={backgroundConfig.gradient.cyclic}
                      onChange={(e) => updateBackgroundConfig({
                        gradient: { ...backgroundConfig.gradient!, cyclic: e.target.checked }
                      })}
                    />
                  }
                  label="Cyclic Animation"
                  sx={{ mt: 2 }}
                />
              </Box>
            )}

            {/* Matrix background configuration */}
            {backgroundConfig.type === 'matrix' && backgroundConfig.matrix && (
              <Box>
                <Typography gutterBottom sx={{ mt: 2 }}>
                  Character Density: {(backgroundConfig.matrix.characterDensity * 100).toFixed(0)}%
                </Typography>
                <Slider
                  value={backgroundConfig.matrix.characterDensity}
                  onChange={(_, value) => updateBackgroundConfig({
                    matrix: { ...backgroundConfig.matrix!, characterDensity: value as number }
                  })}
                  min={0.1}
                  max={1}
                  step={0.1}
                />

                <Typography gutterBottom sx={{ mt: 2 }}>
                  Fall Speed: {backgroundConfig.matrix.fallSpeed}
                </Typography>
                <Slider
                  value={backgroundConfig.matrix.fallSpeed}
                  onChange={(_, value) => updateBackgroundConfig({
                    matrix: { ...backgroundConfig.matrix!, fallSpeed: value as number }
                  })}
                  min={0.5}
                  max={5}
                  step={0.1}
                />

                <Typography gutterBottom sx={{ mt: 2 }}>
                  Trail Length: {backgroundConfig.matrix.trailLength}
                </Typography>
                <Slider
                  value={backgroundConfig.matrix.trailLength}
                  onChange={(_, value) => updateBackgroundConfig({
                    matrix: { ...backgroundConfig.matrix!, trailLength: value as number }
                  })}
                  min={5}
                  max={30}
                  step={1}
                />
              </Box>
            )}

            {/* Snow background configuration */}
            {backgroundConfig.type === 'snow' && backgroundConfig.snow && (
              <Box>
                <Typography gutterBottom sx={{ mt: 2 }}>
                  Snowflake Count: {backgroundConfig.snow.flakeCount}
                </Typography>
                <Slider
                  value={backgroundConfig.snow.flakeCount}
                  onChange={(_, value) => updateBackgroundConfig({
                    snow: { ...backgroundConfig.snow!, flakeCount: value as number }
                  })}
                  min={10}
                  max={100}
                  step={1}
                />

                <Typography gutterBottom sx={{ mt: 2 }}>
                  Fall Speed: {backgroundConfig.snow.fallSpeed}
                </Typography>
                <Slider
                  value={backgroundConfig.snow.fallSpeed}
                  onChange={(_, value) => updateBackgroundConfig({
                    snow: { ...backgroundConfig.snow!, fallSpeed: value as number }
                  })}
                  min={0.1}
                  max={3}
                  step={0.1}
                />

                <Typography gutterBottom sx={{ mt: 2 }}>
                  Wind Speed: {backgroundConfig.snow.windSpeed}
                </Typography>
                <Slider
                  value={backgroundConfig.snow.windSpeed}
                  onChange={(_, value) => updateBackgroundConfig({
                    snow: { ...backgroundConfig.snow!, windSpeed: value as number }
                  })}
                  min={0}
                  max={1}
                  step={0.1}
                />
              </Box>
            )}

            {/* Stars background configuration */}
            {backgroundConfig.type === 'stars' && backgroundConfig.stars && (
              <Box>
                <Typography gutterBottom sx={{ mt: 2 }}>
                  Star Count: {backgroundConfig.stars.count}
                </Typography>
                <Slider
                  value={backgroundConfig.stars.count}
                  onChange={(_, value) => updateBackgroundConfig({
                    stars: { ...backgroundConfig.stars!, count: value as number }
                  })}
                  min={10}
                  max={100}
                  step={1}
                />

                <Typography gutterBottom sx={{ mt: 2 }}>
                  Twinkle Speed: {backgroundConfig.stars.twinkleSpeed}
                </Typography>
                <Slider
                  value={backgroundConfig.stars.twinkleSpeed}
                  onChange={(_, value) => updateBackgroundConfig({
                    stars: { ...backgroundConfig.stars!, twinkleSpeed: value as number }
                  })}
                  min={0.1}
                  max={5}
                  step={0.1}
                />

                <Typography gutterBottom sx={{ mt: 2 }}>
                  Brightness Range: {(backgroundConfig.stars.minBrightness * 100).toFixed(0)}% - {(backgroundConfig.stars.maxBrightness * 100).toFixed(0)}%
                </Typography>
                <Slider
                  value={[backgroundConfig.stars.minBrightness, backgroundConfig.stars.maxBrightness]}
                  onChange={(_, value) => {
                    const [min, max] = value as number[];
                    updateBackgroundConfig({
                      stars: { ...backgroundConfig.stars!, minBrightness: min, maxBrightness: max }
                    });
                  }}
                  min={0}
                  max={1}
                  step={0.1}
                />
              </Box>
            )}

            {/* Pipes background configuration */}
            {backgroundConfig.type === 'pipes' && backgroundConfig.pipes && (
              <Box>
                <Typography gutterBottom sx={{ mt: 2 }}>
                  Pipe Width: {backgroundConfig.pipes.pipeWidth}px
                </Typography>
                <Slider
                  value={backgroundConfig.pipes.pipeWidth}
                  onChange={(_, value) => updateBackgroundConfig({
                    pipes: { ...backgroundConfig.pipes!, pipeWidth: value as number }
                  })}
                  min={2}
                  max={6}
                  step={1}
                />

                <Typography gutterBottom sx={{ mt: 2 }}>
                  Growth Speed: {backgroundConfig.pipes.growthSpeed}
                </Typography>
                <Slider
                  value={backgroundConfig.pipes.growthSpeed}
                  onChange={(_, value) => updateBackgroundConfig({
                    pipes: { ...backgroundConfig.pipes!, growthSpeed: value as number }
                  })}
                  min={1}
                  max={5}
                  step={0.5}
                />

                <Typography gutterBottom sx={{ mt: 2 }}>
                  Max Pipes: {backgroundConfig.pipes.maxPipes}
                </Typography>
                <Slider
                  value={backgroundConfig.pipes.maxPipes}
                  onChange={(_, value) => updateBackgroundConfig({
                    pipes: { ...backgroundConfig.pipes!, maxPipes: value as number }
                  })}
                  min={1}
                  max={10}
                  step={1}
                />

                <Typography gutterBottom sx={{ mt: 2 }}>
                  Turn Probability: {(backgroundConfig.pipes.turnProbability * 100).toFixed(0)}%
                </Typography>
                <Slider
                  value={backgroundConfig.pipes.turnProbability}
                  onChange={(_, value) => updateBackgroundConfig({
                    pipes: { ...backgroundConfig.pipes!, turnProbability: value as number }
                  })}
                  min={0}
                  max={0.5}
                  step={0.05}
                />

                <Typography gutterBottom sx={{ mt: 2 }}>
                  Pipe Lifetime: {backgroundConfig.pipes.pipeLifetime} segments
                </Typography>
                <Slider
                  value={backgroundConfig.pipes.pipeLifetime}
                  onChange={(_, value) => updateBackgroundConfig({
                    pipes: { ...backgroundConfig.pipes!, pipeLifetime: value as number }
                  })}
                  min={20}
                  max={200}
                  step={10}
                />
              </Box>
            )}

            {/* Fish Tank background configuration */}
            {backgroundConfig.type === 'fishtank' && backgroundConfig.fishtank && (
              <Box>
                <Typography gutterBottom sx={{ mt: 2 }}>
                  Fish Count: {backgroundConfig.fishtank.fishCount}
                </Typography>
                <Slider
                  value={backgroundConfig.fishtank.fishCount}
                  onChange={(_, value) => updateBackgroundConfig({
                    fishtank: { ...backgroundConfig.fishtank!, fishCount: value as number }
                  })}
                  min={1}
                  max={15}
                  step={1}
                />

                <Typography gutterBottom sx={{ mt: 2 }}>
                  Fish Size: {backgroundConfig.fishtank.fishMinSize} - {backgroundConfig.fishtank.fishMaxSize}px
                </Typography>
                <Slider
                  value={[backgroundConfig.fishtank.fishMinSize, backgroundConfig.fishtank.fishMaxSize]}
                  onChange={(_, value) => {
                    const [min, max] = value as number[];
                    updateBackgroundConfig({
                      fishtank: { ...backgroundConfig.fishtank!, fishMinSize: min, fishMaxSize: max }
                    });
                  }}
                  min={2}
                  max={12}
                  step={1}
                />

                <Typography gutterBottom sx={{ mt: 2 }}>
                  Swim Speed: {backgroundConfig.fishtank.swimSpeed}
                </Typography>
                <Slider
                  value={backgroundConfig.fishtank.swimSpeed}
                  onChange={(_, value) => updateBackgroundConfig({
                    fishtank: { ...backgroundConfig.fishtank!, swimSpeed: value as number }
                  })}
                  min={0.2}
                  max={3}
                  step={0.2}
                />

                <Typography gutterBottom sx={{ mt: 2 }}>
                  Bubble Count: {backgroundConfig.fishtank.bubbleCount}
                </Typography>
                <Slider
                  value={backgroundConfig.fishtank.bubbleCount}
                  onChange={(_, value) => updateBackgroundConfig({
                    fishtank: { ...backgroundConfig.fishtank!, bubbleCount: value as number }
                  })}
                  min={0}
                  max={30}
                  step={1}
                />

                <Typography gutterBottom sx={{ mt: 2 }}>
                  Plant Count: {backgroundConfig.fishtank.plantCount}
                </Typography>
                <Slider
                  value={backgroundConfig.fishtank.plantCount}
                  onChange={(_, value) => updateBackgroundConfig({
                    fishtank: { ...backgroundConfig.fishtank!, plantCount: value as number }
                  })}
                  min={0}
                  max={10}
                  step={1}
                />

                <TextField
                  fullWidth
                  margin="normal"
                  label="Water Color"
                  type="color"
                  value={backgroundConfig.fishtank.waterColor}
                  onChange={(e) => updateBackgroundConfig({
                    fishtank: { ...backgroundConfig.fishtank!, waterColor: e.target.value }
                  })}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

      <Box sx={{ mt: 2 }}>
        <Typography gutterBottom>
          Update Interval: {template.updateInterval}ms
        </Typography>
        <Slider
          value={template.updateInterval}
          onChange={(_, value) => onUpdate({ updateInterval: value as number })}
          min={100}
          max={10000}
          step={100}
          marks={[
            { value: 100, label: '100ms' },
            { value: 1000, label: '1s' },
            { value: 5000, label: '5s' },
            { value: 10000, label: '10s' },
          ]}
        />
      </Box>

      <FormControlLabel
        control={
          <Switch
            checked={template.enabled}
            onChange={(e) => onUpdate({ enabled: e.target.checked })}
          />
        }
        label="Enabled"
        sx={{ mt: 2 }}
      />

      <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
        {template.displayMode === 'dual' ? (
          <>
            <Typography variant="body2" color="text.secondary">
              Display: {DISPLAY_WIDTH}×{TOTAL_DISPLAY_HEIGHT} pixels (Dual)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Display 1: {DISPLAY_WIDTH}×{DISPLAY_HEIGHT} (Y: 0-{DISPLAY_HEIGHT - 1})
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Display 2: {DISPLAY_WIDTH}×{DISPLAY_HEIGHT} (Y: {DISPLAY_HEIGHT}-{TOTAL_DISPLAY_HEIGHT - 1})
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Format: RGBA8888
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Frame Size: 32,768 bytes
            </Typography>
          </>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary">
              Display: {DISPLAY_WIDTH}×{DISPLAY_HEIGHT} pixels
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Format: RGBA8888
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Frame Size: 16,384 bytes
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
};

export default TemplateSettings;