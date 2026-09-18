import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({ server: { port: 5196 } });
const browser = await chromium.launch({ headless: true });

try {
  await server.listen();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:5196', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const projectState = () => page.evaluate(async () => {
    // @ts-expect-error Browser path is resolved by the test's Vite server.
    return (await import('/src/store/useProjectStore.ts')).useProjectStore.getState().project;
  });

  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  const markerType = page.locator('select:has(option[value="invisible"])');
  for (const type of ['circle', 'ring', 'pin']) {
    await markerType.selectOption(type);
    if (!await page.locator('[data-stop-marker="stop_01_chicago"]').count()) throw new Error(`${type} marker is not rendered`);
  }
  await markerType.selectOption('invisible');
  if (await page.locator('[data-stop-marker="stop_01_chicago"]').count()) throw new Error('Invisible marker is still rendered');
  await markerType.selectOption('circle');

  await page.getByRole('button', { name: 'Route', exact: true }).click();
  const easing = page.locator('select:has(option[value="easeInOut"])');
  for (const value of ['cinematic', 'easeInOut', 'linear', 'easeIn', 'easeOut']) await easing.selectOption(value);
  await easing.selectOption('linear');
  const labelMode = page.locator('select:has(option[value="visited"])');
  for (const value of ['cinematic', 'visited', 'current', 'all']) await labelMode.selectOption(value);
  await labelMode.selectOption('visited');
  let project = await projectState();
  if (project.route.routeEasing !== 'linear' || project.route.labelDisplayMode !== 'visited') throw new Error('Route options were not saved');

  await page.getByRole('button', { name: 'Camera', exact: true }).click();
  const cameraMode = page.locator('select:has(option[value="follow"])');
  for (const value of ['cinematicFollow', 'follow', 'segmentFit', 'staticOverview']) await cameraMode.selectOption(value);
  await cameraMode.selectOption('follow');
  const directFollowDistance = await page.evaluate(async () => {
    // @ts-expect-error Browser path is resolved by the test's Vite server.
    const { useProjectStore } = await import('/src/store/useProjectStore.ts');
    // @ts-expect-error Browser path is resolved by the test's Vite server.
    const { getSceneAtTime } = await import('/src/core/engine/animationEngine.ts');
    // @ts-expect-error Browser path is resolved by the test's Vite server.
    const { calculateTimelineSchedule } = await import('/src/core/engine/timingEngine.ts');
    // @ts-expect-error Browser path is resolved by the test's Vite server.
    const { geodesicDistance } = await import('/src/core/math/geo.ts');
    const project = useProjectStore.getState().project;
    const slot = calculateTimelineSchedule(project).segments[0];
    const scene = getSceneAtTime(project, (slot.travelStartTime + slot.travelEndTime) / 2);
    return geodesicDistance(scene.camera.center, scene.route.headPosition!);
  });
  if (directFollowDistance > 0.01) throw new Error('Direct Follow still applies look-ahead');

  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await page.getByRole('button', { name: /3D Globe/ }).click();
  await page.getByRole('button', { name: /2D Flat Map/ }).click();
  for (const name of ['Vintage Americana', 'Documentary Natural', 'Dark Cinema', 'Clean Light Minimal', 'Satellite Aerial', 'Essential Geography']) {
    await page.getByRole('button', { name: new RegExp(name) }).click();
  }
  await page.getByRole('button', { name: /Dark Cinema/ }).click();
  for (const label of ['State / Province Borders', 'Country Borders', 'Terrain Relief Shading', 'Cinematic Clean Mode']) {
    const checkbox = page.locator('label').filter({ hasText: label }).locator('input');
    const initial = await checkbox.isChecked();
    await checkbox.setChecked(!initial);
    await checkbox.setChecked(initial);
  }
  const countryToggle = page.locator('label').filter({ hasText: 'Country Borders' }).locator('input');
  await countryToggle.uncheck();
  project = await projectState();
  if (project.map.stylePreset !== 'darkCinema' || project.route.defaultLineStyle.color !== '#EF4444' || project.route.segments[0].color !== '#EF4444' || project.route.stops[0].labelStyle?.backgroundColor !== '#1E293B' || project.map.features.showCountryBorders) throw new Error('Map style options were not applied');

  await page.getByRole('button', { name: /Titles\/FX/ }).click();
  const introToggle = page.locator('input[type="checkbox"]').first();
  await introToggle.uncheck();
  await introToggle.check();
  await page.locator('input[placeholder="e.g. ROUTE 66"]').fill('OPTION TEST');
  const font = page.locator('select:has(option[value="Cinzel, serif"])');
  for (const value of ['Cinzel, serif', 'Montserrat, sans-serif', 'serif', 'sans-serif']) await font.selectOption(value);
  const titlePosition = page.locator('select:has(option[value="top"]):has(option[value="center"]):has(option[value="bottom"])').first();
  for (const value of ['top', 'center', 'bottom']) await titlePosition.selectOption(value);
  const titleAnimation = page.locator('select:has(option[value="slideUp"])');
  for (const value of ['fade', 'slideUp', 'scale', 'none']) await titleAnimation.selectOption(value);
  const hudUnit = page.locator('select:has(option[value="miles"])');
  for (const value of ['km', 'miles']) await hudUnit.selectOption(value);
  const hudPosition = page.locator('select:has(option[value="topCenter"])');
  for (const value of ['bottomLeft', 'bottomRight', 'topLeft', 'topRight', 'topCenter', 'bottomCenter']) await hudPosition.selectOption(value);
  const hudTheme = page.locator('select:has(option[value="techSport"])');
  for (const value of ['glassDark', 'vintageBadge', 'minimalClean', 'techSport']) await hudTheme.selectOption(value);
  const decimals = page.locator('select:has(option[value="0"])');
  for (const value of ['1', '0']) await decimals.selectOption(value);
  const colorGrade = page.locator('select:has(option[value="cinematicCold"])');
  for (const value of ['vintageWarm', 'cinematicCold', 'none']) await colorGrade.selectOption(value);
  await page.locator('select:has(option[value="techSport"])').selectOption('techSport');
  project = await projectState();
  if (!project.overlays.titles.some((title: any) => title.text === 'OPTION TEST') || project.overlays.distanceHud?.theme !== 'techSport') throw new Error('Title or HUD options were not applied');

  await page.locator('select:visible:has(option[value="8"])').selectOption('8');
  const aspects = [
    ['16:9', 1920, 1080],
    ['9:16', 1080, 1920],
    ['1:1', 1080, 1080],
    ['4:3', 1440, 1080],
    ['21:9', 2560, 1080],
  ] as const;
  for (const [aspect, width, height] of aspects) {
    await page.getByRole('button', { name: aspect, exact: true }).click();
    const video = (await projectState()).video;
    if (video.width !== width || video.height !== height) throw new Error(`${aspect} produced ${video.width}x${video.height}`);
  }
  await page.getByRole('button', { name: '9:16', exact: true }).click();
  project = await projectState();
  if (project.video.duration !== 8 || project.video.width !== 1080 || project.video.height !== 1920) throw new Error('Video duration or aspect ratio was not applied');

  await page.getByRole('button', { name: /Add Stop/ }).click();
  await page.getByRole('button', { name: 'Coordinates Entry' }).click();
  const coordinateInputs = page.locator('input[type="number"]');
  await coordinateInputs.nth(0).fill('40.4168');
  await coordinateInputs.nth(1).fill('-3.7038');
  await page.getByRole('button', { name: /Pause Hold camera/ }).click();
  await page.getByRole('button', { name: /Add to Itinerary/ }).click();
  project = await projectState();
  if (project.route.stops.at(-1)?.pauseDuration !== 1) throw new Error('Manual pause stop lost its duration');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Save JSON/ }).click();
  if (!(await downloadPromise).suggestedFilename().endsWith('.routevideo.json')) throw new Error('Project JSON download failed');

  await page.getByRole('button', { name: /Export Studio/ }).click();
  for (const name of ['DaVinci H.264', 'Master ProRes', 'Alpha Overlay']) await page.getByRole('button', { name: new RegExp(name) }).click();
  const resolution = page.locator('select:has(option[value="4k"])');
  for (const value of ['1080p', '4k', '720p']) await resolution.selectOption(value);
  const exportFps = page.locator('select:has(option[value="60"])');
  for (const value of ['60', '30', '24', '25']) await exportFps.selectOption(value);
  await page.getByRole('button', { name: 'Close', exact: true }).click();

  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.waitForTimeout(250);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const time = await page.evaluate(() => (window as any).__playbackStore.currentTime);
  if (time <= 0) throw new Error('Playback did not advance');

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await mobile.goto('http://localhost:5196', { waitUntil: 'domcontentloaded' });
  for (const name of ['Vintage Cruiser', 'Modern Sports Car', 'Jet Airplane', 'Road Camper Van', 'Motorcycle']) {
    await mobile.getByRole('button', { name: /Vehicle/ }).click();
    await mobile.getByRole('button', { name: new RegExp(name) }).click();
  }
  await mobile.getByTitle('Extra Options').click();
  await mobile.getByRole('button', { name: /Toggle Diagnostics/ }).click();
  await mobile.getByText('Render Engine Diagnostics').waitFor();
  if (await mobile.locator('.maplibregl-map').count() !== 1) throw new Error('Inactive responsive map is still mounted');
  await mobile.close();

  console.log('✓ editor controls update their state and rendered output');
} finally {
  await browser.close();
  await server.close();
}
