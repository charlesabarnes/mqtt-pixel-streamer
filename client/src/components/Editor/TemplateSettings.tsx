import React from 'react';
import {
  Box,
  TextField,
  Typography,
  Slider,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { Template } from '@mqtt-pixel-streamer/shared';

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
        <Typography variant="body2" color="text.secondary">
          Display: 128×32 pixels
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Format: RGBA8888
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Frame Size: 16,384 bytes
        </Typography>
      </Box>
    </Box>
  );
};

export default TemplateSettings;