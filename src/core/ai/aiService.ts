import { AiConfig, AiProposedAction, ChatMessage } from './types';
import { planLocally } from './localAiPlanner';
import { ProjectData, RouteStop, RouteSegment } from '../types/project';
import { getStandardDimensionsForAspect } from '../project/video';

const GEMINI_SYSTEM_PROMPT = `
You are the AI Route Director & Cinematographer for "Route Motion Studio" (MapAnim), an elite map route video synthesizer.
Your role is to help the user plan epic travel animations, suggest stops, configure transport modes (planes, cars, motorcycles, camper vans), calculate realistic coordinates, and tailor the video for cinematic delivery (16:9 widescreen, 9:16 vertical reels/TikTok, 1:1 square).

CRITICAL TRANSPORT RULES:
- Transatlantic, intercontinental, or long oceanic legs MUST use travelMode="airplane", routeMode="arc", vehicleIcon="plane".
- Continental road trips, highway driving, or city-to-city driving MUST use travelMode="car", routeMode="realRoad", vehicleIcon="vintageCar" (or "car").
- Coastal or motorcycle tours use travelMode="motorcycle", vehicleIcon="motorcycle".
- Road camping uses travelMode="bus", vehicleIcon="bus".

OUTPUT FORMAT:
Provide an enthusiastic, concise and helpful response in Spanish.
When proposing a route, stops, or setting changes, ALWAYS append an actionable JSON code block at the end with this exact schema:

\`\`\`json
{
  "type": "create_route" | "add_stops" | "update_settings",
  "title": "Title of action",
  "description": "Brief description",
  "projectName": "Project Title",
  "stops": [
    {
      "name": "MADRID",
      "lat": 40.4168,
      "lng": -3.7038,
      "behavior": "highlight" | "pause" | "passThrough",
      "notes": "Departure hub",
      "transportToNext": {
        "travelMode": "airplane" | "car" | "motorcycle" | "bus",
        "vehicleIcon": "plane" | "vintageCar" | "car" | "motorcycle" | "bus",
        "routeMode": "arc" | "realRoad" | "direct"
      }
    }
  ],
  "settings": {
    "aspectRatio": "16:9" | "9:16" | "1:1" | "4:3" | "21:9",
    "duration": 12,
    "styleId": "satellite" | "streets" | "dark" | "outdoors",
    "lineColor": "#e63946",
    "glowColor": "#e63946"
  }
}
\`\`\`
`;

/**
 * Queries local Ollama daemon for currently installed models.
 */
export async function fetchOllamaModels(endpoint = 'http://localhost:11434'): Promise<string[]> {
  try {
    const isLocal = !endpoint || endpoint.includes('localhost') || endpoint.includes('127.0.0.1');
    const url = isLocal ? '/api/ollama/api/tags' : `${endpoint.replace(/\/$/, '')}/api/tags`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models || []).map((m: any) => m.name || m.model);
  } catch {
    return [];
  }
}

export async function processAiMessage(
  userText: string,
  history: ChatMessage[],
  config: AiConfig,
  currentProject: ProjectData
): Promise<{ text: string; action?: AiProposedAction }> {
  // 1. If explicit local mode
  if (config.provider === 'local') {
    return planLocally(userText, currentProject.route.stops.length);
  }

  // 2. Ollama Local LLM
  if (config.provider === 'ollama') {
    try {
      const endpoint = config.ollamaEndpoint || 'http://localhost:11434';
      const isLocal = !endpoint || endpoint.includes('localhost') || endpoint.includes('127.0.0.1');
      const chatUrl = isLocal ? '/api/ollama/api/chat' : `${endpoint.replace(/\/$/, '')}/api/chat`;

      const projectSummary = `
Current project context:
- Name: "${currentProject.metadata.name}"
- Duration: ${currentProject.video.duration}s (${currentProject.video.aspectRatio})
- Current stops (${currentProject.route.stops.length}): ${currentProject.route.stops.map(s => s.displayName).join(' -> ') || 'None'}
`;

      const messages = [
        {
          role: 'system',
          content: `${GEMINI_SYSTEM_PROMPT}\n\n${projectSummary}`,
        },
        ...history.slice(-6).map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
        {
          role: 'user',
          content: userText,
        },
      ];

      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model || 'llama3.2',
          messages,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      const rawText = data.message?.content || '';

      let action: AiProposedAction | undefined = undefined;
      let cleanText = rawText;

      const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed && (parsed.type === 'create_route' || parsed.type === 'add_stops' || parsed.type === 'update_settings')) {
            action = {
              id: `ollama_action_${Date.now()}`,
              type: parsed.type,
              title: parsed.title || 'Propuesta de la IA (Ollama)',
              description: parsed.description || 'Cambios generados automáticamente por Ollama.',
              projectName: parsed.projectName,
              stops: parsed.stops,
              settings: parsed.settings,
            };
          }
          cleanText = rawText.replace(/```json\s*[\s\S]*?\s*```/, '').trim();
        } catch (jsonErr) {
          console.warn('Failed to parse JSON action block from Ollama:', jsonErr);
        }
      }

      return { text: cleanText || rawText, action };
    } catch (err: any) {
      console.warn('Ollama request failed:', err);
      const fallback = await planLocally(userText, currentProject.route.stops.length);
      return {
        text: `⚠️ *(No se pudo conectar con Ollama en ${config.ollamaEndpoint || 'http://localhost:11434'}. Asegúrate de que Ollama esté ejecutándose con 'ollama serve'. Se ha usado el motor local de respaldo)*\n\n${fallback.text}`,
        action: fallback.action,
      };
    }
  }

  // 3. Gemini API (requires key)
  if (config.provider === 'gemini') {
    if (!config.apiKey) {
      return planLocally(userText, currentProject.route.stops.length);
    }
    try {
      const modelName = config.model || 'gemini-2.0-flash';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${config.apiKey}`;

      // Build context of current project
      const projectSummary = `
Current project context:
- Name: "${currentProject.metadata.name}"
- Duration: ${currentProject.video.duration}s (${currentProject.video.aspectRatio})
- Current stops (${currentProject.route.stops.length}): ${currentProject.route.stops.map(s => s.displayName).join(' -> ') || 'None'}
`;

      const contents = [
        {
          role: 'user',
          parts: [{ text: `${GEMINI_SYSTEM_PROMPT}\n\n${projectSummary}` }],
        },
        ...history.slice(-6).map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        })),
        {
          role: 'user',
          parts: [{ text: userText }],
        },
      ];

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn('Gemini API returned error, falling back to local planner:', errText);
        const fallback = await planLocally(userText, currentProject.route.stops.length);
        return {
          text: `⚠️ *(Aviso: La clave de Gemini devolvió un error. Se ha utilizado el motor local)*\n\n${fallback.text}`,
          action: fallback.action,
        };
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Parse JSON code block if present
      let action: AiProposedAction | undefined = undefined;
      let cleanText = rawText;

      const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed && (parsed.type === 'create_route' || parsed.type === 'add_stops' || parsed.type === 'update_settings')) {
            action = {
              id: `gemini_action_${Date.now()}`,
              type: parsed.type,
              title: parsed.title || 'Propuesta de la IA',
              description: parsed.description || 'Cambios generados automáticamente.',
              projectName: parsed.projectName,
              stops: parsed.stops,
              settings: parsed.settings,
            };
          }
          cleanText = rawText.replace(/```json\s*[\s\S]*?\s*```/, '').trim();
        } catch (jsonErr) {
          console.warn('Failed to parse JSON action block:', jsonErr);
        }
      }

      return { text: cleanText || rawText, action };
    } catch (err) {
      console.error('Gemini request failed:', err);
      const fallback = await planLocally(userText, currentProject.route.stops.length);
      return {
        text: `⚠️ *(Error de conexión con Gemini. Utilizando motor local)*\n\n${fallback.text}`,
        action: fallback.action,
      };
    }
  }

  return planLocally(userText, currentProject.route.stops.length);
}

/**
 * Applies an AI-generated action directly to the active project store.
 */
export async function executeAiAction(
  action: AiProposedAction,
  store: {
    project: ProjectData;
    setProject: (p: ProjectData, recordHistory?: boolean) => void;
    recalculateAllRoutes: () => Promise<void>;
    updateVideo: (u: any) => void;
    updateMapSettings: (u: any) => void;
    updateDefaultLineStyle: (u: any) => void;
  }
): Promise<void> {
  const current = store.project;

  if (action.type === 'create_route' && action.stops && action.stops.length > 0) {
    const newStops: RouteStop[] = action.stops.map((s, idx) => ({
      id: `stop_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
      canonicalName: `${s.name} [${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}]`,
      displayName: s.name.toUpperCase(),
      coordinates: { lat: s.lat, lng: s.lng },
      visible: true,
      behavior: s.behavior || (idx === 0 || idx === action.stops!.length - 1 ? 'highlight' : 'pause'),
      pauseDuration: s.behavior === 'highlight' ? 0.35 : s.behavior === 'pause' ? 1.0 : 0,
      cameraPriority: s.behavior === 'highlight' ? 1 : 2,
      labelPriority: s.behavior === 'highlight' ? 1 : 2,
    }));

    // Build segments matching proposed vehicles and routeModes
    const newSegments: RouteSegment[] = [];
    for (let i = 0; i < newStops.length - 1; i++) {
      const start = newStops[i];
      const end = newStops[i + 1];
      const proposal = action.stops[i]?.transportToNext;

      const travelMode = proposal?.travelMode || 'car';
      const routeMode = proposal?.routeMode || (travelMode === 'airplane' ? 'arc' : 'realRoad');
      const vehicleIcon = proposal?.vehicleIcon || (travelMode === 'airplane' ? 'plane' : 'vintageCar');

      newSegments.push({
        id: `seg_${start.id}_${end.id}`,
        startStopId: start.id,
        endStopId: end.id,
        travelMode,
        routeMode,
        geometry: [
          [start.coordinates.lng, start.coordinates.lat],
          [end.coordinates.lng, end.coordinates.lat],
        ],
        distanceMeters: 1000,
        vehicle: {
          enabled: true,
          icon: vehicleIcon,
          color: '#ffffff',
          size: 24,
        },
      });
    }

    const finalDuration = action.settings?.duration || current.video.duration;
    const originName = newStops[0]?.displayName || 'START';
    const destName = newStops[newStops.length - 1]?.displayName || 'DESTINATION';
    const routeTitles = (current.overlays?.titles || []).map(t => {
      if (t.id === 'title_intro' || t.id.includes('intro')) {
        return {
          ...t,
          text: action.projectName || `${originName} → ${destName}`,
          subtitle: `${originName} TO ${destName}`,
        };
      }
      if (t.id === 'title_outro' || t.id.includes('outro')) {
        return {
          ...t,
          text: `${originName} → ${destName}`,
          subtitle: 'ROUTE COMPLETED',
          startTime: Math.max(0, finalDuration - (t.duration || 2.0)),
        };
      }
      return t;
    });

    const updatedProject: ProjectData = {
      ...current,
      metadata: {
        ...current.metadata,
        name: action.projectName || action.title || current.metadata.name,
        updatedAt: new Date().toISOString(),
      },
      route: {
        ...current.route,
        stops: newStops,
        segments: newSegments,
      },
      video: {
        ...current.video,
        aspectRatio: action.settings?.aspectRatio || current.video.aspectRatio,
        duration: finalDuration,
        fps: action.settings?.fps || current.video.fps,
        ...(action.settings?.aspectRatio ? getStandardDimensionsForAspect(action.settings.aspectRatio) : {}),
      },
      overlays: {
        ...current.overlays,
        titles: routeTitles,
      },
    };

    if (action.settings?.lineColor) {
      updatedProject.route.defaultLineStyle.color = action.settings.lineColor;
      updatedProject.route.defaultLineStyle.outlineColor = action.settings.lineColor;
    }
    if (action.settings?.glowColor) {
      updatedProject.route.defaultLineStyle.glowColor = action.settings.glowColor;
    }
    if (action.settings?.styleId) {
      updatedProject.map.stylePreset = action.settings.styleId as any;
    }

    store.setProject(updatedProject, true);
    await store.recalculateAllRoutes();
    return;
  }

  if (action.type === 'add_stops' && action.stops) {
    const existingStops = [...current.route.stops];
    for (const s of action.stops) {
      const newStop: RouteStop = {
        id: `stop_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        canonicalName: `${s.name} [${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}]`,
        displayName: s.name.toUpperCase(),
        coordinates: { lat: s.lat, lng: s.lng },
        visible: true,
        behavior: s.behavior || 'highlight',
        pauseDuration: 0.35,
        cameraPriority: 1,
        labelPriority: 1,
      };
      existingStops.push(newStop);
    }

    // Rebuild segments
    const newSegments: RouteSegment[] = [];
    for (let i = 0; i < existingStops.length - 1; i++) {
      const s1 = existingStops[i];
      const s2 = existingStops[i + 1];
      const existing = current.route.segments.find(s => s.startStopId === s1.id && s.endStopId === s2.id);
      if (existing) {
        newSegments.push(existing);
      } else {
        newSegments.push({
          id: `seg_${s1.id}_${s2.id}`,
          startStopId: s1.id,
          endStopId: s2.id,
          travelMode: 'car',
          routeMode: 'realRoad',
          geometry: [
            [s1.coordinates.lng, s1.coordinates.lat],
            [s2.coordinates.lng, s2.coordinates.lat],
          ],
          distanceMeters: 1000,
          vehicle: {
            enabled: true,
            icon: 'vintageCar',
            color: '#ffffff',
            size: 24,
          },
        });
      }
    }

    store.setProject({
      ...current,
      route: {
        ...current.route,
        stops: existingStops,
        segments: newSegments,
      },
    }, true);
    await store.recalculateAllRoutes();
    return;
  }

  if (action.type === 'update_settings' && action.settings) {
    if (action.settings.aspectRatio || action.settings.duration || action.settings.fps) {
      store.updateVideo({
        aspectRatio: action.settings.aspectRatio || current.video.aspectRatio,
        duration: action.settings.duration || current.video.duration,
        fps: action.settings.fps || current.video.fps,
      });
    }
    if (action.settings.styleId) {
      store.updateMapSettings({ stylePreset: action.settings.styleId as any });
    }
    if (action.settings.lineColor || action.settings.glowColor) {
      store.updateDefaultLineStyle({
        color: action.settings.lineColor || current.route.defaultLineStyle.color,
        outlineColor: action.settings.lineColor || current.route.defaultLineStyle.outlineColor,
        glowColor: action.settings.glowColor || current.route.defaultLineStyle.glowColor,
      });
    }
  }
}
