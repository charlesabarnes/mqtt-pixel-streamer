import React from 'react';
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
} from '@mui/material';
import { Element, ElementType, DISPLAY_WIDTH, DISPLAY_HEIGHT, TOTAL_DISPLAY_HEIGHT } from '@mqtt-pixel-streamer/shared';

interface ElementPropertiesProps {
  element?: Element;
  onUpdate: (updates: Partial<Element>) => void;
  templateDisplayMode?: string;
}

const ElementProperties: React.FC<ElementPropertiesProps> = ({ element, onUpdate, templateDisplayMode }) => {
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
              onChange={(e) => onUpdate({ dataSource: e.target.value })}
            >
              <MenuItem value="time">Current Time</MenuItem>
              <MenuItem value="date">Current Date</MenuItem>
              <MenuItem value="weather.temp">Temperature</MenuItem>
              <MenuItem value="weather.condition">Weather Condition</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            margin="normal"
            label="Format"
            value={element.format || ''}
            onChange={(e) => onUpdate({ format: e.target.value })}
            placeholder="e.g., HH:MM, ##°F"
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
    </Box>
  );
};

export default ElementProperties;