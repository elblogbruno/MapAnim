# Route Motion Studio — Project Data Format

Route Motion Studio stores all project state in a structured, versioned JSON schema (`.routevideo.json`).

```json
{
  "version": 1,
  "metadata": {
    "id": "route_66_demo_project",
    "name": "Route 66 — USA 2025",
    "description": "Cinematic journey across historic US Route 66.",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  "video": {
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "duration": 12.0,
    "aspectRatio": "16:9",
    "format": "mp4"
  },
  "map": {
    "stylePreset": "vintageAmericana",
    "features": {
      "showRoads": true,
      "showHighways": true,
      "showBuiltInLabels": false,
      "showStateBorders": true,
      "showCountryBorders": true,
      "showWaterLabels": false,
      "showPOIs": false,
      "showTerrainRelief": true,
      "cinematicClean": true
    }
  },
  "route": {
    "stops": [
      {
        "id": "stop_01_chicago",
        "canonicalName": "Chicago, Illinois, United States",
        "displayName": "CHICAGO",
        "coordinates": { "lng": -87.6298, "lat": 41.8781 },
        "visible": true,
        "behavior": "highlight",
        "pauseDuration": 0.35,
        "cameraPriority": 1,
        "labelPriority": 1
      }
    ],
    "segments": [
      {
        "id": "seg_stop_01_chicago_to_stop_02_st_louis",
        "startStopId": "stop_01_chicago",
        "endStopId": "stop_02_st_louis",
        "travelMode": "car",
        "routeMode": "realRoad",
        "geometry": [[-87.6298, 41.8781], [-90.1994, 38.6270]],
        "distanceMeters": 465000
      }
    ],
    "defaultLineStyle": {
      "color": "#8C342D",
      "width": 4.5,
      "outlineColor": "#FFFFFF",
      "outlineWidth": 1.5,
      "opacity": 1.0,
      "glow": true
    },
    "labelDisplayMode": "cinematic"
  },
  "camera": {
    "mode": "cinematicFollow",
    "lookAheadFactor": 0.28,
    "defaultZoom": 6.8,
    "defaultPitch": 22,
    "defaultBearing": -8,
    "introZoomEnabled": true,
    "outroZoomOutEnabled": true
  },
  "effects": {
    "paperTexture": true,
    "paperOpacity": 0.07,
    "vignette": true,
    "vignetteStrength": 0.25,
    "colorGrade": "vintageWarm"
  },
  "overlays": {
    "titles": [
      {
        "id": "title_intro",
        "text": "ROUTE 66",
        "subtitle": "THE MAIN STREET OF AMERICA • 2025",
        "startTime": 0.1,
        "duration": 2.2,
        "position": "top",
        "fontFamily": "Cinzel, serif",
        "fontSize": 38,
        "color": "#2B2724",
        "animation": "fade"
      }
    ],
    "showDistanceIndicator": true,
    "distanceUnit": "miles"
  }
}
```
