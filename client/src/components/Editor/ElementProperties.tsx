import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Slider,
  Switch,
  FormControlLabel,
  ListSubheader,
} from '@mui/material';
import { Element, ElementType, DISPLAY_WIDTH, DISPLAY_HEIGHT, TOTAL_DISPLAY_HEIGHT, AnimationType } from '@mqtt-pixel-streamer/shared';
import { weatherService, WeatherDataField } from '../../services/weatherService';

interface ElementPropertiesProps {
  element?: Element;
  onUpdate: (updates: Partial<Element>) => void;
  templateDisplayMode?: string;
}

interface DataSourceOption {
  key: string;
  label: string;
  format?: string;
  example?: string;
  integration: 'builtin' | 'weather';
  source?: string;
}

const ElementProperties: React.FC<ElementPropertiesProps> = ({ element, onUpdate, templateDisplayMode }) => {
  const [weatherDataFields, setWeatherDataFields] = useState<WeatherDataField[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadWeatherDataFields = async () => {
      try {
        setLoading(true);
        const fields = await weatherService.getDataFields();
        setWeatherDataFields(fields);
      } catch (error) {
        console.error('Failed to load weather data fields:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWeatherDataFields();
  }, []);

  // Get all available data sources organized by integration
  const getDataSources = (): DataSourceOption[] => {
    const builtinSources: DataSourceOption[] = [
      {
        key: 'time',
        label: 'Current Time',
        format: 'time',
        example: '14:30:45',
        integration: 'builtin',
      },
      {
        key: 'date',
        label: 'Current Date',
        format: 'date',
        example: 'Dec 15',
        integration: 'builtin',
      },
    ];

    const weatherSources: DataSourceOption[] = weatherDataFields.map(field => ({
      key: field.key,
      label: field.label,
      format: field.format,
      example: field.example,
      integration: 'weather' as const,
      source: 'met.no',
    }));

    return [...builtinSources, ...weatherSources];
  };

  const handleDataSourceChange = (dataSource: string) => {
    const selectedSource = getDataSources().find(source => source.key === dataSource);
    const updates: Partial<Element> = { dataSource };

    // Auto-populate format if available and not already set
    if (selectedSource?.format && (!element?.format || element.format === '')) {
      updates.format = selectedSource.format;
    }

    onUpdate(updates);
  };
  if (!element) {
    return (
      <Box>
        <Typography variant="h6">Element Properties</Typography>
        <Typography variant="body2" color="text.secondary">
          Select an element to edit its properties
        </Typography>
      </Box>
    );
  }

  const handlePositionChange = (axis: 'x' | 'y', value: number) => {
    onUpdate({
      position: {
        ...element.position,
        [axis]: value,
      },
    });
  };

  const handleStyleChange = (property: string, value: any) => {
    onUpdate({
      style: {
        ...element.style,
        [property]: value,
      },
    });
  };

  const handleAnimationUpdate = (property: string, value: any) => {
    onUpdate({
      animation: {
        ...element.animation,
        [property]: value,
      },
    });
  };

  const handleEffectConfigUpdate = (effectType: string, property: string, value: any) => {
    onUpdate({
      effectConfig: {
        ...element.effectConfig,
        [effectType]: {
          ...element.effectConfig?.[effectType as keyof typeof element.effectConfig],
          [property]: value,
        },
      },
    });
  };

  // Determine max Y position based on display mode
  const isDualDisplay = templateDisplayMode === 'dual';
  const maxYPosition = isDualDisplay ? TOTAL_DISPLAY_HEIGHT - 1 : DISPLAY_HEIGHT - 1;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Element Properties
      </Typography>

      <FormControl fullWidth margin="normal">
        <InputLabel>Type</InputLabel>
        <Select
          value={element.type}
          label="Type"
          onChange={(e) => onUpdate({ type: e.target.value as ElementType })}
        >
          <MenuItem value="text">Text</MenuItem>
          <MenuItem value="data">Data Field</MenuItem>
          <MenuItem value="icon">Icon</MenuItem>
          <MenuItem value="shape">Shape</MenuItem>
        </Select>
      </FormControl>


      <Box sx={{ mt: 2 }}>
        <Typography gutterBottom>Position</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2">X: {element.position.x}</Typography>
            <Slider
              value={element.position.x}
              onChange={(_, value) => handlePositionChange('x', value as number)}
              min={0}
              max={DISPLAY_WIDTH - 1}
              size="small"
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2">
              Y: {element.position.y}
              {isDualDisplay && element.position.y >= DISPLAY_HEIGHT && ` (Display 2)`}
              {isDualDisplay && element.position.y < DISPLAY_HEIGHT && ` (Display 1)`}
            </Typography>
            <Slider
              value={element.position.y}
              onChange={(_, value) => handlePositionChange('y', value as number)}
              min={0}
              max={maxYPosition}
              size="small"
              marks={isDualDisplay ? [
                { value: 0, label: '0' },
                { value: DISPLAY_HEIGHT - 1, label: `${DISPLAY_HEIGHT - 1}` },
                { value: DISPLAY_HEIGHT, label: `${DISPLAY_HEIGHT}` },
                { value: maxYPosition, label: `${maxYPosition}` }
              ] : undefined}
            />
          </Box>
        </Box>
      </Box>

      {element.type === 'text' && (
        <TextField
          fullWidth
          margin="normal"
          label="Text"
          value={element.text || ''}
          onChange={(e) => onUpdate({ text: e.target.value })}
        />
      )}

      {element.type === 'data' && (
        <>
          <FormControl fullWidth margin="normal">
            <InputLabel>Data Source</InputLabel>
            <Select
              value={element.dataSource || ''}
              label="Data Source"
              onChange={(e) => handleDataSourceChange(e.target.value)}
              disabled={loading}
            >
              <ListSubheader>Built-in</ListSubheader>
              {getDataSources()
                .filter(source => source.integration === 'builtin')
                .map(source => (
                  <MenuItem key={source.key} value={source.key}>
                    {source.label}
                  </MenuItem>
                ))}

              <ListSubheader>Weather • met.no</ListSubheader>
              {getDataSources()
                .filter(source => source.integration === 'weather')
                .map(source => (
                  <MenuItem key={source.key} value={source.key}>
                    {source.label} <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>({source.example})</Typography>
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            margin="normal"
            label="Format"
            value={element.format || ''}
            onChange={(e) => onUpdate({ format: e.target.value })}
            placeholder={(() => {
              const selectedSource = getDataSources().find(source => source.key === element.dataSource);
              return selectedSource?.format ? `e.g., ${selectedSource.format}` : "e.g., HH:MM, ##°F";
            })()}
            helperText={(() => {
              const selectedSource = getDataSources().find(source => source.key === element.dataSource);
              return selectedSource?.example ? `Example output: ${selectedSource.example}` : undefined;
            })()}
          />
        </>
      )}

      {element.type === 'shape' && (
        <FormControl fullWidth margin="normal">
          <InputLabel>Shape</InputLabel>
          <Select
            value={element.shape || 'rectangle'}
            label="Shape"
            onChange={(e) => onUpdate({ shape: e.target.value as any })}
          >
            <MenuItem value="rectangle">Rectangle</MenuItem>
            <MenuItem value="circle">Circle</MenuItem>
            <MenuItem value="line">Line</MenuItem>
          </Select>
        </FormControl>
      )}

      <Box sx={{ mt: 2 }}>
        <Typography gutterBottom>Style</Typography>

        <TextField
          fullWidth
          margin="normal"
          label="Color"
          type="color"
          value={element.style?.color || '#FFFFFF'}
          onChange={(e) => handleStyleChange('color', e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        {(element.type === 'text' || element.type === 'data') && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2">
              Font Size: {element.style?.fontSize || 12}px
            </Typography>
            <Slider
              value={element.style?.fontSize || 12}
              onChange={(_, value) => handleStyleChange('fontSize', value)}
              min={8}
              max={24}
              size="small"
            />
          </Box>
        )}
      </Box>

      <FormControlLabel
        control={
          <Switch
            checked={element.visible}
            onChange={(e) => onUpdate({ visible: e.target.checked })}
          />
        }
        label="Visible"
        sx={{ mt: 2 }}
      />

      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Animation
        </Typography>

        <FormControl fullWidth margin="normal">
          <InputLabel>Animation Type</InputLabel>
          <Select
            value={element.animation?.type || 'none'}
            label="Animation Type"
            onChange={(e) => handleAnimationUpdate('type', e.target.value as AnimationType)}
          >
            <MenuItem value="none">None</MenuItem>
            <MenuItem value="bounce">Bounce</MenuItem>
            <MenuItem value="slide">Slide</MenuItem>
            <MenuItem value="dvd-logo">DVD Logo Bouncer</MenuItem>
            <MenuItem value="rainbow">Rainbow Text</MenuItem>
          </Select>
        </FormControl>

        {element.animation?.type && element.animation.type !== 'none' && (
          <>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">
                Speed: {element.animation.speed || 1}
              </Typography>
              <Slider
                value={element.animation.speed || 1}
                onChange={(_, value) => handleAnimationUpdate('speed', value)}
                min={0.1}
                max={5}
                step={0.1}
                size="small"
              />
            </Box>

            {(element.animation.type === 'bounce') && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Amplitude: {element.animation.amplitude || 10}
                </Typography>
                <Slider
                  value={element.animation.amplitude || 10}
                  onChange={(_, value) => handleAnimationUpdate('amplitude', value)}
                  min={1}
                  max={20}
                  step={1}
                  size="small"
                />
              </Box>
            )}

            {element.animation.type === 'dvd-logo' && (
              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={element.effectConfig?.dvdLogo?.bounceColorChange || false}
                      onChange={(e) => handleEffectConfigUpdate('dvdLogo', 'bounceColorChange', e.target.checked)}
                    />
                  }
                  label="Change Color on Bounce"
                />
              </Box>
            )}

            {element.animation.type === 'rainbow' && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Saturation: {element.effectConfig?.rainbow?.saturation || 100}%
                </Typography>
                <Slider
                  value={element.effectConfig?.rainbow?.saturation || 100}
                  onChange={(_, value) => handleEffectConfigUpdate('rainbow', 'saturation', value)}
                  min={0}
                  max={100}
                  step={1}
                  size="small"
                />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Brightness: {element.effectConfig?.rainbow?.brightness || 50}%
                </Typography>
                <Slider
                  value={element.effectConfig?.rainbow?.brightness || 50}
                  onChange={(_, value) => handleEffectConfigUpdate('rainbow', 'brightness', value)}
                  min={10}
                  max={90}
                  step={1}
                  size="small"
                />
              </Box>
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={element.animation.repeat !== false}
                  onChange={(e) => handleAnimationUpdate('repeat', e.target.checked)}
                />
              }
              label="Repeat"
              sx={{ mt: 1 }}
            />
          </>
        )}
      </Box>
    </Box>
  );
};

export default ElementProperties;