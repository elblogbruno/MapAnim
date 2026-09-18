import React, { useEffect, useState } from 'react';
import { ProjectData } from '../core/types/project';
import { createRoute66Project } from '../core/project/route66Demo';
import { MapCanvas } from '../components/map/MapCanvas';

export const RouteRenderer: React.FC = () => {
  const [project, setProject] = useState<ProjectData>(createRoute66Project());
  const [currentTime, setCurrentTime] = useState<number>(0);
  const transparentBackground = new URLSearchParams(window.location.search).get('transparent') === '1';

  useEffect(() => {
    if (!transparentBackground) return;
    const previous = document.body.style.backgroundColor;
    document.body.style.backgroundColor = 'transparent';
    return () => { document.body.style.backgroundColor = previous; };
  }, [transparentBackground]);

  useEffect(() => {
    // Check if project is supplied in window
    if ((window as any).__RENDER_PROJECT__) {
      setProject((window as any).__RENDER_PROJECT__);
    }

    // Expose control API for Playwright
    (window as any).routeRenderer = {
      ...(window as any).routeRenderer,
      loadProject: (p: ProjectData) => {
        setProject(p);
      },
      seek: async (t: number) => {
        setCurrentTime(t);
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      },
      getCurrentTime: () => currentTime,
    };
  }, [currentTime]);

  return (
    <div
      id="render-canvas-root"
      className={`w-full h-full flex items-center justify-center overflow-hidden ${transparentBackground ? 'bg-transparent' : 'bg-studio-950'}`}
      style={{
        width: `${project.video.width}px`,
        height: `${project.video.height}px`,
      }}
    >
      <MapCanvas
        project={project}
        currentTime={currentTime}
        isInteractive={false}
        renderMode
        transparentBackground={transparentBackground}
      />
    </div>
  );
};
