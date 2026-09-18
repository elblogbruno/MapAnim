# Routing & Geocoding Architecture

## 1. Provider Abstraction
To ensure longevity and zero vendor lock-in, all geocoding and routing operations are abstracted behind TypeScript interfaces:

- `GeocodingProvider`:
  - `NominatimGeocodingProvider`: OpenStreetMap global search with address details.
  - `OfflineSeedProvider`: Verified fallback seeds for zero-network environments.
- `RoutingProvider`:
  - `OsrmRoutingProvider`: OpenStreetMap road navigation with local coordinate caching.
  - `ArcRoutingProvider`: Great-circle / cinematic curved routes for aviation or stylized visualization.
  - `DirectRoutingProvider`: Straight geodesic line.
  - `GpxGeojsonProvider`: Custom user-imported GPX and GeoJSON GPS tracks.

## 2. Coordinate & Geometry Caching Rule
Once a stop or segment is resolved, exact latitude/longitude coordinates and polyline geometries are saved directly into the project JSON. Subsequent animation previews and video frame renders never query external APIs.
