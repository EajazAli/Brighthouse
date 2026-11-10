// node tools/snap.mjs <url> <outdir> <w> <h> [reduced]  -> frames at named scroll positions
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [url, out, w, h, red] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, reducedMotion: red ? 'reduce' : 'no-preference', isMobile: +w < 600, hasTouch: +w < 600 });
const page = await ctx.newPage();
const errs = []; page.on('console', m => m.type() === 'error' && errs.push(m.text())); page.on('pageerror', e => errs.push(String(e))); page.on('requestfailed', r => errs.push('FAILED ' + r.url()));
await page.goto(url, { waitUntil: 'networkidle' });
await page.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
await page.waitForTimeout(1200);
const pos = await page.evaluate(() => {
  const vh = innerHeight, top = s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().top + scrollY : null; };
  const r = {}; const hero = document.querySelector('.hero');
  if (hero) { const tr = hero.offsetHeight - vh; [0, .25, .45, .6, .8, 1].forEach(k => r['hero' + Math.round(k * 100)] = tr * k); }
  const late = top('.steps'); if (late != null) { r.steps = late - vh * .3; r.inbox = top('.inbox') - vh * .15; r.faq = top('.faq') - vh * .15; }
  const d = document.querySelector('.dusk'); if (d) { const t = top('.dusk'), tr = d.offsetHeight - vh; [.05, .13, .22, .5, .95].forEach(k => r['dusk' + Math.round(k * 100)] = t + tr * k); }
  const c = top('.close'); if (c != null) { r.close = c; r.end = document.documentElement.scrollHeight; }
  if (!hero) { r.top = 0; r.mid = vh * .9; }
  return { r, overflow: document.documentElement.scrollWidth - innerWidth };
});
for (const [k, y] of Object.entries(pos.r)) { await page.evaluate(v => scrollTo(0, v), y); await page.waitForTimeout(450); await page.screenshot({ path: `${out}/${k}.png` }); }
console.log(JSON.stringify({ overflow: pos.overflow, errs }));
await b.close();
