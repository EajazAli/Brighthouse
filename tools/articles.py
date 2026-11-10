"""Extract clean article bodies from the captured WordPress HTML.
Usage: python -I articles.py <archive-dir> <out.json>
Keeps text structure only. Inline images are dropped: nearly all are hotlinked
from third-party hosts (images.openai.com, listing sites) with no licence."""
import sys, json, re, html, codecs
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote

arch, outp = sys.argv[1], sys.argv[2]


def cp(e):  # stray cp1252 bytes inside otherwise UTF-8 pages
    b = e.object[e.start:e.end]
    try:
        return (b.decode('cp1252'), e.end)
    except Exception:
        return ('', e.end)


codecs.register_error('cp', cp)

KEEP = {'p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'br'}
MAP = {'h1': 'h2', 'b': 'strong', 'i': 'em', 'h5': 'h4', 'h6': 'h4'}
SKIP = {'script', 'style', 'button', 'svg', 'noscript', 'iframe', 'form', 'figure', 'figcaption', 'video', 'audio'}
VOID = {'br', 'img', 'hr', 'input', 'meta', 'link', 'source'}


class X(HTMLParser):
    def __init__(s):
        super().__init__(convert_charrefs=True)
        s.depth = 0; s.on = False; s.done = False; s.skip = 0; s.out = []
        s.title = ''; s.in_t = False; s.meta = {}; s.ld = ''; s.in_ld = False; s.stack = []

    def handle_starttag(s, t, attrs):
        a = dict(attrs)
        if t == 'meta':
            k = a.get('property') or a.get('name')
            if k:
                s.meta[k] = a.get('content') or ''
        if t == 'title':
            s.in_t = True
        if t == 'script' and a.get('type') == 'application/ld+json':
            s.in_ld = True
        if s.done:
            return
        if not s.on:
            if t == 'div' and 'elementor-widget-tl-post-content' in (a.get('class') or ''):
                s.on = True; s.depth = 1
            return
        if t in VOID:
            if t == 'br' and not s.skip:
                s.out.append('<br>')
            return
        s.depth += 1
        if s.skip or t in SKIP:
            s.skip += 1
            return
        t2 = MAP.get(t, t)
        if t2 not in KEEP:
            s.stack.append(None)
            return
        if t2 == 'a':
            h = (a.get('href') or '').strip()
            u = urlsplit(h)
            if not h or h.startswith('#') or u.scheme not in ('http', 'https', ''):
                s.stack.append(None)
                return
            if u.netloc in ('brighthouse.sa', 'www.brighthouse.sa'):
                s.out.append('<a href="%s">' % html.escape(unquote(u.path) or '/'))
            else:
                s.out.append('<a href="%s" rel="noopener nofollow" target="_blank">' % html.escape(h))
        else:
            s.out.append('<%s>' % t2)
        s.stack.append(t2)

    def handle_endtag(s, t):
        if t == 'title':
            s.in_t = False
        if t == 'script':
            s.in_ld = False
        if not s.on or s.done or t in VOID:
            return
        s.depth -= 1
        if s.depth <= 0:
            s.done = True
            return
        if s.skip:
            s.skip -= 1
            return
        if s.stack:
            t2 = s.stack.pop()
            if t2:
                s.out.append('</%s>' % t2)

    def handle_data(s, d):
        if s.in_t:
            s.title += d
        if s.in_ld:
            s.ld += d
        if s.on and not s.done and not s.skip:
            s.out.append(html.escape(d, quote=False))


BLOCK = r'(?:p|ul|ol|li|h2|h3|h4|table|thead|tbody|tr|td|th|blockquote)'


def clean(b):
    b = re.sub(r'[ \s]+', ' ', b)
    b = re.sub(r'https?://\S+\.(?:webp|jpe?g|png|avif)[^\s<]*', '', b)   # image URLs left behind as text
    for _ in range(6):
        b = re.sub(r'<(strong|em|a|p|li|h2|h3|h4|td|th|blockquote)(?: [^>]*)?>\s*(?:<br>\s*)*</\1>', '', b)
        b = re.sub(r'<tr>\s*</tr>', '', b)
        b = re.sub(r'<(thead|tbody)>\s*</\1>', '', b)
        b = re.sub(r'<table>\s*</table>', '', b)
        b = re.sub(r'<(ul|ol)>\s*</\1>', '', b)
    b = re.sub(r'<(h[234])>\s*<strong>(.*?)</strong>\s*</\1>', r'<\1>\2</\1>', b)
    b = re.sub(r'<li>\s*<p>((?:(?!</?p>).)*)</p>\s*</li>', r'<li>\1</li>', b)
    b = re.sub(r'<p>\s*(?:<br>\s*)+', '<p>', b)
    b = re.sub(r'(?:\s*<br>)+\s*</p>', '</p>', b)
    b = re.sub(r'\s+(</(?:p|li|h2|h3|h4|td|th)>)', r'\1', b)
    b = re.sub(r'(<(?:p|li|h2|h3|h4|td|th)>)\s+', r'\1', b)
    b = re.sub(r'>\s+<(?=/?' + BLOCK + ')', '><', b)
    return b.strip()


def norm(s):
    return re.sub(r'<[^>]+>|\W', '', s).lower()


inv = json.load(open(arch + '/inventory.json', encoding='utf-8'))
out = []; skipped = []
for r in inv:
    if r['group'] != 'articles':
        continue
    raw = open(arch + '/' + r['file'], 'rb').read().decode('utf-8', 'cp')
    x = X(); x.feed(raw)
    if not x.out:
        skipped.append(r['id'])
        continue
    title = html.unescape(re.sub(r'\s*[-|]\s*brighthouse\.sa\s*$', '', x.title.strip(), flags=re.I))
    body = clean(''.join(x.out))
    m = re.match(r'<(h2|p)>(.*?)</\1>', body)          # a first block that only repeats the title
    if m and norm(m.group(2)) == norm(title):
        body = body[m.end():]
    emoji = r'[\U0001F000-\U0001FAFF☀-➿⬀-⯿️‍]+\s*'
    body = re.sub(emoji, '', body); title = re.sub(emoji, '', title).strip()
    body = re.sub(r'\s*—\s*', ', ', body)          # house style: no em dashes
    title = re.sub(r'\s*—\s*', ': ', title)
    words = len(re.sub(r'<[^>]+>', ' ', body).split())
    desc = re.sub(r'\s*—\s*', ', ', html.unescape((x.meta.get('description') or '').strip()))
    if not desc:
        fp = re.search(r'<p>(.*?)</p>', body)
        desc = re.sub(r'<[^>]+>', '', fp.group(1))[:155].rsplit(' ', 1)[0] if fp else title
    kw = []; image = None
    try:
        for g in json.loads(x.ld).get('@graph', []):
            if g.get('keywords'):
                kw = g['keywords'] if isinstance(g['keywords'], list) else [g['keywords']]
            if g.get('thumbnailUrl'):
                image = g['thumbnailUrl']
    except Exception:
        pass
    if not image or urlsplit(image).netloc not in ('brighthouse.sa', 'www.brighthouse.sa'):
        image = None                                    # only the site's own uploads
    lang = 'en' if urlsplit(r['url']).path.startswith('/en/') else 'ar'
    alt = next((unquote(urlsplit(a['url']).path) for a in r['alternates'] if a['lang'][:2] in ('ar', 'en') and a['lang'][:2] != lang), None)
    out.append({'id': r['id'], 'lang': lang, 'path': unquote(urlsplit(r['url']).path), 'alt': alt, 'title': title, 'desc': desc,
                'published': x.meta.get('article:published_time') or r['lastmod'], 'modified': x.meta.get('article:modified_time') or r['lastmod'],
                'words': words, 'keywords': kw[:12], 'image': image, 'body': body})

paths = {a['path'] for a in out}
for a in out:
    if a['alt'] not in paths:
        a['alt'] = None
out.sort(key=lambda a: a['published'], reverse=True)
json.dump(out, open(outp, 'w', encoding='utf-8'), ensure_ascii=False)
ws = sorted(a['words'] for a in out)
print(len(out), 'articles;', sum(a['lang'] == 'en' for a in out), 'en;', sum(1 for a in out if a['alt']), 'paired; skipped', skipped)
print('words min/median/max', ws[0], ws[len(ws) // 2], ws[-1])
print('thin (<150 words):', [(a['id'], a['words']) for a in out if a['words'] < 150])
print('replacement chars:', sum(a['body'].count('�') + a['title'].count('�') for a in out), '| longest path', max(len(a['path']) for a in out))
print('duplicate paths:', len(out) - len(paths), '| duplicate titles:', len(out) - len({(a['lang'], a['title']) for a in out}))
if len(sys.argv) > 3:
    for a in out:
        if a['id'] in sys.argv[3:]:
            print('\n==', {k: v for k, v in a.items() if k != 'body'})
            print(a['body'][:1800])
