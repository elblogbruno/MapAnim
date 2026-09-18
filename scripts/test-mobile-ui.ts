import { chromium } from 'playwright';
import { createServer } from 'vite';

async function captureMobileScreenshots() {
  console.log('📱 Starting local Vite server to test mobile layouts...');
  const server = await createServer({
    server: { port: 5188 },
  });
  await server.listen();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 / mobile phone dimensions
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();
  await page.goto('http://localhost:5188', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // 1. Preview Mode Screenshot
  await page.screenshot({ path: 'exports/mobile_preview.jpg', type: 'jpeg', quality: 90 });
  console.log('📸 Saved mobile_preview.jpg');

  // 2. Switch to Itinerary Tab
  await page.click('nav button:visible:has-text("Itinerary")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'exports/mobile_itinerary.jpg', type: 'jpeg', quality: 90 });
  console.log('📸 Saved mobile_itinerary.jpg');

  // 3. Switch to Inspector Tab
  await page.click('nav button:visible:has-text("Inspector")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'exports/mobile_inspector.jpg', type: 'jpeg', quality: 90 });
  console.log('📸 Saved mobile_inspector.jpg');

  // 4. Click the Titles/FX Tab in Inspector
  await page.click('button:visible:has-text("Titles")');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'exports/mobile_titles_inspector.jpg', type: 'jpeg', quality: 90 });
  console.log('📸 Saved mobile_titles_inspector.jpg');

  await browser.close();
  await server.close();
  console.log('✅ Mobile UI test completed successfully!');
}

captureMobileScreenshots().catch(err => {
  console.error(err);
  process.exit(1);
});
