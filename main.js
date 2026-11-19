import * as THREE from './vendor/three.module.js';

/* =========================================================================
   ASSISE — Construction 3D pilotée par le scroll
   s (0 → 6) : 0 Fondations · 1 Structure · 2 Toiture · 3 Intérieurs
               4 Extérieurs · 5 Remise des clés
   ========================================================================= */

const $ = (s, el = document) => el.querySelector(s);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const range = (s, a, b) => clamp((s - a) / (b - a));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const isMobile = matchMedia('(max-width: 760px)').matches;
const STAGES = 6;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(1989);

/* ---------------- Renderer / scène ---------------- */
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const DPR = Math.min(devicePixelRatio, isMobile ? 1.5 : 2);
renderer.setPixelRatio(DPR);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xb9a08c, 110, 620);
const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 1500);

/* ---------------- Ciel ---------------- */
const skyU = {
  top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, horizon: { value: new THREE.Color() },
  sunDir: { value: new THREE.Vector3(0.25, 0.035, -1).normalize() }, sunColor: { value: new THREE.Color() },
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(900, 32, 16),
  new THREE.ShaderMaterial({
    uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunColor; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir); float h = d.y;
        vec3 c = mix(horizon, mid, smoothstep(0.0, 0.16, h));
        c = mix(c, top, smoothstep(0.12, 0.65, h));
        c = mix(c, horizon * 0.55, smoothstep(0.0, -0.25, h));
        float s = max(dot(d, normalize(sunDir)), 0.0);
        c += sunColor * (pow(s, 900.0) * 3.0 + pow(s, 14.0) * 0.45 + pow(s, 3.0) * 0.12);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
);
sky.frustumCulled = false; sky.renderOrder = -1;
scene.add(sky);

/* ---------------- Lumières ---------------- */
const hemi = new THREE.HemisphereLight(0xffd9b8, 0x2a2f1c, 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffb47a, 3.2);
sun.position.set(-38, 26, 34);
sun.castShadow = true;
sun.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 160 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);

/* ---------------- Terrain ---------------- */
function hRaw(x, z) {
  return 5 * Math.sin(x * 0.017 + 1.3) * Math.cos(z * 0.019 + 0.4)
    + 3 * Math.sin(x * 0.043 + z * 0.031)
    + 1.5 * Math.sin(z * 0.09 - x * 0.05)
    + Math.max(0, -z - 70) * 0.16;
}
function terrainH(x, z) {
  const r = Math.hypot(x * 0.85, z);
  const k = smooth(clamp((r - 28) / 55));
  return k * (hRaw(x, z) + 5);
}
{
  const seg = isMobile ? 140 : 220;
  const g = new THREE.PlaneGeometry(1000, 1000, seg, seg);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position; const col = new Float32Array(p.count * 3);
  const cA = new THREE.Color(0x2c371f), cB = new THREE.Color(0x56603a), cC = new THREE.Color(0x7c7045), cPlot = new THREE.Color(0x453f2d), tmp = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    p.setY(i, terrainH(x, z));
    const n = Math.sin(x * 0.11) * Math.sin(z * 0.13) * 0.5 + Math.sin(x * 0.031 + z * 0.05) * 0.5;
    tmp.copy(cA).lerp(cB, clamp(n * 0.5 + 0.5)).lerp(cC, clamp(Math.sin(x * 0.02 - z * 0.015) * 1.4 - 0.6));
    const r = Math.hypot(x, z); tmp.lerp(cPlot, 1 - smooth(clamp((r - 24) / 16)));
    col.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  const t = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  t.receiveShadow = true; t.name = 'terrain';
  scene.add(t);
}

/* ---------------- Arbres (oliviers + cyprès) ---------------- */
const trees = new THREE.Group(); scene.add(trees);
{
  const dummy = new THREE.Object3D(); const c = new THREE.Color();
  // Oliviers en vergers
  const olives = [];
  for (let x = -330; x <= 330; x += 7.5) for (let z = -360; z <= 140; z += 7.5) {
    const jx = x + (rnd() - 0.5) * 3, jz = z + (rnd() - 0.5) * 3;
    const r = Math.hypot(jx, jz);
    if (r < 36) continue;
    const field = Math.sin(jx * 0.035) * Math.cos(jz * 0.028) + Math.sin(jx * 0.011 + jz * 0.017);
    if (field < 0.15 || rnd() > (isMobile ? 0.35 : 0.6)) continue;
    olives.push([jx, jz]);
  }
  const oG = new THREE.IcosahedronGeometry(1, 1);
  const oliveMesh = new THREE.InstancedMesh(oG, new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), olives.length);
  olives.forEach(([x, z], i) => {
    const s = 1.3 + rnd() * 1.1;
    dummy.position.set(x, terrainH(x, z) + s * 0.75, z);
    dummy.scale.set(s * 1.15, s * 0.8, s * 1.15); dummy.rotation.y = rnd() * 6;
    dummy.updateMatrix(); oliveMesh.setMatrixAt(i, dummy.matrix);
    oliveMesh.setColorAt(i, c.setHSL(0.2 + rnd() * 0.04, 0.22 + rnd() * 0.1, 0.22 + rnd() * 0.08));
  });
  oliveMesh.castShadow = true; oliveMesh.receiveShadow = true;
  trees.add(oliveMesh);

  // Cyprès (alignements + quelques uns près de la maison)
  const cyp = [];
  for (let i = 0; i < 9; i++) {
    const ang = rnd() * Math.PI * 2, x0 = (rnd() - 0.5) * 420, z0 = -60 - rnd() * 260;
    for (let k = 0; k < 10; k++) cyp.push([x0 + Math.cos(ang) * k * 6, z0 + Math.sin(ang) * k * 6]);
  }
  for (let x = -34; x <= 34; x += 4.2) cyp.push([x + (rnd() - 0.5), -27 + (rnd() - 0.5) * 2]);
  for (let z = -22; z <= 18; z += 4.5) cyp.push([-34 + (rnd() - 0.5), z]);
  for (let i = 0; i < (isMobile ? 60 : 160); i++) {
    const x = (rnd() - 0.5) * 600, z = -40 - rnd() * 320;
    if (Math.hypot(x, z) > 45) cyp.push([x, z]);
  }
  const cG = new THREE.ConeGeometry(1, 1, 8); cG.translate(0, 0.5, 0);
  const cypMesh = new THREE.InstancedMesh(cG, new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), cyp.length);
  cyp.forEach(([x, z], i) => {
    const h = 8 + rnd() * 6, w = 0.65 + rnd() * 0.3;
    dummy.position.set(x, terrainH(x, z) - 0.3, z); dummy.scale.set(w, h, w); dummy.rotation.y = rnd() * 6;
    dummy.updateMatrix(); cypMesh.setMatrixAt(i, dummy.matrix);
    cypMesh.setColorAt(i, c.setHSL(0.26 + rnd() * 0.04, 0.35, 0.1 + rnd() * 0.05));
  });
  cypMesh.castShadow = true;
  trees.add(cypMesh);
}

/* ---------------- Sol de la parcelle (terre → pelouse) ---------------- */
const plotMat = new THREE.MeshStandardMaterial({ color: 0x4a3f30, roughness: 1 });
const plot = new THREE.Mesh(new THREE.CircleGeometry(27, 64), plotMat);
plot.rotation.x = -Math.PI / 2; plot.scale.set(1.15, 1, 1); plot.position.y = 0.02; plot.receiveShadow = true;
scene.add(plot);
const DIRT = new THREE.Color(0x4a3f30), LAWN = new THREE.Color(0x3f5a2a);

/* ---------------- Textures procédurales ---------------- */
function canvasTex(w, h, draw, repeat = [1, 1], srgb = true) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
const woodTex = canvasTex(512, 512, (g, w, h) => {
  const n = 16, pw = w / n;
  for (let i = 0; i < n; i++) {
    const l = 30 + rnd() * 10;
    g.fillStyle = `hsl(${22 + rnd() * 6},${42 + rnd() * 10}%,${l}%)`; g.fillRect(i * pw, 0, pw, h);
    for (let k = 0; k < 14; k++) { g.strokeStyle = `rgba(40,20,10,${0.08 + rnd() * 0.1})`; g.beginPath(); const x = i * pw + rnd() * pw; g.moveTo(x, 0); g.bezierCurveTo(x + 3, h * 0.3, x - 3, h * 0.6, x + 1, h); g.stroke(); }
    g.fillStyle = 'rgba(15,8,4,.55)'; g.fillRect(i * pw, 0, 2, h);
  }
}, [1 / 2.9, 1 / 2.9]);
const latticeTex = (rx, ry) => canvasTex(128, 128, (g, w, h) => {
  g.clearRect(0, 0, w, h); g.strokeStyle = '#ffffff'; g.lineWidth = 10;
  g.strokeRect(0, 0, w, h); g.lineWidth = 7; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke();
}, [rx, ry]);
const causticTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#0b4f86'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(160,230,255,.55)'; g.lineWidth = 2;
  for (let i = 0; i < 60; i++) {
    g.beginPath(); const x = rnd() * w, y = rnd() * h, r = 8 + rnd() * 22;
    for (let a = 0; a <= 6.4; a += 0.5) { const rr = r * (0.7 + rnd() * 0.5); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.stroke();
  }
}, [2, 1]);

/* ---------------- Matériaux maison ---------------- */
const M = {
  concrete: new THREE.MeshStandardMaterial({ color: 0x9c978e, roughness: 0.95 }),
  slab2: new THREE.MeshStandardMaterial({ color: 0x9c978e, roughness: 0.9 }),
  rebar: new THREE.MeshStandardMaterial({ color: 0x8a4f2c, roughness: 0.6, metalness: 0.5 }),
  brick: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92 }),
  plaster: new THREE.MeshStandardMaterial({ color: 0xebe6dc, roughness: 0.85, clippingPlanes: [new THREE.Plane(new THREE.Vector3(0, -1, 0), 0)] }),
  wood: new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.8, clippingPlanes: [new THREE.Plane(new THREE.Vector3(0, -1, 0), 0)] }),
  roof: new THREE.MeshStandardMaterial({ color: 0x2b3a56, roughness: 0.45, metalness: 0.55 }),
  frame: new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: 0.5, metalness: 0.4 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x10171d, roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
  glow: new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffb36b, emissiveIntensity: 0, roughness: 1 }),
  stone: new THREE.MeshStandardMaterial({ color: 0xd3c8b6, roughness: 0.9 }),
  white: new THREE.MeshStandardMaterial({ color: 0xf1ece4, roughness: 0.7 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x2a2725, roughness: 0.6 }),
  oak: new THREE.MeshStandardMaterial({ color: 0xb4926c, roughness: 0.7 }),
  darkWood: new THREE.MeshStandardMaterial({ color: 0x4a3324, roughness: 0.7 }),
  fabric: new THREE.MeshStandardMaterial({ color: 0xcdbfa8, roughness: 1 }),
  plant: new THREE.MeshStandardMaterial({ color: 0x3e5a2c, roughness: 0.9, flatShading: true }),
  lamp: new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffc58a, emissiveIntensity: 0 }),
  water: new THREE.MeshStandardMaterial({ color: 0x1680bd, emissive: 0xffffff, emissiveMap: causticTex, emissiveIntensity: 0.55, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.95 }),
  yellow: new THREE.MeshStandardMaterial({ color: 0xf0b030, roughness: 0.6, map: null }),
};

const house = new THREE.Group(); scene.add(house);
function box(w, h, d, mat, x, y, z, parent = house, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true;
  parent.add(m); return m;
}

/* ---- Géométrie de la maison ----
   RDC : x ∈ [-8, 8], z ∈ [-5.5, 5.5], murs y 0.4 → 3.4
   Étage (pignon bois) : x ∈ [-8, 2], z ∈ [-4.5, 4.5], murs y 3.7 → 6.7, faîtage x=-3 à +2.6 m */
const G0 = 0.4, H0 = 3.0, G1 = 3.7, H1 = 3.0, RISE = 2.6;
const gable = { c: -3, half: 5, rise: RISE };
const walls = [
  // RDC
  { lvl: 0, axis: 'x', fixed: 5.5, a: -8, b: 8, y0: G0, h: H0, holes: [{ a: -6.6, b: -0.4, y0: G0, y1: G0 + 2.7 }, { a: 1.5, b: 3.0, y0: G0, y1: G0 + 2.5 }, { a: 4.8, b: 7.0, y0: G0 + 0.9, y1: G0 + 2.4 }] },
  { lvl: 0, axis: 'x', fixed: -5.5, a: -8, b: 8, y0: G0, h: H0, holes: [{ a: -5, b: 1, y0: G0, y1: G0 + 2.7 }, { a: 3, b: 6, y0: G0 + 0.9, y1: G0 + 2.4 }] },
  { lvl: 0, axis: 'z', fixed: -8, a: -5.35, b: 5.35, y0: G0, h: H0, holes: [{ a: -2, b: 2, y0: G0 + 0.9, y1: G0 + 2.4 }] },
  { lvl: 0, axis: 'z', fixed: 8, a: -5.35, b: 5.35, y0: G0, h: H0, holes: [{ a: -3, b: 0, y0: G0 + 0.9, y1: G0 + 2.4 }] },
  // Étage
  { lvl: 1, axis: 'x', fixed: 4.5, a: -8, b: 2, y0: G1, h: H1, gable: true, holes: [{ a: -5.6, b: -0.4, y0: G1 + 0.2, y1: G1 + 2.7 }] },
  { lvl: 1, axis: 'x', fixed: -4.5, a: -8, b: 2, y0: G1, h: H1, gable: true, holes: [{ a: -5, b: -1.5, y0: G1 + 0.6, y1: G1 + 2.4 }] },
  { lvl: 1, axis: 'z', fixed: -8, a: -4.35, b: 4.35, y0: G1, h: H1, holes: [{ a: -1.5, b: 1.5, y0: G1 + 0.6, y1: G1 + 2.4 }] },
  { lvl: 1, axis: 'z', fixed: 2, a: -4.35, b: 4.35, y0: G1, h: H1, holes: [{ a: -2.5, b: 0.5, y0: G1 + 0.6, y1: G1 + 2.4 }] },
];
const topAt = (w, u) => w.y0 + w.h + (w.gable ? Math.max(0, gable.rise * (1 - Math.abs(u - gable.c) / gable.half)) : 0);
const toWorld = (w, u, y, off = 0) => (w.axis === 'x' ? new THREE.Vector3(u, y, w.fixed + off) : new THREE.Vector3(w.fixed + off, y, u));

/* ---- Fondations : ferraillage + dalle + poteaux ---- */
const foundation = new THREE.Group(); house.add(foundation);
const rebars = [];
for (let z = -5.6; z <= 5.6; z += 0.8) rebars.push(box(16.6, 0.05, 0.05, M.rebar, 0, 0.12, z, foundation, false));
for (let x = -8.2; x <= 8.2; x += 0.8) rebars.push(box(0.05, 0.05, 11.6, M.rebar, x, 0.16, 0, foundation, false));
const slab = box(17, 0.4, 12, M.concrete, 0, 0.2, 0, foundation);
const columns = [];
for (const [x, z] of [[-8, -5.5], [8, -5.5], [-8, 5.5], [8, 5.5], [-8, 0], [8, 0], [4, 5.5], [-6.5, -5.5], [2, -5.5]])
  columns.push(box(0.36, H0, 0.36, M.concrete, x, G0 + H0 / 2, z, foundation));
const slab2 = box(17, 0.3, 12, M.slab2, 0, G0 + H0 + 0.15, 0, house);

/* ---- Briques (instanciées) ---- */
const BL = 0.6, CH = 0.3;
function subtract(segs, a, b) {
  const out = [];
  for (const [s0, s1] of segs) { if (b <= s0 || a >= s1) { out.push([s0, s1]); continue; } if (a > s0) out.push([s0, a]); if (b < s1) out.push([b, s1]); }
  return out;
}
function buildBricks(lvl) {
  const list = [];
  for (const w of walls.filter((w) => w.lvl === lvl)) {
    const maxTop = w.y0 + w.h + (w.gable ? gable.rise : 0);
    for (let c = 0; ; c++) {
      const y = w.y0 + c * CH; if (y + 0.05 >= maxTop) break;
      let segs = [[w.a, w.b]];
      for (const h of w.holes) if (y + CH > h.y0 + 0.001 && y < h.y1 - 0.001) segs = subtract(segs, h.a, h.b);
      for (const [s0, s1] of segs) {
        for (let u = s0 - (c % 2 ? BL / 2 : 0); u < s1; u += BL) {
          const u0 = Math.max(u, s0), u1 = Math.min(u + BL, s1);
          if (u1 - u0 < 0.08) continue;
          const uc = (u0 + u1) / 2;
          if (y + CH * 0.5 > topAt(w, uc)) continue;
          const p = toWorld(w, uc, y + CH / 2);
          list.push({ p, rot: w.axis === 'x' ? 0 : Math.PI / 2, len: u1 - u0 - 0.025, key: y * 1000 + Math.atan2(p.z, p.x - (lvl ? -3 : 0)) });
        }
      }
    }
  }
  list.sort((a, b) => a.key - b.key);
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, CH - 0.03, 0.26), M.brick, list.length);
  mesh.castShadow = true; mesh.receiveShadow = true;
  const col = new THREE.Color();
  list.forEach((b, i) => mesh.setColorAt(i, col.setHSL(0.04 + rnd() * 0.025, 0.45 + rnd() * 0.15, 0.36 + rnd() * 0.1)));
  house.add(mesh);
  return { mesh, list, last: -1 };
}
const bricks0 = buildBricks(0), bricks1 = buildBricks(1);
const TOTAL_BRICKS = bricks0.list.length + bricks1.list.length;
const _d = new THREE.Object3D();
function updateBricks(set, t) {
  const N = set.list.length, win = Math.max(24, N * 0.05), n = t * (N + win);
  if (Math.abs(set.last - n) < 0.01) return;
  set.last = n;
  for (let i = 0; i < N; i++) {
    const b = set.list[i]; const k = clamp((n - i) / win);
    if (k <= 0) { _d.scale.setScalar(0); _d.position.copy(b.p); }
    else { const e = easeOut(k); _d.position.set(b.p.x, b.p.y + (1 - e) * 1.4, b.p.z); _d.scale.set(b.len, 1, 1); }
    _d.rotation.set(0, b.rot, 0); _d.updateMatrix(); set.mesh.setMatrixAt(i, _d.matrix);
  }
  set.mesh.instanceMatrix.needsUpdate = true;
  return Math.min(N, Math.floor(n));
}

/* ---- Enduit (RDC) et bardage bois (étage) : murs extrudés avec ouvertures ---- */
function wallMesh(w, mat, T) {
  const L = w.b - w.a, s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(L, 0); s.lineTo(L, w.h);
  if (w.gable) s.lineTo(gable.c - w.a, w.h + gable.rise);
  s.lineTo(0, w.h); s.closePath();
  for (const h of w.holes) {
    const y0 = Math.max(h.y0 - w.y0, 0.02), y1 = h.y1 - w.y0;
    const p = new THREE.Path(); p.moveTo(h.a - w.a, y0); p.lineTo(h.b - w.a, y0); p.lineTo(h.b - w.a, y1); p.lineTo(h.a - w.a, y1); p.closePath();
    s.holes.push(p);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false });
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true;
  if (w.axis === 'x') m.position.set(w.a, w.y0, w.fixed - T / 2);
  else { m.rotation.y = -Math.PI / 2; m.position.set(w.fixed + T / 2, w.y0, w.a); }
  house.add(m); return m;
}
walls.forEach((w) => wallMesh(w, w.lvl === 0 ? M.plaster : M.wood, w.lvl === 0 ? 0.42 : 0.4));

/* ---- Menuiseries : vitrages, cadres, lueur intérieure ---- */
const frames = new THREE.Group(); house.add(frames);
for (const w of walls) for (const h of w.holes) {
  const wd = h.b - h.a, ht = h.y1 - h.y0, uc = (h.a + h.b) / 2, yc = (h.y0 + h.y1) / 2;
  const isDoor = w.lvl === 0 && w.fixed === 5.5 && h.a === 1.5;
  const rotY = w.axis === 'x' ? 0 : Math.PI / 2;
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(wd, ht), isDoor ? M.darkWood : M.glass);
  glass.position.copy(toWorld(w, uc, yc)); glass.rotation.y = rotY; frames.add(glass);
  const bars = [[wd, 0.07, uc, h.y0 + 0.035], [wd, 0.07, uc, h.y1 - 0.035], [0.07, ht, h.a + 0.035, yc], [0.07, ht, h.b - 0.035, yc]];
  const mull = Math.floor(wd / 1.6);
  for (let k = 1; k <= mull; k++) bars.push([0.05, ht, h.a + (wd * k) / (mull + 1), yc]);
  for (const [bw, bh, bu, by] of bars) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.12), M.frame);
    m.position.copy(toWorld(w, bu, by)); m.rotation.y = rotY; frames.add(m);
  }
  // lueur chaude derrière les fenêtres (sauf la grande baie avant du RDC qui montre le vrai intérieur)
  const isFrontGlazing = w.lvl === 0 && (w.fixed === 5.5 || w.fixed === -5.5) && wd > 5;
  if (!isDoor && !isFrontGlazing) {
    const inward = w.fixed > 0 ? -0.5 : 0.5;
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(wd, ht), M.glow);
    gl.position.copy(toWorld(w, uc, yc, inward)); gl.rotation.y = rotY; frames.add(gl);
  }
}
// auvent d'entrée + appliques
const canopy = box(3.6, 0.14, 1.5, M.frame, 2.25, G0 + 2.75, 6.2, frames);
for (const x of [1.1, 3.4]) box(0.12, 0.3, 0.1, M.lamp, x, G0 + 2.0, 5.78, frames, false);

/* ---- Toiture ---- */
const roof = new THREE.Group(); house.add(roof);
{
  const run = 5.6, ang = Math.atan(RISE / 5), L = run / Math.cos(ang) + 0.1, ridgeY = G1 + H1 + RISE + 0.16;
  for (const side of [-1, 1]) {
    const p = box(L, 0.18, 10.2, M.roof, gable.c + side * (run / 2), ridgeY - (run / 2) * Math.tan(ang), 0, roof);
    p.rotation.z = -side * ang;
    for (let z = -4.8; z <= 4.8; z += 0.6) { // joints debout
      const j = box(L, 0.05, 0.03, M.roof, 0, 0.11, z, p, false);
    }
  }
}
roof.userData.y0 = 0;

/* ---- Intérieur RDC ---- */
const interior = new THREE.Group(); house.add(interior);
{
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(15.4, 10.4), M.oak); fl.rotation.x = -Math.PI / 2; fl.position.y = G0 + 0.01; fl.receiveShadow = true; interior.add(fl);
  box(3.4, 0.9, 1.1, M.white, -3.5, G0 + 0.45, -1.3, interior);
  box(3.6, 0.06, 1.25, M.dark, -3.5, G0 + 0.93, -1.3, interior);
  for (const x of [-4.6, -3.5, -2.4]) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.75, 16), M.oak); st.position.set(x, G0 + 0.38, -0.35); interior.add(st);
    const lp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.lamp); lp.position.set(x, G0 + 2.25, -1.3); lp.rotation.x = Math.PI; interior.add(lp);
    const sh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.darkWood); sh.position.set(x, G0 + 2.27, -1.3); interior.add(sh);
    box(0.015, 0.75, 0.015, M.frame, x, G0 + 2.65, -1.3, interior, false);
  }
  box(2.6, 2.6, 0.6, M.darkWood, -6.6, G0 + 1.3, -4.95, interior);
  box(0.6, 2.6, 3.2, M.darkWood, -7.45, G0 + 1.3, -3.2, interior);
  // salon
  box(3.2, 0.42, 1.0, M.fabric, 4, G0 + 0.21, -2.6, interior);
  box(3.2, 0.5, 0.25, M.fabric, 4, G0 + 0.55, -3.0, interior);
  box(1.4, 0.3, 0.8, M.oak, 4, G0 + 0.15, -1.2, interior);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3), M.fabric); rug.rotation.x = -Math.PI / 2; rug.position.set(4, G0 + 0.02, -1.6); interior.add(rug);
  // table à manger
  box(2.4, 0.06, 1, M.oak, -0.2, G0 + 0.75, 2.3, interior);
  box(0.08, 0.72, 0.8, M.dark, -1.2, G0 + 0.36, 2.3, interior); box(0.08, 0.72, 0.8, M.dark, 0.8, G0 + 0.36, 2.3, interior);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.6, 16), M.white); pot.position.set(6.8, G0 + 0.3, -4.5); interior.add(pot);
  const fol = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 1), M.plant); fol.position.set(6.8, G0 + 1.3, -4.5); fol.scale.y = 1.4; interior.add(fol);
}
const inLights = [new THREE.PointLight(0xffb070, 0, 16, 1.6), new THREE.PointLight(0xffb070, 0, 16, 1.6), new THREE.PointLight(0xffc890, 0, 12, 1.6)];
inLights[0].position.set(-3.5, G0 + 2.2, -1.2); inLights[1].position.set(3.5, G0 + 2.5, -1.5); inLights[2].position.set(-3, G1 + 1.8, 0);
inLights.forEach((l) => house.add(l));

/* ---- Extérieurs : terrasse, piscine, mobilier ---- */
const exterior = new THREE.Group(); scene.add(exterior);
const extItems = [];
function ext(obj, order) { obj.userData.order = order; obj.userData.base = obj.scale.clone(); extItems.push(obj); exterior.add(obj); return obj; }
{
  ext(box(17.4, 0.1, 3.2, M.stone, 0, 0.05, 7.2, exterior), 0);
  // piscine
  const px = 7.5, pz = 12.3, pw = 11, pd = 4.4;
  const coping = new THREE.Group();
  box(pw + 0.8, 0.14, 0.4, M.stone, 0, 0.07, -pd / 2 - 0.2, coping); box(pw + 0.8, 0.14, 0.4, M.stone, 0, 0.07, pd / 2 + 0.2, coping);
  box(0.4, 0.14, pd, M.stone, -pw / 2 - 0.2, 0.07, 0, coping); box(0.4, 0.14, pd, M.stone, pw / 2 + 0.2, 0.07, 0, coping);
  box(pw + 3, 0.08, 2.2, M.stone, -0.6, 0.04, -pd / 2 - 1.5, coping);
  coping.position.set(px, 0, pz); ext(coping, 1);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(pw, pd), M.water); water.rotation.x = -Math.PI / 2; water.position.set(px, 0.09, pz); ext(water, 2);
  const poolLight = new THREE.PointLight(0x48b8ff, 0, 14, 1.5); poolLight.position.set(px, 0.6, pz); exterior.add(poolLight); exterior.userData.poolLight = poolLight;
  // transats
  for (let i = 0; i < 3; i++) {
    const l = new THREE.Group();
    box(0.75, 0.25, 1.6, M.white, 0, 0.2, 0, l);
    const back = box(0.75, 0.1, 0.8, M.white, 0, 0.55, -0.95, l); back.rotation.x = 0.7;
    l.position.set(3.2 + i * 1.3, 0.05, 9.6); ext(l, 3 + i * 0.3);
  }
  const para = new THREE.Group();
  box(0.06, 2.5, 0.06, M.frame, 0, 1.25, 0, para);
  const can = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.5, 10), M.fabric); can.position.y = 2.5; can.castShadow = true; para.add(can);
  para.position.set(2.2, 0.05, 9.4); ext(para, 4);
  // allée + plantes
  for (let i = 0; i < 6; i++) ext(box(1.3, 0.06, 0.7, M.stone, 2.25 + (i % 2 ? 0.3 : -0.3), 0.03, 9.3 + i * 1.3, exterior), 1 + i * 0.2);
  for (const [x, z] of [[0.6, 6.4], [3.9, 6.4], [-7.6, 6.4], [7.6, 6.4]]) {
    const g = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.3, 0.7, 16), M.stone); pot.position.y = 0.35; pot.castShadow = true; g.add(pot);
    const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 1), M.plant); f.position.y = 1.2; f.scale.y = 1.4; f.castShadow = true; g.add(f);
    g.position.set(x, 0.1, z); ext(g, 2 + x * 0.05);
  }
  // haie + bornes lumineuses
  for (let x = -14; x <= 14; x += 1.4) ext(box(1.3, 0.9, 0.9, M.plant, x, 0.45, -9.5, exterior), 1.5 + (x + 14) / 20);
  for (let i = 0; i < 6; i++) ext(box(0.12, 0.5, 0.12, M.lamp, 1.2, 0.25, 9.3 + i * 1.3, exterior), 4.5);
}

/* ---- Chantier : grue + palettes ---- */
const site = new THREE.Group(); scene.add(site);
const crane = new THREE.Group(); site.add(crane);
const jibGroup = new THREE.Group();
{
  const yMastMat = new THREE.MeshStandardMaterial({ color: 0xf0b030, map: latticeTex(1, 24), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 });
  const yJibMat = new THREE.MeshStandardMaterial({ color: 0xf0b030, map: latticeTex(28, 1), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 });
  box(1.1, 24, 1.1, yMastMat, 0, 12, 0, crane);
  box(3, 0.6, 3, M.concrete, 0, 0.3, 0, crane);
  jibGroup.position.y = 24; crane.add(jibGroup);
  box(28, 1, 1, yJibMat, 11, 0, 0, jibGroup);
  box(9, 0.8, 0.8, yJibMat, -6, 0, 0, jibGroup);
  box(2.4, 1.8, 1.4, M.concrete, -9.5, -0.6, 0, jibGroup);
  box(1.6, 1.6, 1.6, M.yellow, 1.3, -1.2, 0.9, jibGroup);
  box(0.7, 4, 0.7, yMastMat, 0, 2.5, 0, jibGroup);
  const tie = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(24, 0.5, 0), new THREE.Vector3(0, 4.5, 0), new THREE.Vector3(-10, 0.4, 0)]);
  jibGroup.add(new THREE.Line(tie, new THREE.LineBasicMaterial({ color: 0x333333 })));
  const cable = box(0.04, 13, 0.04, M.frame, 13, -6.5, 0, jibGroup, false);
  const hook = box(1.4, 0.7, 1.0, M.brick, 13, -13.3, 0, jibGroup); // palette de briques suspendue
  jibGroup.userData.hook = hook;
  crane.position.set(-17, 0, -11);
}
{
  const c = new THREE.Color();
  for (const [x, z] of [[11, -9], [13, -7.5], [12.5, -10.5], [-12, 8]]) {
    const pal = box(1.3, 0.12, 1.1, M.darkWood, x, 0.06, z, site);
    const st = box(1.2, 0.9, 1.0, M.brick, x, 0.57, z, site);
  }
  box(2.4, 1.2, 1.4, M.concrete, -12, 0.6, 11, site);
}

/* =========================================================================
   ÉTAT DE LA SCÈNE EN FONCTION DE s
   ========================================================================= */
const C = (h) => new THREE.Color(h);
const SKY = {
  day: { top: C(0x2a4166), mid: C(0x9a9aa2), horizon: C(0xf2b07a), sun: C(0xffb070), fog: C(0xb7a08e), sunL: C(0xffc08a), hemiS: C(0xffe6cc) },
  dusk: { top: C(0x0a1122), mid: C(0x2a3450), horizon: C(0xc0705a), sun: C(0x8a4a38), fog: C(0x3a3a48), sunL: C(0xffc8a0), hemiS: C(0x8090b0) },
};
const tmpC = new THREE.Color();
let placedBricks = 0;

function applyState(s, o = {}) {
  // ---- Fondations
  const tReb = range(s, 0.02, 0.38);
  rebars.forEach((r, i) => { const k = clamp(tReb * rebars.length - i * 0.6, 0, 1); r.scale.set(k || 0.0001, 1, k || 0.0001); r.visible = k > 0 && s < 0.9; });
  const tSlab = easeInOut(range(s, 0.32, 0.75));
  slab.scale.y = Math.max(0.001, tSlab); slab.position.y = 0.2 * tSlab; slab.visible = tSlab > 0;
  const tCol = range(s, 0.7, 1.05);
  columns.forEach((c, i) => { const k = easeOut(clamp(tCol * 1.6 - i * 0.06)); c.scale.y = Math.max(0.001, k); c.position.y = G0 + (H0 * k) / 2; c.visible = k > 0 && s < 2.5; });

  // ---- Structure
  const p0 = updateBricks(bricks0, range(s, 1.0, 1.52)) ?? null;
  const tS2 = easeOut(range(s, 1.48, 1.62));
  slab2.visible = tS2 > 0; slab2.scale.set(1, Math.max(0.001, tS2), 1); slab2.position.y = G0 + H0 + 0.15 + (1 - tS2) * 2;
  updateBricks(bricks1, range(s, 1.6, 2.05));
  placedBricks = Math.round(range(s, 1.0, 1.52) * bricks0.list.length + range(s, 1.6, 2.05) * bricks1.list.length);
  slab2.material.color.copy(tmpC.set(0x9c978e).lerp(C(0xe2ddd3), range(s, 2.05, 2.4)));

  // ---- Toiture & finitions
  M.plaster.clippingPlanes[0].constant = lerp(G0 - 0.05, G0 + H0 + 0.05, easeInOut(range(s, 2.0, 2.45)));
  M.wood.clippingPlanes[0].constant = lerp(G1 - 0.05, G1 + H1 + RISE + 0.05, easeInOut(range(s, 2.25, 2.7)));
  const tRoof = easeOut(range(s, 2.5, 2.88));
  roof.visible = tRoof > 0; roof.position.y = (1 - tRoof) * 6; roof.scale.setScalar(0.6 + 0.4 * tRoof);
  roof.position.x = gable.c * (1 - roof.scale.x);
  const tWin = range(s, 2.55, 2.95);
  frames.visible = tWin > 0; frames.scale.setScalar(1); M.glass.opacity = 0.32 * tWin;
  frames.children.forEach((m) => { m.visible = tWin > 0.02; });

  // ---- Intérieurs
  const tInt = range(s, 2.6, 2.95);
  interior.visible = tInt > 0;
  interior.scale.setScalar(1); interior.position.y = (1 - easeOut(tInt)) * -0.6;
  const lights = smooth(range(s, 2.85, 3.35));
  inLights[0].intensity = 26 * lights; inLights[1].intensity = 18 * lights; inLights[2].intensity = 10 * lights;
  M.lamp.emissiveIntensity = 2.6 * lights;
  M.glow.emissiveIntensity = 1.4 * lights;

  // ---- Chantier
  const tSite = easeInOut(range(s, 2.75, 3.15));
  crane.position.y = -28 * tSite; site.visible = tSite < 1;
  site.children.forEach((m) => { if (m !== crane) m.scale.setScalar(Math.max(0.001, 1 - tSite)); });

  // ---- Extérieurs
  const tExt = range(s, 3.55, 4.55);
  exterior.visible = tExt > 0;
  extItems.forEach((it) => {
    const k = easeOut(clamp(tExt * 6 - it.userData.order));
    it.scale.copy(it.userData.base).multiplyScalar(Math.max(0.001, k)); it.visible = k > 0;
  });
  exterior.userData.poolLight.intensity = 16 * clamp(tExt * 2 - 0.5);
  plotMat.color.copy(DIRT).lerp(LAWN, smooth(range(s, 3.5, 4.1)));

  // ---- Lumière / ciel (heure dorée → heure bleue)
  const d = o.dusk ?? smooth(range(s, 1.8, 3.6)) * 0.78;
  const A = SKY.day, B = SKY.dusk;
  skyU.top.value.copy(A.top).lerp(B.top, d); skyU.mid.value.copy(A.mid).lerp(B.mid, d);
  skyU.horizon.value.copy(A.horizon).lerp(B.horizon, d); skyU.sunColor.value.copy(A.sun).lerp(B.sun, d);
  scene.fog.color.copy(A.fog).lerp(B.fog, d);
  sun.intensity = lerp(3.3, 0.45, d); sun.color.copy(A.sunL).lerp(B.sunL, d);
  hemi.intensity = lerp(1.15, 0.6, d); hemi.color.copy(A.hemiS).lerp(B.hemiS, d);
  renderer.toneMappingExposure = lerp(0.95, 1.35, d);
}

/* ---------------- Trajectoire caméra ---------------- */
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const KEYS = [
  { p: V(32, 17, 40), t: V(-3, 1, -12) },   // 0 fondations : vue aérienne
  { p: V(-26, 11, 32), t: V(-2, 3, -4) },  // 1 structure
  { p: V(-17, 9, 23), t: V(-2, 4.2, 0) },// 2 toiture
  { p: V(-3.6, 2.1, 10.5), t: V(-3.4, 1.5, -2) }, // 3 intérieurs : dans la baie
  { p: V(23, 3.4, 22), t: V(2, 2.2, 5) },// 4 extérieurs : au ras de la piscine
  { p: V(34, 10, 38), t: V(-1, 4, -2) },   // 5 bienvenue
];
const camP = new THREE.Vector3(), camT = new THREE.Vector3();
function cameraAt(s, out = camP, tgt = camT) {
  const i = Math.min(Math.floor(s), STAGES - 1), f = s - i;
  const a = KEYS[i], b = KEYS[Math.min(i + 1, STAGES - 1)];
  const k = easeInOut(range(f, 0.55, 1));
  out.lerpVectors(a.p, b.p, k); tgt.lerpVectors(a.t, b.t, k);
  // petite orbite pendant chaque étape pour garder la scène vivante
  const orbit = (f - 0.3) * 0.12 * (i === 3 ? 0.15 : 1);
  const dx = out.x - tgt.x, dz = out.z - tgt.z;
  out.x = tgt.x + dx * Math.cos(orbit) - dz * Math.sin(orbit);
  out.z = tgt.z + dx * Math.sin(orbit) + dz * Math.cos(orbit);
  // arc vers le haut pendant les transitions pour éviter de traverser la maison
  out.y += Math.sin(k * Math.PI) * (i === 2 ? 1.5 : i === 3 ? 6 : 3);
  return out;
}

/* ---------------- Rendu ---------------- */
let W = 0, H = 0;
function resize() {
  W = canvas.clientWidth; H = canvas.clientHeight;
  renderer.setPixelRatio(DPR); renderer.setSize(W, H, false);
  camera.aspect = W / H; camera.fov = W / H < 1 ? 52 : 36; camera.updateProjectionMatrix();
}
function render() { sky.position.copy(camera.position); renderer.render(scene, camera); }

/* ---------------- Clichés de la maison pour les autres sections ---------------- */
function snapshot({ s = 5.5, p, t, w = 640, h = 800, dusk, wire = false, type = 'image/jpeg' }) {
  applyState(s, { dusk });
  camera.position.copy(p); camera.lookAt(t);
  camera.aspect = w / h; camera.fov = 36; camera.updateProjectionMatrix();
  renderer.setPixelRatio(1); renderer.setSize(w, h, false);
  const hidden = [];
  if (wire) {
    scene.traverse((o) => { if (o.name === 'terrain' || o === sky || o === trees || o === plot) { hidden.push(o); o.visible = false; } });
    scene.overrideMaterial = new THREE.MeshBasicMaterial({ color: 0x7f9cc4, wireframe: true, transparent: true, opacity: 0.35 });
    renderer.setClearColor(0x000000, 0);
  }
  sky.position.copy(camera.position);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL(type, 0.86);
  if (wire) { hidden.forEach((o) => (o.visible = true)); scene.overrideMaterial = null; }
  return url;
}

/* =========================================================================
   UI : scroll, textes, HUD
   ========================================================================= */
const hero = $('.hero');
const texts = [...document.querySelectorAll('.stage-text')];
const steps = [...document.querySelectorAll('#hudSteps li')];
const PHASES = ['Fondations', 'Structure', 'Toiture & finitions', 'Intérieurs', 'Extérieurs', 'Remise des clés'];
const hud = { day: $('#hudDay'), pct: $('#hudPct'), phase: $('#hudPhase'), bricks: $('#hudBricks'), bar: $('#hudBar'), plan: $('#planPath'), el: $('#hud') };
const sceneWrap = $('#sceneWrap'), scrollHint = $('#scrollHint');
let target = 0, current = 0, lastStage = -1;

function heroProgress() {
  const r = hero.getBoundingClientRect();
  return clamp(-r.top / (r.height - innerHeight));
}

function updateUI(s, p) {
  const i = Math.min(Math.floor(s), STAGES - 1), f = s - i;
  texts.forEach((el, k) => {
    let op = 0;
    if (k === i) {
      const fin = k === 0 ? 1 : smooth(range(f, 0.04, 0.2));
      const fout = k === STAGES - 1 ? 1 : 1 - smooth(range(f, 0.62, 0.8));
      op = fin * fout;
    }
    const y = (1 - op) * 30;
    el.style.opacity = op.toFixed(3);
    el.style.filter = op < 0.99 ? `blur(${((1 - op) * 10).toFixed(1)}px)` : 'none';
    el.style.transform = isMobile ? `translateY(${y}px)` : `translateY(calc(-50% + ${y}px))`;
    el.style.pointerEvents = op > 0.5 ? 'auto' : 'none';
  });
  if (i !== lastStage) {
    steps.forEach((li, k) => { li.classList.toggle('active', k === i); li.classList.toggle('done', k < i); });
    hud.phase.textContent = PHASES[i]; lastStage = i;
  }
  const pct = Math.round(clamp(s / 5.2) * 100);
  hud.pct.textContent = pct + '%';
  hud.day.textContent = String(Math.max(1, Math.round(clamp(s / 5.2) * 240))).padStart(3, '0');
  hud.bricks.textContent = placedBricks.toLocaleString('fr-FR');
  hud.bar.style.width = p * 100 + '%';
  hud.plan.style.strokeDashoffset = (1 - clamp(s / 2.2)).toFixed(3);
  scrollHint.style.opacity = s < 0.15 ? 1 : 0;

  // Étape 6 : la scène se réduit en carte
  const k = easeInOut(range(s, 5.15, 5.75));
  const sc = 1 - (isMobile ? 0.12 : 0.42) * k;
  sceneWrap.style.transform = `translate(${(isMobile ? 0 : 19) * k}vw, ${(isMobile ? -14 : 0) * k}vh) scale(${sc})`;
  sceneWrap.style.borderRadius = `${18 * k / sc}px`;
  hud.el.style.opacity = 1 - k * 0.6;
}

addEventListener('scroll', () => { target = heroProgress(); }, { passive: true });
addEventListener('resize', () => { resize(); target = heroProgress(); });

const clock = new THREE.Clock();
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05), time = clock.elapsedTime;
  current += (target - current) * (1 - Math.pow(0.002, dt));
  if (Math.abs(target - current) < 0.00005) current = target;
  const s = current * (STAGES - 0.001);
  const heroVisible = hero.getBoundingClientRect().bottom > 0;
  if (heroVisible) {
    applyState(s);
    cameraAt(s); camera.position.copy(camP); camera.lookAt(camT);
    jibGroup.rotation.y = Math.sin(time * 0.12) * 0.7 + 0.4;
    jibGroup.userData.hook.rotation.y = time * 0.3;
    causticTex.offset.set(time * 0.03, time * 0.017);
    updateUI(s, current);
    render();
  }
  requestAnimationFrame(loop);
}

/* =========================================================================
   SECTIONS : carrousel, biens, chiffres, formulaire
   ========================================================================= */
const SERVICES = [
  { t: 'Maisons neuves', d: "Maisons d'architecte conçues et bâties de A à Z, sur votre terrain ou le nôtre.", y: '35 ans', shot: { s: 5.5, p: V(19, 6, 23), t: V(-1, 3, 0) } },
  { t: 'Rénovation', d: 'Réhabilitation de bâtisses anciennes : structure, isolation, enduits à la chaux.', y: '120 chantiers', shot: { s: 2.3, p: V(-16, 8, 20), t: V(-2, 3.5, 0), dusk: 0.3 } },
  { t: 'Gros œuvre', d: 'Fondations, maçonnerie et ossature béton réalisées par nos propres compagnons.', y: '1 200 m³ / an', shot: { s: 1.9, p: V(22, 18, 24), t: V(0, 2, 0), dusk: 0.15 } },
  { t: 'Toiture & charpente', d: 'Zinc, tuile ou bac acier : une couverture durable, garantie dix ans.', y: '10 ans', shot: { s: 2.9, p: V(-14, 13, -16), t: V(-3, 6, 0), dusk: 0.45 } },
  { t: 'Architecture intérieure', d: "Cuisines, éclairage et matériaux pensés avec nos architectes d'intérieur.", y: 'Sur mesure', shot: { s: 5.5, p: V(-3.4, 1.9, 7.5), t: V(-3.5, 1.4, -3) } },
  { t: 'Piscines & extérieurs', d: 'Terrasses en pierre, piscines, jardins méditerranéens et éclairage paysager.', y: '80 piscines', shot: { s: 5.5, p: V(18, 2.4, 19), t: V(5, 1, 10) } },
  { t: 'Extensions', d: 'Agrandir sans déménager : surélévation, véranda ou nouvelle aile.', y: 'Permis inclus', shot: { s: 5.5, p: V(-24, 7, -18), t: V(-2, 3, 0), dusk: 0.5 } },
  { t: 'Aménagement paysager', d: 'Jardins, allées en pierre et éclairage pensés comme une pièce à vivre.', y: 'Sur mesure', shot: { s: 5.5, p: V(9, 1.7, 17), t: V(3, 1.2, 7) } },
  { t: 'Façades & enduits', d: 'Enduits à la chaux, bardages et ravalements qui traversent le temps.', y: 'Garantie 10 ans', shot: { s: 2.25, p: V(15, 5, 15), t: V(0, 2.2, 4), dusk: 0.2 } },
  { t: 'Menuiseries', d: 'Baies aluminium, portes en bois massif et vitrages à isolation renforcée.', y: 'Alu & bois', shot: { s: 5.5, p: V(-6, 2.6, 12.5), t: V(-3.5, 1.8, 5) } },
  { t: 'Suivi de chantier', d: 'Un conducteur de travaux dédié et un compte rendu chaque semaine.', y: '1 interlocuteur', shot: { s: 1.35, p: V(-30, 16, 22), t: V(-4, 2, -2), dusk: 0.1 } },
  { t: 'Clés en main', d: 'Du permis à la remise des clés : un seul contrat et un prix ferme.', y: 'Prix ferme', shot: { s: 5.5, p: V(30, 14, 36), t: V(0, 3, 0), dusk: 0.85 } },
];
const LISTINGS = [
  { t: 'Villa Les Oliviers', loc: 'Aix-en-Provence (13)', m2: 240, ch: 5, ter: '1 800 m²', price: '180 000 000 XOF', tag: 'Disponible', ok: true, shot: { s: 5.5, p: V(24, 9, 26), t: V(0, 3, 2) } },
  { t: 'Mas des Cyprès', loc: 'Lourmarin (84)', m2: 210, ch: 4, ter: '2 400 m²', price: '185 000 000 XOF', tag: 'Livraison 2027', shot: { s: 5.5, p: V(-26, 8, -20), t: V(-2, 3, 0), dusk: 0.55 } },
  { t: 'Domaine du Lauzet', loc: 'Gordes (84)', m2: 280, ch: 6, ter: '3 100 m²', price: '400 000 000 XOF', tag: 'Vendu', shot: { s: 5.5, p: V(0, 34, 30), t: V(1, 0, 3), dusk: 0.75 } },
];

// Anneau de 12 cadres, chacun avec sa propre image : on en voit 5 à la fois sur toute la largeur.
// Les cadres hors du centre sont transparents et deviennent opaques quand leur tour arrive.
// Rotation uniquement par glissement horizontal (souris, doigt, pavé tactile) — pas au scroll vertical.
const ring = $('#ring'), carouselEl = $('#carousel'), idxEl = $('#carouselIndex');
let ringRot = 0, ringTarget = 0, dragging = false;
function buildCarousel(images) {
  ring.innerHTML = SERVICES.map((sv, k) => `
    <article class="card" data-i="${k}">
      <img src="${images[k]}" alt="${sv.t}" draggable="false" />
      <div class="card-body">
        <span class="num">${String(k + 1).padStart(2, '0')} — SERVICE</span>
        <h3>${sv.t}</h3>
        <p>${sv.d}</p>
        <div class="card-foot"><em>${sv.y}</em><span>Détails →</span></div>
      </div>
    </article>`).join('');
}
const cardAngle = 360 / SERVICES.length;
const snap = () => { ringTarget = Math.round(ringTarget / cardAngle) * cardAngle; };
function layoutCarousel() {
  const R = innerWidth < 760 ? Math.max(420, innerWidth * 1.28) : Math.min(840, innerWidth * 0.56);   // mobile : les voisines dépassent juste sur les bords
  const cards = ring.children;
  let best = 0, bestD = 1e9;
  for (let i = 0; i < cards.length; i++) {
    const a = i * cardAngle + ringRot;
    const norm = ((a % 360) + 540) % 360 - 180;
    const d = Math.abs(norm);
    cards[i].style.transform = `rotateY(${a}deg) translateZ(${R}px)`;
    const op = d < 8 ? 1 : d < 22 ? lerp(1, 0.38, (d - 8) / 14) : d < 80 ? lerp(0.38, 0, (d - 22) / 58) : 0;
    cards[i].style.opacity = op.toFixed(3);
    cards[i].style.zIndex = String(200 - Math.round(d));   // la carte du centre toujours devant
    cards[i].style.pointerEvents = d < 15 && !dragging ? 'auto' : 'none';
    if (d < bestD) { bestD = d; best = i; }
  }
  ring.style.transform = `translateZ(${-R}px) rotateX(-3deg)`;
  idxEl.textContent = `${String(best + 1).padStart(2, '0')} / ${SERVICES.length}`;
}
function carouselLoop() {
  ringRot += (ringTarget - ringRot) * (dragging ? 0.35 : 0.1);
  layoutCarousel();
  requestAnimationFrame(carouselLoop);
}
{
  const DEG_PER_PX = 0.16;
  let x0 = 0, lastX = 0, lastT = 0, vel = 0, startTarget = 0;
  carouselEl.addEventListener('pointerdown', (e) => {
    dragging = true; x0 = lastX = e.clientX; lastT = performance.now(); vel = 0; startTarget = ringTarget;
    carouselEl.setPointerCapture(e.pointerId); carouselEl.classList.add('grabbing');
  });
  carouselEl.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const now = performance.now();
    vel = (e.clientX - lastX) / Math.max(1, now - lastT); lastX = e.clientX; lastT = now;
    ringTarget = startTarget + (e.clientX - x0) * DEG_PER_PX;
  });
  const end = () => {
    if (!dragging) return;
    dragging = false; carouselEl.classList.remove('grabbing');
    ringTarget += clamp(vel * 80, -45, 45);   // élan : un geste rapide fait tourner plus loin
    snap();
  };
  carouselEl.addEventListener('pointerup', end);
  carouselEl.addEventListener('pointercancel', end);
  // pavé tactile / molette horizontale (gauche ↔ droite) ; la molette verticale fait défiler la page normalement
  let wheelTimer;
  carouselEl.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    ringTarget -= e.deltaX * DEG_PER_PX * 0.6;
    clearTimeout(wheelTimer); wheelTimer = setTimeout(snap, 140);
  }, { passive: false });
  $('#prev').onclick = () => { ringTarget += cardAngle; snap(); };
  $('#next').onclick = () => { ringTarget -= cardAngle; snap(); };
  addEventListener('keydown', (e) => {
    const r = carouselEl.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
    if (e.key === 'ArrowLeft') { ringTarget += cardAngle; snap(); }
    if (e.key === 'ArrowRight') { ringTarget -= cardAngle; snap(); }
  });
}

function buildListings(images) {
  $('#listings').innerHTML = LISTINGS.map((l, i) => `
    <article class="listing reveal" style="transition-delay:${i * 0.12}s">
      <div class="img"><img src="${images[i]}" alt="${l.t}" /><span class="tag ${l.ok ? 'ok' : ''}">${l.tag}</span></div>
      <div class="body">
        <h3>${l.t}</h3><p class="loc">${l.loc}</p>
        <div class="specs"><div><small>Surface</small>${l.m2} m²</div><div><small>Chambres</small>${l.ch}</div><div><small>Terrain</small>${l.ter}</div></div>
        <div class="price"><b>${l.price}</b><a class="btn btn-ghost" href="#contact">Visiter →</a></div>
      </div>
    </article>`).join('');
}

function setupReveals() {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    const b = e.target.querySelector('[data-count]') || (e.target.dataset.count !== undefined ? e.target : null);
    e.target.querySelectorAll('[data-count]').forEach(countUp);
    io.unobserve(e.target);
  }), { threshold: 0.2 });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
}
function countUp(el) {
  const to = +el.dataset.count, suf = el.dataset.suffix || '', t0 = performance.now(), dur = 1800;
  const tick = (now) => { const k = easeOut(clamp((now - t0) / dur)); el.textContent = Math.round(to * k) + suf; if (k < 1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}
$('#form').addEventListener('submit', (e) => { e.preventDefault(); $('#formOk').classList.add('show'); e.target.reset(); });

/* =========================================================================
   DÉMARRAGE
   ========================================================================= */
const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
async function boot() {
  const bar = $('.loader-bar span'), pct = $('.loader-pct'), label = $('.loader-label');
  const jobs = [...SERVICES.map((x) => x.shot), ...LISTINGS.map((x) => ({ ...x.shot, w: 800, h: 600 })),
    { s: 5.5, p: V(4, 1.6, 22), t: V(0, 3, 0), w: 1400, h: 800 }];
  const labels = ['Pose de la première pierre…', 'Montage des murs…', 'Pose de la toiture…', 'Allumage des lumières…'];
  const out = [];
  for (let i = 0; i < jobs.length; i++) {
    out.push(snapshot(jobs[i]));
    const k = (i + 1) / jobs.length;
    bar.style.width = k * 100 + '%'; pct.textContent = Math.round(k * 100) + '%';
    label.textContent = labels[Math.min(labels.length - 1, Math.floor(k * labels.length))];
    await frame();
  }
  buildCarousel(out.slice(0, SERVICES.length));
  buildListings(out.slice(SERVICES.length, SERVICES.length + 3));
  $('#contactBg').style.backgroundImage = `url(${out[SERVICES.length + 3]})`;

  renderer.setClearColor(0x000000, 1);
  resize(); target = current = heroProgress();
  setupReveals();
  requestAnimationFrame(loop);
  requestAnimationFrame(carouselLoop);
  setTimeout(() => $('#loader').classList.add('done'), 250);
}
boot();
