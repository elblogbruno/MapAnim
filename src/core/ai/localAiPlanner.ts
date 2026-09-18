import { AiProposedAction, AiStopProposal } from './types';
import { NominatimGeocodingProvider } from '../providers/geocoding/nominatimProvider';
import { OFFLINE_GEO_SEEDS } from '../providers/geocoding/offlineSeedProvider';
import { AspectRatio } from '../types/project';

const geocoder = new NominatimGeocodingProvider();

/**
 * Intelligent local rule-based planner that parses natural language travel requests,
 * resolves city coordinates (offline seeds + OpenStreetMap Nominatim),
 * assigns suitable travel modes (plane/car/etc.), and prepares complete routes.
 */
export async function planLocally(
  userText: string,
  currentStopCount: number
): Promise<{ text: string; action?: AiProposedAction }> {
  const lower = userText.toLowerCase();

  // 1. Detect settings alterations
  let detectedRatio: AspectRatio | undefined = undefined;
  if (lower.includes('9:16') || lower.includes('vertical') || lower.includes('tiktok') || lower.includes('reels') || lower.includes('shorts')) {
    detectedRatio = '9:16';
  } else if (lower.includes('16:9') || lower.includes('horizontal') || lower.includes('youtube')) {
    detectedRatio = '16:9';
  } else if (lower.includes('1:1') || lower.includes('cuadrado')) {
    detectedRatio = '1:1';
  }

  let detectedDuration: number | undefined = undefined;
  const durationMatch = lower.match(/(\d{1,2})\s*(s|seg|segundos|second)/);
  if (durationMatch) {
    const sec = parseInt(durationMatch[1], 10);
    if (sec >= 3 && sec <= 60) detectedDuration = sec;
  }

  let detectedStyle: string | undefined = undefined;
  if (lower.includes('satélite') || lower.includes('satellite')) detectedStyle = 'satellite';
  else if (lower.includes('oscuro') || lower.includes('dark') || lower.includes('noche')) detectedStyle = 'dark';
  else if (lower.includes('calle') || lower.includes('street')) detectedStyle = 'streets';

  let detectedLineColor: string | undefined = undefined;
  let detectedGlowColor: string | undefined = undefined;
  if (lower.includes('dorad') || lower.includes('oro') || lower.includes('gold') || lower.includes('amarill')) {
    detectedLineColor = '#eab308';
    detectedGlowColor = '#fde047';
  } else if (lower.includes('azul') || lower.includes('cyan') || lower.includes('neon')) {
    detectedLineColor = '#06b6d4';
    detectedGlowColor = '#22d3ee';
  } else if (lower.includes('roj') || lower.includes('red')) {
    detectedLineColor = '#ef4444';
    detectedGlowColor = '#f87171';
  }

  // 2. Extract potential city names from the text
  const foundCities: { name: string; lat: number; lng: number; indexInText: number }[] = [];

  for (const seed of OFFLINE_GEO_SEEDS) {
    const cityName = seed.displayName.split(',')[0].trim().toLowerCase();
    const idx = lower.indexOf(cityName);
    if (idx !== -1 && cityName.length >= 3) {
      if (!foundCities.some(c => Math.abs(c.lat - seed.coordinates.lat) < 0.2 && Math.abs(c.lng - seed.coordinates.lng) < 0.2)) {
        foundCities.push({
          name: seed.displayName.split(',')[0].toUpperCase(),
          lat: seed.coordinates.lat,
          lng: seed.coordinates.lng,
          indexInText: idx,
        });
      }
    }
  }

  // Sort by appearance in the user's prompt
  foundCities.sort((a, b) => a.indexInText - b.indexInText);

  // If few or no cities found in offline seeds, try parsing words and querying geocoder
  if (foundCities.length < 2) {
    const segments = userText
      .split(/[,;\-\n\->➔]| a | de | y | luego | pasando por | hasta /i)
      .map(s => s.replace(/[?¿!¡.]/g, '').trim())
      .filter(s => s.length >= 3 && !['vuelo', 'avion', 'coche', 'ruta', 'viaje', 'parada', 'estados', 'unidos', 'españa'].includes(s.toLowerCase()));

    for (const seg of segments) {
      if (foundCities.length >= 6) break;
      if (foundCities.some(c => c.name.toLowerCase() === seg.toLowerCase())) continue;
      try {
        const results = await geocoder.search(seg);
        if (results.length > 0) {
          const best = results[0];
          const name = (best.displayName.split(',')[0] || seg).toUpperCase();
          if (!foundCities.some(c => Math.abs(c.lat - best.coordinates.lat) < 0.1 && Math.abs(c.lng - best.coordinates.lng) < 0.1)) {
            foundCities.push({
              name,
              lat: best.coordinates.lat,
              lng: best.coordinates.lng,
              indexInText: userText.indexOf(seg),
            });
          }
        }
      } catch {}
    }
  }

  foundCities.sort((a, b) => a.indexInText - b.indexInText);

  // 3. Detect transport between stops
  const defaultAirplane = lower.includes('avión') || lower.includes('avion') || lower.includes('vuelo') || lower.includes('volar') || lower.includes('fly');
  const defaultMotorcycle = lower.includes('moto') || lower.includes('motorcycle');
  const defaultVan = lower.includes('camper') || lower.includes('furgoneta') || lower.includes('van');

  // If at least 2 cities found, generate a complete route proposal
  if (foundCities.length >= 2) {
    const stops: AiStopProposal[] = foundCities.map((city, idx) => {
      const isLast = idx === foundCities.length - 1;
      if (isLast) {
        return {
          name: city.name,
          lat: city.lat,
          lng: city.lng,
          behavior: 'highlight',
        };
      }

      // Check distance to next city: if oceanic (> 2500 km) or user explicitly mentioned plane
      const nextCity = foundCities[idx + 1];
      const isTransatlanticOrFar = Math.abs(city.lng - nextCity.lng) > 30 || Math.abs(city.lat - nextCity.lat) > 25;
      const usePlane = defaultAirplane && (idx === 0 || isTransatlanticOrFar);

      return {
        name: city.name,
        lat: city.lat,
        lng: city.lng,
        behavior: idx === 0 || idx === foundCities.length - 1 ? 'highlight' : 'pause',
        transportToNext: usePlane
          ? {
              travelMode: 'airplane',
              vehicleIcon: 'plane',
              routeMode: 'arc',
            }
          : defaultMotorcycle
          ? {
              travelMode: 'motorcycle',
              vehicleIcon: 'motorcycle',
              routeMode: 'realRoad',
            }
          : defaultVan
          ? {
              travelMode: 'bus',
              vehicleIcon: 'bus',
              routeMode: 'realRoad',
            }
          : {
              travelMode: 'car',
              vehicleIcon: 'vintageCar',
              routeMode: 'realRoad',
            },
      };
    });

    const routeTitle = `${foundCities[0].name} a ${foundCities[foundCities.length - 1].name}`;

    const action: AiProposedAction = {
      id: `ai_action_${Date.now()}`,
      type: 'create_route',
      title: `Ruta: ${routeTitle}`,
      description: `Creación de ${stops.length} paradas con cálculo dinámico de trayectorias.`,
      projectName: routeTitle,
      stops,
      settings: {
        aspectRatio: detectedRatio || '16:9',
        duration: detectedDuration || (stops.length > 4 ? 14 : 10),
        styleId: detectedStyle,
        lineColor: detectedLineColor,
        glowColor: detectedGlowColor,
      },
    };

    let reply = `¡He planificado tu ruta de **${routeTitle}** con **${stops.length} paradas**!\n\n`;
    reply += `📍 **Itinerario propuesto:**\n`;
    stops.forEach((s, i) => {
      const mode = s.transportToNext
        ? s.transportToNext.travelMode === 'airplane'
          ? '✈️ Vuelo (Arco)'
          : '🚗 Carretera'
        : '🏁 Fin del viaje';
      reply += `- **${i + 1}. ${s.name}** → ${mode}\n`;
    });

    if (detectedRatio) reply += `\n📐 **Formato:** ${detectedRatio} (optimizado para vídeo)`;
    if (detectedDuration) reply += `\n⏱️ **Duración:** ${detectedDuration}s`;
    reply += `\n\nHaz clic en **"Aplicar al Proyecto"** abajo para cargar esta ruta automáticamente en el mapa.`;

    return { text: reply, action };
  }

  // If only 1 city found or user wants to add a stop to existing route
  if (foundCities.length === 1 && currentStopCount > 0) {
    const city = foundCities[0];
    const action: AiProposedAction = {
      id: `ai_action_${Date.now()}`,
      type: 'add_stops',
      title: `Añadir parada: ${city.name}`,
      description: `Añade ${city.name} al itinerario activo.`,
      stops: [
        {
          name: city.name,
          lat: city.lat,
          lng: city.lng,
          behavior: 'highlight',
          transportToNext: {
            travelMode: 'car',
            vehicleIcon: 'vintageCar',
            routeMode: 'realRoad',
          },
        },
      ],
    };

    return {
      text: `He localizado **${city.name}** (${city.lat.toFixed(2)}, ${city.lng.toFixed(2)}). ¿Quieres añadirlo a tu itinerario actual?`,
      action,
    };
  }

  // If user only wanted to adjust settings (style, format, ratio)
  if (detectedRatio || detectedDuration || detectedStyle || detectedLineColor) {
    const action: AiProposedAction = {
      id: `ai_action_${Date.now()}`,
      type: 'update_settings',
      title: 'Actualizar configuración del proyecto',
      description: 'Aplica los cambios de aspecto, duración o estilo visual solicitados.',
      settings: {
        aspectRatio: detectedRatio,
        duration: detectedDuration,
        styleId: detectedStyle,
        lineColor: detectedLineColor,
        glowColor: detectedGlowColor,
      },
    };

    let reply = `He preparado los siguientes ajustes para tu proyecto:\n`;
    if (detectedRatio) reply += `- Formato de aspecto: **${detectedRatio}**\n`;
    if (detectedDuration) reply += `- Duración: **${detectedDuration} segundos**\n`;
    if (detectedStyle) reply += `- Estilo de mapa: **${detectedStyle}**\n`;
    if (detectedLineColor) reply += `- Color de línea: **${detectedLineColor}**\n`;
    reply += `\nPuedes aplicarlos directamente haciendo clic en el botón inferior.`;

    return { text: reply, action };
  }

  // General conversational guidance
  return {
    text: `¡Hola! Soy tu asistente de viajes para **Route Motion Studio**.\n\nPuedo crear rutas completas, calcular coordenadas, añadir tramos en avión ✈️ o coche 🚗, o ajustar el formato para redes sociales.\n\n**Prueba pidiéndome:**\n- *"Ruta de Madrid a Chicago en avión y luego coche hasta Los Ángeles"*\n- *"Crea un viaje por la costa oeste de EE.UU.: San Francisco, Las Vegas, Los Ángeles"*\n- *"Ruta por el norte de España: Bilbao, Santander, Oviedo, Santiago"*\n- *"Cambia el formato a 9:16 vertical para TikTok con 15 segundos de duración"*\n\n*(💡 Tip: Puedes configurar tu API Key de Google Gemini en el botón de ajustes para respuestas narrativas aún más ricas).*`,
  };
}
