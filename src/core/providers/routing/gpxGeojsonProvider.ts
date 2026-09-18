import { LngLatTuple } from '../../types/geo';

export interface ParsedGpsData {
  name?: string;
  tracks: {
    name?: string;
    coordinates: LngLatTuple[];
  }[];
  waypoints: {
    name: string;
    coordinates: LngLatTuple;
  }[];
}

const isValidCoordinate = (value: unknown): value is LngLatTuple =>
  Array.isArray(value) && value.length >= 2 &&
  Number.isFinite(value[0]) && Number.isFinite(value[1]) &&
  value[0] >= -180 && value[0] <= 180 && value[1] >= -90 && value[1] <= 90;

/**
 * Parses GPX XML file content into structured coordinates and waypoints
 */
export function parseGpx(xmlContent: string): ParsedGpsData {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlContent, 'application/xml');

  const tracks: { name?: string; coordinates: LngLatTuple[] }[] = [];
  const waypoints: { name: string; coordinates: LngLatTuple }[] = [];

  // Parse waypoints (<wpt>)
  const wptNodes = xml.querySelectorAll('wpt');
  wptNodes.forEach(wpt => {
    const lat = Number(wpt.getAttribute('lat'));
    const lon = Number(wpt.getAttribute('lon'));
    const nameNode = wpt.querySelector('name');
    const name = nameNode ? nameNode.textContent?.trim() || 'Waypoint' : 'Waypoint';

    if (wpt.hasAttribute('lat') && wpt.hasAttribute('lon') && isValidCoordinate([lon, lat])) {
      waypoints.push({ name, coordinates: [lon, lat] });
    }
  });

  // Parse tracks (<trk>)
  const trkNodes = xml.querySelectorAll('trk');
  trkNodes.forEach(trk => {
    const nameNode = trk.querySelector('name');
    const name = nameNode?.textContent?.trim();
    const coordinates: LngLatTuple[] = [];

    const trkpts = trk.querySelectorAll('trkpt');
    trkpts.forEach(pt => {
      const lat = Number(pt.getAttribute('lat'));
      const lon = Number(pt.getAttribute('lon'));
      if (pt.hasAttribute('lat') && pt.hasAttribute('lon') && isValidCoordinate([lon, lat])) {
        coordinates.push([lon, lat]);
      }
    });

    if (coordinates.length > 0) {
      tracks.push({ name, coordinates });
    }
  });

  // Parse routes (<rte>)
  const rteNodes = xml.querySelectorAll('rte');
  rteNodes.forEach(rte => {
    const nameNode = rte.querySelector('name');
    const name = nameNode?.textContent?.trim();
    const coordinates: LngLatTuple[] = [];

    const rtepts = rte.querySelectorAll('rtept');
    rtepts.forEach(pt => {
      const lat = Number(pt.getAttribute('lat'));
      const lon = Number(pt.getAttribute('lon'));
      if (pt.hasAttribute('lat') && pt.hasAttribute('lon') && isValidCoordinate([lon, lat])) {
        coordinates.push([lon, lat]);
      }
    });

    if (coordinates.length > 0) {
      tracks.push({ name: name || 'Route', coordinates });
    }
  });

  return { tracks, waypoints };
}

/**
 * Parses GeoJSON content into structured coordinates and waypoints
 */
export function parseGeoJson(jsonContent: string | object): ParsedGpsData {
  const geojson = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
  const tracks: { name?: string; coordinates: LngLatTuple[] }[] = [];
  const waypoints: { name: string; coordinates: LngLatTuple }[] = [];

  const processFeature = (feature: any) => {
    if (!feature || !feature.geometry) return;
    const geom = feature.geometry;
    const props = feature.properties || {};

    if (geom.type === 'LineString' && Array.isArray(geom.coordinates)) {
      const coordinates = geom.coordinates.filter(isValidCoordinate);
      if (coordinates.length === 0) return;
      tracks.push({
        name: props.name || props.title || 'LineString',
        coordinates,
      });
    } else if (geom.type === 'MultiLineString' && Array.isArray(geom.coordinates)) {
      for (const line of geom.coordinates) {
        const coordinates = Array.isArray(line) ? line.filter(isValidCoordinate) : [];
        if (coordinates.length === 0) continue;
        tracks.push({
          name: props.name || 'MultiLineString',
          coordinates,
        });
      }
    } else if (geom.type === 'Point' && isValidCoordinate(geom.coordinates)) {
      waypoints.push({
        name: props.name || props.title || 'Point',
        coordinates: geom.coordinates as LngLatTuple,
      });
    }
  };

  if (geojson.type === 'FeatureCollection' && Array.isArray(geojson.features)) {
    geojson.features.forEach(processFeature);
  } else if (geojson.type === 'Feature') {
    processFeature(geojson);
  }

  return { tracks, waypoints };
}
