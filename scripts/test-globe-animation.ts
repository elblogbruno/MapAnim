import { chromium } from 'playwright';
import { createServer } from 'vite';

async function testGlobeAnimation() {
  const server = await createServer({
    server: { port: 5211 },
  });
  await server.listen();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();
  await page.goto('http://localhost:5211', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // 1. Go to Camera tab and activate 3D World Globe
  await page.click('button:visible:has-text("Camera")');
  await page.waitForTimeout(300);
  await page.click('button:visible:has-text("3D World Globe")');
  await page.waitForTimeout(1000);

  // Capture Globe at t=0 (Intro Space Fly-in)
  await page.screenshot({ path: 'exports/globe_animation_intro_space.jpg', type: 'jpeg', quality: 90 });
  console.log('📸 Saved globe_animation_intro_space.jpg');

  // 2. Seek to midpoint t=6.0s
  await page.evaluate(() => {
    const store = (window as any).__playbackStore;
    if (store && typeof store.seek === 'function') {
      store.seek(6.0);
    }
  });
  await page.waitForTimeout(800);

  // Capture Globe at midpoint tracking route
  await page.screenshot({ path: 'exports/globe_animation_midpoint.jpg', type: 'jpeg', quality: 90 });
  console.log('📸 Saved globe_animation_midpoint.jpg');

  // 3. Jump to outro space reveal t=11.6s
  await page.evaluate(() => {
    const store = (window as any).__playbackStore;
    if (store && typeof store.seek === 'function') {
      store.seek(11.6);
    }
  });
  await page.waitForTimeout(800);

  await page.screenshot({ path: 'exports/globe_animation_outro_space.jpg', type: 'jpeg', quality: 90 });
  console.log('📸 Saved globe_animation_outro_space.jpg');

  await browser.close();
  await server.close();
  console.log('✅ 3D World Globe Animation test completed successfully!');
}

testGlobeAnimation().catch(err => {
  console.error(err);
  process.exit(1);
});
