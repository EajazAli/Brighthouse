// node tools/railshot.mjs <url> <out.png> <w> <h> [reduced] -> the lateral rail at five scroll positions, side by side
import { chromium } from 'playwright-core';
const [url, out, w, h, red] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, reducedMotion: red ? 'reduce' : 'no-preference', isMobile: +w < 600, hasTouch: +w < 600 });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'networkidle' });
await page.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
await page.waitForTimeout(800);
const info = await page.evaluate(() => { const e = document.querySelector('.walk'), r = e.querySelector('.walk__rail'); return { top: e.getBoundingClientRect().top + scrollY, travel: e.offsetHeight - innerHeight, overflow: r.scrollWidth - innerWidth }; });
const shots = [];
for (const k of [0, 0.25, 0.5, 0.75, 1]) {
  await page.evaluate(y => scrollTo(0, y), info.top + info.travel * k); await page.waitForTimeout(500);
  const first = await page.evaluate(() => { const q = s => Math.round(document.querySelector(s).getBoundingClientRect().left); return { lead: q('.walk__lead'), end: q('.walk__end') }; });
  shots.push({ k, ...first, buf: await page.screenshot() });
}
console.log(JSON.stringify({ overflow: info.overflow, travel: Math.round(info.travel), pos: shots.map(s => ({ k: s.k, lead: s.lead, end: s.end })) }));
const html = `<body style="margin:0;display:flex;background:#000">${shots.map(s => `<img style="width:${Math.round(+w * 0.4)}px;margin-right:4px" src="data:image/png;base64,${s.buf.toString('base64')}">`).join('')}</body>`;
const p2 = await ctx.newPage(); await p2.setViewportSize({ width: Math.round(+w * 0.4) * 5 + 20, height: Math.round(+h * 0.4) });
await p2.setContent(html); await p2.screenshot({ path: out });
await b.close();
