import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({ server: { port: 5198 } });
const browser = await chromium.launch({ headless: true });

try {
  await server.listen();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:5198', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Map', exact: true }).click();

  for (const name of ['Vintage Americana', 'Documentary Natural', 'Dark Cinema', 'Clean Light Minimal', 'Satellite Aerial', 'Essential Geography']) {
    await page.getByRole('button', { name: new RegExp(name) }).click();
    await page.waitForFunction(() => {
      const map = (window as any).__mapInstance;
      return map?.isStyleLoaded() && map.areTilesLoaded() && map.getStyle().layers.length > 0;
    }, undefined, { timeout: 30_000 });
    console.log(`✓ ${name}`);
  }

  for (const [name, type] of [['3D Globe', 'globe'], ['2D Flat Map', 'mercator']] as const) {
    await page.getByRole('button', { name: new RegExp(name) }).click();
    await page.waitForFunction(expected => (window as any).__mapInstance?.getProjection()?.type === expected, type);
    console.log(`✓ ${name}`);
  }
} finally {
  await browser.close();
  await server.close();
}
