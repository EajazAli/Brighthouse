"""Prepare delivery images from raw/ and the archive. Usage: python assets.py <build> <archive-assets> <pexels-dir> <logo>"""
import sys, os
from PIL import Image
build, arch, pex, logo = sys.argv[1:5]
out = os.path.join(build, 'assets', 'img'); raw = os.path.join(build, 'raw')
def norm_alpha(im):
    r,g,b,a = im.split()
    a = a.point(lambda v: 0 if v < 10 else (255 if v > 242 else v))
    return Image.merge('RGBA', (r,g,b,a))
def save(im, name, w, q=80):
    if im.size[0] > w: im = im.resize((w, round(im.size[1]*w/im.size[0])), Image.LANCZOS)
    im.save(os.path.join(out, name), 'WEBP', quality=q, method=6); print(name, im.size, os.path.getsize(os.path.join(out,name))//1024,'KB')
sky = Image.open(os.path.join(raw,'sky.png')).convert('RGB')
save(sky,'sky-2000.webp',2000,78); save(sky,'sky-1000.webp',1000,74)
b = norm_alpha(Image.open(os.path.join(raw,'building.png')))
b = b.crop(b.getbbox()); print('building bbox', b.size)
save(b,'building-1100.webp',1100,84); save(b,'building-620.webp',620,82)
f = norm_alpha(Image.open(os.path.join(raw,'frame-d.png'))); save(f,'roshan-d-2200.webp',2200,82); save(f,'roshan-d-1300.webp',1300,80)
f = norm_alpha(Image.open(os.path.join(raw,'frame-m.png'))); save(f,'roshan-m-1000.webp',1000,82)
real = {'008.jpg':'entrance','009.jpg':'community','010.jpg':'terrace','011.jpg':'interior','012.jpg':'stone-entrance','014.jpg':'residence'}
for k,v in real.items():
    im = Image.open(os.path.join(arch,k)).convert('RGB'); save(im, v+'-720.webp', 720, 78)
for k,v in {'muhannad':'albalad','dalya':'corniche','du_':'tower'}.items():
    fn = [x for x in os.listdir(pex) if k in x][0]
    im = Image.open(os.path.join(pex,fn)).convert('RGB'); save(im, v+'-1200.webp', 1200, 76); save(im, v+'-640.webp', 640, 74)
# logo: full lockup and the tower mark alone, both as alpha masks
lg = Image.open(logo).convert('RGBA'); a = lg.getchannel('A')
full = Image.new('RGBA', lg.size, (255,255,255,0)); full.putalpha(a); full = full.crop(a.getbbox()); full.save(os.path.join(out,'logo-lockup.png')); print('lockup', full.size)
# mark = rows above the first empty horizontal band below the tower
w,h = a.size; rows = [max(a.crop((0,y,w,y+1)).getdata()) > 40 for y in range(h)]
y0 = rows.index(True); y1 = y0
gap = 0
for y in range(y0,h):
    if rows[y]: y1 = y; gap = 0
    else:
        gap += 1
        if gap > 3: break
m = a.crop((0,y0,w,y1+1)); bb = m.getbbox(); m = m.crop(bb)
mark = Image.new('RGBA', m.size, (255,255,255,0)); mark.putalpha(m); mark.save(os.path.join(out,'logo-mark.png')); print('mark', mark.size)
# social card
card = sky.resize((1200, round(sky.size[1]*1200/sky.size[0]))).crop((0,24,1200,654)); bb2 = b.resize((round(b.size[0]*600/b.size[1]),600)); card.paste(bb2,(1200-bb2.size[0]-90,40),bb2); card.save(os.path.join(out,'og.jpg'),quality=84)
