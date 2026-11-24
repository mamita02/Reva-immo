/* =====================================================================
   REVA — Catalogue (Ventes directes · Biens en VEFA · Terrains)
   Filtres à facettes, tri, cartes avec galerie, visionneuse zoomable,
   fiche rapide avec carte Google Maps, favoris, liens partageables.
   ===================================================================== */
import { BIENS } from './data/biens.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const PHONE = '221781752323';
const PAGE_SIZE = 12;

/* ---------- configuration par page ---------- */
const PAGES = {
  ventes: {
    hero: ['24837', '25548', '25562'], feature: '25619',
    groups: ['q', 'type', 'quartier', 'prix', 'surface', 'chambres', 'equip', 'statut'],
  },
  vefa: {
    hero: ['25362', '25429', '24397'], feature: '25429',
    groups: ['q', 'etape', 'quartier', 'prix', 'surface', 'chambres', 'type', 'equip', 'statut'],
  },
  terrains: {
    hero: ['25165', '24564', '24612'], feature: '25545',
    groups: ['q', 'type', 'quartier', 'prix', 'surface', 'statut'],
  },
};
const CAT = document.body.dataset.cat;
const CONF = PAGES[CAT];
const ALL = BIENS[CAT].map((b, i) => ({ ...b, order: i }));
const byId = new Map(ALL.map((b) => [b.id, b]));

/* ---------- icônes ---------- */
const I = {
  pin: '<svg class="i" viewBox="0 0 24 24"><path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  area: '<svg class="i" viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  bed: '<svg class="i" viewBox="0 0 24 24"><path d="M3 18v-6.5A1.5 1.5 0 0 1 4.5 10h15a1.5 1.5 0 0 1 1.5 1.5V18M3 15h18M6 10V7.5A1.5 1.5 0 0 1 7.5 6h3A1.5 1.5 0 0 1 12 7.5V10M3 18v2M21 18v2"/></svg>',
  bath: '<svg class="i" viewBox="0 0 24 24"><path d="M4 12h16v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-2zM6 12V6a2 2 0 0 1 4 0M7 19l-1 2M17 19l1 2"/></svg>',
  heart: '<svg class="i" viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-9.2-9.3C1.6 7.2 4 4 7.3 4c2 0 3.5 1.1 4.7 2.7C13.2 5.1 14.7 4 16.7 4 20 4 22.4 7.2 21.2 10.7 19.5 15.4 12 20 12 20z"/></svg>',
  zoom: '<svg class="i" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.8-4.8M10.5 7.5v6M7.5 10.5h6"/></svg>',
  cam: '<svg class="i" viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  l: '<svg class="i" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  r: '<svg class="i" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  x: '<svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  phone: '<svg class="i" viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
  wa: '<svg class="i fill" viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3a.5.5 0 0 0 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3z"/></svg>',
  share: '<svg class="i" viewBox="0 0 24 24"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/></svg>',
  plus: '<svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg class="i" viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
  reset: '<svg class="i" viewBox="0 0 24 24"><path d="M4 4v6h6M4.5 15a8 8 0 1 0 1.9-8.3L4 10"/></svg>',
  ext: '<svg class="i" viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  search: '<svg class="i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
};

/* ---------- utilitaires ---------- */
const nf = new Intl.NumberFormat('fr-FR');
const fmt = (n) => nf.format(n);
const short = (n) => {
  if (n == null) return '—';
  if (n >= 1e9) return `${+(n / 1e9).toFixed(2)} Md`;
  if (n >= 1e6) return `${+(n / 1e6).toFixed(1)} M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)} k`;
  return String(n);
};
const full = (u) => u.replace(/-\d+x\d+(\.\w+)$/, '$1');
const where = (b) => `${b.adresse || b.quartier}, Sénégal`;
const mapsUrl = (b) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(where(b))}`;
const mapsEmbed = (b) => `https://maps.google.com/maps?q=${encodeURIComponent(where(b))}&z=14&output=embed`;
const shareUrl = (b) => `${location.origin}${location.pathname}#bien-${b.id}`;
const waUrl = (b) => `https://wa.me/${PHONE}?text=${encodeURIComponent(`Bonjour REVA, je suis intéressé(e) par « ${b.titre} » (${b.quartier}) — réf. ${b.id}.\n${shareUrl(b)}`)}`;
const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const plural = (n, s, p = s + 's') => `${n} ${n > 1 ? p : s}`;

function priceHTML(b, big = false) {
  if (b.prix) {
    const m2 = b.surface && !b.lot && b.type !== 'Terrain' ? `<span class="m2">≈ ${fmt(Math.round(b.prix / b.surface))} F CFA / m²</span>` : (b.surface && b.type === 'Terrain' && !b.lot ? `<span class="m2">≈ ${fmt(Math.round(b.prix / b.surface))} F CFA / m²</span>` : '');
    return `<div class="p-price">${b.lot ? '<small>dès</small>' : ''}${fmt(b.prix)} <small>F CFA</small>${m2}</div>`;
  }
  if (b.prixM2) return `<div class="p-price"><small>dès</small>${fmt(b.prixM2)} <small>F CFA / m²</small></div>`;
  return `<div class="p-price ask">Prix sur demande</div>`;
}
function badgesHTML(b) {
  const out = [`<span class="badge">${esc(b.type)}</span>`];
  if (b.etape && b.etape !== 'Non précisé') out.push(`<span class="badge gold">${esc(b.etape)}</span>`);
  if (b.statut === 'Vendu') out.push('<span class="badge sold">Vendu</span>');
  else if (b.statut === 'En attente') out.push('<span class="badge wait">Bientôt</span>');
  if (b.equip?.includes('Vue mer')) out.push('<span class="badge light">Vue mer</span>');
  return `<div class="p-badges">${out.join('')}</div>`;
}
function specsHTML(b) {
  const s = [];
  if (b.surface) s.push(`<li>${I.area}${fmt(b.surface)} m²</li>`);
  if (b.chambres) s.push(`<li>${I.bed}${plural(b.chambres, 'ch.', 'ch.')}</li>`);
  if (b.sdb) s.push(`<li>${I.bath}${plural(b.sdb, 'sdb', 'sdb')}</li>`);
  if (!s.length) s.push(`<li>${I.cam}${plural(b.imgs.length, 'photo')}</li>`);
  return `<ul class="p-specs">${s.join('')}</ul>`;
}

/* ---------- favoris ---------- */
const FKEY = 'reva-favoris';
const favs = new Set(JSON.parse(localStorage.getItem(FKEY) || '[]'));
const saveFavs = () => localStorage.setItem(FKEY, JSON.stringify([...favs]));

/* ---------- toast ---------- */
const toastEl = $('#toast');
let toastT;
function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 2200); }

/* =====================================================================
   ÉTAT DES FILTRES (+ synchronisation avec l'URL)
   ===================================================================== */
const PRICE_STEPS = [0, 5e6, 10e6, 20e6, 30e6, 50e6, 75e6, 100e6, 125e6, 150e6, 200e6, 250e6, 300e6, 400e6, 500e6, 750e6, 1e9];
const SURF_STEPS = [0, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500, 750, 1000, 1e5];
const S = {
  q: '', types: new Set(), quartiers: new Set(), etapes: new Set(), equip: new Set(),
  p: [0, PRICE_STEPS.length - 1], s: [0, SURF_STEPS.length - 1], ask: true,
  ch: 0, hideSold: false, fav: false, sort: 'reco', view: 'grid', shown: PAGE_SIZE,
};
const SORTS = { reco: 'Recommandés', 'prix-asc': 'Prix croissant', 'prix-desc': 'Prix décroissant', 'surface-desc': 'Surface (grande → petite)', 'm2-asc': 'Prix au m² le plus bas' };

function readURL() {
  const u = new URLSearchParams(location.search);
  const list = (k) => (u.get(k) ? u.get(k).split('|').filter(Boolean) : []);
  S.q = u.get('q') || '';
  S.types = new Set(list('type')); S.quartiers = new Set(list('quartier'));
  S.etapes = new Set(list('etape')); S.equip = new Set(list('equip'));
  if (u.get('prix')) { const [a, b] = u.get('prix').split('-').map(Number); S.p = [a || 0, Number.isFinite(b) ? b : PRICE_STEPS.length - 1]; }
  if (u.get('surface')) { const [a, b] = u.get('surface').split('-').map(Number); S.s = [a || 0, Number.isFinite(b) ? b : SURF_STEPS.length - 1]; }
  S.ch = +u.get('ch') || 0; S.hideSold = u.get('vendus') === '0'; S.fav = u.get('favoris') === '1';
  S.ask = u.get('demande') !== '0';
  S.sort = SORTS[u.get('tri')] ? u.get('tri') : 'reco';
  S.view = u.get('vue') === 'liste' ? 'list' : 'grid';
}
function writeURL() {
  const u = new URLSearchParams();
  if (S.q) u.set('q', S.q);
  if (S.types.size) u.set('type', [...S.types].join('|'));
  if (S.quartiers.size) u.set('quartier', [...S.quartiers].join('|'));
  if (S.etapes.size) u.set('etape', [...S.etapes].join('|'));
  if (S.equip.size) u.set('equip', [...S.equip].join('|'));
  if (S.p[0] > 0 || S.p[1] < PRICE_STEPS.length - 1) u.set('prix', S.p.join('-'));
  if (S.s[0] > 0 || S.s[1] < SURF_STEPS.length - 1) u.set('surface', S.s.join('-'));
  if (!S.ask) u.set('demande', '0');
  if (S.ch) u.set('ch', S.ch);
  if (S.hideSold) u.set('vendus', '0');
  if (S.fav) u.set('favoris', '1');
  if (S.sort !== 'reco') u.set('tri', S.sort);
  if (S.view === 'list') u.set('vue', 'liste');
  const qs = u.toString();
  history.replaceState(null, '', `${location.pathname}${qs ? '?' + qs : ''}${location.hash}`);
}

/* ---------- application des filtres (avec exclusion d'un groupe pour les compteurs) ---------- */
const priceActive = () => S.p[0] > 0 || S.p[1] < PRICE_STEPS.length - 1;
const surfActive = () => S.s[0] > 0 || S.s[1] < SURF_STEPS.length - 1;
function match(b, skip) {
  if (skip !== 'q' && S.q) {
    const hay = fold(`${b.titre} ${b.quartier} ${b.adresse} ${b.type} ${b.etape || ''} ${(b.equip || []).join(' ')} ${b.id}`);
    if (!fold(S.q).split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  if (skip !== 'type' && S.types.size && !S.types.has(b.type)) return false;
  if (skip !== 'quartier' && S.quartiers.size && !S.quartiers.has(b.quartier)) return false;
  if (skip !== 'etape' && S.etapes.size && !S.etapes.has(b.etape)) return false;
  if (skip !== 'equip' && S.equip.size && ![...S.equip].every((e) => b.equip?.includes(e))) return false;
  if (skip !== 'prix') {
    if (b.prix) { if (b.prix < PRICE_STEPS[S.p[0]] || (S.p[1] < PRICE_STEPS.length - 1 && b.prix > PRICE_STEPS[S.p[1]])) return false; }
    else if (!S.ask) return false;
  }
  if (skip !== 'surface' && surfActive()) {
    if (!b.surface || b.surface < SURF_STEPS[S.s[0]] || (S.s[1] < SURF_STEPS.length - 1 && b.surface > SURF_STEPS[S.s[1]])) return false;
  }
  if (skip !== 'chambres' && S.ch && !(b.chambres >= S.ch)) return false;
  if (skip !== 'statut' && S.hideSold && b.statut === 'Vendu') return false;
  if (skip !== 'fav' && S.fav && !favs.has(b.id)) return false;
  return true;
}
const filtered = (skip) => ALL.filter((b) => match(b, skip));
function sorted(list) {
  const nullLast = (v, dir) => (v == null ? Infinity : v * dir);
  const sold = (b) => (b.statut === 'Vendu' ? 1 : 0);
  const fns = {
    reco: (a, b) => sold(a) - sold(b) || a.order - b.order,
    'prix-asc': (a, b) => nullLast(a.prix, 1) - nullLast(b.prix, 1),
    'prix-desc': (a, b) => nullLast(a.prix, -1) - nullLast(b.prix, -1),
    'surface-desc': (a, b) => nullLast(a.surface, -1) - nullLast(b.surface, -1),
    'm2-asc': (a, b) => nullLast(a.prix && a.surface ? a.prix / a.surface : a.prixM2, 1) - nullLast(b.prix && b.surface ? b.prix / b.surface : b.prixM2, 1),
  };
  return [...list].sort(fns[S.sort]);
}

/* =====================================================================
   HERO
   ===================================================================== */
function buildHero() {
  const col = $('#collage');
  if (col) {
    // photos du hero : assets/hero/<page>-1.webp, -2.webp, -3.webp (remplaçables librement)
    col.innerHTML = CONF.hero.map((id, i) => {
      const b = byId.get(id);
      return `<figure class="f${i + 1}" data-depth="${[18, 10, 26][i]}"${b ? ` data-open="${b.id}" style="cursor:pointer"` : ''}><img src="assets/hero/${CAT}-${i + 1}.webp" alt="${esc(b?.titre || 'REVA Immobilier')}" ${i ? '' : 'fetchpriority="high"'} /></figure>`;
    }).join('');
    const f = byId.get(CONF.feature) || ALL.find((b) => b.prix);
    if (f) {
      col.insertAdjacentHTML('beforeend', `<div class="float-card" data-open="${f.id}" role="button" tabindex="0"><small>À la une</small><b>${esc(f.titre)}</b><span>${f.prix ? fmt(f.prix) + ' F CFA' : f.prixM2 ? 'dès ' + fmt(f.prixM2) + ' F CFA / m²' : 'Prix sur demande'}</span></div>`);
    }
    // léger effet de profondeur au mouvement de la souris
    const hero = $('.c-hero');
    hero.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      $$('figure', col).forEach((fg) => { const d = +fg.dataset.depth; fg.style.transform = `translate3d(${-x * d}px, ${-y * d}px, 0) rotateY(${x * 4}deg) rotateX(${-y * 4}deg)`; });
    });
    hero.addEventListener('pointerleave', () => $$('figure', col).forEach((fg) => (fg.style.transform = '')));
  }

  // chiffres
  const quartiers = new Set(ALL.map((b) => b.quartier));
  const prices = ALL.filter((b) => b.prix && b.statut !== 'Vendu').map((b) => b.prix);
  const stats = {
    count: ALL.filter((b) => b.statut !== 'Vendu').length,
    quartiers: quartiers.size,
    min: prices.length ? short(Math.min(...prices)) : '—',
    chantier: ALL.filter((b) => b.etape === 'En construction').length,
    surface: ALL.reduce((s, b) => s + (b.surface || 0), 0),
  };
  $$('[data-stat]').forEach((el) => {
    const k = el.dataset.stat;
    const v = stats[k];
    if (typeof v === 'number') countUp(el, v, k === 'surface' ? (n) => (n >= 10000 ? `${+(n / 10000).toFixed(1)} ha` : `${fmt(n)} m²`) : fmt);
    else el.textContent = v;
  });

  // étapes VEFA
  $$('.steps-pills [data-etape]').forEach((btn) => {
    const n = ALL.filter((b) => b.etape === btn.dataset.etape).length;
    btn.querySelector('b').textContent = n;
    btn.addEventListener('click', () => { resetState(); S.etapes.add(btn.dataset.etape); applyState(); scrollToShop(); });
  });

  // recherche rapide
  const qf = $('#quick');
  if (qf) {
    const types = [...new Set(ALL.map((b) => b.type))];
    qf.type.innerHTML = '<option value="">Tous les types</option>' + types.map((t) => `<option>${esc(t)}</option>`).join('');
    qf.budget.innerHTML = '<option value="">Sans limite</option>' + PRICE_STEPS.slice(1, -1).filter((p) => prices.some((x) => x <= p) && p <= Math.max(...prices, 0) * 1.5).map((p) => `<option value="${PRICE_STEPS.indexOf(p)}">Jusqu'à ${short(p)} F CFA</option>`).join('');
    $('#quick-list').innerHTML = [...quartiers].sort().map((q) => `<option value="${esc(q)}">`).join('');
    qf.addEventListener('submit', (e) => {
      e.preventDefault();
      resetState();
      const txt = qf.q.value.trim();
      const exact = [...quartiers].find((q) => fold(q) === fold(txt));
      if (exact) S.quartiers.add(exact); else S.q = txt;
      if (qf.type.value) S.types.add(qf.type.value);
      if (qf.budget.value) { S.p = [0, +qf.budget.value]; }
      applyState(); scrollToShop();
    });
  }
}
function countUp(el, to, f) {
  const t0 = performance.now(), d = 1400;
  const tick = (t) => { const k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 3); el.textContent = f(Math.round(to * e)); if (k < 1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}
const scrollToShop = () => $('#catalogue').scrollIntoView({ behavior: 'smooth', block: 'start' });

/* =====================================================================
   PANNEAU DE FILTRES
   ===================================================================== */
const panel = $('#filters');
const GROUP_TITLES = { q: 'Recherche', type: 'Type de bien', quartier: 'Quartier', etape: 'Avancement des travaux', prix: 'Budget', surface: 'Surface', chambres: 'Chambres', equip: 'Équipements', statut: 'Disponibilité' };

function buildFilters() {
  const body = CONF.groups.map((g) => {
    if (g === 'chambres' && !ALL.some((b) => b.chambres)) return '';
    if (g === 'equip' && !ALL.some((b) => b.equip?.length)) return '';
    if (g === 'statut' && !ALL.some((b) => b.statut === 'Vendu')) return '';
    return `<div class="fgroup${['equip', 'surface'].includes(g) ? ' closed' : ''}" data-g="${g}"><button class="fg-h" type="button">${GROUP_TITLES[g]}</button><div class="fg-b" data-body="${g}"></div></div>`;
  }).join('');
  panel.insertAdjacentHTML('beforeend', body);

  $$('.fg-h', panel).forEach((h) => h.addEventListener('click', () => h.parentElement.classList.toggle('closed')));

  // recherche
  const qb = $('[data-body="q"]', panel);
  if (qb) {
    qb.innerHTML = `<div class="search-in">${I.search}<input type="search" id="f-q" placeholder="Quartier, résidence, F4, vue mer…" autocomplete="off" /></div>
      <label class="toggle"><span>${I.heart} Mes favoris uniquement</span><input type="checkbox" id="f-fav" /></label>`;
    $('#f-q').addEventListener('input', debounce((e) => { S.q = e.target.value.trim(); applyState(); }, 220));
    $('#f-fav').addEventListener('change', (e) => { S.fav = e.target.checked; applyState(); });
  }
  // budget
  const pb = $('[data-body="prix"]', panel);
  if (pb) {
    pb.innerHTML = rangeHTML('p') + `<label class="toggle"><span>Inclure « Prix sur demande »</span><input type="checkbox" id="f-ask" /></label>`;
    bindRange('p', PRICE_STEPS, (v, i, last) => (i === 0 ? 'Min' : i === last ? 'Max' : `${short(v)}`));
    $('#f-ask').addEventListener('change', (e) => { S.ask = e.target.checked; applyState(); });
  }
  const sb = $('[data-body="surface"]', panel);
  if (sb) {
    sb.innerHTML = rangeHTML('s');
    bindRange('s', SURF_STEPS, (v, i, last) => (i === 0 ? 'Min' : i === last ? 'Max' : v >= 10000 ? `${v / 10000} ha` : `${v} m²`));
  }
  // chambres
  const cb = $('[data-body="chambres"]', panel);
  if (cb) {
    cb.innerHTML = `<div class="seg">${[0, 1, 2, 3, 4].map((n) => `<button type="button" data-ch="${n}">${n ? n + '+' : 'Tous'}</button>`).join('')}</div>`;
    $$('[data-ch]', cb).forEach((b) => b.addEventListener('click', () => { S.ch = +b.dataset.ch; applyState(); }));
  }
  // disponibilité
  const st = $('[data-body="statut"]', panel);
  if (st) {
    st.innerHTML = `<label class="toggle"><span>Masquer les biens vendus</span><input type="checkbox" id="f-sold" /></label>`;
    $('#f-sold').addEventListener('change', (e) => { S.hideSold = e.target.checked; applyState(); });
  }

  $('#f-reset').addEventListener('click', () => { resetState(); applyState(); });
}

function rangeHTML(k) {
  return `<div class="histo" id="h-${k}"></div><div class="range" id="r-${k}"><div class="track"></div><div class="fill"></div><input type="range" aria-label="minimum" /><input type="range" aria-label="maximum" /></div><div class="range-vals"><span id="v-${k}0"></span><span id="v-${k}1"></span></div>`;
}
function bindRange(k, steps, label) {
  const last = steps.length - 1;
  const [a, b] = $$(`#r-${k} input`);
  [a, b].forEach((inp) => { inp.min = 0; inp.max = last; inp.step = 1; });
  const onInput = (which) => {
    let lo = +a.value, hi = +b.value;
    if (lo >= hi) { if (which === 0) lo = a.value = hi - 1; else hi = b.value = lo + 1; }
    S[k] = [lo, hi];
    paintRange(k, steps, label);
  };
  a.addEventListener('input', () => onInput(0));
  b.addEventListener('input', () => onInput(1));
  const commit = debounce(() => applyState(), 120);
  a.addEventListener('change', commit); b.addEventListener('change', commit);
  a.addEventListener('input', debounce(() => applyState(), 260));
  b.addEventListener('input', debounce(() => applyState(), 260));
  rangeFns[k] = () => paintRange(k, steps, label);
}
const rangeFns = {};
function paintRange(k, steps, label) {
  const last = steps.length - 1;
  const [a, b] = $$(`#r-${k} input`);
  a.value = S[k][0]; b.value = S[k][1];
  const fill = $(`#r-${k} .fill`);
  fill.style.left = `${(S[k][0] / last) * 100}%`;
  fill.style.right = `${100 - (S[k][1] / last) * 100}%`;
  $(`#v-${k}0`).textContent = label(steps[S[k][0]], S[k][0], last);
  $(`#v-${k}1`).textContent = label(steps[S[k][1]], S[k][1], last);
  $$(`#h-${k} i`).forEach((bar, i) => bar.classList.toggle('in', i >= S[k][0] && i < S[k][1]));
}
function histo(k, steps, field, list) {
  const el = $(`#h-${k}`);
  if (!el) return;
  const buckets = new Array(steps.length - 1).fill(0);
  list.forEach((b) => { const v = b[field]; if (!v) return; let i = steps.findIndex((s, j) => j > 0 && v <= s) - 1; if (i < 0) i = buckets.length - 1; buckets[i]++; });
  const max = Math.max(1, ...buckets);
  el.innerHTML = buckets.map((n) => `<i style="height:${n ? 12 + (n / max) * 88 : 4}%" title="${n}"></i>`).join('');
}

/* ---------- facettes (compteurs dynamiques) ---------- */
function facets() {
  const chipGroup = (g, key, set, values) => {
    const body = $(`[data-body="${g}"]`, panel);
    if (!body) return;
    const base = filtered(g);
    const counts = {};
    base.forEach((b) => { [].concat(b[key] || []).forEach((v) => (counts[v] = (counts[v] || 0) + 1)); });
    body.innerHTML = `<div class="chips">${values.map((v) => `<button type="button" class="chip${set.has(v) ? ' on' : ''}" data-v="${esc(v)}" ${!counts[v] && !set.has(v) ? 'disabled' : ''}>${esc(v)} <small>${counts[v] || 0}</small></button>`).join('')}</div>`;
    $$('.chip', body).forEach((c) => c.addEventListener('click', () => { const v = c.dataset.v; set.has(v) ? set.delete(v) : set.add(v); applyState(); }));
  };
  const freq = (key) => { const c = {}; ALL.forEach((b) => [].concat(b[key] || []).forEach((v) => (c[v] = (c[v] || 0) + 1))); return Object.keys(c).sort((a, b) => c[b] - c[a]); };

  chipGroup('type', 'type', S.types, freq('type'));
  chipGroup('etape', 'etape', S.etapes, ['Sur plan', 'En construction', 'En finition', 'Non précisé'].filter((e) => ALL.some((b) => b.etape === e)));
  chipGroup('equip', 'equip', S.equip, freq('equip').slice(0, 10));

  // quartiers : liste à cocher avec recherche
  const qb = $('[data-body="quartier"]', panel);
  if (qb) {
    const base = filtered('quartier');
    const c = {};
    base.forEach((b) => (c[b.quartier] = (c[b.quartier] || 0) + 1));
    const all = [...new Set(ALL.map((b) => b.quartier))].sort((a, b) => (c[b] || 0) - (c[a] || 0) || a.localeCompare(b, 'fr'));
    const prevQ = $('.mini-search', qb)?.value || '';
    qb.innerHTML = `<input class="mini-search" placeholder="Filtrer les ${all.length} quartiers…" value="${esc(prevQ)}" /><div class="checks">${all.map((q) => `<label class="check" data-name="${esc(fold(q))}"><input type="checkbox" value="${esc(q)}" ${S.quartiers.has(q) ? 'checked' : ''} /><span>${esc(q)}</span><small>${c[q] || 0}</small></label>`).join('')}</div>`;
    const ms = $('.mini-search', qb);
    const filt = () => $$('.check', qb).forEach((l) => (l.style.display = l.dataset.name.includes(fold(ms.value)) ? '' : 'none'));
    ms.addEventListener('input', filt); filt();
    $$('input[type=checkbox]', qb).forEach((cbx) => cbx.addEventListener('change', () => { cbx.checked ? S.quartiers.add(cbx.value) : S.quartiers.delete(cbx.value); applyState(); }));
  }

  histo('p', PRICE_STEPS, 'prix', filtered('prix'));
  histo('s', SURF_STEPS, 'surface', filtered('surface'));
  rangeFns.p?.(); rangeFns.s?.();

  $$('[data-ch]', panel).forEach((b) => b.classList.toggle('on', +b.dataset.ch === S.ch));
  if ($('#f-q') && document.activeElement !== $('#f-q')) $('#f-q').value = S.q;
  if ($('#f-fav')) $('#f-fav').checked = S.fav;
  if ($('#f-ask')) $('#f-ask').checked = S.ask;
  if ($('#f-sold')) $('#f-sold').checked = S.hideSold;
}

/* ---------- filtres actifs (pastilles) ---------- */
function activePills() {
  const p = [];
  if (S.q) p.push([`« ${S.q} »`, () => (S.q = '')]);
  if (S.fav) p.push(['Mes favoris', () => (S.fav = false)]);
  S.types.forEach((v) => p.push([v, () => S.types.delete(v)]));
  S.etapes.forEach((v) => p.push([v, () => S.etapes.delete(v)]));
  S.quartiers.forEach((v) => p.push([v, () => S.quartiers.delete(v)]));
  S.equip.forEach((v) => p.push([v, () => S.equip.delete(v)]));
  if (priceActive()) p.push([`${S.p[0] ? short(PRICE_STEPS[S.p[0]]) : '0'} – ${S.p[1] < PRICE_STEPS.length - 1 ? short(PRICE_STEPS[S.p[1]]) : '∞'} F CFA`, () => (S.p = [0, PRICE_STEPS.length - 1])]);
  if (surfActive()) p.push([`${SURF_STEPS[S.s[0]]} – ${S.s[1] < SURF_STEPS.length - 1 ? SURF_STEPS[S.s[1]] : '∞'} m²`, () => (S.s = [0, SURF_STEPS.length - 1])]);
  if (!S.ask) p.push(['Prix affichés uniquement', () => (S.ask = true)]);
  if (S.ch) p.push([`${S.ch}+ chambres`, () => (S.ch = 0)]);
  if (S.hideSold) p.push(['Sans les vendus', () => (S.hideSold = false)]);
  const el = $('#pills');
  el.innerHTML = p.map(([t], i) => `<button type="button" class="pill" data-i="${i}">${esc(t)} <i>✕</i></button>`).join('') + (p.length > 1 ? '<button type="button" class="link-btn" id="pills-clear">Tout effacer</button>' : '');
  $$('.pill', el).forEach((b) => b.addEventListener('click', () => { p[+b.dataset.i][1](); applyState(); }));
  $('#pills-clear')?.addEventListener('click', () => { resetState(); applyState(); });
  $('#f-badge').textContent = p.length ? `(${p.length})` : '';
}

function resetState() {
  Object.assign(S, { q: '', types: new Set(), quartiers: new Set(), etapes: new Set(), equip: new Set(), p: [0, PRICE_STEPS.length - 1], s: [0, SURF_STEPS.length - 1], ask: true, ch: 0, hideSold: false, fav: false });
}

/* =====================================================================
   GRILLE DE CARTES
   ===================================================================== */
const grid = $('#grid');
let current = [];

function cardHTML(b) {
  const n = b.imgs.length;
  return `<article class="p-card" data-id="${b.id}">
    <div class="p-media" data-i="0">
      <div class="p-track">${b.imgs.map((src, i) => `<img ${i === 0 ? `src="${src}" loading="lazy" class="cur"` : `data-src="${src}"`} alt="${esc(b.titre)} — photo ${i + 1}" draggable="false" />`).join('')}</div>
      ${b.statut === 'Vendu' ? '<div class="sold-veil"></div>' : ''}
      ${badgesHTML(b)}
      <button class="fav${favs.has(b.id) ? ' on' : ''}" type="button" aria-label="Ajouter aux favoris">${I.heart}</button>
      ${n > 1 ? `<button class="nav-arrow prev" type="button" aria-label="Photo précédente">${I.l}</button><button class="nav-arrow next" type="button" aria-label="Photo suivante">${I.r}</button><div class="p-dots">${b.imgs.slice(0, 6).map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>` : ''}
      <span class="photo-count">${I.cam} ${n}</span>
      <span class="zoom-hint">${I.zoom} Agrandir</span>
    </div>
    <div class="p-body">
      ${priceHTML(b)}
      <h3 class="p-title" data-open="${b.id}">${esc(b.titre)}</h3>
      <a class="p-loc" href="${mapsUrl(b)}" target="_blank" rel="noopener" title="Ouvrir dans Google Maps">${I.pin}<span>${esc(b.quartier)}</span><u>Voir sur la carte ↗</u></a>
      ${b.extrait ? `<p class="p-extrait">${esc(b.extrait)}</p>` : ''}
      ${specsHTML(b)}
      <div class="p-actions">
        <button class="btn btn-green" type="button" data-open="${b.id}">Voir le bien</button>
        <a class="ic-btn wa" href="${waUrl(b)}" target="_blank" rel="noopener" aria-label="WhatsApp">${I.wa}</a>
        <a class="ic-btn" href="tel:+${PHONE}" aria-label="Appeler">${I.phone}</a>
      </div>
    </div>
  </article>`;
}

function render({ keepShown = false } = {}) {
  current = sorted(filtered());
  if (!keepShown) S.shown = PAGE_SIZE;
  const list = current.slice(0, S.shown);
  const total = ALL.length;
  $('#count').innerHTML = `<b>${current.length}</b> ${current.length > 1 ? 'biens' : 'bien'}${current.length !== total ? ` sur ${total}` : ''}`;
  $('#f-apply-n').textContent = current.length;

  grid.classList.toggle('list', S.view === 'list');
  if (!current.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><p class="big">Aucun bien ne correspond…</p><p>Élargissez votre budget ou retirez un filtre. Nos conseillers peuvent aussi chercher pour vous.</p><button class="btn btn-green" type="button" id="empty-reset">Réinitialiser les filtres</button></div>`;
    $('#empty-reset').addEventListener('click', () => { resetState(); applyState(); });
  } else {
    grid.innerHTML = list.map(cardHTML).join('');
    $$('.p-card', grid).forEach(bindCard);
    observeCards();
  }
  const more = $('#more');
  more.hidden = current.length <= S.shown;
  $('#more-txt').textContent = `${Math.min(S.shown, current.length)} sur ${current.length} biens affichés`;
  $('#more-bar').style.width = `${(Math.min(S.shown, current.length) / Math.max(1, current.length)) * 100}%`;
}

function loadMore() {
  const from = S.shown;
  S.shown += PAGE_SIZE;
  const add = current.slice(from, S.shown);
  grid.insertAdjacentHTML('beforeend', add.map(cardHTML).join(''));
  $$('.p-card', grid).slice(from).forEach(bindCard);
  observeCards();
  $('#more').hidden = current.length <= S.shown;
  $('#more-txt').textContent = `${Math.min(S.shown, current.length)} sur ${current.length} biens affichés`;
  $('#more-bar').style.width = `${(Math.min(S.shown, current.length) / current.length) * 100}%`;
}

const cardIO = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const delay = (+el.dataset.k || 0) * 70;
    setTimeout(() => el.classList.add('in'), delay);
    cardIO.unobserve(el);
  });
}, { rootMargin: '0px 0px -40px 0px' });
function observeCards() {
  let k = 0;
  $$('.p-card:not(.in)', grid).forEach((c) => { c.dataset.k = k++ % 3; cardIO.observe(c); });
}

function bindCard(card) {
  const b = byId.get(card.dataset.id);
  const media = $('.p-media', card);
  const track = $('.p-track', media);
  const imgs = $$('img', track);
  const dots = $$('.p-dots i', media);
  const markOk = (img) => { if (img.complete && img.naturalWidth) img.classList.add('ok'); else img.addEventListener('load', () => img.classList.add('ok'), { once: true }); };
  markOk(imgs[0]);
  imgs[0].addEventListener('error', () => imgs[0].classList.add('ok'), { once: true });
  const load = (i) => { const im = imgs[i]; if (im && im.dataset.src) { im.src = im.dataset.src; im.removeAttribute('data-src'); markOk(im); } };
  const go = (i) => {
    const n = imgs.length;
    i = (i + n) % n;
    load(i); load((i + 1) % n);
    media.dataset.i = i;
    track.style.transform = `translateX(${-i * 100}%)`;
    imgs.forEach((im, j) => im.classList.toggle('cur', j === i));
    dots.forEach((d, j) => d.classList.toggle('on', j === Math.min(i, dots.length - 1)));
  };
  media.addEventListener('mouseenter', () => load(1), { once: true });
  $('.prev', media)?.addEventListener('click', (e) => { e.stopPropagation(); go(+media.dataset.i - 1); });
  $('.next', media)?.addEventListener('click', (e) => { e.stopPropagation(); go(+media.dataset.i + 1); });

  // glisser (mobile) / cliquer pour agrandir
  let x0 = null, y0 = 0;
  media.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; x0 = e.clientX; y0 = e.clientY; });
  media.addEventListener('pointerup', (e) => {
    if (x0 == null || e.target.closest('button')) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(+media.dataset.i + (dx < 0 ? 1 : -1));
    else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) Lightbox.open(b, +media.dataset.i);
  });
  media.style.touchAction = 'pan-y';

  $('.fav', card).addEventListener('click', (e) => { e.stopPropagation(); toggleFav(b, e.currentTarget); });
}

function toggleFav(b, btn) {
  if (favs.has(b.id)) { favs.delete(b.id); toast('Retiré de vos favoris'); }
  else { favs.add(b.id); toast('Ajouté à vos favoris ♥'); }
  saveFavs();
  $$(`.p-card[data-id="${b.id}"] .fav, .qv .fav[data-id="${b.id}"]`).forEach((f) => { f.classList.toggle('on', favs.has(b.id)); f.classList.remove('pop'); void f.offsetWidth; f.classList.add('pop'); });
  if (btn) { btn.classList.toggle('on', favs.has(b.id)); }
  if (S.fav) applyState({ keepShown: true });
}

function applyState(opts = {}) {
  facets();
  activePills();
  $('#sort').value = S.sort;
  $$('.views button').forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
  render(opts);
  writeURL();
}

/* =====================================================================
   FICHE RAPIDE
   ===================================================================== */
const QV = (() => {
  const root = $('#qv');
  let b = null, i = 0, lastFocus = null;
  const box = $('.qv-box', root);

  function show(id) {
    b = byId.get(id);
    if (!b) return;
    i = 0;
    lastFocus = document.activeElement;
    const specs = [];
    if (b.surface) specs.push(['Surface', `${fmt(b.surface)} m²`]);
    if (b.chambres) specs.push(['Chambres', b.chambres]);
    if (b.sdb) specs.push(['Salles de bain', b.sdb]);
    specs.push(['Type', b.type]);
    if (b.etape) specs.push(['Avancement', b.etape]);
    specs.push(['Statut', b.statut]);
    specs.push(['Photos', b.imgs.length]);
    if (b.prix && b.surface && !b.lot) specs.push(['Prix / m²', `${fmt(Math.round(b.prix / b.surface))} F`]);
    specs.push(['Référence', b.id]);

    box.innerHTML = `
      <button class="qv-close" type="button" aria-label="Fermer">${I.x}</button>
      <div class="qv-gal">
        <div class="qv-main">
          <img class="blur" alt="" aria-hidden="true" />
          <img class="main" alt="${esc(b.titre)}" />
          ${b.imgs.length > 1 ? `<button class="nav-arrow prev" type="button" aria-label="Photo précédente">${I.l}</button><button class="nav-arrow next" type="button" aria-label="Photo suivante">${I.r}</button>` : ''}
          <span class="photo-count"><span id="qv-n">1</span> / ${b.imgs.length}</span>
          <span class="zoom-hint">${I.zoom} Cliquer pour zoomer</span>
        </div>
        ${b.imgs.length > 1 ? `<div class="qv-thumbs">${b.imgs.map((src, k) => `<button type="button" data-k="${k}" aria-label="Photo ${k + 1}"><img src="${src}" alt="" loading="lazy" /></button>`).join('')}</div>` : ''}
      </div>
      <div class="qv-info">
        ${badgesHTML(b)}
        <h2 id="qv-title">${esc(b.titre)}</h2>
        <a class="p-loc" href="${mapsUrl(b)}" target="_blank" rel="noopener">${I.pin}<span>${esc(b.adresse || b.quartier)}</span><u>Ouvrir Google Maps ↗</u></a>
        ${priceHTML(b, true)}
        <div class="qv-specs">${specs.map(([k, v]) => `<div><small>${k}</small><b>${esc(v)}</b></div>`).join('')}</div>
        ${b.extrait ? `<p class="qv-desc">${esc(b.extrait)}</p>` : ''}
        ${b.equip?.length ? `<p class="qv-h">Équipements & services</p><div class="amen">${b.equip.map((e) => `<span>${esc(e)}</span>`).join('')}</div>` : ''}
        <p class="qv-h">Localisation</p>
        <div class="qv-map"><iframe title="Carte : ${esc(b.quartier)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="${mapsEmbed(b)}"></iframe><a href="${mapsUrl(b)}" target="_blank" rel="noopener">${I.ext} Itinéraire</a></div>
        <div class="qv-cta">
          <a class="btn btn-wa" href="${waUrl(b)}" target="_blank" rel="noopener">${I.wa} Demander une visite</a>
          <a class="btn btn-green" href="tel:+${PHONE}">${I.phone} +221 78 175 23 23</a>
        </div>
        <div class="qv-share">
          <span>Réf. ${esc(b.id)} · ${esc(b.statut)}</span>
          <span style="display:flex;gap:8px">
            <button class="ic-btn fav${favs.has(b.id) ? ' on' : ''}" data-id="${b.id}" type="button" aria-label="Favori">${I.heart}</button>
            <button class="ic-btn" type="button" id="qv-share" aria-label="Partager">${I.share}</button>
          </span>
        </div>
      </div>`;
    root.setAttribute('aria-labelledby', 'qv-title');
    setImg(0);
    $('.qv-close', box).addEventListener('click', close);
    $('.prev', box)?.addEventListener('click', (e) => { e.stopPropagation(); setImg(i - 1); });
    $('.next', box)?.addEventListener('click', (e) => { e.stopPropagation(); setImg(i + 1); });
    $$('.qv-thumbs button', box).forEach((t) => t.addEventListener('click', () => setImg(+t.dataset.k)));
    $('.qv-main', box).addEventListener('click', (e) => { if (!e.target.closest('button')) Lightbox.open(b, i); });
    $('.fav', box).addEventListener('click', (e) => toggleFav(b, e.currentTarget));
    $('#qv-share').addEventListener('click', () => share(b));
    swipe($('.qv-main', box), (d) => setImg(i + d));

    root.classList.add('open');
    root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lock');
    history.replaceState(null, '', `${location.pathname}${location.search}#bien-${b.id}`);
    setTimeout(() => $('.qv-close', box).focus(), 50);
  }
  function setImg(k) {
    const n = b.imgs.length;
    i = (k + n) % n;
    const main = $('.qv-main img.main', box), blur = $('.qv-main img.blur', box);
    main.style.opacity = 0;
    const src = b.imgs[i];
    const im = new Image();
    im.onload = im.onerror = () => { main.src = src; blur.src = src; main.style.opacity = 1; };
    im.src = src;
    const nEl = $('#qv-n', box); if (nEl) nEl.textContent = i + 1;
    $$('.qv-thumbs button', box).forEach((t, j) => t.classList.toggle('on', j === i));
    $('.qv-thumbs button.on', box)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }
  function close() {
    root.classList.remove('open');
    root.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lock');
    history.replaceState(null, '', `${location.pathname}${location.search}`);
    lastFocus?.focus?.();
    setTimeout(() => { if (!root.classList.contains('open')) box.innerHTML = ''; }, 450);
  }
  $('.qv-bg', root).addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (!root.classList.contains('open') || Lightbox.isOpen()) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') setImg(i + 1);
    if (e.key === 'ArrowLeft') setImg(i - 1);
  });
  return { show, close, isOpen: () => root.classList.contains('open') };
})();

function swipe(el, cb) {
  let x0 = null, y0 = 0;
  el.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) cb(dx < 0 ? 1 : -1);
    x0 = null;
  });
}

async function share(b) {
  const url = shareUrl(b);
  if (navigator.share) { try { await navigator.share({ title: b.titre, text: `${b.titre} — REVA Immobilier`, url }); return; } catch (_) { /* annulé */ } }
  try { await navigator.clipboard.writeText(url); toast('Lien copié dans le presse-papiers'); }
  catch (_) { prompt('Copiez ce lien :', url); }
}

/* =====================================================================
   VISIONNEUSE PLEIN ÉCRAN (zoom molette, double-clic, pincement, glisser)
   ===================================================================== */
const Lightbox = (() => {
  const root = $('#lb');
  const stage = $('.lb-stage', root);
  const img = $('img', stage);
  const thumbs = $('.lb-thumbs', root);
  const zl = $('.zl', root);
  let b = null, i = 0, s = 1, tx = 0, ty = 0;
  const MAX = 5;
  const pointers = new Map();
  let pinch0 = null, drag0 = null, moved = false, lastTap = 0;

  function open(bien, k = 0) {
    b = bien;
    thumbs.innerHTML = b.imgs.length > 1 ? b.imgs.map((src, j) => `<button type="button" data-k="${j}" aria-label="Photo ${j + 1}"><img src="${src}" alt="" loading="lazy" /></button>`).join('') : '';
    $$('button', thumbs).forEach((t) => t.addEventListener('click', () => set(+t.dataset.k)));
    $$('.nav-arrow', root).forEach((a) => (a.hidden = b.imgs.length < 2));
    root.classList.add('open');
    root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lock');
    set(k);
    $('.lb-help', root).style.opacity = 1;
    setTimeout(() => ($('.lb-help', root).style.opacity = 0), 3500);
  }
  function close() {
    root.classList.remove('open');
    root.setAttribute('aria-hidden', 'true');
    if (!QV.isOpen()) document.body.classList.remove('lock');
  }
  function set(k) {
    const n = b.imgs.length;
    i = (k + n) % n;
    reset(false);
    const mid = b.imgs[i], hi = full(mid);
    stage.classList.add('loading');
    img.style.opacity = 0;
    const pre = new Image();
    pre.onload = pre.onerror = () => {
      img.src = mid; img.alt = `${b.titre} — photo ${i + 1}`; img.style.opacity = 1; stage.classList.remove('loading');
      // version haute définition pour un zoom net
      if (hi !== mid) { const h = new Image(); h.onload = () => { if (b && b.imgs[i] === mid) img.src = hi; }; h.src = hi; }
    };
    pre.src = mid;
    $('.lb-title', root).innerHTML = `<b>${i + 1} / ${n}</b>${esc(b.titre)}`;
    $('#lb-full').href = hi;
    $$('button', thumbs).forEach((t, j) => t.classList.toggle('on', j === i));
    $('button.on', thumbs)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }
  function apply() {
    clamp();
    img.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
    stage.classList.toggle('zoomed', s > 1.01);
    zl.textContent = `${Math.round(s * 100)} %`;
  }
  function clamp() {
    const W = stage.clientWidth, H = stage.clientHeight;
    const w = img.offsetWidth * s, h = img.offsetHeight * s;
    const mx = Math.max(0, (w - W) / 2 + 40), my = Math.max(0, (h - H) / 2 + 40);
    if (s <= 1) { tx = 0; ty = 0; return; }
    tx = Math.max(-mx, Math.min(mx, tx));
    ty = Math.max(-my, Math.min(my, ty));
  }
  function reset(anim = true) { s = 1; tx = 0; ty = 0; if (!anim) img.style.transition = 'none'; apply(); if (!anim) requestAnimationFrame(() => (img.style.transition = '')); }
  // zoom centré sur un point (coordonnées écran)
  function zoomAt(ns, cx, cy) {
    ns = Math.max(1, Math.min(MAX, ns));
    const r = stage.getBoundingClientRect();
    const px = cx - (r.left + r.width / 2), py = cy - (r.top + r.height / 2);
    tx = px - (px - tx) * (ns / s);
    ty = py - (py - ty) * (ns / s);
    s = ns;
    apply();
  }
  const center = () => { const r = stage.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

  stage.addEventListener('wheel', (e) => { e.preventDefault(); const dy = Math.max(-60, Math.min(60, e.deltaMode ? e.deltaY * 30 : e.deltaY)); zoomAt(s * Math.exp(-dy * 0.004), e.clientX, e.clientY); }, { passive: false });
  stage.addEventListener('dblclick', (e) => { s > 1.01 ? reset() : zoomAt(2.6, e.clientX, e.clientY); });

  stage.addEventListener('pointerdown', (e) => {
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = false;
    if (pointers.size === 2) {
      const [a, c] = [...pointers.values()];
      pinch0 = { d: Math.hypot(a.x - c.x, a.y - c.y), s, mx: (a.x + c.x) / 2, my: (a.y + c.y) / 2 };
      stage.classList.add('pinch');
    } else {
      drag0 = { x: e.clientX, y: e.clientY, tx, ty };
    }
  });
  stage.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2 && pinch0) {
      const [a, c] = [...pointers.values()];
      const d = Math.hypot(a.x - c.x, a.y - c.y);
      zoomAt(pinch0.s * (d / pinch0.d), (a.x + c.x) / 2, (a.y + c.y) / 2);
      moved = true;
      return;
    }
    if (!drag0) return;
    const dx = e.clientX - drag0.x, dy = e.clientY - drag0.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
    if (s > 1.01) { stage.classList.add('drag'); tx = drag0.tx + dx; ty = drag0.ty + dy; apply(); }
  });
  const end = (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    stage.classList.remove('drag');
    if (pointers.size < 2) { pinch0 = null; stage.classList.remove('pinch'); }
    if (drag0 && pointers.size === 0) {
      const dx = e.clientX - drag0.x, dy = e.clientY - drag0.y;
      if (s <= 1.01 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) set(i + (dx < 0 ? 1 : -1));
      else if (!moved && e.pointerType !== 'mouse') {
        // double-tap tactile
        const now = Date.now();
        if (now - lastTap < 300) { s > 1.01 ? reset() : zoomAt(2.6, e.clientX, e.clientY); lastTap = 0; } else lastTap = now;
      } else if (!moved && e.pointerType === 'mouse' && s <= 1.01 && e.detail === 1) {
        // clic simple : zoom progressif à l'endroit cliqué (le double-clic est géré à part)
      }
      drag0 = null;
    }
    if (pointers.size === 1) { const [p] = [...pointers.values()]; drag0 = { x: p.x, y: p.y, tx, ty }; }
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);

  $('#lb-in').addEventListener('click', () => zoomAt(s * 1.5, ...center()));
  $('#lb-out').addEventListener('click', () => zoomAt(s / 1.5, ...center()));
  $('#lb-reset').addEventListener('click', () => reset());
  $('#lb-close').addEventListener('click', close);
  $('.lb .prev').addEventListener('click', () => set(i - 1));
  $('.lb .next').addEventListener('click', () => set(i + 1));
  window.addEventListener('resize', () => root.classList.contains('open') && apply());
  document.addEventListener('keydown', (e) => {
    if (!root.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') set(i + 1);
    else if (e.key === 'ArrowLeft') set(i - 1);
    else if (e.key === '+' || e.key === '=') zoomAt(s * 1.5, ...center());
    else if (e.key === '-') zoomAt(s / 1.5, ...center());
    else if (e.key === '0') reset();
  });
  return { open, close, isOpen: () => root.classList.contains('open') };
})();

/* =====================================================================
   DIVERS : menu mobile, tiroir de filtres, révélations, liens profonds
   ===================================================================== */
function bindUI() {
  // ouvrir une fiche depuis n'importe quel élément [data-open]
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-open]');
    if (t) { e.preventDefault(); QV.show(t.dataset.open); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches?.('.float-card')) QV.show(e.target.dataset.open);
  });

  $('#sort').innerHTML = Object.entries(SORTS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
  $('#sort').addEventListener('change', (e) => { S.sort = e.target.value; applyState(); });
  $$('.views button').forEach((b) => b.addEventListener('click', () => { S.view = b.dataset.view; applyState({ keepShown: true }); }));
  $('#more-btn').addEventListener('click', loadMore);

  // tiroir des filtres (mobile / tablette)
  const veil = $('#filters-veil');
  const openF = () => { panel.classList.add('open'); veil.classList.add('open'); document.body.classList.add('lock'); };
  const closeF = () => { panel.classList.remove('open'); veil.classList.remove('open'); document.body.classList.remove('lock'); };
  $('#btn-filters').addEventListener('click', openF);
  veil.addEventListener('click', closeF);
  $('#f-apply').addEventListener('click', () => { closeF(); scrollToShop(); });

  // menu mobile
  const mm = $('#m-menu');
  $('#burger').addEventListener('click', () => { mm.classList.add('open'); document.body.classList.add('lock'); });
  $('#m-close').addEventListener('click', () => { mm.classList.remove('open'); document.body.classList.remove('lock'); });

  // révélations au scroll
  const io = new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.15 });
  $$('.rv').forEach((el) => io.observe(el));

  // lien direct vers une fiche : page.html#bien-12345
  const openHash = () => { const m = location.hash.match(/^#bien-(\d+)/); if (m && byId.has(m[1])) QV.show(m[1]); };
  window.addEventListener('hashchange', openHash);
  openHash();
}

/* ---------- démarrage ---------- */
readURL();
buildHero();
buildFilters();
bindUI();
applyState({ keepShown: false });
