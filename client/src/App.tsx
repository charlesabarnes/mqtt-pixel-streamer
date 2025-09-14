import React, { useState, useEffect } from 'react';
import { Box, Container, Grid, Paper, AppBar, Toolbar, Typography, Button, Alert } from '@mui/material';
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

  useEffect(() => {
    loadTemplates();
    checkStatus();
    websocketService.connect();

    return () => {
      websocketService.disconnect();
    };
  }, []);

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

    setCurrentTemplate({
      ...currentTemplate,
      elements: updatedElements,
    });
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

    setCurrentTemplate({
      ...currentTemplate,
      elements: [...currentTemplate.elements, newElement],
    });

    setSelectedElementId(newElement.id);
  };

  const handleDeleteElement = (elementId: string) => {
    if (!currentTemplate) return;

    setCurrentTemplate({
      ...currentTemplate,
      elements: currentTemplate.elements.filter((el) => el.id !== elementId),
    });

    if (selectedElementId === elementId) {
      setSelectedElementId(null);
    }
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
                />
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <TemplateSettings
                  template={currentTemplate}
                  onUpdate={(updates) =>
                    setCurrentTemplate(
                      currentTemplate ? { ...currentTemplate, ...updates } : null
                    )
                  }
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