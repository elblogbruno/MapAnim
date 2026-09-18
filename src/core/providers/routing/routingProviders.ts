import { Coordinates, LngLatTuple, TravelMode } from '../../types/geo';
import { RoutingProvider, RoutingResult } from '../../types/providers';
import { geodesicDistance } from '../../math/geo';
import { createCinematicArc } from '../../math/polyline';

export class DirectRoutingProvider implements RoutingProvider {
  name = 'Direct Geodesic Line';

  async calculateRoute(origin: Coordinates, destination: Coordinates, _mode: TravelMode): Promise<RoutingResult> {
    const start: LngLatTuple = [origin.lng, origin.lat];
    const end: LngLatTuple = [destination.lng, destination.lat];
    const distanceMeters = geodesicDistance(origin, destination);

    return {
      geometry: [start, end],
      distanceMeters,
      durationSeconds: Math.round(distanceMeters / 25), // ~90 km/h approx
      provider: this.name,
    };
  }
}

export class ArcRoutingProvider implements RoutingProvider {
  name = 'Cinematic Arc';

  async calculateRoute(origin: Coordinates, destination: Coordinates, mode: TravelMode): Promise<RoutingResult> {
    const start: LngLatTuple = [origin.lng, origin.lat];
    const end: LngLatTuple = [destination.lng, destination.lat];
    const distanceMeters = geodesicDistance(origin, destination);
    const curvature = mode === 'airplane' ? 0.18 : 0.06;
    const pointsCount = Math.max(20, Math.min(80, Math.round(distanceMeters / 25000)));

    const geometry = createCinematicArc(start, end, pointsCount, curvature);

    return {
      geometry,
      distanceMeters: distanceMeters * 1.05,
      durationSeconds: Math.round(distanceMeters / 30),
      provider: this.name,
    };
  }
}

// In-memory routing cache
const osrmCache = new Map<string, RoutingResult>();

export class OsrmRoutingProvider implements RoutingProvider {
  name = 'OSRM Driving (OpenStreetMap)';

  async calculateRoute(origin: Coordinates, destination: Coordinates, mode: TravelMode): Promise<RoutingResult> {
    const cacheKey = `${origin.lng.toFixed(4)},${origin.lat.toFixed(4)}_${destination.lng.toFixed(4)},${destination.lat.toFixed(4)}_${mode}`;
    if (osrmCache.has(cacheKey)) {
      return osrmCache.get(cacheKey)!;
    }

    const start: LngLatTuple = [origin.lng, origin.lat];
    const end: LngLatTuple = [destination.lng, destination.lat];
    const directDistance = geodesicDistance(origin, destination);

    // For flights, always use Arc
    if (mode === 'airplane') {
      const arcResult = await new ArcRoutingProvider().calculateRoute(origin, destination, mode);
      osrmCache.set(cacheKey, arcResult);
      return arcResult;
    }

    try {
      const profile = mode === 'walking' || mode === 'bicycle' ? 'foot' : 'driving';
      const url = `https://router.project-osrm.org/route/v1/${profile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`OSRM HTTP error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.routes || data.routes.length === 0) {
        throw new Error('No OSRM route returned');
      }

      const primaryRoute = data.routes[0];
      const geometry: LngLatTuple[] = primaryRoute.geometry.coordinates;

      const result: RoutingResult = {
        geometry,
        distanceMeters: primaryRoute.distance || directDistance * 1.15,
        durationSeconds: primaryRoute.duration || 60,
        provider: this.name,
      };

      osrmCache.set(cacheKey, result);
      return result;
    } catch (err) {
      console.warn('OSRM routing request failed, falling back to smooth arc route:', err);
      // Fallback to cinematic arc so the user is never blocked
      const fallbackArc = createCinematicArc(start, end, 35, 0.04);
      const fallbackResult: RoutingResult = {
        geometry: fallbackArc,
        distanceMeters: directDistance * 1.15,
        durationSeconds: Math.round(directDistance / 25),
        provider: 'Fallback Arc (OSRM Offline)',
      };
      return fallbackResult;
    }
  }
}
