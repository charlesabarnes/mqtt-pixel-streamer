import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Typography,
  Button,
  Divider,
  IconButton,
  Paper,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { Template, Element } from '@mqtt-pixel-streamer/shared';

interface SidebarProps {
  templates: Template[];
  currentTemplate: Template | null;
  onTemplateSelect: (template: Template) => void;
  onAddElement: () => void;
  elements: Element[];
  selectedElementId: string | null;
  onElementSelect: (id: string) => void;
  onElementDelete: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  templates,
  currentTemplate,
  onTemplateSelect,
  onAddElement,
  elements,
  selectedElementId,
  onElementSelect,
  onElementDelete,
}) => {
  return (
    <Paper
      sx={{
        width: 300,
        height: '100%',
        overflow: 'auto',
        borderRight: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6">Templates</Typography>
        <List dense>
          {templates.map((template) => (
            <ListItemButton
              key={template.id}
              selected={currentTemplate?.id === template.id}
              onClick={() => onTemplateSelect(template)}
            >
              <ListItemText primary={template.name} />
            </ListItemButton>
          ))}
        </List>

        <Button
          fullWidth
          variant="outlined"
          startIcon={<AddIcon />}
          sx={{ mt: 1 }}
        >
          New Template
        </Button>
      </Box>

      <Divider />

      <Box sx={{ p: 2 }}>
        <Typography variant="h6">Elements</Typography>
        <List dense>
          {elements.map((element) => (
            <ListItem
              key={element.id}
              secondaryAction={
                <IconButton
                  edge="end"
                  size="small"
                  onClick={() => onElementDelete(element.id)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemButton
                selected={selectedElementId === element.id}
                onClick={() => onElementSelect(element.id)}
              >
                <ListItemText
                  primary={element.text || element.dataSource || element.type}
                  secondary={`${element.type} at ${element.position.x},${element.position.y}`}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Button
          fullWidth
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={onAddElement}
          sx={{ mt: 1 }}
        >
          Add Element
        </Button>
      </Box>
    </Paper>
  );
};

export default Sidebar;