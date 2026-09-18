# Route Motion Studio — Architecture Specification

## 1. Executive Summary
**Route Motion Studio** is a deterministic geospatial motion graphics studio engineered to generate high-fidelity, reproducible travel map animations and video exports for video editors such as DaVinci Resolve, Adobe Premiere Pro, and Final Cut Pro.

## 2. Core Architectural Principles
1. **Single Deterministic Animation Model**: Both real-time UI preview and headless video rendering invoke the identical mathematical function:
   $$\text{SceneState} = \text{getSceneAtTime}(\text{ProjectData}, t)$$
   where $t = \text{frame} / \text{fps}$.
2. **Deterministic Typography & Canonical Labels**:
   - Every location stop is assigned a permanent unique canonical ID (e.g. `stop_01_chicago`).
   - Labels are derived directly from stops; duplicate labels are structurally impossible.
   - Screen-space collision resolution with automatic fallback offsets and priority rules.
3. **True Polyline Geodesic Math**:
   - Progressive route lines are measured and sliced using exact cumulative distance along coordinates rather than naive vertex index interpolation.
   - Constant-speed drawing with configurable easing curves (`cinematic`, `easeInOut`, `linear`).
4. **Cinematic Camera Director**:
   - Intelligent look-ahead target calculation:
     $$\text{cameraTarget} = \text{lerp}(\text{headPosition}, \text{destinationPosition}, \text{lookAheadFactor})$$
   - Seamless continuous velocity across segment boundaries without robotic stops or jerks.

## 3. Subsystem Breakdown
- **`src/core/math/`**: Geodesic Haversine calculations, bearing, antimeridian longitude wrapping, bounding box fitting, polyline slicing, and continuous easing curves.
- **`src/core/engine/`**: The animation engine, camera director, strict label deduplicator, and distance-weighted timing scheduler.
- **`src/core/providers/`**: Pluggable provider interfaces for Geocoding (Nominatim + Offline Seeds), Routing (OSRM, Arc, Direct, GPX/GeoJSON), and Map Styles (Vintage Americana, Documentary, Dark Cinema, Clean Light, Satellite).
- **`src/components/`**: Modular, high-performance dark studio UI with timeline scrubbing, itinerary drag-and-drop, and interactive parameter inspectors.
- **`scripts/`**: Headless Playwright + FFmpeg frame-by-frame renderer producing DaVinci-ready MP4 (H.264 High Profile, yuv420p).
