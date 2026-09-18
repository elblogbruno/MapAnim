import { chromium } from 'playwright';
import { createServer } from 'vite';

async function testDotsMenu() {
  const server = await createServer({
    server: { port: 5196 },
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
  await page.goto('http://localhost:5196', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Click the 3-dots button
  await page.click('button[title="Extra Options"]');
  await page.waitForTimeout(500);

  await page.screenshot({ path: 'exports/mobile_dots_menu_open.jpg', type: 'jpeg', quality: 90 });
  console.log('📸 Saved mobile_dots_menu_open.jpg');

  await browser.close();
  await server.close();
  console.log('✅ Dots menu test completed successfully!');
}

testDotsMenu().catch(err => {
  console.error(err);
  process.exit(1);
});
