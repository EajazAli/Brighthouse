// node tools/check.mjs  -> static checks over dist/ (links, headings, JSON-LD, lengths)
import fs from 'node:fs';
import path from 'node:path';
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.html') ? [path.join(d, e.name)] : []);
const files = walk('dist'); const links = new Map(); let ld = 0, issues = 0;
const redirects = fs.readFileSync('dist/_redirects', 'utf8').trim().split('\n').map(l => decodeURI(l.split(' ')[0]));
const redirected = p => redirects.some(r => r.endsWith('*') ? p.startsWith(r.slice(0, -1)) : p === r);
const say = (...a) => { issues++; if (issues < 40) console.log(...a); };
for (const f of files) {
  const h = fs.readFileSync(f, 'utf8');
  for (const m of h.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) { try { JSON.parse(m[1]); } catch { ld++; say('LD bad', f); } }
  const h1 = (h.match(/<h1/g) || []).length; if (h1 !== 1) say('h1 count', h1, f);
  const vis = h.replace(/<script[\s\S]*?<\/script>/g, '');
  if (/—/.test(vis)) say('em dash', f);
  if (/�/.test(h)) say('replacement char', f);
  if (!/<link rel="canonical"/.test(h)) say('no canonical', f);
  const t = h.match(/<title>(.*?)<\/title>/)[1]; if (!t.trim()) say('empty title', f);
  for (const m of h.matchAll(/(?:href|src)="(\/[^"#?]*)/g)) { const k = decodeURI(m[1]); if (!links.has(k)) links.set(k, f); }
}
let broken = 0, viaRedirect = 0;
for (const [l, from] of links) {
  const p = path.join('dist', l.endsWith('/') ? l + 'index.html' : l);
  if (fs.existsSync(p)) continue;
  if (redirected(l)) { viaRedirect++; continue; }
  broken++; if (broken < 25) console.log('BROKEN', l, '<-', from);
}
console.log(JSON.stringify({ pages: files.length, links: links.size, broken, viaRedirect, ldErrors: ld, issues }));
