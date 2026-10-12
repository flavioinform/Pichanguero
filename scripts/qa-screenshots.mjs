// Visual QA: opens the running dev server, screenshots the menu and each
// game's first screen, and prints any console errors seen along the way.
//
// Usage: npm run dev (in another terminal), then `npm run qa:screens [outDir]`
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const baseUrl = process.env.QA_URL ?? 'http://localhost:5173';
const outDir = path.resolve(process.argv[2] ?? 'qa-screens');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

await page.goto(baseUrl, { waitUntil: 'networkidle' });
await page.waitForSelector('button[aria-label^="Entrar a"]', { timeout: 20000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(outDir, '00-menu.png') });

const gameCount = await page.locator('button[aria-label^="Entrar a"]').count();
const names = await page.locator('button[aria-label^="Entrar a"]').evaluateAll((els) =>
  els.map((el) => el.getAttribute('aria-label')?.replace('Entrar a ', '') ?? '')
);
console.log(`Menu shows ${gameCount} games: ${names.join(', ')}`);

for (let i = 0; i < gameCount; i++) {
  if (i > 0) await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, `${String(i + 1).padStart(2, '0')}-detail-${i}.png`) });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, `${String(i + 1).padStart(2, '0')}-game-${i}.png`) });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
}

await browser.close();

console.log(`Screenshots saved to ${outDir}`);
if (consoleErrors.length > 0) {
  console.log(`Console errors (${consoleErrors.length}):`);
  for (const e of [...new Set(consoleErrors)]) console.log(`  - ${e}`);
} else {
  console.log('No console errors.');
}
