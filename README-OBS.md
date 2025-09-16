# MQTT Pixel Streamer - OBS Edition

## 🎉 New Simplified Architecture

The complex template and animation system has been replaced with a simple OBS-to-MQTT bridge. Now you can use OBS Studio's powerful features to create content for your LED matrix!

## Why OBS?

- **Professional Tools**: Leverage OBS's mature ecosystem of plugins, filters, and effects
- **Easy Animation**: Use OBS's built-in transitions, filters, and scene switching
- **Live Preview**: See exactly what will appear on your LED matrix in real-time
- **No Code Required**: Create complex animations without writing any code
- **Infinite Possibilities**: Browser sources, media playback, live data, and more

## Quick Migration Guide

### Old System → New System

| Old Feature | OBS Equivalent |
|-------------|----------------|
| Templates | OBS Scenes |
| Elements | OBS Sources |
| Animations | OBS Filters & Transitions |
| Background Effects | OBS Filters & Shaders |
| Data Sources | Browser Sources |
| Preview Canvas | OBS Preview Window |
| Template Editor | OBS Studio Interface |

## Getting Started

### 1. Set Up the New Server

```bash
cd obs-server
npm install
cp .env.example .env
# Edit .env with your MQTT settings
npm run dev
```

### 2. Install OBS Studio

Download from: https://obsproject.com/

### 3. Configure OBS

#### Video Settings
- Base Resolution: **128x32**
- Output Resolution: **128x32**
- FPS: **30**

#### Stream Settings
- Service: **Custom**
- Server: **rtmp://localhost:1935/live**
- Stream Key: **pixelmatrix**

### 4. Start Streaming

1. Create your scenes in OBS
2. Click "Start Streaming"
3. Watch your LED matrix come to life!

## Example Scenes

The `obs-server/obs-scenes/` folder contains:
- Pre-made scene collections
- HTML widgets for browser sources
- Configuration examples

### Import Scene Collection
1. In OBS: Scene Collection → Import
2. Select `pixel-matrix-scenes.json`
3. Customize to your needs

## Creating Content

### Text
- Use Text (GDI+) source
- Font size: 8-14px
- Monospace fonts work best

### Animations
- Apply Scroll filter for moving text
- Use Move transition for scene changes
- StreamFX plugin for advanced effects

### Dynamic Data
- Add Browser Source
- Point to local HTML files or web URLs
- See `obs-scenes/widgets/` for examples

### Media
- Drag and drop videos/GIFs
- They'll automatically scale to 128x32
- Loop for continuous playback

## Advantages

### Before (Complex Template System)
```javascript
// Complicated code to create animations
const element = {
  type: 'text',
  animation: {
    type: 'dvd-logo',
    speed: 2,
    bounceColorChange: true
  },
  // ... lots of configuration
};
```

### After (OBS)
1. Add text source
2. Apply bounce filter
3. Done! No code needed

## Tips

- **Performance**: Use hardware encoding if available
- **Quality**: Point scaling for pixel art
- **Latency**: Set encoder to "ultrafast"
- **Effects**: Install StreamFX for more options

## Need Help?

- Check `obs-server/README.md` for detailed setup
- See `obs-scenes/` folder for examples
- OBS documentation: https://obsproject.com/wiki/

## The Future is Streaming!

With OBS handling the complexity, you can focus on creating amazing content for your LED matrix. Happy streaming! 🎥✨