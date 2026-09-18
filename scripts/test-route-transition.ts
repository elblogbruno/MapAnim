import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({ server: { port: 5199 } });
const browser = await chromium.launch({ headless: true });
try {
  await server.listen();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('console', message => console.log(message.text()));
  await page.goto('http://localhost:5199', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => (window as any).__mapInstance?.isStyleLoaded());
  const schedule = await page.evaluate(async () => {
    // @ts-expect-error Browser path is resolved by the test's Vite server.
    const { useProjectStore } = await import('/src/store/useProjectStore.ts');
    // @ts-expect-error Browser path is resolved by the test's Vite server.
    const { calculateTimelineSchedule } = await import('/src/core/engine/timingEngine.ts');
    return calculateTimelineSchedule(useProjectStore.getState().project);
  });

  for (const slot of schedule.segments) {
    await page.evaluate(async (time) => {
      // @ts-expect-error Browser path is resolved by the test's Vite server.
      const { useProjectStore } = await import('/src/store/useProjectStore.ts');
      // @ts-expect-error Browser path is resolved by the test's Vite server.
      const { getSceneAtTime } = await import('/src/core/engine/animationEngine.ts');
      const project = useProjectStore.getState().project;
      const scene = getSceneAtTime(project, time);
      const map = (window as any).__mapInstance;
      const camera = scene.camera;
      const next = project.route.segments[scene.route.activeSegmentIndex + 1];
      const canvas = map.getCanvas();
      const visible = next?.geometry.filter((coord: [number, number]) => {
        const p = map.project(coord);
        return p.x >= 0 && p.x <= canvas.width && p.y >= 0 && p.y <= canvas.height;
      }).length ?? 0;
      console.log(`transition ${time.toFixed(2)} segment=${scene.route.activeSegmentIndex} zoom=${camera.zoom.toFixed(2)} next visible points=${visible}`);
      if (next && visible === 0) throw new Error(`Next route is outside the viewport at ${time}`);
    }, slot.endTime + 0.05);
    for (const time of [slot.travelEndTime - 0.05, slot.endTime + 0.05]) {
      await page.evaluate((t) => (window as any).__playbackStore.seek(t), time);
      await page.waitForTimeout(80);
      const state = await page.evaluate(() => {
        const map = (window as any).__mapInstance;
        const data = (map?.getSource('studio-animated-route-source') as any)?._data;
        return { features: data?.features?.length ?? 0, rendered: map?.queryRenderedFeatures({ layers: ['studio-route-line'] }).length ?? 0, dataType: data?.type, dataKeys: data ? Object.keys(data) : [], sourceKeys: map?.getSource('studio-animated-route-source') ? Object.keys(map.getSource('studio-animated-route-source')) : [], lineVisible: map?.getLayoutProperty('studio-route-line', 'visibility') };
      });
      if (state.rendered === 0) throw new Error(`Route lost its rendered line at ${time}: ${JSON.stringify(state)}`);
      if (slot.segmentIndex === 0) await page.screenshot({ path: `exports/route-transition-${time.toFixed(2)}.png` });
      if (slot.segmentIndex === 1 && time > slot.endTime) await page.screenshot({ path: `exports/route-transition-second-${time.toFixed(2)}.png` });
    }
  }
  console.log('✓ route stays present across every segment transition');
} finally {
  await browser.close();
  await server.close();
}
