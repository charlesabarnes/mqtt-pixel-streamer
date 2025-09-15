import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import TestIcon from '@mui/icons-material/Science';
import { weatherService, WeatherLocation } from '../../services/weatherService';

interface LocationManagementProps {
  open: boolean;
  onClose: () => void;
  onLocationUpdated?: () => void;
}

interface LocationFormData {
  name: string;
  latitude: string;
  longitude: string;
  enabled: boolean;
}

const LocationManagement: React.FC<LocationManagementProps> = ({ open, onClose, onLocationUpdated }) => {
  const [locations, setLocations] = useState<WeatherLocation[]>([]);
  const [editingLocation, setEditingLocation] = useState<WeatherLocation | null>(null);
  const [formData, setFormData] = useState<LocationFormData>({
    name: '',
    latitude: '',
    longitude: '',
    enabled: true,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadLocations();
    }
  }, [open]);

  const loadLocations = async () => {
    try {
      setLoading(true);
      const locationList = await weatherService.getLocations();
      setLocations(locationList);
    } catch (err) {
      setError('Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const lat = parseFloat(formData.latitude);
      const lng = parseFloat(formData.longitude);

      if (isNaN(lat) || isNaN(lng)) {
        setError('Please enter valid latitude and longitude values');
        return;
      }

      if (lat < -90 || lat > 90) {
        setError('Latitude must be between -90 and 90');
        return;
      }

      if (lng < -180 || lng > 180) {
        setError('Longitude must be between -180 and 180');
        return;
      }

      if (!formData.name.trim()) {
        setError('Please enter a location name');
        return;
      }

      const locationData = {
        name: formData.name.trim(),
        latitude: lat,
        longitude: lng,
        enabled: formData.enabled,
      };

      if (editingLocation) {
        await weatherService.updateLocation(editingLocation.id, locationData);
      } else {
        await weatherService.createLocation(locationData);
      }

      await loadLocations();
      onLocationUpdated?.();
      resetForm();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await weatherService.deleteLocation(id);
      await loadLocations();
      onLocationUpdated?.();
    } catch (err) {
      setError('Failed to delete location');
    }
  };

  const handleEdit = (location: WeatherLocation) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      enabled: location.enabled,
    });
    setTestResult(null);
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      setError(null);

      const lat = parseFloat(formData.latitude);
      const lng = parseFloat(formData.longitude);

      if (isNaN(lat) || isNaN(lng)) {
        setError('Please enter valid latitude and longitude values');
        return;
      }

      const result = await weatherService.testLocation(lat, lng);
      setTestResult(`Connection successful! Sample data: ${result.sampleData.temperature}°F, ${result.sampleData.condition}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to test location');
    } finally {
      setTesting(false);
    }
  };

  const resetForm = () => {
    setEditingLocation(null);
    setFormData({
      name: '',
      latitude: '',
      longitude: '',
      enabled: true,
    });
    setError(null);
    setTestResult(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Manage Weather Locations
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box mb={3}>
              <Typography variant="h6" gutterBottom>
                Existing Locations
              </Typography>
              {locations.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No locations configured
                </Typography>
              ) : (
                <List>
                  {locations.map((location) => (
                    <ListItem key={location.id}>
                      <ListItemText
                        primary={location.name}
                        secondary={`${location.latitude}, ${location.longitude} • ${location.enabled ? 'Enabled' : 'Disabled'}`}
                      />
                      <ListItemSecondaryAction>
                        <IconButton onClick={() => handleEdit(location)} size="small">
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => handleDelete(location.id)} size="small">
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>

            <Box>
              <Typography variant="h6" gutterBottom>
                {editingLocation ? 'Edit Location' : 'Add New Location'}
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {testResult && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {testResult}
                </Alert>
              )}

              <TextField
                fullWidth
                margin="normal"
                label="Location Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Home, Office, New York"
              />

              <Box display="flex" gap={2}>
                <TextField
                  margin="normal"
                  label="Latitude"
                  type="number"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="e.g., 40.7128"
                  inputProps={{ step: 'any' }}
                  fullWidth
                />
                <TextField
                  margin="normal"
                  label="Longitude"
                  type="number"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="e.g., -74.0060"
                  inputProps={{ step: 'any' }}
                  fullWidth
                />
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  />
                }
                label="Enabled"
                sx={{ mt: 1 }}
              />

              <Box display="flex" gap={1} mt={2}>
                <Button
                  variant="outlined"
                  startIcon={<TestIcon />}
                  onClick={handleTest}
                  disabled={testing || !formData.latitude || !formData.longitude}
                >
                  {testing ? 'Testing...' : 'Test Location'}
                </Button>
                <Button
                  variant="contained"
                  startIcon={editingLocation ? <EditIcon /> : <AddIcon />}
                  onClick={handleSave}
                  disabled={saving || !formData.name || !formData.latitude || !formData.longitude}
                >
                  {saving ? 'Saving...' : editingLocation ? 'Update' : 'Add'}
                </Button>
                {editingLocation && (
                  <Button onClick={resetForm}>
                    Cancel
                  </Button>
                )}
              </Box>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default LocationManagement;