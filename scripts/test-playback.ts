import { chromium } from 'playwright';
import { createServer } from 'vite';

async function testPlayback() {
  const server = await createServer({
    server: { port: 5194 },
  });
  await server.listen();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();
  await page.goto('http://localhost:5194', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // 1. Select Airplane
  await page.click('button:has-text("Vehicle")');
  await page.waitForTimeout(300);
  await page.click('button:has-text("Jet Airplane")');
  await page.waitForTimeout(500);

  // 2. Click Play button
  await page.click('button[title="Play"]');
  await page.waitForTimeout(3000);

  // 3. Pause
  await page.click('button[title="Pause"]');
  await page.waitForTimeout(500);

  await page.screenshot({ path: 'exports/mobile_airplane_moving.jpg', type: 'jpeg', quality: 90 });
  console.log('📸 Saved mobile_airplane_moving.jpg');

  await browser.close();
  await server.close();
  console.log('✅ Playback test completed successfully!');
}

testPlayback().catch(err => {
  console.error(err);
  process.exit(1);
});
