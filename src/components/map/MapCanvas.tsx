import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import { ProjectData } from '../../core/types/project';
import { SceneState } from '../../core/types/animation';
import { getSceneAtTime } from '../../core/engine/animationEngine';
import { MarkerOverlay } from './MarkerOverlay';
import { LabelOverlay } from './LabelOverlay';
import { TransportOverlay } from './TransportOverlay';
import { EffectsOverlay } from './EffectsOverlay';
import { TitleOverlay } from './TitleOverlay';
import { DistanceHudOverlay } from './DistanceHudOverlay';
import { getMapLayerVisibility, getMapStyleById } from '../../core/providers/mapStyles/styleRegistry';
import { calculateBoundingBox, expandBoundingBox, calculateFitZoom } from '../../core/math/geo';
import { useEditorStore } from '../../store/useEditorStore';
import { usePlaybackStore } from '../../store/usePlaybackStore';

interface Props {
  project: ProjectData;
  currentTime: number;
  onSelectStop?: (stopId: string) => void;
  selectedStopId?: string | null;
  onUpdateLabelOffset?: (stopId: string, offsetX: number, offsetY: number) => void;
  isInteractive?: boolean;
  showSafeArea?: boolean;
  renderMode?: boolean;
  transparentBackground?: boolean;
}

const ROUTE_SOURCE_ID = 'studio-animated-route-source';
const ROUTE_GLOW_LAYER = 'studio-route-glow';
const ROUTE_OUTLINE_LAYER = 'studio-route-outline';
const ROUTE_LINE_LAYER = 'studio-route-line';

function applyMapFeatureVisibility(map: maplibregl.Map, features: ProjectData['map']['features']) {
  for (const layer of map.getStyle().layers || []) {
    if (layer.id.startsWith('studio-')) continue;

    const visible = getMapLayerVisibility(layer as any, features);

    if (visible !== undefined) {
      const next = visible ? 'visible' : 'none';
      if ((map.getLayoutProperty(layer.id, 'visibility') || 'visible') !== next) {
        map.setLayoutProperty(layer.id, 'visibility', next);
      }
    }
  }
}

export const MapCanvas: React.FC<Props> = ({
  project,
  currentTime,
  onSelectStop,
  selectedStopId,
  onUpdateLabelOffset,
  isInteractive,
  showSafeArea = false,
  renderMode = false,
  transparentBackground = false,
}) => {
  const interactive = isInteractive !== undefined ? isInteractive : !renderMode;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const featuresRef = useRef(project.map.features);
  featuresRef.current = project.map.features;
  const focusStopCounter = useEditorStore(state => state.focusStopCounter);
  const resetCameraCounter = useEditorStore(state => state.resetCameraCounter);
  const fitRouteCounter = useEditorStore(state => state.fitRouteCounter);
  const isPlaying = usePlaybackStore(state => state.isPlaying);
  const isFlyingToStopRef = useRef(false);
  const [styleLoaded, setStyleLoaded] = useState(false);
  const [wrapperSize, setWrapperSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Track outer canvas wrapper size to scale aspect ratio boxes pixel-perfectly without stretching
  useEffect(() => {
    if (renderMode || !wrapperRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setWrapperSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, [renderMode]);

  // Compute current scene state deterministically from the one animation engine
  const scene: SceneState = getSceneAtTime(project, currentTime);

  const setupRouteLayers = useCallback((map: maplibregl.Map) => {
    if (!map.isStyleLoaded()) return;

    if (!map.getSource(ROUTE_SOURCE_ID)) {
      map.addSource(ROUTE_SOURCE_ID, {
        type: 'geojson',
        lineMetrics: true,
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      // Add Route Glow Layer
      if (!map.getLayer(ROUTE_GLOW_LAYER)) {
        map.addLayer({
          id: ROUTE_GLOW_LAYER,
          type: 'line',
          source: ROUTE_SOURCE_ID,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': ['get', 'glowColor'],
            'line-width': ['get', 'glowWidth'],
            'line-opacity': ['get', 'glowOpacity'],
            'line-blur': 6,
          },
        });
      }

      // Add Route Outline Layer
      if (!map.getLayer(ROUTE_OUTLINE_LAYER)) {
        map.addLayer({
          id: ROUTE_OUTLINE_LAYER,
          type: 'line',
          source: ROUTE_SOURCE_ID,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': ['get', 'outlineColor'],
            'line-width': ['get', 'outlineWidth'],
            'line-opacity': ['get', 'opacity'],
          },
        });
      }

      // Add Main Route Line Layer
      if (!map.getLayer(ROUTE_LINE_LAYER)) {
        map.addLayer({
          id: ROUTE_LINE_LAYER,
          type: 'line',
          source: ROUTE_SOURCE_ID,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': ['get', 'color'],
            'line-width': ['get', 'width'],
            'line-opacity': ['get', 'opacity'],
          },
        });
      }
    }
  }, []);

  // Initialize MapLibre GL Map
  useEffect(() => {
    if (!containerRef.current) return;

    const stylePreset = getMapStyleById(project.map.stylePreset);
    const styleObj = transparentBackground
      ? { version: 8, sources: {}, layers: [] }
      : stylePreset.styleUrl;

    const isGlobe = project.map.projection === 'globe' || project.camera.projection === 'globe';

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: typeof styleObj === 'string' ? styleObj : (styleObj as any),
      center: scene.camera.center,
      zoom: scene.camera.zoom,
      pitch: scene.camera.pitch,
      bearing: scene.camera.bearing,
      projection: { type: isGlobe ? 'globe' : 'mercator' },
      interactive,
      attributionControl: false,
      canvasContextAttributes: { alpha: true },
    } as any);

    const onStyleReady = () => {
      (window as any).__mapInstance = map;
      if (typeof (map as any).setProjection === 'function') {
        (map as any).setProjection({ type: isGlobe ? 'globe' : 'mercator' });
      }
      setupRouteLayers(map);
      applyMapFeatureVisibility(map, featuresRef.current);
      setStyleLoaded(true);
    };

    map.on('load', onStyleReady);
    map.on('styledata', () => {
      if (map.isStyleLoaded()) {
        setupRouteLayers(map);
        applyMapFeatureVisibility(map, featuresRef.current);
        setStyleLoaded(true);
      }
    });

    // Expose window.routeRenderer for headless automation
    (window as any).routeRenderer = {
      ...((window as any).routeRenderer || {}),
      isReady: () => styleLoaded && map.areTilesLoaded(),
      waitUntilReady: async (timeoutMs: number = 3000): Promise<boolean> => {
        if (!map) return true;
        if (map.areTilesLoaded()) return true;
        return new Promise(resolve => {
          let timeoutHandle: number;
          const onIdle = () => {
            clearTimeout(timeoutHandle);
            map.off('idle', onIdle);
            resolve(true);
          };
          timeoutHandle = window.setTimeout(() => {
            map.off('idle', onIdle);
            resolve(true); // Don't hang indefinitely
          }, timeoutMs);
          map.once('idle', onIdle);
        });
      },
      getDebugState: () => scene,
    };

    mapRef.current = map;

    // Observe container size changes (mobile rotation, layout switches)
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      setStyleLoaded(false);
    };
  }, [project.map.stylePreset, setupRouteLayers, transparentBackground]);

  useEffect(() => {
    const map = mapRef.current;
    if (map?.isStyleLoaded()) applyMapFeatureVisibility(map, project.map.features);
  }, [project.map.features, styleLoaded]);

  // Dynamically update projection (3D Globe vs 2D Mercator)
  const isGlobe = project.map.projection === 'globe' || project.camera.projection === 'globe';
  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    if (typeof (map as any).setProjection === 'function') {
      try {
        (map as any).setProjection({ type: isGlobe ? 'globe' : 'mercator' });
      } catch (err) {
        console.warn('Projection update warning:', err);
      }
    }
  }, [isGlobe]);

  // Smoothly fly camera to stop when focused via UI (itinerary, inspector, map marker, timeline)
  useEffect(() => {
    if (renderMode || !selectedStopId || focusStopCounter === 0) return;

    const stop = project.route.stops.find(s => s.id === selectedStopId);
    const map = mapRef.current;
    if (!stop || !map || !map.isStyleLoaded()) return;

    isFlyingToStopRef.current = true;
    const isGlobe = project.map.projection === 'globe' || project.camera.projection === 'globe';
    const targetZoom = isGlobe
      ? Math.max(project.camera.defaultZoom, 5.2)
      : Math.max(project.camera.defaultZoom, 6.2);

    map.flyTo({
      center: [stop.coordinates.lng, stop.coordinates.lat],
      zoom: targetZoom,
      pitch: project.camera.defaultPitch,
      bearing: project.camera.defaultBearing,
      duration: 1000,
      essential: true,
    });

    const timeout = window.setTimeout(() => {
      isFlyingToStopRef.current = false;
    }, 1050);

    return () => {
      clearTimeout(timeout);
      isFlyingToStopRef.current = false;
    };
  }, [focusStopCounter, selectedStopId, project.route.stops, project.camera, project.map.projection, renderMode]);

  // Synchronize Camera deterministically
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // If an animation is flying to a newly selected stop, don't interrupt unless user started playback
    if (isFlyingToStopRef.current && !isPlaying) return;

    map.jumpTo({
      center: scene.camera.center,
      zoom: scene.camera.zoom,
      pitch: scene.camera.pitch,
      bearing: scene.camera.bearing,
    });
  }, [scene.camera, isPlaying]);

  // Reset Camera Position to deterministic scene camera with smooth flyTo
  useEffect(() => {
    if (renderMode || resetCameraCounter === 0) return;
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    isFlyingToStopRef.current = false;

    map.flyTo({
      center: scene.camera.center,
      zoom: scene.camera.zoom,
      pitch: scene.camera.pitch,
      bearing: scene.camera.bearing,
      duration: 800,
      essential: true,
    });
  }, [resetCameraCounter]);

  // Fit entire route overview in viewport
  useEffect(() => {
    if (renderMode || fitRouteCounter === 0) return;
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || project.route.stops.length === 0) return;

    isFlyingToStopRef.current = false;
    const allPoints = project.route.stops.map(s => [s.coordinates.lng, s.coordinates.lat] as [number, number]);
    const bbox = calculateBoundingBox(allPoints);
    const padded = expandBoundingBox(bbox, 0.25);
    const canvas = map.getCanvas();
    const fit = calculateFitZoom(padded, canvas?.width || 1920, canvas?.height || 1080);

    map.flyTo({
      center: fit.center,
      zoom: fit.zoom,
      pitch: 0,
      bearing: 0,
      duration: 900,
      essential: true,
    });
  }, [fitRouteCounter, project.route.stops]);

  // Enable interactive exploration while paused in editor mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (renderMode) {
      map.boxZoom?.disable();
      map.scrollZoom?.disable();
      map.dragPan?.disable();
      map.dragRotate?.disable();
      map.doubleClickZoom?.disable();
      map.touchZoomRotate?.disable();
      return;
    }
    if (isPlaying) {
      map.dragPan?.disable();
      map.scrollZoom?.disable();
      map.dragRotate?.disable();
    } else {
      map.dragPan?.enable();
      map.scrollZoom?.enable();
      map.dragRotate?.enable();
    }
  }, [isPlaying, renderMode]);

  // Synchronize Route Polylines
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    setupRouteLayers(map);
    const source = map.getSource(ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource;
    if (!source) return;

    const features = scene.route.drawnPolylines.map((poly, idx) => ({
      type: 'Feature' as const,
      id: idx,
      properties: {
        color: poly.color,
        width: poly.width,
        opacity: poly.opacity,
        outlineColor: poly.outlineColor,
        outlineWidth: poly.outlineWidth > 0 ? poly.width + poly.outlineWidth * 2 : 0,
        glowColor: poly.glow ? poly.glowColor : 'transparent',
        glowWidth: poly.glow ? poly.width + 12 : 0,
        glowOpacity: poly.glow ? 0.6 : 0,
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: poly.coordinates,
      },
    }));

    try {
      source.setData({
        type: 'FeatureCollection',
        features,
      });
    } catch {
      // Ignore transient style-reload frames
    }
  }, [scene.route.drawnPolylines, styleLoaded, setupRouteLayers]);

  // Screen coordinate projection helper
  const projectCoord = useCallback(
    (lng: number, lat: number) => {
      const map = mapRef.current;
      if (!map) return null;
      try {
        const p = map.project([lng, lat]);
        return { x: p.x, y: p.y };
      } catch {
        return null;
      }
    },
    [scene.camera]
  );

  // Target aspect ratio decimal
  const targetAspect = useMemo(() => {
    switch (project.video.aspectRatio) {
      case '9:16':
        return 9 / 16;
      case '1:1':
        return 1;
      case '4:3':
        return 4 / 3;
      case '21:9':
        return 21 / 9;
      case '16:9':
      default:
        return 16 / 9;
    }
  }, [project.video.aspectRatio]);

  // Compute exact pixel dimensions so 9:16, 1:1, and 16:9 always fit without stretching or clipping
  const frameStyle = useMemo<React.CSSProperties>(() => {
    if (renderMode) {
      return { width: '100%', height: '100%' };
    }

    if (wrapperSize.width > 0 && wrapperSize.height > 0) {
      const containerAspect = wrapperSize.width / wrapperSize.height;
      if (containerAspect > targetAspect) {
        // Container is wider than the target aspect ratio (e.g. 9:16 vertical on a landscape desktop monitor)
        const h = Math.floor(wrapperSize.height);
        const w = Math.floor(h * targetAspect);
        return { width: `${w}px`, height: `${h}px` };
      } else {
        // Container is taller than the target aspect ratio
        const w = Math.floor(wrapperSize.width);
        const h = Math.floor(w / targetAspect);
        return { width: `${w}px`, height: `${h}px` };
      }
    }

    return project.video.aspectRatio === '9:16'
      ? { width: 'auto', height: '100%', aspectRatio: '9/16' }
      : { width: '100%', height: 'auto', aspectRatio: `${targetAspect}` };
  }, [renderMode, project.video.aspectRatio, targetAspect, wrapperSize]);

  return (
    <div
      ref={wrapperRef}
      className={renderMode
        ? `relative w-full h-full select-none overflow-hidden ${transparentBackground ? 'bg-transparent' : 'bg-studio-950'}`
        : 'relative w-full h-full flex items-center justify-center bg-studio-950 p-1 sm:p-2 md:p-4 select-none overflow-hidden'}
    >
      {/* Frame Aspect Container */}
      <div
        className={renderMode
          ? `relative w-full h-full overflow-hidden isolate ${transparentBackground ? 'bg-transparent' : 'bg-studio-900'}`
          : 'relative shadow-2xl overflow-hidden rounded-md border border-studio-800 bg-studio-900 flex-shrink-0 transition-all duration-150 isolate'}
        style={{ ...frameStyle, isolation: 'isolate' }}
      >
        {/* MapLibre GL Canvas Container */}
        <div ref={containerRef} className="absolute inset-0 w-full h-full" />

        {/* Crisp Markers */}
        <MarkerOverlay
          stops={scene.stops}
          projectCoord={projectCoord}
          onSelectStop={onSelectStop}
          selectedStopId={selectedStopId}
        />

        {/* Crisp Vector Typography Labels */}
        <LabelOverlay
          labels={scene.labels}
          projectCoord={projectCoord}
          onUpdateLabelOffset={onUpdateLabelOffset}
          onSelectStop={onSelectStop}
          selectedStopId={selectedStopId}
        />

        {/* Moving Transport Vehicle */}
        <TransportOverlay
          transport={scene.transport}
          projectCoord={projectCoord}
        />

        {/* Cinematic Film & Paper Texture Overlay */}
        <EffectsOverlay effects={project.effects} />

        {/* Title and Mileage Cards */}
        <TitleOverlay titles={scene.titles} photo={scene.activePhoto} />

        {/* Real-time Distance / Odometer HUD */}
        <DistanceHudOverlay
          distanceMeters={scene.route.totalDistanceTravelledMeters}
          totalDistanceMeters={scene.route.totalRouteDistanceMeters}
          progress={scene.route.totalRouteDistanceMeters > 0
            ? scene.route.totalDistanceTravelledMeters / scene.route.totalRouteDistanceMeters
            : 0}
          config={project.overlays.distanceHud}
          legacyUnit={project.overlays.distanceUnit}
          legacyShow={project.overlays.showDistanceIndicator}
        />

        {/* Title & Social Safe Area Guides */}
        {showSafeArea && (
          project.video.aspectRatio === '9:16' ? (
            <div className="absolute inset-0 pointer-events-none z-30">
              <div className="absolute top-[8%] bottom-[18%] left-[5%] right-[15%] border border-cyan-400/60 border-dashed rounded-xl flex flex-col justify-between p-2.5 bg-cyan-950/10">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-mono font-bold text-cyan-300 bg-cyan-950/90 px-1.5 py-0.5 rounded border border-cyan-800/80 shadow">
                    📱 TikTok / Reels Safe Area
                  </span>
                  <span className="text-[8px] font-mono text-cyan-400/80 bg-black/50 px-1 rounded">Top 8%</span>
                </div>
                <div className="flex justify-between items-end text-[8px] font-mono text-cyan-400/80">
                  <span className="bg-black/50 px-1 rounded">Left 5%</span>
                  <span className="bg-black/50 px-1 rounded text-center">Subtítulos & Audio (18%)</span>
                  <span className="bg-black/50 px-1 rounded">Iconos UI (15%)</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="absolute inset-[10%] border border-cyan-400/40 border-dashed pointer-events-none z-30 flex items-start justify-end p-2">
              <span className="text-[10px] font-mono text-cyan-300/80 bg-cyan-950/80 px-1 rounded">
                Title Safe 90%
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
};
