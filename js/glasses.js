// Luxlens — prozedurales 3D-Modell der Panto-Brille (Three.js)
// Front aus einem Stück Acetat (Schlüsselloch-Steg), gebogene Fassung,
// Bügel mit Ohrbiegung, silberne Zierniete und Gläser.
(function () {
  'use strict';
  const THREE = window.THREE;

  /* ---------- Acetat-Texturen (Canvas) ---------- */

  function mulberry32(seed) {
    return function () {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const FINISHES = {
    havana: {
      name: 'Havana',
      transmission: 0.7,
      attenuation: '#c8701f',
      glow: 0.25,
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
      transmission: 0.85,
      attenuation: '#e8a24c',
      glow: 0.3,
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
      transmission: 0.45,
      attenuation: '#6a3414',
      glow: 0.15,
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
      transmission: 0.08,
      attenuation: '#2a2220',
      glow: 0.0,
      note: 'Poliertes Schwarz',
      base: '#0d0b0a',
      spots: ['#1a1613', '#141110', '#201b17'],
      dark: '#060505',
      spotCount: 60,
      darkCount: 10,
      swatch: 'radial-gradient(circle at 30% 30%, #4a4440, #141110 55%, #050404)',
    },
  };

  function makeAcetateCanvas(finish, size = 1024, seed = 7) {
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
    layer.width = layer.height = 0; // Zwischenebene freigeben
    return c;
  }

  // Kleinere Texturen auf Handys und Tablets: spart Speicher, verhindert Abstürze
  const LOW_POWER = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent)) ||
    Math.min(screen.width, screen.height) < 820;
  const TEX_SIZE = LOW_POWER ? 1024 : 2048;
  const MAX_DPR = LOW_POWER ? 1.5 : 2;

  const textureCache = new Map();
  function acetateTexture(finish, renderer) {
    const key = finish + (renderer ? renderer.id || '' : '');
    if (textureCache.has(key)) return textureCache.get(key);
    const tex = new THREE.CanvasTexture(makeAcetateCanvas(finish, TEX_SIZE));
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(0.3, 0.3);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 4;
    textureCache.set(key, tex);
    return tex;
  }

  /* ---------- Geometrie ---------- */
  // Runde Panto-Form wie auf dem Produktfoto
  // Maße nach dem Kampagnenfoto: Glas 168 × 140 px, Rand 14 px, Glasmitten 266 px auseinander
  // (die Fase legt außen und innen je BEVEL_S drauf)
  const R_A = 0.945;        // halbe Außenbreite eines Glasrings
  const R_B = 0.805;        // halbe Außenhöhe (flacher als breit)
  const RIM = 0.07;         // Randstärke ohne Fase, sichtbar ≈ 0,14
  const CX = 1.33;          // Glasmittelpunkt-Abstand zur Mitte
  const DEPTH = 0.16;       // Acetatstärke der Front
  const BEND = 0.05;        // Frontbiegung (Wrap)
  const BEVEL_S = 0.035;    // Fasenbreite
  const BEVEL_T = 0.045;    // Fasentiefe

  // Panto-Kontur: rund mit leicht abgeflachter Oberkante
  function rimPoint(theta, a, b) {
    const s = Math.sin(theta);
    const c = Math.cos(theta);
    const y = s > 0 ? b * Math.pow(s, 0.6) : b * s; // gerade Oberkante, runde Unterseite
    return [a * c, y];
  }

  // Ausformung für die Backen (Endstücke) an der Außenseite oben
  function wingBump(thetaLocal) {
    const d = (thetaLocal - 158) / 22;
    return Math.abs(d) < 1 ? 0.24 * 0.5 * (1 + Math.cos(Math.PI * d)) : 0;
  }

  function buildFrontShape() {
    const shape = new THREE.Shape();
    const deg = Math.PI / 180;
    const pts = [];
    // Linkes Glas: von oben-innen (50°) gegen den Uhrzeigersinn bis unten-innen (325°)
    for (let t = 37; t <= 346; t += 1) {
      const bump = wingBump(t);
      const [x, y] = rimPoint(t * deg, R_A + bump, R_B + bump * 0.6);
      pts.push([-CX + x, y]);
    }
    const L = pts[pts.length - 1];
    shape.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
    // Schlüsselloch-Steg: Bogen nach oben bis Scheitel
    const apexY = 0.38;
    shape.bezierCurveTo(L[0] + 0.07, L[1] + 0.25, -0.2, apexY, 0, apexY);
    shape.bezierCurveTo(0.2, apexY, -L[0] - 0.07, L[1] + 0.25, -L[0], L[1]);
    // Rechtes Glas: von unten-innen (215°) über außen bis oben-innen (130°+360°)
    for (let t = 194; t <= 503; t += 1) {
      const mirrored = 180 - (t % 360);
      const bump = wingBump(((mirrored % 360) + 360) % 360);
      const [x, y] = rimPoint(t * deg, R_A + bump, R_B + bump * 0.6);
      shape.lineTo(CX + x, y);
    }
    // Oberkante des Stegs
    const P0 = pts[0];
    shape.quadraticCurveTo(0, P0[1] - 0.04, P0[0], P0[1]);

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

  // Verformt z = z + f(x, y) und transformiert die Normalen exakt mit,
  // damit gebogene Flächen glatt schattiert bleiben (keine Facetten)
  function deformZ(geo, f, fx, fy) {
    const p = geo.attributes.position;
    const n = geo.attributes.normal;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      p.setZ(i, p.getZ(i) + f(x, y));
      const nz = n.getZ(i);
      v.set(n.getX(i) - fx(x, y) * nz, n.getY(i) - fy(x, y) * nz, nz).normalize();
      n.setXYZ(i, v.x, v.y, v.z);
    }
    p.needsUpdate = true;
    n.needsUpdate = true;
  }

  function bendGeometry(geo, k) {
    deformZ(geo, (x) => -k * x * x, (x) => -2 * k * x, () => 0);
  }

  function buildLensGeometry(side) {
    // Glas mit echter Dicke (Kante fängt Licht), sitzt in der Nut der Fassung
    const s = new THREE.Shape();
    const deg = Math.PI / 180;
    for (let t = 0; t <= 360; t += 2) {
      const [x, y] = rimPoint(t * deg, R_A - RIM + 0.025, R_B - RIM + 0.025);
      if (t === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    }
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.035, bevelEnabled: false, curveSegments: 8 });
    geo.translate(side * CX, 0, -0.0175);
    const cx = side * CX;
    deformZ(
      geo,
      (x, y) => 0.045 - 0.045 * ((x - cx) ** 2 + y * y),
      (x) => -0.09 * (x - cx),
      (x, y) => -0.09 * y
    );
    bendGeometry(geo, BEND);
    return geo;
  }

  function buildTempleGeometry() {
    // Seitenprofil des Bügels (x = Länge nach hinten, y = Höhe)
    const L = 5.3;
    const s = new THREE.Shape();
    s.moveTo(0, 0.13);
    s.bezierCurveTo(1.2, 0.13, 3.0, 0.08, L, 0.05);
    // Ohrbiegung nach unten
    s.bezierCurveTo(L + 0.55, 0.03, L + 0.95, -0.25, L + 1.13, -0.76);
    s.bezierCurveTo(L + 1.16, -0.85, L + 1.07, -0.88, L + 1.03, -0.8);
    s.bezierCurveTo(L + 0.85, -0.31, L + 0.5, -0.05, L, -0.035);
    s.bezierCurveTo(3.0, -0.03, 1.2, -0.1, 0, -0.12);
    s.lineTo(0, 0.13);
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: 0.065,
      bevelEnabled: true,
      bevelThickness: 0.022,
      bevelSize: 0.02,
      bevelSegments: 6,
      curveSegments: 72,
    });
    geo.translate(0, 0, -0.0325);
    geo.rotateY(Math.PI / 2); // Länge zeigt nach -z
    return geo;
  }

  function buildRivetGeometry() {
    // Silberne Zierniete in Pfeilform (wie auf dem Produktfoto)
    const s = new THREE.Shape();
    const w = 0.11, h = 0.038, n = 0.018;
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

  // Durchlässigkeit aus der Farbtextur: helle Bernstein-Partien lassen Licht durch,
  // dunkle Flecken bleiben deckend (wie in echtem Schildpatt-Acetat)
  const transCache = new Map();
  function transmissionTexture(finish) {
    if (transCache.has(finish)) return transCache.get(finish);
    const src = acetateTexture(finish).image;
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    const g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    const img = g.getImageData(0, 0, c.width, c.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
      let t = Math.min(1, Math.max(0, (lum - 0.1) / 0.42));
      t = t * t * (3 - 2 * t);
      const v = Math.round((0.12 + 0.88 * t) * 255);
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    g.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.copy(acetateTexture(finish).repeat);
    transCache.set(finish, tex);
    return tex;
  }

  function applyAcetate(m, finish, renderer) {
    const f = FINISHES[finish] || FINISHES.havana;
    const map = acetateTexture(finish, renderer);
    m.map = map;
    m.transmissionMap = transmissionTexture(finish);
    m.transmission = f.transmission;
    m.attenuationColor.set(f.attenuation);
    m.emissiveMap = map;
    m.emissiveIntensity = f.glow;
    m.needsUpdate = true;
  }

  function createMaterials(finish, renderer) {
    const acetate = new THREE.MeshPhysicalMaterial({
      roughness: 0.2,
      metalness: 0,
      ior: 1.49,
      thickness: 0.25,              // Lichtweg durch das Acetat
      attenuationColor: new THREE.Color('#c8701f'),
      attenuationDistance: 0.22,    // färbt durchgehendes Licht bernsteinfarben
      specularIntensity: 0.8,
      clearcoat: 1,
      clearcoatRoughness: 0.025,
      emissive: new THREE.Color('#4a2810'),
      envMapIntensity: 1.0,
    });
    applyAcetate(acetate, finish, renderer);
    const lens = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.0,
      transparent: true,
      opacity: 0.05,
      ior: 1.6,
      clearcoat: 1,
      clearcoatRoughness: 0,
      envMapIntensity: 1.1,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const pad = new THREE.MeshPhysicalMaterial({
      color: 0xf3ebe0,
      roughness: 0.15,
      transparent: true,
      opacity: 0.45,
      clearcoat: 1,
      envMapIntensity: 1.6,
      depthWrite: false,
    });
    const metal = new THREE.MeshStandardMaterial({
      color: 0xe7e4df,
      metalness: 1,
      roughness: 0.14,
      envMapIntensity: 1.5,
    });
    const wire = new THREE.MeshStandardMaterial({
      color: 0xb9b2a8,
      metalness: 1,
      roughness: 0.35,
    });
    return { acetate, lens, pad, metal, wire };
  }

  function setFinish(model, finish, renderer) {
    applyAcetate(model.userData.materials.acetate, finish, renderer);
    model.userData.finish = finish;
  }

  /* ---------- Zusammenbau ---------- */

  function createGlasses(finish = 'havana', renderer) {
    const mats = createMaterials(finish, renderer);
    const group = new THREE.Group();
    group.userData.materials = mats;
    group.userData.finish = finish;

    const frontGeo = new THREE.ExtrudeGeometry(buildFrontShape(), {
      depth: DEPTH,
      bevelEnabled: true,
      bevelThickness: BEVEL_T,
      bevelSize: BEVEL_S,
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

      // Transparente Nasenpads hinter dem Steg
      const pad = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), mats.pad);
      const px = side * (CX - R_A + RIM + 0.0);
      pad.scale.set(0.05, 0.15, 0.03);
      pad.position.set(px, -0.32, -DEPTH / 2 - BEVEL_T - 0.05 - BEND * px * px);
      pad.rotation.set(0.25, side * 0.6, side * 0.35);
      pad.renderOrder = 3;
      group.add(pad);
    }

    // Außenkante der Backen bestimmen
    frontGeo.computeBoundingBox();
    const maxX = frontGeo.boundingBox.max.x;
    const hingeY = 0.5;
    const backZ = -DEPTH / 2 - BEVEL_T + 0.005 - BEND * maxX * maxX;

    const templeGeo = buildTempleGeometry();
    const rivetGeo = buildRivetGeometry();
    const hingeGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.22, 20);
    // Kerndraht: Metallseele im Bügel, durch das Acetat sichtbar
    const wireGeo = new THREE.CylinderGeometry(0.011, 0.011, 4.3, 10);
    wireGeo.rotateX(Math.PI / 2);
    wireGeo.translate(0, 0.008, -2.45);
    for (const side of [-1, 1]) {
      // Bügel mit Scharnier-Pivot, leicht geöffnet
      const pivot = new THREE.Group();
      pivot.position.set(side * (maxX - 0.08), hingeY, backZ + 0.015);
      pivot.rotation.y = side * 0.1;
      group.userData.pivots = group.userData.pivots || [];
      group.userData.pivots.push(pivot);
      const temple = new THREE.Mesh(templeGeo, mats.acetate);
      temple.castShadow = true;
      temple.receiveShadow = true;
      pivot.add(temple);
      const wire = new THREE.Mesh(wireGeo, mats.wire);
      pivot.add(wire);

      // Niete außen am Bügel
      const tr = new THREE.Mesh(rivetGeo, mats.metal);
      tr.rotation.y = side * Math.PI / 2;
      tr.position.set(side * 0.057, 0.008, -0.55);
      pivot.add(tr);
      group.add(pivot);

      // Niete vorne auf den Backen
      const fr = new THREE.Mesh(rivetGeo, mats.metal);
      const fx = side * (maxX - 0.16);
      fr.position.set(fx, hingeY + 0.02, DEPTH / 2 + BEVEL_T - BEND * fx * fx - 0.006);
      fr.rotation.y = -side * Math.atan(2 * BEND * Math.abs(fx));
      group.add(fr);

      // Scharnier aus Metall zwischen Front und Bügel
      const hinge = new THREE.Mesh(hingeGeo, mats.metal);
      hinge.position.set(side * (maxX - 0.12), hingeY, backZ - 0.025);
      group.add(hinge);
    }

    // Modell zentrieren (inklusive Bügel)
    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    group.children.forEach((c) => c.position.sub(new THREE.Vector3(0, center.y, center.z)));
    group.userData.size = box.getSize(new THREE.Vector3());
    // Mitte zwischen den Gläsern (für die Ausrichtung auf dem Foto)
    group.userData.eyeCenter = new THREE.Vector3(0, -center.y, DEPTH / 2 - center.z);
    group.userData.eyeSpacing = 2 * CX;
    return group;
  }

  /* ---------- Studio-Umgebung für Reflexionen ---------- */

  function buildStudioEnvironment() {
    // Dunkelgrüner Raum mit Softboxen: erzeugt lange, weiche Glanzlichter
    // auf dem lackierten Acetat, wie bei Produktfotos
    const env = new THREE.Scene();
    const room = new THREE.Mesh(
      new THREE.SphereGeometry(20, 32, 16),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#2c3a30'), side: THREE.BackSide })
    );
    env.add(room);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#b9a58f') })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -6;
    env.add(floor);
    const box = (w, h, intensity, pos, look, tint = '#fff4e8') => {
      const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(intensity), side: THREE.DoubleSide });
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
      p.position.set(...pos);
      p.lookAt(...look);
      env.add(p);
    };
    box(10, 4, 5.5, [0, 9, 2], [0, 0, 0]);          // große Softbox oben
    box(2, 9, 6, [-9, 2, 5], [0, 0, 0]);            // Streifenlicht links vorne
    box(1.4, 8, 3.5, [9, 2, -5], [0, 0, 0], '#ffe2c4'); // warmes Kantenlicht hinten rechts
    box(6, 2.5, 2, [3, 1, 10], [0, 0, 0]);          // Aufheller von vorne
    return env;
  }

  /* ---------- Bühne: Licht, Umgebung, Schatten ---------- */

  function createStage(renderer, { shadow = true } = {}) {
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(buildStudioEnvironment(), 0.025).texture;
    pmrem.dispose();
    scene.userData.envPromise = Promise.resolve();

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
    scene.add(new THREE.HemisphereLight(0xfff6ec, 0x3f5a45, 0.6));

    if (shadow) {
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 30),
        new THREE.ShadowMaterial({ color: 0x1c3324, opacity: 0.22 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -1.55;
      ground.receiveShadow = true;
      scene.add(ground);
      scene.userData.ground = ground;
    }
    return scene;
  }

  function configureRenderer(renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;
  }

  window.LXGlasses = { MAX_DPR, FINISHES, makeAcetateCanvas, createMaterials, setFinish, createGlasses, createStage, configureRenderer };
})();
