"""Fetch each article's featured image from brighthouse.sa and write web sizes.
Usage: python post_images.py <build-root>   (re-runnable; skips what it already has)"""
import sys, os, json, hashlib, io, time, urllib.request, urllib.parse
from PIL import Image

root = sys.argv[1]
# Optional second argument: the crawl archive, whose already-downloaded files are used before the network.
local = {}
if len(sys.argv) > 2:
    for x in json.load(open(os.path.join(sys.argv[2], 'downloaded-assets.json'), encoding='utf-8')):
        if x.get('status') == 200 and x.get('local_file'):
            local[x['url']] = os.path.join(sys.argv[2], x['local_file'])
arts = json.load(open(os.path.join(root, 'src', 'articles.json'), encoding='utf-8'))
rawdir = os.path.join(root, 'raw', 'featured'); outdir = os.path.join(root, 'assets', 'img', 'posts')
os.makedirs(rawdir, exist_ok=True); os.makedirs(outdir, exist_ok=True)
urls = sorted({a['image'] for a in arts if a.get('image')})
print(len(urls), 'distinct featured images for', sum(1 for a in arts if a.get('image')), 'articles')
meta = {}; failed = []; total = 0
for u in urls:
    key = hashlib.sha1(u.encode()).hexdigest()[:12]
    raw = os.path.join(rawdir, key)
    if not os.path.exists(raw) and u in local and os.path.exists(local[u]):
        open(raw, 'wb').write(open(local[u], 'rb').read())
    if not os.path.exists(raw):
        p = urllib.parse.urlsplit(u)
        if p.netloc not in ('brighthouse.sa', 'www.brighthouse.sa'):
            failed.append((u, 'foreign host')); continue
        safe = urllib.parse.urlunsplit((p.scheme, p.netloc, urllib.parse.quote(urllib.parse.unquote(p.path)), '', ''))
        try:
            req = urllib.request.Request(safe, headers={'User-Agent': 'Mozilla/5.0 (site migration)'})
            data = urllib.request.urlopen(req, timeout=30).read()
            if len(data) > 15_000_000:
                failed.append((u, 'too large')); continue
            open(raw, 'wb').write(data); time.sleep(0.15)
        except Exception as e:
            failed.append((u, str(e)[:60])); continue
    try:
        im = Image.open(raw); im.load(); im = im.convert('RGB')
    except Exception as e:
        failed.append((u, 'decode ' + str(e)[:50])); continue
    total += os.path.getsize(raw)
    w, h = im.size
    for tw in (1200, 480):
        o = os.path.join(outdir, '%s-%d.webp' % (key, tw))
        if not os.path.exists(o):
            x = im if w <= tw else im.resize((tw, round(h * tw / w)), Image.LANCZOS)
            x.save(o, 'WEBP', quality=76, method=6)
    meta[u] = {'key': key, 'w': w, 'h': h}
json.dump(meta, open(os.path.join(root, 'src', 'post-images.json'), 'w', encoding='utf-8'))
print('ok', len(meta), '| failed', len(failed), '| raw MB %.1f' % (total / 1e6))
for f in failed[:15]:
    print('  FAIL', f)
