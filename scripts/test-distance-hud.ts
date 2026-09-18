import { chromium } from 'playwright';
import { createServer } from 'vite';

async function testDistanceHud() {
  const server = await createServer({
    server: { port: 5199 },
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
  await page.goto('http://localhost:5199', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // 1. Open Inspector -> Titles/FX
  await page.click('nav button:visible:has-text("Inspector")');
  await page.waitForTimeout(300);
  await page.click('button:visible:has-text("Titles")');
  await page.waitForTimeout(300);

  // 2. Select Kilometers (km) in HUD
  const unitSelect = page.locator('select:visible:has-text("Kilometers (km)")');
  await unitSelect.selectOption({ label: 'Kilometers (km)' });
  await page.waitForTimeout(300);

  // 3. Switch HUD Theme to "Cyber Sport Dashboard (Cyan HUD)"
  const themeSelect = page.locator('select:visible:has-text("Glass Dark Translucent")');
  await themeSelect.selectOption({ label: 'Cyber Sport Dashboard (Cyan HUD)' });
  await page.waitForTimeout(300);

  // 4. Go back to Preview
  await page.click('nav button:visible:has-text("Preview")');
  await page.waitForTimeout(300);

  // 5. Seek to ~4 seconds into the animation
  await page.click('button[title="Play"]');
  await page.waitForTimeout(2500);
  await page.click('button[title="Pause"]');
  await page.waitForTimeout(500);

  await page.screenshot({ path: 'exports/mobile_hud_cyber_sport_km.jpg', type: 'jpeg', quality: 90 });
  console.log('📸 Saved mobile_hud_cyber_sport_km.jpg');

  await browser.close();
  await server.close();
  console.log('✅ Distance HUD KM test completed successfully!');
}

testDistanceHud().catch(err => {
  console.error(err);
  process.exit(1);
});
