import { ProjectData, RouteStop, RouteSegment, AspectRatio } from '../types/project';
import { LngLatTuple } from '../types/geo';
import { geodesicDistance } from '../math/geo';
import { createCinematicArc } from '../math/polyline';
import { getStandardDimensionsForAspect } from '../project/video';
import { OFFLINE_GEO_SEEDS } from '../providers/geocoding/offlineSeedProvider';
import { NominatimGeocodingProvider } from '../providers/geocoding/nominatimProvider';

const nominatim = new NominatimGeocodingProvider();

export interface MagicPresetPrompt {
  id: string;
  icon: string;
  title: string;
  category: 'roadtrip' | 'flight' | 'train' | 'nature';
  prompt: string;
  aspectRatio: AspectRatio;
}

export const MAGIC_PRESET_PROMPTS: MagicPresetPrompt[] = [
  {
    id: 'west-coast',
    icon: '🚐',
    title: 'Costa Oeste USA',
    category: 'roadtrip',
    prompt: 'Ruta de 12 días por la Costa Oeste: San Francisco, Yosemite, Las Vegas y Gran Cañón en furgoneta camper',
    aspectRatio: '16:9',
  },
  {
    id: 'japan-express',
    icon: '🚅',
    title: 'Japón en Tren Bala',
    category: 'train',
    prompt: 'Viaje por Japón: Tokio, Monte Fuji, Kioto, Osaka y Nara en tren de alta velocidad',
    aspectRatio: '16:9',
  },
  {
    id: 'southeast-asia',
    icon: '✈️',
    title: 'Mochilazo Sudeste Asiático',
    category: 'flight',
    prompt: 'De Bangkok a Hanói pasando por Chiang Mai, Luang Prabang y Siem Reap con vuelo y carretera',
    aspectRatio: '9:16',
  },
  {
    id: 'italy-dolce-vita',
    icon: '🍕',
    title: 'Italia Clásica & Costa',
    category: 'roadtrip',
    prompt: 'Ruta por Italia: Roma, Florencia, Venecia, Milán y la Costa Amalfitana en coche descapotable',
    aspectRatio: '16:9',
  },
  {
    id: 'patagonia-epic',
    icon: '🏔️',
    title: 'Patagonia & Glaciares',
    category: 'nature',
    prompt: 'Viaje a la Patagonia: Buenos Aires, Bariloche, El Calafate y Ushuaia con avión y 4x4',
    aspectRatio: '9:16',
  },
  {
    id: 'spain-north',
    icon: '🍷',
    title: 'Ruta del Norte de España',
    category: 'roadtrip',
    prompt: 'Road trip por el norte de España: Madrid, Ribera del Duero, Bilbao, Santander y Santiago de Compostela',
    aspectRatio: '16:9',
  },
];

interface ExtractedStop {
  displayName: string;
  canonicalName: string;
  lat: number;
  lng: number;
}

/**
 * Extracts stops from a natural language travel prompt.
 */
async function extractStopsFromPrompt(
  prompt: string,
  onProgress?: (msg: string) => void
): Promise<ExtractedStop[]> {
  const lower = prompt.toLowerCase();
  const found: { stop: ExtractedStop; index: number }[] = [];

  // 1. Search in offline seeds
  for (const seed of OFFLINE_GEO_SEEDS) {
    const rawCity = seed.displayName.split(',')[0].trim().toLowerCase();
    const idx = lower.indexOf(rawCity);
    if (idx !== -1 && rawCity.length >= 3) {
      if (!found.some(f => Math.abs(f.stop.lat - seed.coordinates.lat) < 0.2 && Math.abs(f.stop.lng - seed.coordinates.lng) < 0.2)) {
        found.push({
          stop: {
            displayName: seed.displayName.split(',')[0].trim().toUpperCase(),
            canonicalName: seed.displayName,
            lat: seed.coordinates.lat,
            lng: seed.coordinates.lng,
          },
          index: idx,
        });
      }
    }
  }

  // Sort by appearance in prompt
  found.sort((a, b) => a.index - b.index);

  // 2. If less than 2 stops detected, parse clauses and query geocoder
  if (found.length < 2) {
    onProgress?.('Buscando ubicaciones geográficas en el mapa global...');
    const parts = prompt
      .split(/[,;:\n\->➔]| a | de | y | luego | pasando por | hasta | hacia | para /i)
      .map(s => s.replace(/[?¿!¡.]/g, '').trim())
      .filter(s => s.length >= 3 && !['viaje', 'ruta', 'coche', 'avion', 'tren', 'dias', 'noches', 'furgoneta', 'camper'].includes(s.toLowerCase()));

    for (const part of parts) {
      if (found.length >= 7) break;
      if (found.some(f => f.stop.displayName.toLowerCase() === part.toLowerCase())) continue;

      try {
        const results = await nominatim.search(part);
        if (results && results.length > 0) {
          const best = results[0];
          const name = (best.displayName.split(',')[0] || part).trim().toUpperCase();
          if (!found.some(f => Math.abs(f.stop.lat - best.coordinates.lat) < 0.1 && Math.abs(f.stop.lng - best.coordinates.lng) < 0.1)) {
            found.push({
              stop: {
                displayName: name,
                canonicalName: best.displayName,
                lat: best.coordinates.lat,
                lng: best.coordinates.lng,
              },
              index: prompt.indexOf(part),
            });
          }
        }
      } catch {
        // Geocode error ignored
      }
    }
    found.sort((a, b) => a.index - b.index);
  }

  // 3. Fallback default if completely empty
  if (found.length < 2) {
    return [
      { displayName: 'PARÍS', canonicalName: 'París, Francia', lat: 48.8566, lng: 2.3522 },
      { displayName: 'GINEBRA', canonicalName: 'Ginebra, Suiza', lat: 46.2044, lng: 6.1432 },
      { displayName: 'MILÁN', canonicalName: 'Milán, Italia', lat: 45.4642, lng: 9.1900 },
      { displayName: 'ROMA', canonicalName: 'Roma, Italia', lat: 41.9028, lng: 12.4964 },
    ];
  }

  return found.map(f => f.stop);
}

/**
 * Generates a full cinematic ProjectData from a prompt.
 */
export async function generateMagicRouteFromPrompt(
  prompt: string,
  onProgress?: (step: string) => void
): Promise<ProjectData> {
  onProgress?.('Analizando itinerario y detectando destinos...');
  const stopsData = await extractStopsFromPrompt(prompt, onProgress);

  onProgress?.('Configurando transporte y geometría cinemática...');

  const lower = prompt.toLowerCase();

  // Detect Aspect Ratio
  let aspectRatio: AspectRatio = '16:9';
  if (lower.includes('9:16') || lower.includes('vertical') || lower.includes('tiktok') || lower.includes('reels') || lower.includes('shorts')) {
    aspectRatio = '9:16';
  } else if (lower.includes('1:1') || lower.includes('cuadrado')) {
    aspectRatio = '1:1';
  } else if (lower.includes('21:9') || lower.includes('cine') || lower.includes('wide')) {
    aspectRatio = '21:9';
  }

  const dims = getStandardDimensionsForAspect(aspectRatio);

  // Detect Style Preset
  let stylePreset: 'vintageAmericana' | 'documentary' | 'darkCinema' | 'cleanLight' | 'satellite' | 'minimal' = 'vintageAmericana';
  if (lower.includes('satélite') || lower.includes('satellite')) {
    stylePreset = 'satellite';
  } else if (lower.includes('oscuro') || lower.includes('dark') || lower.includes('noche') || lower.includes('cyber')) {
    stylePreset = 'darkCinema';
  } else if (lower.includes('minimal') || lower.includes('limpio')) {
    stylePreset = 'minimal';
  } else if (lower.includes('documental') || lower.includes('natgeo') || lower.includes('atlas')) {
    stylePreset = 'documentary';
  }

  // Detect general travel mode preference
  const isTrainPrompt = lower.includes('tren') || lower.includes('rail') || lower.includes('shinkansen') || lower.includes('ave');
  const isPlanePrompt = lower.includes('vuelo') || lower.includes('avion') || lower.includes('flight');
  const isCamperPrompt = lower.includes('camper') || lower.includes('furgoneta') || lower.includes('furgo') || lower.includes('van') || lower.includes('caravana');
  const isMotoPrompt = lower.includes('moto') || lower.includes('motocicleta') || lower.includes('motorcycle');

  // Build Route Stops
  const stops: RouteStop[] = stopsData.map((s, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === stopsData.length - 1;

    return {
      id: `stop_${idx + 1}_${s.displayName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      canonicalName: s.canonicalName,
      displayName: s.displayName,
      coordinates: { lng: s.lng, lat: s.lat },
      visible: true,
      behavior: isFirst || isLast ? 'highlight' : 'pause',
      pauseDuration: isFirst || isLast ? 0.4 : 0.25,
      cameraPriority: isFirst || isLast ? 1 : 2,
      labelPriority: isFirst || isLast ? 1 : 2,
      markerStyle: {
        type: isFirst || isLast ? 'circle' : 'ring',
        size: isFirst || isLast ? 12 : 9,
        color: isFirst ? '#10b981' : isLast ? '#ef4444' : '#e63946',
        strokeColor: '#ffffff',
        strokeWidth: 2.5,
        pulse: true,
        glow: true,
      },
      labelStyle: {
        fontFamily: 'Montserrat, sans-serif',
        fontSize: isFirst || isLast ? 14 : 11,
        fontWeight: 'bold',
        color: '#ffffff',
        haloColor: '#000000',
        haloWidth: 3,
        offsetY: 22,
        anchor: 'top',
      },
    };
  });

  // Build Segments with smart distance & transport detection
  const segments: RouteSegment[] = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const fromStop = stops[i];
    const toStop = stops[i + 1];

    const distKm = geodesicDistance(fromStop.coordinates, toStop.coordinates) / 1000;
    const isLongDistance = distKm > 650;

    let travelMode: 'airplane' | 'car' | 'motorcycle' | 'bus' | 'bicycle' | 'walking' | 'boat' = 'car';
    let routeMode: 'arc' | 'direct' | 'realRoad' = 'realRoad';
    let vehicleIcon: 'car' | 'vintageCar' | 'motorcycle' | 'plane' | 'boat' | 'bus' | 'bicycle' | 'dot' = 'car';

    if (isPlanePrompt || isLongDistance) {
      travelMode = 'airplane';
      routeMode = 'arc';
      vehicleIcon = 'plane';
    } else if (isTrainPrompt) {
      travelMode = 'car'; // train renders with road or direct
      routeMode = 'realRoad';
      vehicleIcon = 'car';
    } else if (isCamperPrompt) {
      travelMode = 'bus';
      routeMode = 'realRoad';
      vehicleIcon = 'bus';
    } else if (isMotoPrompt) {
      travelMode = 'motorcycle';
      routeMode = 'realRoad';
      vehicleIcon = 'motorcycle';
    }

    const p1: LngLatTuple = [fromStop.coordinates.lng, fromStop.coordinates.lat];
    const p2: LngLatTuple = [toStop.coordinates.lng, toStop.coordinates.lat];

    // Generate arc geometry for smooth curves
    const geometry = createCinematicArc(p1, p2, 16, routeMode === 'arc' ? 0.08 : 0.02);
    const distanceMeters = geodesicDistance(fromStop.coordinates, toStop.coordinates) * (routeMode === 'arc' ? 1.0 : 1.18);

    segments.push({
      id: `seg_${fromStop.id}_to_${toStop.id}`,
      startStopId: fromStop.id,
      endStopId: toStop.id,
      travelMode,
      routeMode,
      geometry,
      distanceMeters,
      color: travelMode === 'airplane' ? '#38bdf8' : '#e63946',
      width: travelMode === 'airplane' ? 2.5 : 4.0,
      vehicle: {
        enabled: true,
        icon: vehicleIcon,
        size: 24,
        color: '#ffffff',
      },
    });
  }

  // Calculate dynamic duration
  const totalDuration = Math.max(10, Math.min(32, Math.round(stops.length * 3.2)));

  // Extract trip title from prompt
  const cleanedTitle = prompt
    .split(/[:,]/)[0]
    .replace(/^(crea|haz|genera|planifica|dibuja|un|una|ruta|viaje)\s+/i, '')
    .trim() || `${stops[0].displayName} a ${stops[stops.length - 1].displayName}`;

  const projectName = cleanedTitle.charAt(0).toUpperCase() + cleanedTitle.slice(1);

  onProgress?.('Ajustando cámara cinemática y títulos...');

  const project: ProjectData = {
    version: 1,
    metadata: {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `proj_${Date.now()}`,
      name: projectName,
      description: prompt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: 'MapAnim AI Copilot',
    },
    video: {
      width: dims.width,
      height: dims.height,
      fps: 30,
      duration: totalDuration,
      aspectRatio,
      format: 'mp4',
    },
    map: {
      stylePreset,
      projection: 'mercator',
      features: {
        showRoads: true,
        showHighways: true,
        showBuiltInLabels: true,
        showStateBorders: true,
        showCountryBorders: true,
        showWaterLabels: false,
        showPOIs: false,
        showTerrainRelief: false,
        cinematicClean: true,
      },
    },
    route: {
      stops,
      segments,
      defaultLineStyle: {
        color: '#e63946',
        width: 4.0,
        outlineColor: '#ffffff',
        outlineWidth: 0,
        opacity: 0.95,
        completedOpacity: 1,
        futureVisibility: false,
        lineCap: 'round',
        lineJoin: 'round',
        glow: true,
        glowColor: '#e63946',
        glowBlur: 6,
      },
      defaultMarkerStyle: {
        type: 'ring',
        size: 9,
        color: '#e63946',
        strokeColor: '#ffffff',
        strokeWidth: 2.5,
        pulse: true,
        glow: true,
      },
      defaultLabelStyle: {
        fontFamily: 'Montserrat, sans-serif',
        fontSize: 12,
        fontWeight: 'bold',
        color: '#ffffff',
        backgroundColor: '#00000088',
        borderColor: '#ffffff33',
        borderWidth: 1,
        borderRadius: 4,
        paddingX: 8,
        paddingY: 4,
        uppercase: true,
        letterSpacing: 1.2,
        shadow: true,
        leaderLine: false,
        offsetX: 0,
        offsetY: -30,
      },
      labelDisplayMode: 'cinematic',
      optimizeOverlappingLabels: true,
      routeEasing: 'cinematic',
    },
    camera: {
      mode: 'cinematicFollow',
      lookAheadFactor: 0.28,
      defaultZoom: 6.5,
      defaultPitch: 28,
      defaultBearing: 0,
      smoothingDuration: 0.8,
      introZoomEnabled: true,
      outroZoomOutEnabled: true,
      outroHoldSeconds: 1.8,
      keyframes: [],
    },
    effects: {
      paperTexture: false,
      paperOpacity: 0.05,
      vignette: true,
      vignetteStrength: 0.25,
      filmGrain: false,
      filmGrainOpacity: 0.05,
      colorGrade: 'vintageWarm',
    },
    overlays: {
      titles: [
        {
          id: 'title_intro',
          text: projectName.toUpperCase(),
          subtitle: `${stops.length} PARADAS • RUTA CINEMÁTICA`,
          startTime: 0.1,
          duration: 2.5,
          position: 'top',
          fontFamily: 'Montserrat, sans-serif',
          fontSize: 30,
          color: '#ffffff',
          animation: 'fade',
        },
      ],
      safeAreaGuides: false,
      showDistanceIndicator: true,
      distanceUnit: 'km',
      distanceHud: {
        enabled: true,
        unit: 'km',
        position: 'topRight',
        theme: 'glassDark',
        showProgressBar: true,
      },
    },
    audio: {
      enabled: true,
      trackId: 'acoustic-journey',
      trackName: 'Acoustic Journey',
      url: 'https://cdn.freesound.org/previews/565/565985_11861866-lq.mp3',
      volume: 0.7,
      fadeIn: 1,
      fadeOut: 1,
      sfxEnabled: true,
      sfxVolume: 0.7,
    },
  };

  onProgress?.('¡Ruta cinemática generada con éxito!');
  return project;
}
