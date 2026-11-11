// node tools/footshot.mjs <url> <out.png> <w> <h>  -> the bottom of the page (footer)
import { chromium } from 'playwright-core';
const [url, out, w, h] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, isMobile: +w < 600, hasTouch: +w < 600 });
const page = await ctx.newPage();
const errs = []; page.on('requestfailed', r => errs.push(r.url()));
await page.goto(url, { waitUntil: 'networkidle' });
await page.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
for (let i = 0; i < 3; i++) { await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(700); }
const info = await page.evaluate(() => { const a = document.querySelector('.foot__by'), i = a.querySelector('img'), r = i.getBoundingClientRect(); return { text: a.textContent.trim(), img: [Math.round(r.width), Math.round(r.height)], loaded: i.naturalWidth, overflow: document.documentElement.scrollWidth - innerWidth }; });
console.log(JSON.stringify({ ...info, errs }));
await page.screenshot({ path: out, clip: { x: 0, y: Math.max(0, +h - 420), width: +w, height: Math.min(420, +h) } });
await b.close();
