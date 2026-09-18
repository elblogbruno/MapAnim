# Video Rendering & DaVinci Resolve Workflow

## 1. Export Formats Supported
- **DaVinci Resolve MP4**: H.264 High Profile, `yuv420p` pixel format, CRF 18 (visually lossless).
- **ProRes 422 HQ**: 10-bit master archive format.
- **PNG Sequence**: Individual frame sequence for visual compositing.
- **Transparent Overlay**: Route lines and typography rendered with an alpha channel for direct overlay on footage.

## 2. Deterministic Rendering Pipeline
```
[User Project JSON]
       │
       ▼
[getSceneAtTime(project, t)]
       │
       ▼
[Playwright Headless Chromium]
       │ (Step t = frame / fps, wait for tile sync)
       ▼
[Pristine Frame Buffer (PNG)]
       │
       ▼
[FFmpeg Encoder (libx264 / yuv420p)]
       │
       ▼
[High Quality MP4 Video]
```

## 3. Command Line Rendering
To render a video directly from terminal:
```bash
# Render the built-in Route 66 demo project
npm run render-demo

# Render any custom project
npm run render-cli -- --project my_trip.routevideo.json --output exports/my_trip.mp4
```
