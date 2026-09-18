import { chromium } from 'playwright';
import { createServer } from 'vite';

async function testBranding() {
  const server = await createServer({
    server: { port: 5200 },
  });
  await server.listen();

  const browser = await chromium.launch({ headless: true });

  // 1. Desktop 16:9 Studio Layout
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto('http://localhost:5200', { waitUntil: 'domcontentloaded' });
  await desktopPage.waitForTimeout(1500);

  await desktopPage.screenshot({ path: 'exports/desktop_studio_branding.jpg', type: 'jpeg', quality: 90 });
  console.log('📸 Saved desktop_studio_branding.jpg');

  // Open Export Dialog on Desktop
  await desktopPage.click('button:has-text("Export Studio")');
  await desktopPage.waitForTimeout(500);
  await desktopPage.screenshot({ path: 'exports/desktop_export_studio_dialog.jpg', type: 'jpeg', quality: 90 });
  console.log('📸 Saved desktop_export_studio_dialog.jpg');

  // 2. Mobile Layout
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:5200', { waitUntil: 'domcontentloaded' });
  await mobilePage.waitForTimeout(1500);

  await mobilePage.screenshot({ path: 'exports/mobile_studio_branding.jpg', type: 'jpeg', quality: 90 });
  console.log('📸 Saved mobile_studio_branding.jpg');

  await browser.close();
  await server.close();
  console.log('✅ Branding tests completed successfully!');
}

testBranding().catch(err => {
  console.error(err);
  process.exit(1);
});
