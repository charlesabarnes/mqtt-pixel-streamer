import React, { useState, useEffect } from 'react';
import { Box, Container, Grid, Paper, AppBar, Toolbar, Typography, Button, Alert, Slider, IconButton } from '@mui/material';
import BrightnessLowIcon from '@mui/icons-material/BrightnessLow';
import { Template } from '@mqtt-pixel-streamer/shared';
import Sidebar from './components/Sidebar/Sidebar';
import PreviewCanvas from './components/Canvas/PreviewCanvas';
import ElementProperties from './components/Editor/ElementProperties';
import TemplateSettings from './components/Editor/TemplateSettings';
import { templateService } from './services/templateService';
import { websocketService } from './services/websocketService';

function App() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isPreviewRunning, setIsPreviewRunning] = useState(false);
  const [mqttStatus, setMqttStatus] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [brightness, setBrightness] = useState<number>(() => {
    const saved = localStorage.getItem('displayBrightness');
    return saved ? parseInt(saved, 10) : 100;
  });

  useEffect(() => {
    loadTemplates();
    checkStatus();
    websocketService.connect();

    return () => {
      websocketService.disconnect();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('displayBrightness', brightness.toString());
  }, [brightness]);

  const loadTemplates = async () => {
    try {
      const loadedTemplates = await templateService.getTemplates();
      setTemplates(loadedTemplates);
      if (loadedTemplates.length > 0 && !currentTemplate) {
        setCurrentTemplate(loadedTemplates[0]);
      }
    } catch (err) {
      setError('Failed to load templates');
      console.error(err);
    }
  };

  const checkStatus = async () => {
    try {
      const status = await templateService.getStatus();
      setMqttStatus(status.mqtt.connected);
    } catch (err) {
      console.error('Failed to check status:', err);
    }
  };

  const handlePublishFrame = async () => {
    if (!currentTemplate?.id) return;

    try {
      await templateService.publishFrame(currentTemplate.id);
      setError(null);
    } catch (err) {
      setError('Failed to publish frame');
      console.error(err);
    }
  };

  const handleSaveTemplate = async () => {
    if (!currentTemplate) return;

    try {
      if (currentTemplate.id) {
        await templateService.updateTemplate(currentTemplate.id, currentTemplate);
      } else {
        const saved = await templateService.createTemplate(currentTemplate);
        setCurrentTemplate(saved);
      }
      await loadTemplates();
      setError(null);
    } catch (err) {
      setError('Failed to save template');
      console.error(err);
    }
  };

  const handleElementUpdate = (elementId: string, updates: any) => {
    if (!currentTemplate) return;

    const updatedElements = currentTemplate.elements.map((el) =>
      el.id === elementId ? { ...el, ...updates } : el
    );

    const updatedTemplate = {
      ...currentTemplate,
      elements: updatedElements,
    };

    setCurrentTemplate(updatedTemplate);

    // Send template update to server for live publishing
    if (currentTemplate.id) {
      websocketService.sendTemplateUpdate(currentTemplate.id, updatedTemplate);
    }
  };

  const handleAddElement = () => {
    if (!currentTemplate) return;

    const newElement = {
      id: `element_${Date.now()}`,
      type: 'text' as const,
      position: { x: 10, y: 16 },
      text: 'New Text',
      style: {
        color: '#FFFFFF',
        fontSize: 12,
      },
      visible: true,
    };

    const updatedTemplate = {
      ...currentTemplate,
      elements: [...currentTemplate.elements, newElement],
    };

    setCurrentTemplate(updatedTemplate);
    setSelectedElementId(newElement.id);

    // Send template update to server for live publishing
    if (currentTemplate.id) {
      websocketService.sendTemplateUpdate(currentTemplate.id, updatedTemplate);
    }
  };

  const handleDeleteElement = (elementId: string) => {
    if (!currentTemplate) return;

    const updatedTemplate = {
      ...currentTemplate,
      elements: currentTemplate.elements.filter((el) => el.id !== elementId),
    };

    setCurrentTemplate(updatedTemplate);

    if (selectedElementId === elementId) {
      setSelectedElementId(null);
    }

    // Send template update to server for live publishing
    if (currentTemplate.id) {
      websocketService.sendTemplateUpdate(currentTemplate.id, updatedTemplate);
    }
  };

  const handleBrightnessChange = (_: Event, value: number | number[]) => {
    const newBrightness = Array.isArray(value) ? value[0] : value;
    setBrightness(newBrightness);

    // Send brightness update to server
    websocketService.sendBrightnessUpdate(newBrightness);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            MQTT Pixel Streamer
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            MQTT: {mqttStatus ? '🟢 Connected' : '🔴 Disconnected'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2, minWidth: 120 }}>
            <BrightnessLowIcon sx={{ mr: 1, fontSize: 18 }} />
            <Slider
              value={brightness}
              onChange={handleBrightnessChange}
              min={10}
              max={100}
              size="small"
              sx={{
                width: 80,
                mr: 1,
                '& .MuiSlider-thumb': {
                  width: 16,
                  height: 16,
                },
                '& .MuiSlider-track': {
                  height: 3,
                },
                '& .MuiSlider-rail': {
                  height: 3,
                }
              }}
            />
            <Typography variant="caption" sx={{ minWidth: 30, fontSize: 11 }}>
              {brightness}%
            </Typography>
          </Box>
          <Button color="inherit" onClick={handleSaveTemplate}>
            Save
          </Button>
          <Button color="inherit" onClick={handlePublishFrame}>
            Publish
          </Button>
        </Toolbar>
      </AppBar>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        <Sidebar
          templates={templates}
          currentTemplate={currentTemplate}
          onTemplateSelect={setCurrentTemplate}
          onAddElement={handleAddElement}
          elements={currentTemplate?.elements || []}
          selectedElementId={selectedElementId}
          onElementSelect={setSelectedElementId}
          onElementDelete={handleDeleteElement}
        />

        <Box sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <PreviewCanvas
                  template={currentTemplate}
                  isRunning={isPreviewRunning}
                  onTogglePreview={() => setIsPreviewRunning(!isPreviewRunning)}
                  brightness={brightness}
                />
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <ElementProperties
                  element={currentTemplate?.elements.find(
                    (el) => el.id === selectedElementId
                  )}
                  onUpdate={(updates) =>
                    selectedElementId && handleElementUpdate(selectedElementId, updates)
                  }
                  templateDisplayMode={currentTemplate?.displayMode}
                />
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <TemplateSettings
                  template={currentTemplate}
                  onUpdate={(updates) => {
                    const updatedTemplate = currentTemplate ? { ...currentTemplate, ...updates } : null;
                    setCurrentTemplate(updatedTemplate);

                    // Send template update to server for live publishing
                    if (updatedTemplate?.id) {
                      websocketService.sendTemplateUpdate(updatedTemplate.id, updatedTemplate);
                    }
                  }}
                />
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Box>
  );
}

export default App;