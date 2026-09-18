# Route Motion Studio

> **Professional Travel Map Video Animation Studio**  
> Build deterministic, cinematic travel map animations and export high-quality MP4 videos ready for DaVinci Resolve, Adobe Premiere Pro, and Final Cut Pro.

---

## 🌟 Key Highlights

- **Deterministic Animation Engine**: Live preview and final video export share the exact same mathematical scene function: `getSceneAtTime(project, time)`.
- **Strict Duplicate Prevention**: Canonical label derivation guarantees no duplicate labels or misspelled AI hallucinations.
- **Cinematic Camera Director**: Continuous velocity and intelligent look-ahead framing anticipate upcoming turns and destinations.
- **Authentic Route 66 USA Preset**: Bundled with 11 verified stops from Chicago to Santa Monica Pier with historic corridor waypoints.
- **DaVinci Resolve Friendly**: H.264 High Profile (`yuv420p`), ProRes 422, PNG Sequence, and Transparent Alpha overlay exports.
- **Cartography Styles**: Vintage Americana, Documentary Natural, Dark Cinema, Clean Light, and Satellite Aerial.
- **Zero Vendor Lock-In**: Works out of the box without paid commercial keys.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [FFmpeg](https://ffmpeg.org/) (installed in PATH for video export)

### Installation
```bash
# 1. Clone or navigate to the repository
cd MapAnim

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## 🧪 Automated Testing

Run the full unit and mathematical invariant test suite with Vitest:
```bash
npm run test
```

Tests cover:
- Geodesic Haversine calculations & antimeridian longitude wrapping
- Constant-speed polyline slicing & distance calculations
- Strict Stop-ID label deduplication across full animation duration
- Camera interpolation & look-ahead framing
- Schedule allocation & timeline monotonicity

---

## 🎬 Headless Video Rendering

Render the built-in Route 66 project into a broadcast-ready MP4:
```bash
npm run render-demo
```
The resulting video will be saved to `exports/route66-demo.mp4`.

---

## 📂 Project Structure

```
src/
├── core/
│   ├── types/          # Schema definitions (ProjectData, SceneState, Geo)
│   ├── math/           # Geodesic math, polylines, easing, interpolation
│   ├── engine/         # Single deterministic animation engine & camera director
│   ├── providers/      # Geocoding, Routing, and Map Style presets
│   └── project/        # Route 66 demo, migrations, IndexedDB storage
├── components/
│   ├── layout/         # Header, workspaces
│   ├── itinerary/      # Drag-and-drop itinerary, search, GPX upload
│   ├── map/            # MapLibre canvas, vector labels, pulsing markers
│   ├── inspector/      # Stop, route, camera, map, and effects inspectors
│   ├── timeline/       # Scrubber, playhead, multi-track visualizer
│   └── export/         # Export dialog with DaVinci Resolve presets
├── renderer/           # Headless clean frame renderer
scripts/                # Headless Playwright + FFmpeg export scripts
docs/                   # Architecture, project format, rendering docs
```

---

## 📄 License
MIT License.
