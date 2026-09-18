import { chromium } from 'playwright';
import { createServer } from 'vite';

async function testGlobeRender() {
  const server = await createServer({
    server: { port: 5206 },
  });
  await server.listen();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2,
  });

  await page.goto('http://localhost:5206', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Switch MapLibre projection to globe and zoom out
  await page.evaluate(() => {
    const map = (window as any).__mapInstance;
    if (map) {
      map.setProjection({ type: 'globe' });
      map.jumpTo({
        center: [-98.5795, 39.8283],
        zoom: 1.8,
        pitch: 35,
        bearing: 0,
      });
    }
  });

  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'exports/globe_view_preview.jpg', type: 'jpeg', quality: 90 });
  console.log('📸 Saved globe_view_preview.jpg');

  await browser.close();
  await server.close();
  console.log('✅ Globe test completed!');
}

testGlobeRender().catch(err => {
  console.error(err);
  process.exit(1);
});
