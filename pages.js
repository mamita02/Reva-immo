/* =====================================================================
   REVA — Pages de service (Vendez · Diaspora)
   - collage du hero, menu mobile, révélations au scroll
   - Vendez   : formulaire d'estimation en 4 étapes + fourchette de prix
                calculée sur les biens comparables du catalogue
   - Diaspora : convertisseur devise → F CFA relié au catalogue,
                horloges Dakar / diaspora, sélection de biens, prise de RDV
   Aucun back-office : les demandes partent sur WhatsApp (ou par e-mail).
   ===================================================================== */
import { BIENS } from './data/biens.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = new Intl.NumberFormat('fr-FR');
const fmt = (n) => nf.format(Math.round(n));
const short = (n) => _short(n).replace('.', ',');
const _short = (n) => (n >= 1e9 ? `${+(n / 1e9).toFixed(2)} Md` : n >= 1e6 ? `${+(n / 1e6).toFixed(n >= 1e8 ? 0 : 1)} M` : n >= 1e3 ? `${Math.round(n / 1e3)} k` : String(Math.round(n)));
const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

const PHONE = '221781752323';
const MAIL = 'info@reva.sn';
const PAGE = document.body.dataset.page;
const ALL = Object.entries(BIENS).flatMap(([cat, list]) => list.map((b) => ({ ...b, cat })));
const byId = new Map(ALL.map((b) => [b.id, b]));
const CAT_URL = { ventes: 'ventes-directes.html', vefa: 'biens-en-vefa.html', terrains: 'terrains.html' };
const PRICE_STEPS = [0, 5e6, 10e6, 20e6, 30e6, 50e6, 75e6, 100e6, 125e6, 150e6, 200e6, 250e6, 300e6, 400e6, 500e6, 750e6, 1e9];

const toast = (msg) => { const t = $('#toast'); if (!t) return; t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); };
const openWA = (text) => window.open(`https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
const mailto = (subject, body) => `mailto:${MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

/* =====================================================================
   COMMUN
   ===================================================================== */
function common() {
  // collage du hero : data-ids="id1,id2,id3" → 1re photo de chaque bien
  const col = $('#collage');
  if (col) {
    const ids = (col.dataset.ids || '').split(',').filter(Boolean);
    col.insertAdjacentHTML('afterbegin', ids.map((id, i) => {
      const b = byId.get(id);
      const src = b?.imgs?.[col.dataset.img ? +col.dataset.img : 0] || b?.imgs?.[0];
      return src ? `<figure class="f${i + 1}" data-depth="${[18, 10, 26][i]}"><img src="${src}" alt="${esc(b.titre)}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} /></figure>` : '';
    }).join(''));
    const hero = $('.c-hero');
    hero.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      $$('figure', col).forEach((fg) => { const d = +fg.dataset.depth; fg.style.transform = `translate3d(${-x * d}px, ${-y * d}px, 0) rotateY(${x * 4}deg) rotateX(${-y * 4}deg)`; });
    });
    hero.addEventListener('pointerleave', () => $$('figure', col).forEach((fg) => (fg.style.transform = '')));
  }

  // chiffres réels issus du catalogue
  const dispo = ALL.filter((b) => b.statut !== 'Vendu');
  const set = (k, v) => $$(`[data-stat="${k}"]`).forEach((el) => (el.textContent = v));
  set('biens', dispo.length);
  set('quartiers', new Set(ALL.map((b) => b.quartier)).size);
  set('vefa', BIENS.vefa.filter((b) => b.statut !== 'Vendu').length);

  // menu mobile
  const mm = $('#m-menu');
  $('#burger')?.addEventListener('click', () => { mm.classList.add('open'); document.body.classList.add('lock'); });
  $('#m-close')?.addEventListener('click', () => { mm.classList.remove('open'); document.body.classList.remove('lock'); });

  // révélations
  const io = new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
  $$('.rv').forEach((el) => io.observe(el));

  // FAQ : une seule question ouverte à la fois
  $$('.faq details').forEach((d) => d.addEventListener('toggle', () => { if (d.open) $$('.faq details').forEach((o) => o !== d && (o.open = false)); }));
}

/* =====================================================================
   FORMULAIRE MULTI-ÉTAPES GÉNÉRIQUE
   ===================================================================== */
function wizard(form, { onStep, onSubmit }) {
  const steps = $$('.wiz-step', form);
  const prog = $('.wiz-prog', form);
  prog.innerHTML = steps.map(() => '<span></span>').join('');
  const prev = $('[data-prev]', form), next = $('[data-next]', form), send = $('[data-send]', form), cnt = $('.count-step', form);
  let cur = 0;

  const show = (i) => {
    cur = i;
    steps.forEach((s, k) => s.classList.toggle('on', k === i));
    $$('span', prog).forEach((p, k) => p.classList.toggle('on', k <= i));
    prev.hidden = i === 0;
    next.hidden = i === steps.length - 1;
    send.hidden = i !== steps.length - 1;
    cnt.textContent = `Étape ${i + 1} / ${steps.length}`;
    onStep?.(i, steps[i]);
  };
  const valid = (step) => {
    let ok = true;
    $$('[required]', step).forEach((el) => {
      const f = el.closest('.field');
      const good = el.type === 'radio' ? !!$(`input[name="${el.name}"]:checked`, step) : el.type === 'checkbox' ? el.checked : el.checkValidity() && el.value.trim() !== '';
      if (f) f.classList.toggle('err', !good);
      if (!good) ok = false;
    });
    if (!ok) toast('Merci de compléter les champs requis.');
    return ok;
  };

  next.addEventListener('click', () => { if (valid(steps[cur])) { show(cur + 1); form.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
  prev.addEventListener('click', () => show(cur - 1));
  form.addEventListener('input', (e) => e.target.closest('.field')?.classList.remove('err'));
  form.addEventListener('change', (e) => {
    // passage automatique à l'étape suivante après un choix unique
    if (e.target.type === 'radio' && e.target.closest('.opts[data-auto]') && cur < steps.length - 1) setTimeout(() => next.click(), 260);
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!valid(steps[cur])) return;
    onSubmit(Object.fromEntries(new FormData(form)));
  });
  show(0);
  return { show };
}

const doneScreen = (form, { title, text, mail }) => {
  form.innerHTML = `<div class="wiz-done">
    <div class="ok"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
    <h3>${title}</h3><p>${text}</p>
    <div class="acts">
      <a class="btn btn-green" href="index.html">Retour à l'accueil</a>
      <a class="btn btn-outline" href="${mail}">Envoyer aussi par e-mail</a>
    </div></div>`;
};

/* =====================================================================
   VENDEZ
   ===================================================================== */
function vendez() {
  // liste des quartiers connus pour l'autocomplétion
  const dl = $('#quartiers');
  dl.innerHTML = [...new Set(ALL.map((b) => b.quartier))].sort((a, b) => a.localeCompare(b, 'fr')).map((q) => `<option value="${esc(q)}">`).join('');

  // fourchette indicative : médiane du prix au m² des biens comparables
  const estimate = (d) => {
    const surface = +d.surface;
    if (!surface) return null;
    const isLand = d.type === 'Terrain';
    const pool = ALL.filter((b) => b.prix && b.surface > 0 && (isLand ? b.type === 'Terrain' : b.type !== 'Terrain'));
    const sameType = pool.filter((b) => isLand || b.type === d.type || (d.type === 'Appartement' && b.type === 'Studio'));
    const q = fold(d.quartier);
    let comps = sameType.filter((b) => fold(b.quartier) === q);
    let scope = `${d.type.toLowerCase()}s à ${d.quartier}`;
    if (comps.length < 3) { comps = pool.filter((b) => fold(b.quartier) === q); scope = `biens à ${d.quartier}`; }
    if (comps.length < 3) { comps = sameType; scope = `${d.type.toLowerCase()}s du catalogue REVA`; }
    if (comps.length < 3) return null;
    let m2 = median(comps.map((b) => b.prix / b.surface));
    const etat = { neuf: 1.08, bon: 1, renover: 0.85 }[d.etat] ?? 1;
    m2 *= etat;
    const mid = m2 * surface;
    return { low: mid * 0.88, high: mid * 1.12, m2, n: comps.length, scope };
  };

  const renderEst = (d) => {
    const box = $('#est');
    const r = estimate(d);
    if (!r) {
      box.className = 'est none';
      box.innerHTML = `<small>Estimation indicative</small><p class="range-out">Pas assez de ventes comparables pour ce bien.</p>
        <p class="note">Un conseiller REVA vous rappelle pour une estimation sur place, gratuite et sans engagement.</p>`;
      return;
    }
    const max = r.high * 1.25;
    box.className = 'est';
    box.innerHTML = `<small>Estimation indicative</small>
      <p class="range-out">${short(r.low)} <i>à</i> ${short(r.high)} <i>F CFA</i></p>
      <p class="m2">≈ ${fmt(r.m2)} F CFA / m² · ${r.n} ${esc(r.scope)} en comparaison</p>
      <div class="gauge"><span style="left:${(r.low / max) * 100}%;width:${((r.high - r.low) / max) * 100}%"></span></div>
      <div class="gauge-l"><span>0</span><span>${short(max)} F CFA</span></div>
      <p class="note">Calcul automatique à partir des prix affichés sur notre catalogue. L'estimation définitive, après visite et vérification des documents, est réalisée gratuitement par un conseiller.</p>`;
  };

  const form = $('#wiz-vendre');
  const wiz = wizard(form, {
    onStep: (i) => { if (i === 2) renderEst(Object.fromEntries(new FormData(form))); },
    onSubmit: (d) => {
      const r = estimate(d);
      const msg = [
        'Bonjour REVA, je souhaite vendre mon bien.',
        `• Type : ${d.type}`, `• Quartier : ${d.quartier}`, `• Surface : ${d.surface} m²`,
        d.chambres ? `• Chambres : ${d.chambres}` : '', `• État : ${{ neuf: 'Neuf / récent', bon: 'Bon état', renover: 'À rafraîchir' }[d.etat] || '—'}`,
        `• Document : ${d.doc || '—'}`, d.prix ? `• Prix souhaité : ${fmt(+d.prix)} F CFA` : '',
        r ? `• Estimation indicative du site : ${short(r.low)} – ${short(r.high)} F CFA` : '',
        `• Délai : ${d.delai || '—'}`, '', `Nom : ${d.nom}`, `Téléphone : ${d.tel}`, d.email ? `E-mail : ${d.email}` : '', d.msg ? `\n${d.msg}` : '',
      ].filter(Boolean).join('\n');
      openWA(msg);
      doneScreen(form, {
        title: 'Demande envoyée',
        text: `Merci ${esc(d.nom.split(' ')[0])} ! Votre demande s'est ouverte dans WhatsApp : validez l'envoi. Un conseiller REVA vous rappelle sous 48 h pour fixer la visite d'estimation.`,
        mail: mailto(`Estimation — ${d.type} à ${d.quartier}`, msg),
      });
    },
  });
  return wiz;
}

/* estimation express du hero Vendez : pré-remplit le formulaire puis affiche la fourchette */
function vendezQuick(wiz) {
  const q = $('#v-quick'), form = $('#wiz-vendre');
  if (!q || !wiz) return;
  q.addEventListener('input', (e) => e.target.closest('.vq')?.classList.remove('err'));
  q.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(q));
    let ok = true;
    ['quartier', 'surface'].forEach((k) => {
      const bad = !String(d[k] || '').trim() || (k === 'surface' && +d[k] < 10);
      $(`[name="${k}"]`, q).closest('.vq').classList.toggle('err', bad);
      if (bad) ok = false;
    });
    if (!ok) return toast('Indiquez le quartier et la surface.');
    $(`input[name="type"][value="${d.type}"]`, form).checked = true;
    $('input[name="quartier"]', form).value = d.quartier;
    $('input[name="surface"]', form).value = d.surface;
    wiz.show(2);
    $('#estimation').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

/* =====================================================================
   DIASPORA
   ===================================================================== */
function diaspora() {
  /* ---------- convertisseur ---------- */
  // EUR : parité fixe (1 € = 655,957 F CFA). Les autres taux sont indicatifs et modifiables.
  const CUR = {
    EUR: { sym: '€', rate: 655.957, fixed: true, max: 1000000, def: 150000 },
    USD: { sym: '$', rate: 600, max: 1100000, def: 160000 },
    CAD: { sym: 'CA$', rate: 440, max: 1500000, def: 220000 },
    GBP: { sym: '£', rate: 770, max: 850000, def: 130000 },
    CHF: { sym: 'CHF', rate: 700, max: 950000, def: 140000 },
    XOF: { sym: 'F CFA', rate: 1, fixed: true, max: 650e6, def: 100e6 },
  };
  let cur = 'EUR';
  const amt = $('#c-amount'), rng = $('#c-range'), rate = $('#c-rate'), sym = $('#c-sym');
  $('#cur-tabs').innerHTML = Object.keys(CUR).map((k) => `<button type="button" data-cur="${k}" class="${k === cur ? 'on' : ''}">${k === 'XOF' ? 'F CFA' : k}</button>`).join('');

  const parse = (s) => +String(s).replace(/[^\d]/g, '') || 0;
  const update = () => {
    const c = CUR[cur];
    const r = parseFloat(String(rate.value).replace(/\s/g, '').replace(',', '.'));
    const fcfa = parse(amt.value) * (r > 0 ? r : c.rate);
    $('#c-fcfa').textContent = `${fmt(fcfa)} F CFA`;
    // palier de prix du catalogue juste au-dessus du budget (pour le lien)
    let k = PRICE_STEPS.findIndex((p) => p >= fcfa); if (k < 0) k = PRICE_STEPS.length - 1;
    const cap = fcfa;
    $('#c-match').innerHTML = Object.entries({ ventes: 'Ventes directes', vefa: 'Biens en VEFA', terrains: 'Terrains' }).map(([cat, label]) => {
      const n = BIENS[cat].filter((b) => b.prix && b.statut !== 'Vendu' && b.prix <= cap).length;
      return `<a href="${CAT_URL[cat]}?prix=0-${k}&demande=0&tri=prix-desc#catalogue"><span>${label}<em>≤ ${short(cap)} F CFA</em></span><b>${n}</b></a>`;
    }).join('');
  };
  const setCur = (k) => {
    const c = CUR[cur = k];
    $$('#cur-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.cur === k));
    sym.textContent = c.sym;
    rng.max = c.max; rng.step = c.max / 200; rng.value = c.def;
    amt.value = fmt(c.def);
    rate.value = String(c.rate).replace('.', ',');
    rate.disabled = !!c.fixed;
    $('#c-rate-l').textContent = k === 'XOF' ? 'Montant saisi directement en F CFA' : c.fixed ? `Parité fixe : 1 ${k} =` : `Taux indicatif (modifiable) : 1 ${k} =`;
    update();
  };
  $('#cur-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-cur]'); if (b) setCur(b.dataset.cur); });
  rng.addEventListener('input', () => { amt.value = fmt(+rng.value); update(); });
  amt.addEventListener('input', () => { const v = parse(amt.value); amt.value = v ? fmt(v) : ''; rng.value = Math.min(v, +rng.max); update(); });
  rate.addEventListener('input', update);
  setCur(cur);

  /* ---------- carte Dakar <-> diaspora avec heures locales ---------- */
  // projection simple : x = (lon + 80) * 10, y = (58 - lat) * 10 (viewBox 1000 x 470)
  const P = (lon, lat) => [(lon + 80) * 10, (58 - lat) * 10];
  const HOME = { city: 'Dakar', tz: 'Africa/Dakar', at: P(-17.44, 14.69) };
  const CITIES = [
    { city: 'Paris', tz: 'Europe/Paris', at: P(2.35, 48.86), side: 't' },
    { city: 'Milan', tz: 'Europe/Rome', at: P(9.19, 45.46), side: 'r' },
    { city: 'Madrid', tz: 'Europe/Madrid', at: P(-3.7, 40.42), side: 'l' },
    { city: 'Montréal', tz: 'America/Toronto', at: P(-73.57, 45.5), side: 't' },
    { city: 'New York', tz: 'America/New_York', at: P(-74, 40.71), side: 'b' },
  ];
  const map = $('.d-map');
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs) => { const n = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v)); return n; };
  const [hx, hy] = HOME.at;
  CITIES.forEach((c, i) => {
    const [x, y] = c.at;
    const mx = (hx + x) / 2, my = (hy + y) / 2, dx = x - hx, len = Math.hypot(dx, y - hy);
    const cx = mx + (dx > 0 ? -1 : 1) * len * 0.08, cy = my - Math.abs(dx / len) * len * 0.28 - 30;
    const d = `M${hx},${hy} Q${cx.toFixed(1)},${cy.toFixed(1)} ${x},${y}`;
    const path = el('path', { d, class: 'd-arc' });
    $('#d-arcs').append(path);
    setTimeout(() => path.classList.add('in'), 500 + i * 180);
    const dot = el('circle', { r: 3.2, class: 'd-dot' });
    dot.append(el('animateMotion', { dur: `${3.2 + i * 0.5}s`, repeatCount: 'indefinite', begin: `${i * 0.6}s`, keyPoints: i % 2 ? '1;0' : '0;1', keyTimes: '0;1', calcMode: 'linear', path: d }));
    $('#d-arcs').append(dot);
  });
  [HOME, ...CITIES].forEach((c, i) => {
    const [x, y] = c.at;
    const g = $('#d-cities');
    g.append(el('circle', { cx: x, cy: y, r: i ? 9 : 14, class: 'd-ring', style: `animation-delay:${i * 0.4}s` }));
    g.append(el('circle', { cx: x, cy: y, r: i ? 4 : 6, class: 'd-pt' }));
    const pin = document.createElement('div');
    pin.className = `d-pin${i ? '' : ' home'}`;
    pin.style.left = `${x / 10}%`;
    pin.style.top = `${(y / 470) * 100}%`;
    pin.innerHTML = `<div class="d-tag ${i ? c.side : 'b'}" style="animation-delay:${0.6 + i * 0.15}s"><small>${c.city}</small><b data-tz="${c.tz}">--:--</b>${i ? '' : '<span data-open></span>'}</div>`;
    map.append(pin);
  });
  map.insertAdjacentHTML('afterend', `<div class="d-legend">${CITIES.map((c) => `<div><small>${c.city}</small><b data-tz="${c.tz}">--:--</b></div>`).join('')}</div>`);
  const tick = () => {
    const now = new Date();
    $$('[data-tz]').forEach((n) => (n.textContent = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: n.dataset.tz }).format(now)));
    const h = parseInt(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: 'Africa/Dakar' }).format(now), 10);
    $$('[data-open]').forEach((n) => (n.textContent = h >= 9 && h < 19 ? '● Conseillers disponibles' : 'Laissez-nous un message'));
  };
  tick();
  setInterval(tick, 30000);

  /* ---------- sélection de biens (VEFA + ventes avec prix) ---------- */
  const picks = (document.querySelector('#picks')?.dataset.ids || '').split(',').map((id) => byId.get(id)).filter(Boolean);
  $('#picks').innerHTML = picks.map((b) => `<article class="pick rv">
      <div class="pick-img"><img src="${b.imgs[0]}" alt="${esc(b.titre)}" loading="lazy" /><span class="badge ${b.cat === 'vefa' ? 'gold' : ''}">${b.cat === 'vefa' ? 'VEFA' + (b.etape ? ' · ' + esc(b.etape) : '') : esc(b.type)}</span></div>
      <div class="pick-b">
        <p class="pr">${b.prix ? fmt(b.prix) + ' F CFA' : 'Prix sur demande'}${b.prix ? `<small>≈ ${fmt(b.prix / 655.957)} €</small>` : ''}</p>
        <h3>${esc(b.titre)}</h3>
        <p>${esc(b.quartier)}${b.surface ? ' · ' + fmt(b.surface) + ' m²' : ''}${b.chambres ? ' · ' + b.chambres + ' ch.' : ''}</p>
        <a class="btn btn-green" href="${CAT_URL[b.cat]}#bien-${b.id}">Voir la fiche</a>
        <a class="btn btn-outline" href="https://wa.me/${PHONE}?text=${encodeURIComponent(`Bonjour REVA, je vis à l'étranger et je souhaite une visite vidéo de « ${b.titre} » (réf. ${b.id}).`)}" target="_blank" rel="noopener">Demander une visite vidéo</a>
      </div></article>`).join('');
  const io = new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
  $$('#picks .rv').forEach((el) => io.observe(el));

  /* ---------- prise de rendez-vous ---------- */
  const form = $('#wiz-rdv');
  // fuseau du visiteur pré-rempli
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  $('#rdv-tz').value = tz;
  wizard(form, {
    onSubmit: (d) => {
      const msg = [
        'Bonjour REVA, je vis à l\'étranger et je souhaite un rendez-vous visio.',
        `• Projet : ${d.projet}`, `• Budget : ${d.budget || '—'}`, `• Financement : ${d.fin || '—'}`,
        `• Pays de résidence : ${d.pays}`, `• Fuseau horaire : ${d.tz || '—'}`,
        `• Créneau souhaité : ${d.creneau || '—'}${d.date ? ' — à partir du ' + new Date(d.date).toLocaleDateString('fr-FR') : ''}`,
        `• Canal : ${d.canal || '—'}`, '', `Nom : ${d.nom}`, `Téléphone : ${d.tel}`, d.email ? `E-mail : ${d.email}` : '', d.msg ? `\n${d.msg}` : '',
      ].filter(Boolean).join('\n');
      openWA(msg);
      doneScreen(form, {
        title: 'Rendez-vous demandé',
        text: `Merci ${esc(d.nom.split(' ')[0])} ! Votre demande s'est ouverte dans WhatsApp : validez l'envoi. Nous vous confirmons le créneau en tenant compte de votre fuseau horaire.`,
        mail: mailto(`Diaspora — rendez-vous visio (${d.pays})`, msg),
      });
    },
  });
}

/* =====================================================================
   FINANCEMENT — outils communs
   ===================================================================== */
// mensualité constante : M = C × t / (1 − (1 + t)^−n), t = taux mensuel
const mensualite = (cap, tauxAn, ans) => {
  const t = tauxAn / 100 / 12, n = ans * 12;
  if (cap <= 0) return 0;
  return t ? (cap * t) / (1 - Math.pow(1 + t, -n)) : cap / n;
};
// capital empruntable pour une mensualité donnée
const capitalMax = (mens, tauxAn, ans) => {
  const t = tauxAn / 100 / 12, n = ans * 12;
  if (mens <= 0) return 0;
  return t ? (mens * (1 - Math.pow(1 + t, -n))) / t : mens * n;
};
// capital restant dû à la fin de chaque année
const restantParAn = (cap, tauxAn, ans) => {
  const t = tauxAn / 100 / 12, m = mensualite(cap, tauxAn, ans), out = [];
  let r = cap;
  for (let y = 0; y < ans; y++) { out.push(r); for (let k = 0; k < 12; k++) r = r * (1 + t) - m; }
  return out;
};
const pf = (n) => `${fmt(n)} F CFA`;
const parseN = (s) => +String(s).replace(/[^\d]/g, '') || 0;
const pctTxt = (v) => `${String(v).replace('.', ',')} %`;

// relie un curseur à un champ numérique éditable
function linkNum(rangeSel, numSel, onChange) {
  const r = $(rangeSel), n = $(numSel);
  const sync = () => { n.value = fmt(+r.value); onChange(); };
  r.addEventListener('input', sync);
  n.addEventListener('change', () => {
    const v = Math.min(Math.max(parseN(n.value), +r.min), Math.max(+r.max, parseN(n.value)));
    if (v > +r.max) r.max = v;
    r.value = v; n.value = fmt(v); onChange();
  });
  n.addEventListener('focus', () => n.select());
  n.value = fmt(+r.value);
  return r;
}
// lien vers le catalogue filtré sur un budget maximum
const catLink = (page, budget) => {
  let k = PRICE_STEPS.findIndex((p) => p >= budget); if (k < 0) k = PRICE_STEPS.length - 1;
  return `${page}?prix=0-${k}&demande=0&tri=prix-desc#catalogue`;
};

/* =====================================================================
   PRÊT IMMOBILIER
   ===================================================================== */
function pret() {
  /* ---------- hero : exemple + skyline ---------- */
  const EX = { cap: 75e6, taux: 7.5 };
  const sky = $('#p-sky');
  const hero = (ans) => {
    const m = mensualite(EX.cap, EX.taux, ans);
    const big = $('#p-big'), from = parseN(big.textContent) || 0, t0 = performance.now();
    const step = (t) => { const k = Math.min(1, (t - t0) / 700), e = 1 - Math.pow(1 - k, 3); big.textContent = fmt(from + (m - from) * e); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
    $('#p-fig-txt').innerHTML = `pour <b>${short(EX.cap)} F CFA</b> empruntés sur <b>${ans} ans</b> à <b>${pctTxt(EX.taux)}</b>, soit ${fmt(m * ans * 12 - EX.cap)} F CFA d'intérêts au total. Exemple indicatif.`;
    const rest = restantParAn(EX.cap, EX.taux, ans);
    sky.innerHTML = rest.map((r, i) => `<i title="Année ${i + 1} : ${fmt(r)} F CFA restants"></i>`).join('');
    requestAnimationFrame(() => $$('i', sky).forEach((b, i) => { b.style.transitionDelay = `${i * 30}ms`; b.style.height = `${Math.max(6, (rest[i] / EX.cap) * 100)}%`; }));
    $('#p-sky-end').textContent = `Année ${ans}`;
  };
  $('#p-chips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-y]'); if (!b) return;
    $$('#p-chips button').forEach((x) => x.classList.toggle('on', x === b));
    hero(+b.dataset.y);
  });
  hero(20);

  /* ---------- onglets ---------- */
  $$('.sim-tabs button').forEach((b) => b.addEventListener('click', () => {
    $$('.sim-tabs button').forEach((x) => x.classList.toggle('on', x === b));
    const cap = b.dataset.pane === 'cap';
    $('#pane-mens').classList.toggle('on', !cap); $('#pane-cap').classList.toggle('on', cap);
    $('#out-mens').hidden = cap; $('#out-cap').hidden = !cap;
  }));

  /* ---------- mensualité ---------- */
  const C = 2 * Math.PI * 48;
  let last = {};
  const calcMens = () => {
    const prix = +$('#s-prix').value;
    const apportR = $('#s-apport'); apportR.max = Math.max(prix, +apportR.value);
    const apport = Math.min(+apportR.value, prix);
    const taux = +$('#s-taux').value, ans = +$('#s-duree').value, fraisP = +$('#s-frais').value;
    const frais = (prix * fraisP) / 100;
    const emp = Math.max(0, prix + frais - apport);
    const m = mensualite(emp, taux, ans), tot = m * ans * 12, int = Math.max(0, tot - emp);
    $('#s-apport-pct').textContent = `${prix ? Math.round((apport / prix) * 100) : 0} % du prix du bien`;
    $('#s-taux-o').textContent = pctTxt(taux);
    $('#s-duree-o').textContent = `${ans} ans`;
    $('#s-frais-o').textContent = `${pctTxt(fraisP)} · ${short(frais)} F`;
    $('#o-mens').innerHTML = `${fmt(m)}<span>F CFA / mois</span>`;
    $('#o-cap').textContent = pf(emp); $('#o-int').textContent = pf(int); $('#o-tot').textContent = pf(tot);
    $('#o-emp').textContent = pf(emp); $('#o-frais').textContent = pf(frais); $('#o-budget').textContent = pf(prix + frais);
    $('#o-rev').textContent = `${pf(m * 3)} / mois`;
    const capLen = tot ? (emp / tot) * C : 0, intLen = tot ? (int / tot) * C : 0;
    $('#d-cap').setAttribute('stroke-dasharray', `${capLen} ${C}`);
    $('#d-int').setAttribute('stroke-dasharray', `${intLen} ${C}`);
    $('#d-int').setAttribute('stroke-dashoffset', `${-capLen}`);
    const w = $('#o-warn');
    w.classList.toggle('on', emp === 0);
    w.textContent = emp === 0 ? 'Votre apport couvre le prix et les frais : pas besoin d\'emprunter.' : '';
    $('#see-mens').href = catLink('ventes-directes.html', prix);
    last.mens = { prix, apport, taux, ans, fraisP, emp, m, tot };
  };
  linkNum('#s-prix', '#s-prix-n', calcMens);
  linkNum('#s-apport', '#s-apport-n', calcMens);
  ['#s-taux', '#s-duree', '#s-frais'].forEach((s) => $(s).addEventListener('input', calcMens));
  calcMens();

  /* ---------- capacité ---------- */
  const calcCap = () => {
    const rev = +$('#c-rev').value, ch = +$('#c-char').value, end = +$('#c-end').value;
    const taux = +$('#c-taux').value, ans = +$('#c-duree').value, apport = +$('#c-apport').value;
    const mMax = Math.max(0, (rev * end) / 100 - ch);
    const cap = capitalMax(mMax, taux, ans);
    const budget = (cap + apport) / 1.1; // ≈ 10 % de frais d'acquisition
    $('#c-end-o').textContent = `${end} %`; $('#c-taux-o').textContent = pctTxt(taux); $('#c-duree-o').textContent = `${ans} ans`;
    $('#k-max').innerHTML = `${fmt(cap)}<span>F CFA</span>`;
    $('#k-mens').textContent = `${pf(mMax)} / mois`; $('#k-apport').textContent = pf(apport); $('#k-budget').textContent = pf(budget);
    $('#k-match').innerHTML = Object.entries({ ventes: 'Ventes directes', vefa: 'Biens en VEFA', terrains: 'Terrains' }).map(([cat, label]) => {
      const n = BIENS[cat].filter((b) => b.prix && b.statut !== 'Vendu' && b.prix <= budget).length;
      return `<a href="${catLink(CAT_URL[cat], budget)}"><span>${label}<em>≤ ${short(budget)} F CFA</em></span><b>${n}</b></a>`;
    }).join('');
    const w = $('#k-warn'); w.classList.toggle('on', mMax === 0);
    w.textContent = mMax === 0 ? 'Vos crédits en cours dépassent le taux d\'endettement choisi : parlons-en avec un conseiller.' : '';
    last.cap = { rev, ch, end, taux, ans, apport, mMax, cap, budget };
  };
  linkNum('#c-rev', '#c-rev-n', calcCap);
  linkNum('#c-char', '#c-char-n', calcCap);
  linkNum('#c-apport', '#c-apport-n', calcCap);
  ['#c-end', '#c-taux', '#c-duree'].forEach((s) => $(s).addEventListener('input', calcCap));
  calcCap();

  /* ---------- envoi au conseiller ---------- */
  $('#send-mens').addEventListener('click', () => {
    const d = last.mens;
    openWA(['Bonjour REVA, voici ma simulation de prêt immobilier :', `• Prix du bien : ${pf(d.prix)}`, `• Apport : ${pf(d.apport)}`, `• Montant à emprunter : ${pf(d.emp)}`,
      `• Taux : ${pctTxt(d.taux)} sur ${d.ans} ans`, `• Mensualité estimée : ${pf(d.m)} / mois`, '', 'Pouvez-vous m\'aider à monter mon dossier ?'].join('\n'));
  });
  $('#send-cap').addEventListener('click', () => {
    const d = last.cap;
    openWA(['Bonjour REVA, voici ma capacité d\'emprunt estimée :', `• Revenus nets mensuels : ${pf(d.rev)}`, `• Crédits en cours : ${pf(d.ch)} / mois`, `• Apport : ${pf(d.apport)}`,
      `• Mensualité max (${d.end} %) : ${pf(d.mMax)}`, `• Capacité estimée : ${pf(d.cap)} sur ${d.ans} ans à ${pctTxt(d.taux)}`, `• Budget d'achat : ${pf(d.budget)}`, '', 'Pouvez-vous étudier mon dossier ?'].join('\n'));
  });
}

/* =====================================================================
   CO-FINANCEMENT
   ===================================================================== */
function cofi() {
  const COLORS = ['#e3c992', '#5f8f86', '#c8a76a', '#9fc3b8', '#b98c4e', '#d9e4df'];
  const MAX = 6;
  const list = $('#co-list');
  let people = [
    { nom: 'Vous', lieu: 'Dakar', apport: 36e6 },
    { nom: 'Votre frère', lieu: 'Paris', apport: 31.5e6 },
    { nom: 'Votre sœur', lieu: 'Montréal', apport: 22.5e6 },
  ];
  const LIEUX = ['Dakar', 'Thiès', 'Saint-Louis', 'Autre ville du Sénégal', 'Paris', 'Lyon', 'Milan', 'Madrid', 'Bruxelles', 'Londres', 'New York', 'Montréal', 'Autre pays'];

  const renderRows = () => {
    list.innerHTML = people.map((p, i) => `<div class="co-row" data-i="${i}">
      <i style="background:${COLORS[i]}"></i>
      <input class="who" value="${esc(p.nom)}" aria-label="Nom du co-acquéreur ${i + 1}" placeholder="Nom" />
      <select class="lieu" aria-label="Lieu de résidence">${LIEUX.map((l) => `<option${l === p.lieu ? ' selected' : ''}>${l}</option>`).join('')}</select>
      <span class="amt"><input class="ap" inputmode="numeric" value="${fmt(p.apport)}" aria-label="Apport" /><em>F CFA</em></span>
      <button type="button" aria-label="Retirer"${people.length <= 2 ? ' disabled style="visibility:hidden"' : ''}>×</button>
    </div>`).join('');
    $('#co-add').disabled = people.length >= MAX;
    $('#k-n').textContent = `${people.length} personne${people.length > 1 ? 's' : ''}`;
    calc();
  };
  const calc = () => {
    const prix = +$('#k-prix').value;
    const sum = people.reduce((a, p) => a + p.apport, 0);
    const base = Math.max(prix, sum);
    const rest = Math.max(0, prix - sum);
    $('#k-sum').innerHTML = `${fmt(sum)}<span>F CFA sur ${short(prix)}</span>`;
    $('#co-bar').innerHTML = people.map((p, i) => `<span style="width:${(p.apport / base) * 100}%;background:${COLORS[i]}" title="${esc(p.nom)}"></span>`).join('') + (rest ? `<span class="rest" style="width:${(rest / base) * 100}%" title="Reste à financer"></span>` : '');
    $('#co-shares').innerHTML = people.map((p, i) => `<div><span><i style="background:${COLORS[i]}"></i>${esc(p.nom || 'Co-acquéreur ' + (i + 1))} · ${esc(p.lieu)}</span><b>${short(p.apport)} F</b><strong>${sum ? (Math.round((p.apport / sum) * 1000) / 10).toString().replace('.', ',') : 0} %</strong></div>`).join('')
      + (rest ? `<div><span>Reste à financer (prêt ou apports)</span><b>${short(rest)} F</b><strong>—</strong></div>` : '');
    const w = $('#co-warn');
    w.classList.toggle('on', sum > prix);
    w.textContent = sum > prix ? `Les apports dépassent le prix de ${short(sum - prix)} F CFA : ils peuvent couvrir les frais d'acquisition.` : '';
    $('#co-loan').style.display = rest ? '' : 'none';
    $('#co-loan').textContent = `Financer les ${short(rest)} F restants par un prêt`;
  };

  list.addEventListener('input', (e) => {
    const row = e.target.closest('.co-row'); if (!row) return;
    const p = people[+row.dataset.i];
    if (e.target.classList.contains('who')) p.nom = e.target.value;
    if (e.target.classList.contains('ap')) { p.apport = parseN(e.target.value); }
    calc();
  });
  list.addEventListener('change', (e) => {
    const row = e.target.closest('.co-row'); if (!row) return;
    const p = people[+row.dataset.i];
    if (e.target.classList.contains('lieu')) p.lieu = e.target.value;
    if (e.target.classList.contains('ap')) e.target.value = fmt(p.apport);
    calc();
  });
  list.addEventListener('focusin', (e) => e.target.classList.contains('ap') && e.target.select());
  list.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    people.splice(+b.closest('.co-row').dataset.i, 1); renderRows();
  });
  $('#co-add').addEventListener('click', () => {
    if (people.length >= MAX) return;
    const sum = people.reduce((a, p) => a + p.apport, 0);
    people.push({ nom: `Co-acquéreur ${people.length + 1}`, lieu: 'Dakar', apport: Math.max(0, +$('#k-prix').value - sum) });
    renderRows();
    $$('.co-row .who', list).at(-1).focus();
  });
  linkNum('#k-prix', '#k-prix-n', calc);
  renderRows();

  $('#co-send').addEventListener('click', () => {
    const prix = +$('#k-prix').value, sum = people.reduce((a, p) => a + p.apport, 0);
    openWA(['Bonjour REVA, nous souhaitons acheter à plusieurs.', `• Budget visé : ${pf(prix)}`, ...people.map((p) => `• ${p.nom} (${p.lieu}) : ${pf(p.apport)} — ${sum ? Math.round((p.apport / sum) * 100) : 0} %`),
      prix > sum ? `• Reste à financer : ${pf(prix - sum)}` : '', '', 'Pouvez-vous nous accompagner ?'].filter(Boolean).join('\n'));
  });
}

common();
if (PAGE === 'vendez') vendezQuick(vendez());
if (PAGE === 'diaspora') diaspora();
if (PAGE === 'pret') pret();
if (PAGE === 'cofi') cofi();
