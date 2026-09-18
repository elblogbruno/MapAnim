import { chromium } from 'playwright';
import { createServer } from 'vite';

async function testTitlesInspector() {
  const server = await createServer({
    server: { port: 5197 },
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
  await page.goto('http://localhost:5197', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // 1. Go to Inspector tab via bottom nav
  await page.click('nav button:has-text("Inspector")');
  await page.waitForTimeout(500);

  // 2. Click "Titles/FX" tab
  await page.click('button:has-text("Titles/FX")');
  await page.waitForTimeout(500);

  await page.screenshot({ path: 'exports/mobile_titles_inspector.jpg', type: 'jpeg', quality: 90 });
  console.log('📸 Saved mobile_titles_inspector.jpg');

  await browser.close();
  await server.close();
  console.log('✅ Titles inspector test completed successfully!');
}

testTitlesInspector().catch(err => {
  console.error(err);
  process.exit(1);
});
