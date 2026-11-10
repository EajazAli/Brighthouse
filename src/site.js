/* Bright House page behaviour. The scrollcraft engine is untouched; everything
   bespoke (the day, the hero scene, the form) lives here. */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ---- the day: scroll is the sun -------------------------------------- */
  const grounds = $$('[data-ground]').map(el => ({ el, rgb: hex(el.dataset.ground) }));
  const hours = $$('.rail a').map(a => ({ a, el: document.getElementById(a.hash.slice(1)) })).filter(h => h.el);
  const hero = $('.hero'), stage = $('.hero__stage');
  const dusk = $('.dusk'), close = $('.close');
  function hex(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }

  let lastY = scrollY, mx = 0, my = 0, tx = 0, ty = 0, ticking = false;

  function frame() {
    ticking = false;
    const y = scrollY, vh = innerHeight, mid = y + vh / 2;

    if (grounds.length) {
      const pts = grounds.map(g => { const r = g.el.getBoundingClientRect(); return { c: r.top + y + r.height / 2, rgb: g.rgb }; });
      let i = 0; while (i < pts.length - 2 && mid > pts[i + 1].c) i++;
      const t = clamp((mid - pts[i].c) / (pts[i + 1].c - pts[i].c || 1));
      const a = pts[i].rgb, b = pts[i + 1].rgb;
      root.style.setProperty('--sc-canvas', `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * t)).join(' ')})`);
    }
    if (hours.length) {
      const tops = hours.map(h => h.el.getBoundingClientRect().top + y);
      let i = 0; while (i < tops.length - 1 && mid >= tops[i + 1]) i++;
      const next = i < tops.length - 1 ? tops[i + 1] : document.documentElement.scrollHeight;
      const day = (i + clamp((mid - tops[i]) / (next - tops[i] || 1))) / (tops.length - 1);
      root.style.setProperty('--day', clamp(day).toFixed(4));
      hours.forEach((h, k) => h.a.classList.toggle('is-now', k === i));
    }

    let night = false;
    if (dusk) {
      const r = dusk.getBoundingClientRect();
      const p = reduce ? (r.top < vh * 0.5 ? 1 : 0) : clamp(-r.top / Math.max(1, r.height - vh));
      night = r.top <= vh * 0.5 && p > 0.19;
    }
    if (close && close.getBoundingClientRect().top < 40) night = true;
    if (root.dataset.night === 'always') night = true;
    root.classList.toggle('night', night);

    let wood = false;
    if (hero && stage) {
      const hp = reduce ? 0 : clamp(y / Math.max(1, hero.offsetHeight - vh));
      stage.style.setProperty('--hp', hp.toFixed(4));
      wood = hp < 0.3;
    }
    root.classList.toggle('on-wood', wood);
    root.classList.toggle('scrolled', y > 24 && !wood);
    if (!root.classList.contains('menu-open')) {
      if (y > lastY + 6 && y > vh * 0.6) root.classList.add('bar-hidden');
      else if (y < lastY - 6 || y < 40) root.classList.remove('bar-hidden');
    }
    lastY = y;

    const heroGone = hero ? y > hero.offsetHeight - vh * 0.4 : y > vh * 0.7;
    const atClose = close && close.getBoundingClientRect().top < vh * 0.8;
    root.classList.toggle('dock-on', heroGone && !atClose);

    for (const el of drifts) {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;
      const k = clamp((vh - r.top) / (vh + r.height));
      el.style.transform = `translate3d(0, ${(-k * (el.offsetHeight - r.height)).toFixed(1)}px, 0)`;
    }
  }
  const drifts = reduce ? [] : $$('[data-drift]');
  const queue = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  frame();

  /* the scene appears whole, or after a short wait if a plane is slow */
  if (stage) {
    const ready = () => stage.classList.add('is-ready');
    const planes = $$('img', stage).map(i => (i.decode ? i.decode() : Promise.resolve()).catch(() => {}));
    Promise.all(planes).then(ready); setTimeout(ready, 2500);
  }

  /* pointer depth on the hero: additive, never the only way to see it */
  if (stage && fine && !reduce) {
    stage.addEventListener('pointermove', e => { tx = (e.clientX / innerWidth - 0.5) * 2; ty = (e.clientY / innerHeight - 0.5) * 2; });
    stage.addEventListener('pointerleave', () => { tx = ty = 0; });
    (function lean() {
      mx += (tx - mx) * 0.06; my += (ty - my) * 0.06;
      if (Math.abs(tx - mx) > 0.001 || Math.abs(ty - my) > 0.001) {
        stage.style.setProperty('--mx', mx.toFixed(4)); stage.style.setProperty('--my', my.toFixed(4));
      }
      requestAnimationFrame(lean);
    })();
  }

  /* ---- menu ------------------------------------------------------------- */
  const burger = $('.burger');
  if (burger) {
    const set = on => { root.classList.toggle('menu-open', on); burger.setAttribute('aria-expanded', on); };
    burger.addEventListener('click', () => set(!root.classList.contains('menu-open')));
    $$('.sheet a').forEach(a => a.addEventListener('click', () => set(false)));
    addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
  }

  /* ---- questions: animate the native disclosure ------------------------- */
  $$('.qa').forEach(d => {
    const s = $('summary', d), body = $('.qa__a', d);
    if (reduce || !body.animate) return;
    s.addEventListener('click', e => {
      e.preventDefault();
      const opening = !d.open;
      if (opening) d.open = true;
      const h = body.scrollHeight;
      const anim = body.animate({ height: opening ? ['0px', h + 'px'] : [h + 'px', '0px'], opacity: opening ? [0, 1] : [1, 0] }, { duration: 340, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
      anim.onfinish = () => { if (!opening) d.open = false; };
    });
  });

  /* ---- enquiry ---------------------------------------------------------- */
  $$('form.form').forEach(form => {
    const host = form.closest('.close') || form.parentElement;
    const done = $('.form__done', form), btn = $('button[type=submit]', form);
    const t = form.dataset;
    form.noValidate = true;
    const check = f => {
      const v = f.value.trim();
      const ok = f.name === 'phone' ? v.replace(/\D/g, '').length >= 9 : v.length >= 2;
      f.closest('.field').classList.toggle('bad', !ok);
      f.setAttribute('aria-invalid', !ok);
      return ok;
    };
    $$('[required]', form).forEach(f => f.addEventListener('blur', () => f.value && check(f)));
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const req = $$('[required]', form);
      const bad = req.filter(f => !check(f));
      if (bad.length) { bad[0].focus(); return; }
      const d = Object.fromEntries(new FormData(form));
      if (d.company) return;                       // honeypot
      delete d.company;
      d.page = location.pathname; d.lang = root.lang;
      const say = (title, text) => { $('b', done).textContent = title; $('p', done).textContent = text; host.classList.add('is-sent'); done.focus(); };
      if (t.endpoint) {
        btn.disabled = true;
        try {
          const r = await fetch(t.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(d) });
          if (!r.ok) throw new Error(r.status);
          say(t.sentTitle, t.sentText);
          return;
        } catch (err) { btn.disabled = false; }
      }
      const lines = [t.waHello, `${t.lType}: ${d.type || '-'}`, `${t.lUnits}: ${d.units || '-'}`, `${t.lArea}: ${d.area || '-'}`, `${t.lName}: ${d.name}`];
      window.open(`https://wa.me/${t.wa}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
      say(t.waTitle, t.waText);
    });
  });

  /* ---- insights: filter and show more ----------------------------------- */
  $$('[data-posts]').forEach(box => {
    const rows = $$('.posts__list li', box), input = $('input', box), more = $('.posts__more', box), none = $('.posts__none', box), count = $('[data-count]', box);
    const step = +box.dataset.step || 24; let shown = step;
    const text = rows.map(r => r.textContent.toLowerCase());
    const draw = () => {
      const q = input.value.trim().toLowerCase(); let hit = 0;
      rows.forEach((r, i) => { const ok = !q || text[i].includes(q); if (ok) hit++; r.classList.toggle('is-off', !ok || hit > shown); });
      count.textContent = hit; none.hidden = hit > 0; more.hidden = hit <= shown;
    };
    input.addEventListener('input', () => { shown = step; draw(); });
    $('button', more).addEventListener('click', () => { const first = rows.filter(r => r.classList.contains('is-off'))[0]; shown += step; draw(); if (first && !first.classList.contains('is-off')) $('a', first).focus(); });
    draw();
  });

  /* ---- article: mark the section being read ------------------------------ */
  const tocLinks = $$('.post__side nav a');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    const byId = Object.fromEntries(tocLinks.map(a => [a.hash.slice(1), a]));
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && byId[e.target.id]) { tocLinks.forEach(a => a.classList.remove('is-here')); byId[e.target.id].classList.add('is-here'); } }), { rootMargin: '-20% 0px -70% 0px' });
    $$('.post__body h2[id]').forEach(h => io.observe(h));
  }

  if (window.ScrollCraft) ScrollCraft.mount(document.body);
})();
