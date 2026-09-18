import { ProjectData } from '../types/project';
import { createRoute66Project } from './route66Demo';

export function migrateProject(data: unknown): ProjectData {
  if (!data || typeof data !== 'object') {
    return createRoute66Project();
  }

  const raw = data as Partial<ProjectData>;
  const defaults = createRoute66Project();

  return {
    ...defaults,
    ...raw,
    metadata: { ...defaults.metadata, ...raw.metadata },
    video: { ...defaults.video, ...raw.video },
    map: {
      ...defaults.map,
      ...raw.map,
      features: { ...defaults.map.features, ...raw.map?.features },
    },
    route: {
      ...defaults.route,
      ...raw.route,
      stops: Array.isArray(raw.route?.stops) ? raw.route.stops : defaults.route.stops,
      segments: Array.isArray(raw.route?.segments) ? raw.route.segments : defaults.route.segments,
      defaultLineStyle: { ...defaults.route.defaultLineStyle, ...raw.route?.defaultLineStyle },
      defaultMarkerStyle: { ...defaults.route.defaultMarkerStyle, ...raw.route?.defaultMarkerStyle },
      defaultLabelStyle: { ...defaults.route.defaultLabelStyle, ...raw.route?.defaultLabelStyle },
    },
    camera: { ...defaults.camera, ...raw.camera },
    effects: { ...defaults.effects, ...raw.effects },
    overlays: {
      ...defaults.overlays,
      ...raw.overlays,
      titles: (raw.overlays?.titles || defaults.overlays.titles).map(t => {
        if (t.id === 'title_outro' || t.id.toLowerCase().includes('outro') || t.id.toLowerCase().includes('closing')) {
          const totalDur = raw.video?.duration ?? defaults.video.duration;
          return {
            ...t,
            startTime: Math.max(0, totalDur - (t.duration || 2.0)),
          };
        }
        return t;
      }),
    },
  };
}
