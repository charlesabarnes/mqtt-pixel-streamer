# RTMP Pixel Streamer

A simplified RTMP-to-MQTT bridge that receives video streams and publishes frames to LED matrix displays via MQTT.

## Related Projects

- **Low-fi Dashboards**: Standalone animated dashboards for browser sources → [lowfi-dashboards](https://github.com/charlesabarnes/lowfi-dashboards)

## Overview

This server processes RTMP video streams for LED matrix displays:

1. Receives RTMP stream (128x32 resolution)
2. Extracts raw frames from the video stream
3. Processes frames (brightness, color correction)
4. Publishes to MQTT for LED matrix display

## Quick Start

### 1. Install Dependencies

```bash
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

### 4. Configure Streaming Source

#### RTMP Settings
- **Server**: `rtmp://localhost:1935/live`
- **Stream Key**: `pixelmatrix`
- **Resolution**: 128x32
- **FPS**: 30
- **Bitrate**: 1000 Kbps

## Content Creation Guide

### Creating Content for 128x32 Display

#### 1. Text Content
- **Font Size**: 8-14px works best
- **Font**: Use bitmap or monospace fonts
- **Outline**: Avoid - too small for low resolution
- **Anti-aliasing**: Disable for crisp pixels

#### 2. Images
- **Format**: PNG with transparency recommended
- **Size**: Design at exact size or multiples of 128x32
- **Scaling**: Use nearest-neighbor for pixel art

#### 3. Web Content
- **Dimensions**: Set exact 128x32 pixel dimensions
```css
body {
  margin: 0;
  overflow: hidden;
  width: 128px;
  height: 32px;
}
```

#### 4. Video Content
- **Resolution**: Pre-render at 128x32 for best results
- **Format**: H.264 recommended
- **Frame Rate**: 30 FPS optimal

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
3. **Network**: Run streaming source and server on same machine
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

### RTMP Connection Issues
- Check server is running: `npm run dev`
- Verify RTMP port is free: `lsof -i :1935`
- Check firewall settings

### No MQTT Output
- Verify MQTT broker is running
- Check .env configuration
- Monitor server logs for errors

### Poor Frame Rate
- Reduce streaming encoding quality
- Check CPU usage
- Ensure network isn't bottleneck

### Color Issues
- Server automatically swaps R/B channels
- Adjust brightness in .env (0-100)

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