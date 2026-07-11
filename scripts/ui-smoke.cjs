const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.GEARFLOW_BASE_URL || 'http://127.0.0.1:5173';
const outputDir = path.resolve(__dirname, '..', 'output', 'playwright', 'local-release');
const viewClass = {
  Dashboard: 'dashboard',
  Rides: 'rides',
  'Ride Planner': 'ride-planner',
  Bikes: 'bikes',
  Gear: 'gears',
  Maintenance: 'maintenance',
  Insights: 'insights'
};

async function canvasCount(page) {
  return page.locator('.dashboard-wavy-cubes canvas').count();
}

async function waitForView(page, view) {
  const expected = viewClass[view];
  await page.waitForFunction((name) => {
    const pageElement = document.querySelector('.page-motion-wrapper');
    return pageElement?.classList.contains(`page-view-${name}`)
      && !pageElement.classList.contains('route-field-enter-active')
      && !pageElement.classList.contains('route-field-leave-active');
  }, expected);
  const active = await page.locator('.primary-nav button.active').textContent();
  if (active?.trim() !== view) throw new Error(`Navigation mismatch: expected ${view}, got ${active?.trim()}`);
}

async function login(page) {
  await page.locator('.auth-form input[type=email]').fill('demo@gearflow.app');
  await page.locator('.auth-form input[type=password]').fill('ride123');
  await page.locator('.auth-form button.primary').click();
  await page.waitForSelector('.app-shell');
  if (await canvasCount(page) !== 1) throw new Error('Expected one Wavy Canvas after login.');
}

async function logout(page) {
  await page.locator('.user-card button').click();
  await page.waitForSelector('.auth-screen');
  if (await canvasCount(page) !== 1) throw new Error('Expected one Wavy Canvas after logout.');
}

async function run() {
  await fs.mkdir(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const pageErrors = [];
  const webglErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (/webgl|three\.js/i.test(message.text()) && message.type() === 'error') webglErrors.push(message.text());
  });

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForSelector('.auth-screen');
  if (await canvasCount(page) !== 1) throw new Error('Expected one Wavy Canvas before login.');
  await page.screenshot({ path: path.join(outputDir, 'login-1440x900.png') });

  await login(page);
  await waitForView(page, 'Dashboard');
  const heroLoaded = await page.locator('.dashboard-hero-panel img').evaluate((image) => image.complete && image.naturalWidth > 0);
  if (!heroLoaded) throw new Error('Dashboard Merida Hero did not load.');
  await page.screenshot({ path: path.join(outputDir, 'dashboard-1440x900.png') });

  for (const view of ['Rides', 'Ride Planner', 'Bikes', 'Gear', 'Maintenance', 'Insights']) {
    await page.getByRole('button', { name: view, exact: true }).click();
    await waitForView(page, view);
    if (view === 'Ride Planner') await page.screenshot({ path: path.join(outputDir, 'ride-planner-1440x900.png') });
    if (view === 'Insights') await page.screenshot({ path: path.join(outputDir, 'insights-1440x900.png') });
  }

  for (const view of ['Rides', 'Bikes', 'Gear', 'Maintenance', 'Dashboard']) {
    await page.getByRole('button', { name: view, exact: true }).click({ noWaitAfter: true });
  }
  await waitForView(page, 'Dashboard');
  if (await page.locator('.page-motion-wrapper').count() !== 1) throw new Error('Page transition left overlapping page wrappers.');
  if (await canvasCount(page) !== 1) throw new Error('Page transitions duplicated the Wavy Canvas.');

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.screenshot({ path: path.join(outputDir, 'dashboard-1280x720.png') });

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Insights', exact: true }).click();
  await waitForView(page, 'Insights');
  const signalDisplay = await page.locator('.route-signal-line').evaluate((element) => getComputedStyle(element).display);
  if (signalDisplay !== 'none') throw new Error('Route Signal remains visible with reduced motion enabled.');
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  await logout(page);
  for (let cycle = 2; cycle <= 3; cycle += 1) {
    await login(page);
    await logout(page);
  }

  if (pageErrors.length) throw new Error(`Page errors: ${pageErrors.join(' | ')}`);
  if (webglErrors.length) throw new Error(`WebGL errors: ${webglErrors.join(' | ')}`);

  const result = {
    baseUrl,
    canvasCount: await canvasCount(page),
    loginLogoutCycles: 3,
    heroLoaded,
    orderedViews: Object.keys(viewClass),
    rapidFinalView: 'Dashboard',
    reducedMotion: 'passed',
    screenshots: outputDir
  };
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
