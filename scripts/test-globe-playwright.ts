import { chromium } from 'playwright';
import { createServer } from 'vite';

async function checkGlobeInBrowser() {
  const server = await createServer({
    server: { port: 5205 },
  });
  await server.listen();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:5205', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const globeSupport = await page.evaluate(() => {
    const map = (window as any).__mapInstance;
    return {
      hasSetProjection: typeof map?.setProjection === 'function',
      hasGetProjection: typeof map?.getProjection === 'function',
      currentProjection: map?.getProjection ? map.getProjection() : null,
    };
  });

  console.log('Globe support in MapLibre:', globeSupport);

  await browser.close();
  await server.close();
}

checkGlobeInBrowser().catch(err => {
  console.error(err);
  process.exit(1);
});
