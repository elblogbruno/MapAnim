import { MapStylePreset } from '../../types/providers';
import { MapFeaturesConfig } from '../../types/project';

export function getMapLayerVisibility(
  layer: { id: string; type?: string; 'source-layer'?: string },
  features: MapFeaturesConfig
): boolean | undefined {
  const id = layer.id.toLowerCase();
  const sourceLayer = String(layer['source-layer'] || '').toLowerCase();
  const key = `${id} ${sourceLayer}`;

  if (/boundary[_ -]state|admin[_ -]?4/.test(key)) return features.showStateBorders;
  if (/boundary[_ -]country|admin[_ -]?2/.test(key)) return features.showCountryBorders;
  if (/hillshade|terrain|landcover/.test(key)) return features.showTerrainRelief;
  if (layer.type === 'symbol') {
    if (/water/.test(key)) return features.showWaterLabels;
    if (/poi|park|airport|aeroway/.test(key)) return features.showPOIs && !features.cinematicClean;
    return features.showBuiltInLabels && !features.cinematicClean;
  }
  if (/motorway|trunk|highway/.test(key)) return features.showHighways;
  if (/transportation|road|street/.test(key)) return features.showRoads;
  if (/building|landuse|park|aeroway/.test(key)) return !features.cinematicClean;
}

/**
 * Creates a deterministic, standalone MapLibre vector style object
 * that works without commercial keys (uses CARTO / OSM / OpenMapTiles basemaps).
 */
function createRasterBasemapStyle(tilesUrl: string, attribution: string, bgColor: string): object {
  return {
    version: 8,
    name: 'Basemap Style',
    sources: {
      'raster-tiles': {
        type: 'raster',
        tiles: [tilesUrl],
        tileSize: 256,
        attribution,
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': bgColor,
        },
      },
      {
        id: 'raster-basemap',
        type: 'raster',
        source: 'raster-tiles',
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  };
}

export const MAP_STYLE_PRESETS: MapStylePreset[] = [
  {
    id: 'vintageAmericana',
    name: 'Vintage Americana',
    description: 'Warm paper cartography with muted historic tones and dark red route.',
    // CARTO Voyager with warm vintage tone
    styleUrl: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    defaultRouteColor: '#8C342D',
    defaultLabelBg: '#F7F3E8',
    defaultLabelColor: '#2B2724',
  },
  {
    id: 'documentary',
    name: 'Documentary Natural',
    description: 'Subdued natural tones ideal for documentary travel films.',
    styleUrl: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    defaultRouteColor: '#C2410C',
    defaultLabelBg: '#FFFFFF',
    defaultLabelColor: '#1E293B',
  },
  {
    id: 'darkCinema',
    name: 'Dark Cinema',
    description: 'High contrast dark basemap with vibrant route illumination.',
    styleUrl: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    defaultRouteColor: '#EF4444',
    defaultLabelBg: '#1E293B',
    defaultLabelColor: '#F8FAFC',
  },
  {
    id: 'cleanLight',
    name: 'Clean Light Minimal',
    description: 'Crisp, contemporary white and gray aesthetic.',
    styleUrl: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    defaultRouteColor: '#2563EB',
    defaultLabelBg: '#FFFFFF',
    defaultLabelColor: '#0F172A',
  },
  {
    id: 'satellite',
    name: 'Satellite Aerial',
    description: 'Real-world photographic satellite imagery.',
    styleUrl: createRasterBasemapStyle(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      '#000000'
    ),
    defaultRouteColor: '#F59E0B',
    defaultLabelBg: '#0F172A',
    defaultLabelColor: '#FFFFFF',
  },
  {
    id: 'minimal',
    name: 'Essential Geography',
    description: 'Ultra-minimal outline map emphasizing pure route geometry.',
    styleUrl: 'https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json',
    defaultRouteColor: '#DC2626',
    defaultLabelBg: '#FFFFFF',
    defaultLabelColor: '#18181B',
  },
];

export function getMapStyleById(styleId: string): MapStylePreset {
  return MAP_STYLE_PRESETS.find(p => p.id === styleId) || MAP_STYLE_PRESETS[0];
}
