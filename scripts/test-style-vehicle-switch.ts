import { chromium } from 'playwright';
import { createServer } from 'vite';

async function testStyleAndVehicleSwitching() {
  console.log('📱 Starting local Vite test server...');
  const server = await createServer({
    server: { port: 5192 },
  });
  await server.listen();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // Mobile iPhone 14
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err));

  await page.goto('http://localhost:5192', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Initial default state screenshot
  await page.screenshot({ path: 'exports/mobile_style_default.jpg', type: 'jpeg', quality: 90 });
  console.log('📸 Saved mobile_style_default.jpg');

  // 2. Click "Vehicle" button to open vehicle selector
  await page.click('button:has-text("Vehicle")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'exports/mobile_vehicle_drawer.jpg', type: 'jpeg', quality: 90 });
  console.log('📸 Saved mobile_vehicle_drawer.jpg');

  // 3. Select "Jet Airplane"
  await page.click('button:has-text("Jet Airplane")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'exports/mobile_airplane_applied.jpg', type: 'jpeg', quality: 90 });
  console.log('📸 Saved mobile_airplane_applied.jpg');

  // 4. Click "Style" button to open cartography presets
  await page.click('button:has-text("Style")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'exports/mobile_style_drawer.jpg', type: 'jpeg', quality: 90 });
  console.log('📸 Saved mobile_style_drawer.jpg');

  // 5. Select "Dark Cinema" preset
  await page.click('button:has-text("Dark Cinema")');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'exports/mobile_darkcinema_applied.jpg', type: 'jpeg', quality: 90 });
  console.log('📸 Saved mobile_darkcinema_applied.jpg');

  await browser.close();
  await server.close();
  console.log('✅ Style & Vehicle switching test completed successfully!');
}

testStyleAndVehicleSwitching().catch(err => {
  console.error(err);
  process.exit(1);
});
