# OBS Pixel Streamer

A simplified RTMP-to-MQTT bridge that receives video streams from OBS Studio and publishes frames to LED matrix displays via MQTT.

## Overview

This server replaces the complex template/animation system with OBS Studio as the content creation tool. OBS handles all animations, effects, and content management, while this server simply:

1. Receives RTMP stream from OBS (128x32 resolution)
2. Extracts raw frames from the video stream
3. Processes frames (brightness, color correction)
4. Publishes to MQTT for LED matrix display

## Quick Start

### 1. Install Dependencies

```bash
cd obs-server
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your MQTT broker details
```

### 3. Start the Server

```bash
npm run dev  # Development mode with auto-reload
# or
npm run build && npm start  # Production mode
```

### 4. Configure OBS Studio

#### Video Settings (Settings → Video)
- **Base (Canvas) Resolution**: 128x32
- **Output (Scaled) Resolution**: 128x32
- **Downscale Filter**: Bilinear
- **FPS**: 30

#### Stream Settings (Settings → Stream)
- **Service**: Custom...
- **Server**: `rtmp://localhost:1935/live`
- **Stream Key**: `pixelmatrix`

#### Output Settings (Settings → Output)
- **Output Mode**: Simple
- **Video Bitrate**: 1000 Kbps (low bitrate is fine for 128x32)
- **Encoder**: x264 or Hardware encoder
- **Encoder Preset**: ultrafast (for low latency)

## OBS Scene Setup Guide

### Creating Content for 128x32 Display

#### 1. Text Sources
- **Font Size**: 8-14px works best
- **Font**: Use bitmap or monospace fonts
- **Outline**: Avoid - too small for low resolution
- **Anti-aliasing**: Disable for crisp pixels

#### 2. Image Sources
- **Format**: PNG with transparency recommended
- **Size**: Design at exact size or multiples of 128x32
- **Scaling**: Use "Point" filter for pixel art

#### 3. Browser Sources
- **Custom CSS**: Set exact dimensions
```css
body {
  margin: 0;
  overflow: hidden;
  width: 128px;
  height: 32px;
}
```

#### 4. Media Sources
- **Videos**: Pre-render at 128x32 for best results
- **GIFs**: Work great for animations
- **Loop**: Enable for continuous playback

### Animation Techniques

#### Scrolling Text
1. Add Text source
2. Apply "Scroll" filter
3. Adjust speed and direction

#### Scene Transitions
- **Cut**: Instant, good for digital displays
- **Fade**: Smooth but may look odd at low resolution
- **Slide**: Works well for scene changes

#### Dynamic Content
1. **Browser Source**: For web-based content
   - Weather widgets
   - Live data feeds
   - Custom HTML/CSS animations

2. **Window Capture**: For system information
   - Terminal output
   - System monitors

3. **StreamFX Plugin**: Advanced effects
   - Shaders
   - Animated backgrounds
   - Particle effects

### Recommended OBS Plugins

1. **StreamFX**: Advanced effects and filters
2. **Move Transition**: Smooth animation transitions
3. **Advanced Scene Switcher**: Automated scene management
4. **Spectralizer**: Audio visualization
5. **Waveform**: Audio waveform display

## Display Modes

### Single Display (128x32)
- Full canvas sent to `display1` topic
- Default mode

### Dual Display (128x64 → 2x 128x32)
- Top half (0-31) → `display1` topic
- Bottom half (32-63) → `display2` topic
- Set `DISPLAY_MODE=dual` in .env

## Example Scenes

### 1. Clock Display
```
Scene: Clock
├── Color Source (Background: #000000)
├── Text (Time: %H:%M:%S)
└── Text (Date: %Y-%m-%d)
```

### 2. Weather Display
```
Scene: Weather
├── Image (Weather Icon)
├── Text (Temperature)
└── Text (Conditions)
```

### 3. Scrolling News
```
Scene: News
├── Color Source (Background)
└── Text (RSS feed with scroll filter)
```

### 4. Audio Visualizer
```
Scene: Music
├── Spectralizer (Audio reactive)
└── Text (Now Playing)
```

## Performance Tips

1. **CPU Usage**: Use hardware encoding if available
2. **Latency**: Set encoder preset to "ultrafast"
3. **Network**: Run OBS and server on same machine
4. **Frame Rate**: 30 FPS is optimal, higher unnecessary

## API Endpoints

### GET /api/status
Returns current system status:
```json
{
  "mqtt": {
    "connected": true,
    "broker": "mqtt://localhost:1883",
    "frameCount": 1234
  },
  "rtmp": {
    "isStreaming": true,
    "rtmpPort": 1935,
    "streamKey": "pixelmatrix"
  },
  "processor": {
    "isProcessing": true,
    "expectedFrameSize": 16384
  }
}
```

### GET /health
Simple health check endpoint

## Troubleshooting

### OBS Can't Connect
- Check server is running: `npm run dev`
- Verify RTMP port is free: `lsof -i :1935`
- Check firewall settings

### No MQTT Output
- Verify MQTT broker is running
- Check .env configuration
- Monitor server logs for errors

### Poor Frame Rate
- Reduce OBS encoding quality
- Check CPU usage
- Ensure network isn't bottleneck

### Color Issues
- Server automatically swaps R/B channels
- Adjust brightness in .env (0-100)

## Architecture Benefits

### vs. Previous Template System

| Old System | OBS-Based System |
|------------|------------------|
| Complex code for animations | OBS handles all animations |
| Limited effects | Unlimited OBS filters/plugins |
| Hard to preview | Real-time OBS preview |
| Custom data integration | Browser sources for any web content |
| Template management | OBS scene collections |
| Manual timing | OBS automation tools |

## Environment Variables

```bash
# MQTT Configuration
MQTT_BROKER=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_TOPIC_DISPLAY1=led/display1
MQTT_TOPIC_DISPLAY2=led/display2

# RTMP Server
RTMP_PORT=1935
HTTP_PORT=8000
STREAM_KEY=pixelmatrix

# Display Settings
CANVAS_WIDTH=128
CANVAS_HEIGHT=32
DISPLAY_MODE=single  # or 'dual' for two displays
BRIGHTNESS=50        # 0-100

# API Server
PORT=3001
```

## License

MIT