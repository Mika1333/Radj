// Luxlens — prozedurales 3D-Modell der Panto-Brille (Three.js)
// Front aus einem Stück Acetat (Schlüsselloch-Steg), gebogene Fassung,
// Bügel mit Ohrbiegung, silberne Zierniete und Gläser.
import * as THREE from 'three';

/* ---------- Acetat-Texturen (Canvas) ---------- */

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const FINISHES = {
  havana: {
    name: 'Havana',
    note: 'Klassisches Schildpatt',
    base: '#2b1507',
    spots: ['#b5651c', '#9a4f14', '#cf8a36', '#6e340d'],
    dark: '#0f0602',
    spotCount: 170,
    darkCount: 190,
    swatch: 'radial-gradient(circle at 30% 30%, #e0a14a, #8a4a16 45%, #2a1206 75%)',
  },
  honig: {
    name: 'Honig',
    note: 'Helles Bernstein-Schildpatt',
    base: '#8a4a17',
    spots: ['#e0a456', '#d08c3c', '#f0bd72', '#b8722a'],
    dark: '#3d1d08',
    spotCount: 220,
    darkCount: 120,
    swatch: 'radial-gradient(circle at 30% 30%, #ffd79a, #d38d3a 50%, #6b3510 85%)',
  },
  espresso: {
    name: 'Espresso',
    note: 'Tiefes Braun, dezent marmoriert',
    base: '#24140b',
    spots: ['#4a2a17', '#3a2112', '#5a341d', '#2e190c'],
    dark: '#140a05',
    spotCount: 160,
    darkCount: 60,
    swatch: 'radial-gradient(circle at 30% 30%, #6a3f24, #2e190c 60%, #140a05)',
  },
  onyx: {
    name: 'Onyx',
    note: 'Poliertes Schwarz',
    base: '#0d0b0a',
    spots: ['#1a1613', '#141110', '#201b17'],
    dark: '#060505',
    spotCount: 60,
    darkCount: 10,
    swatch: 'radial-gradient(circle at 30% 30%, #4a4440, #141110 55%, #050404)',
  },
};

export function makeAcetateCanvas(finish, size = 1024, seed = 7) {
  const f = FINISHES[finish] || FINISHES.havana;
  const rand = mulberry32(seed);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = f.base;
  g.fillRect(0, 0, size, size);

  const layer = document.createElement('canvas');
  layer.width = layer.height = size;
  const l = layer.getContext('2d');

  const blob = (x, y, r, col, alpha, sx, sy, rot) => {
    // Gezogene, unregelmäßige Flecken wie in gegossenem Acetat
    l.save();
    l.translate(x, y);
    l.rotate(rot);
    l.scale(sx, sy);
    const grd = l.createRadialGradient(0, 0, 0, 0, 0, r);
    grd.addColorStop(0, col);
    grd.addColorStop(0.55, col);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    l.globalAlpha = alpha;
    l.fillStyle = grd;
    l.beginPath();
    l.arc(0, 0, r, 0, Math.PI * 2);
    l.fill();
    l.restore();
  };

  // Nahtlos kacheln: Flecken am Rand auf der Gegenseite wiederholen
  const tiled = (x, y, r, col, alpha) => {
    const sx = 1 + rand() * 1.6, sy = 0.5 + rand() * 0.6, rot = rand() * Math.PI;
    const m = r * 2.6;
    const xs = [0], ys = [0];
    if (x < m) xs.push(size); if (x > size - m) xs.push(-size);
    if (y < m) ys.push(size); if (y > size - m) ys.push(-size);
    for (const ox of xs) for (const oy of ys) blob(x + ox, y + oy, r, col, alpha, sx, sy, rot);
  };

  // Jede Ebene ohne Filter zeichnen, dann einmal weichzeichnen
  const flush = (blur) => {
    g.filter = `blur(${Math.round(blur * size / 1024)}px)`;
    g.drawImage(layer, 0, 0);
    g.filter = 'none';
    l.clearRect(0, 0, size, size);
  };
  const k = size / 1024;

  for (let i = 0; i < f.spotCount; i++) {
    const col = f.spots[Math.floor(rand() * f.spots.length)];
    tiled(rand() * size, rand() * size, (18 + rand() * 60) * k, col, 0.45 + rand() * 0.5);
  }
  flush(10);
  for (let i = 0; i < f.darkCount; i++) {
    tiled(rand() * size, rand() * size, (8 + rand() * 34) * k, f.dark, 0.6 + rand() * 0.4);
  }
  flush(5);
  for (let i = 0; i < f.spotCount / 2; i++) {
    const col = f.spots[Math.floor(rand() * f.spots.length)];
    tiled(rand() * size, rand() * size, (4 + rand() * 12) * k, col, 0.5);
  }
  flush(2);
  return c;
}

const textureCache = new Map();
function acetateTexture(finish, renderer) {
  const key = finish + (renderer ? renderer.id || '' : '');
  if (textureCache.has(key)) return textureCache.get(key);
  const tex = new THREE.CanvasTexture(makeAcetateCanvas(finish));
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(0.24, 0.24);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 4;
  textureCache.set(key, tex);
  return tex;
}

/* ---------- Geometrie ---------- */

const R_A = 1.0;          // halbe Glasbreite (≈ 24 mm)
const R_B = 0.93;         // halbe Glashöhe
const RIM = 0.145;         // Randstärke
const CX = 1.17;          // Glasmittelpunkt-Abstand zur Mitte
const DEPTH = 0.2;        // Acetatstärke der Front
const BEND = 0.05;        // Frontbiegung (Wrap)

// Panto-Kontur: rund mit leicht abgeflachter Oberkante
function rimPoint(theta, a, b) {
  const s = Math.sin(theta);
  const c = Math.cos(theta);
  const y = s > 0 ? b * Math.pow(s, 0.8) : b * s;
  return [a * c, y];
}

// Ausformung für die Backen (Endstücke) an der Außenseite oben
function wingBump(thetaLocal) {
  // thetaLocal: Winkel relativ zur Außenseite (Grad), Zentrum bei 157°
  const d = (thetaLocal - 157) / 22;
  return Math.abs(d) < 1 ? 0.13 * 0.5 * (1 + Math.cos(Math.PI * d)) : 0;
}

function buildFrontShape() {
  const shape = new THREE.Shape();
  const deg = Math.PI / 180;
  const pts = [];
  // Linkes Glas: von oben-innen (50°) gegen den Uhrzeigersinn bis unten-innen (325°)
  for (let t = 50; t <= 325; t += 2) {
    const bump = wingBump(t);
    const [x, y] = rimPoint(t * deg, R_A + bump, R_B + bump * 0.6);
    pts.push([-CX + x, y]);
  }
  const L = pts[pts.length - 1];
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  // Schlüsselloch-Steg: Bogen nach oben bis Scheitel
  const apexY = 0.36;
  shape.bezierCurveTo(L[0] + 0.12, L[1] + 0.32, -0.2, apexY, 0, apexY);
  shape.bezierCurveTo(0.2, apexY, -L[0] - 0.12, L[1] + 0.32, -L[0], L[1]);
  // Rechtes Glas: von unten-innen (215°) über außen bis oben-innen (130°+360°)
  for (let t = 215; t <= 490; t += 2) {
    const mirrored = 180 - (t % 360); // Winkel im Spiegel des linken Glases
    const bump = wingBump(((mirrored % 360) + 360) % 360);
    const [x, y] = rimPoint(t * deg, R_A + bump, R_B + bump * 0.6);
    shape.lineTo(CX + x, y);
  }
  // Oberkante des Stegs
  const P0 = pts[0];
  shape.quadraticCurveTo(0, P0[1] - 0.1, P0[0], P0[1]);

  for (const side of [-1, 1]) {
    const hole = new THREE.Path();
    for (let t = 0; t <= 360; t += 2) {
      const [x, y] = rimPoint(t * deg, R_A - RIM, R_B - RIM);
      if (t === 0) hole.moveTo(side * CX + x, y);
      else hole.lineTo(side * CX + x, y);
    }
    shape.holes.push(hole);
  }
  return shape;
}

function bendGeometry(geo, k) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    p.setZ(i, p.getZ(i) - k * x * x);
  }
  p.needsUpdate = true;
  geo.computeVertexNormals();
}

function buildLensGeometry(side) {
  const s = new THREE.Shape();
  const deg = Math.PI / 180;
  for (let t = 0; t <= 360; t += 3) {
    const [x, y] = rimPoint(t * deg, R_A - RIM + 0.04, R_B - RIM + 0.04);
    if (t === 0) s.moveTo(side * CX + x, y);
    else s.lineTo(side * CX + x, y);
  }
  const geo = new THREE.ShapeGeometry(s, 24);
  // leichte Wölbung der Gläser
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const dx = p.getX(i) - side * CX, dy = p.getY(i);
    p.setZ(i, 0.06 - 0.05 * (dx * dx + dy * dy));
  }
  geo.computeVertexNormals();
  bendGeometry(geo, BEND);
  return geo;
}

function buildTempleGeometry() {
  // Seitenprofil des Bügels (x = Länge nach hinten, y = Höhe)
  const L = 5.3;
  const s = new THREE.Shape();
  s.moveTo(0, 0.19);
  s.bezierCurveTo(1.2, 0.2, 3.0, 0.12, L, 0.07);
  // Ohrbiegung nach unten
  s.bezierCurveTo(L + 0.55, 0.04, L + 0.95, -0.25, L + 1.15, -0.78);
  s.bezierCurveTo(L + 1.19, -0.9, L + 1.06, -0.93, L + 1.01, -0.82);
  s.bezierCurveTo(L + 0.82, -0.32, L + 0.5, -0.07, L, -0.05);
  s.bezierCurveTo(3.0, -0.03, 1.2, -0.11, 0, -0.17);
  s.lineTo(0, 0.19);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.1,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 4,
    curveSegments: 48,
  });
  geo.translate(0, 0, -0.05);
  geo.rotateY(Math.PI / 2); // Länge zeigt nach -z
  return geo;
}

function buildRivetGeometry() {
  // Silberne Zierniete in Pfeilform (wie auf dem Produktfoto)
  const s = new THREE.Shape();
  const w = 0.13, h = 0.045, n = 0.022;
  s.moveTo(-w, 0);
  s.lineTo(-w * 0.55, h);
  s.lineTo(-w * 0.2, n);
  s.lineTo(w * 0.2, n);
  s.lineTo(w * 0.55, h);
  s.lineTo(w, 0);
  s.lineTo(w * 0.55, -h);
  s.lineTo(w * 0.2, -n);
  s.lineTo(-w * 0.2, -n);
  s.lineTo(-w * 0.55, -h);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, {
    depth: 0.012,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.008,
    bevelSegments: 2,
  });
}

/* ---------- Materialien ---------- */

export function createMaterials(finish, renderer) {
  const map = acetateTexture(finish, renderer);
  const acetate = new THREE.MeshPhysicalMaterial({
    map,
    roughness: 0.38,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    envMapIntensity: 0.9,
  });
  const lens = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.02,
    transparent: true,
    opacity: 0.16,
    clearcoat: 1,
    envMapIntensity: 2.2,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: 0xe9e6e1,
    metalness: 1,
    roughness: 0.18,
    envMapIntensity: 1.4,
  });
  return { acetate, lens, metal };
}

export function setFinish(model, finish, renderer) {
  const map = acetateTexture(finish, renderer);
  model.userData.materials.acetate.map = map;
  model.userData.materials.acetate.needsUpdate = true;
  model.userData.finish = finish;
}

/* ---------- Zusammenbau ---------- */

export function createGlasses(finish = 'havana', renderer) {
  const mats = createMaterials(finish, renderer);
  const group = new THREE.Group();
  group.userData.materials = mats;
  group.userData.finish = finish;

  const frontGeo = new THREE.ExtrudeGeometry(buildFrontShape(), {
    depth: DEPTH,
    bevelEnabled: true,
    bevelThickness: 0.055,
    bevelSize: 0.05,
    bevelSegments: 6,
    curveSegments: 64,
  });
  frontGeo.translate(0, 0, -DEPTH / 2);
  bendGeometry(frontGeo, BEND);
  const front = new THREE.Mesh(frontGeo, mats.acetate);
  front.castShadow = true;
  front.receiveShadow = true;
  group.add(front);

  for (const side of [-1, 1]) {
    const lens = new THREE.Mesh(buildLensGeometry(side), mats.lens);
    lens.renderOrder = 2;
    group.add(lens);
  }

  // Außenkante der Backen bestimmen
  frontGeo.computeBoundingBox();
  const maxX = frontGeo.boundingBox.max.x;
  const hingeY = 0.42;
  const backZ = -DEPTH / 2 - 0.05 - BEND * maxX * maxX;

  const templeGeo = buildTempleGeometry();
  const rivetGeo = buildRivetGeometry();
  for (const side of [-1, 1]) {
    // Bügel mit Scharnier-Pivot, leicht geöffnet
    const pivot = new THREE.Group();
    pivot.position.set(side * (maxX - 0.1), hingeY, backZ + 0.02);
    pivot.rotation.y = side * 0.07;
    const temple = new THREE.Mesh(templeGeo, mats.acetate);
    temple.castShadow = true;
    temple.receiveShadow = true;
    pivot.add(temple);

    // Niete außen am Bügel
    const tr = new THREE.Mesh(rivetGeo, mats.metal);
    tr.rotation.y = side * Math.PI / 2;
    tr.position.set(side * 0.084, 0.01, -0.62);
    pivot.add(tr);
    group.add(pivot);

    // Niete vorne auf den Backen
    const fr = new THREE.Mesh(rivetGeo, mats.metal);
    const fx = side * (maxX - 0.19);
    fr.position.set(fx, hingeY + 0.02, DEPTH / 2 + 0.055 - BEND * fx * fx - 0.006);
    fr.rotation.y = -side * Math.atan(2 * BEND * Math.abs(fx));
    group.add(fr);

    // Scharnierblock aus Metall (kaum sichtbar, sorgt für Tiefe)
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.3, 16), mats.metal);
    hinge.position.set(side * (maxX - 0.16), hingeY, backZ - 0.03);
    group.add(hinge);
  }

  // Modell zentrieren (inklusive Bügel)
  const box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  group.children.forEach((c) => c.position.sub(new THREE.Vector3(0, center.y, center.z)));
  group.userData.size = box.getSize(new THREE.Vector3());
  return group;
}

/* ---------- Bühne: Licht, Umgebung, Schatten ---------- */

export function createStage(renderer, { shadow = true } = {}) {
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.userData.envPromise = import('three/addons/environments/RoomEnvironment.js').then(
    ({ RoomEnvironment }) => {
      scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.03).texture;
    }
  );

  const key = new THREE.DirectionalLight(0xfff1e0, 2.4);
  key.position.set(-4, 8, 6);
  if (shadow) {
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -5;
    key.shadow.camera.right = 5;
    key.shadow.camera.top = 5;
    key.shadow.camera.bottom = -5;
    key.shadow.radius = 9;
    key.shadow.blurSamples = 20;
    key.shadow.bias = -0.0005;
  }
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd2a8, 1.4);
  rim.position.set(6, 3, -6);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xfff6ec, 0x6b4a33, 0.6));

  if (shadow) {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.ShadowMaterial({ color: 0x3a2414, opacity: 0.22 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.55;
    ground.receiveShadow = true;
    scene.add(ground);
    scene.userData.ground = ground;
  }
  return scene;
}

export function configureRenderer(renderer) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
}
