const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const checks = [];

  for (const viewport of [
    { width: 1366, height: 900, name: 'desktop' },
    { width: 390, height: 844, name: 'mobile' }
  ]) {
    const page = await browser.newPage({ viewport });
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.fill('input[type=email]', 'demo@gearflow.app');
    await page.fill('input[type=password]', 'ride123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/app/dashboard');

    for (const path of ['/app/dashboard', '/app/gears', '/app/maintenance', '/app/wishlist', '/app/insights', '/app/status']) {
      await page.goto(`http://localhost:5173${path}`, { waitUntil: 'networkidle' });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      const textLength = await page.locator('body').innerText({ timeout: 5000 }).then((text) => text.length);
      checks.push({ viewport: viewport.name, path, overflow, hasText: textLength > 20 });
    }

    await page.close();
  }

  await browser.close();
  console.log(JSON.stringify(checks, null, 2));
  if (checks.some((check) => check.overflow || !check.hasText)) process.exit(1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
