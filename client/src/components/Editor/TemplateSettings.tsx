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
} from '@mui/material';
import { Template, DISPLAY_WIDTH, DISPLAY_HEIGHT, TOTAL_DISPLAY_HEIGHT } from '@mqtt-pixel-streamer/shared';

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

      <TextField
        fullWidth
        margin="normal"
        label="Background Color"
        type="color"
        value={template.background}
        onChange={(e) => onUpdate({ background: e.target.value })}
        InputLabelProps={{ shrink: true }}
      />

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