import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:/Users/drnas/.cache/puppeteer/chrome-headless-shell/win64-149.0.7827.22/chrome-headless-shell-win64/chrome-headless-shell.exe';

const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';
const width = parseInt(process.argv[4] || '1440', 10);
const height = parseInt(process.argv[5] || '900', 10);
const fullPage = process.argv[6] !== 'viewport';

const dir = './temporary_screenshots';
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

let n = 1;
while (fs.existsSync(path.join(dir, `screenshot-${n}${label ? '-' + label : ''}.png`))) n++;
const outPath = path.join(dir, `screenshot-${n}${label ? '-' + label : ''}.png`);

const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true });
const page = await browser.newPage();
await page.setViewport({ width, height });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

if (fullPage) {
  // Auto-scroll to trigger any IntersectionObserver / scroll-reveal animations
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let total = 0;
      const step = 400;
      const timer = setInterval(() => {
        window.scrollBy(0, step);
        total += step;
        if (total >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 60);
    });
  });
  await new Promise((r) => setTimeout(r, 400));
  // Force any scroll-reveal elements that the IntersectionObserver missed
  // (headless auto-scroll fires faster than IO can keep up with) so the
  // screenshot reflects the final design, not a stuck mid-animation state.
  await page.evaluate(() => {
    document.querySelectorAll('.reveal:not(.in)').forEach((el) => el.classList.add('in'));
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 300));
}

await page.screenshot({ path: outPath, fullPage });
await browser.close();
console.log('Saved', outPath);
