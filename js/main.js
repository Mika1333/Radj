// Luxlens — Startseite: Scroll-Effekte, 3D-Szenen, Kollektion
(function () {
  'use strict';
  const THREE = window.THREE;
  const { createGlasses, createStage, configureRenderer, setFinish, makeAcetateCanvas, FINISHES, } = window.LXGlasses;
  const { MAX_DPR } = window.LXGlasses;
  const { $, $$, euro, BASE_PRICE, PRODUCT, FINISH_META, initShop, addToCart, closeCart, closeMenu, loadDraft, saveDraft, } = window.LXShop;

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

  if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* =========================================================
     Smooth Scroll (Lenis) — gekoppelt an GSAP ScrollTrigger
     ========================================================= */
  let lenis = null;
  if (!reduceMotion && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95 });
    if (gsap && ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  function scrollToTarget(target) {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: el.id === 'top' ? 0 : -40, duration: 1.6 });
    else el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const el = $(id);
      if (!el) return;
      e.preventDefault();
      closeMenu();
      closeCart();
      scrollToTarget(el);
    });
  });

  /* =========================================================
     Acetat-Flächen (Kacheln & Prozess) aus derselben Textur
     ========================================================= */
  const swatchCache = {};
  function acetateURL(finish) {
    if (!swatchCache[finish]) swatchCache[finish] = makeAcetateCanvas(finish, 1024, 11).toDataURL('image/jpeg', 0.84);
    return swatchCache[finish];
  }
  $$('[data-acetate]').forEach((el) => {
    el.style.backgroundImage = `url(${acetateURL(el.dataset.acetate)})`;
    const z = parseFloat(el.dataset.zoom || '1');
    el.style.backgroundSize = `${Math.round(640 * z)}px`;
  });

  /* =========================================================
     HERO — Porträt als erstes Bild. Beim Scrollen hebt die Brille
     von der Nase ab, wird zum 3D-Modell und dreht sich ins Bild.
     ========================================================= */
  const hero = $('#hero');
  const heroCanvas = $('#heroCanvas');
  const photoGlasses = $('#photoGlasses');   // Foto mit Brille
  const photoBare = $('#photoBare');         // Foto ohne Brille, unscharf (Fokus auf der Brille)
  const heroLogo = $('#heroLogo');
  // Lage der Brille im Foto (Pixel im Originalbild): Mitte zwischen den Gläsern,
  // Abstand der Glasmitten, Neigung und leichte Drehung des Kopfes
  const PHOTO = { w: 1307, h: 1203, eyeX: 679, eyeY: 570.5, eyeDist: 266, tilt: 0.049, yaw: 0.12 };
  const CAM_DIST = 30, CAM_FOV = 14;          // lange Brennweite wie beim Porträt
  const heroState = { visible: true, pointerX: 0, pointerY: 0, gl: false };
  let heroRenderer, heroScene, heroCamera, heroHolder, heroModel, headAnchor;
  let K = null;                               // Schlüsselposen

  function initHero() {
    if (reduceMotion) return;                 // ruhiges Standbild ohne Animation
    heroRenderer = new THREE.WebGLRenderer({ canvas: heroCanvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    heroRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
    configureRenderer(heroRenderer);
    heroScene = createStage(heroRenderer);
    heroCamera = new THREE.PerspectiveCamera(CAM_FOV, 1, 0.1, 400);
    heroModel = createGlasses('havana', heroRenderer);
    heroHolder = new THREE.Group();
    heroHolder.add(heroModel);
    heroScene.add(heroHolder);

    // Unsichtbarer Kopf (nur Tiefe): verdeckt Bügel und Ohrbügel, solange die Brille sitzt
    headAnchor = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), new THREE.MeshBasicMaterial({ colorWrite: false }));
    head.scale.set(3.7, 4.4, 3.7);
    head.position.set(0, 0.35, -4.45);
    head.renderOrder = -1;
    headAnchor.add(head);
    heroScene.add(headAnchor);

    heroState.gl = true;
    document.documentElement.classList.add('hero-gl');
    resizeHero();
    window.addEventListener('resize', resizeHero);
    window.addEventListener('pointermove', (e) => {
      heroState.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      heroState.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
    new IntersectionObserver(([entry]) => { heroState.visible = entry.isIntersecting; }).observe(hero);
  }

  const tmpV = THREE ? new THREE.Vector3() : null;
  const tmpE = THREE ? new THREE.Euler() : null;
  // Holder-Position, bei der die Glasmitte des Modells auf `target` liegt
  function poseAt(target, rot, s) {
    tmpE.set(rot[0], rot[1], rot[2]);
    tmpV.copy(heroModel.userData.eyeCenter).multiplyScalar(s).applyEuler(tmpE);
    return { x: target.x - tmpV.x, y: target.y - tmpV.y, z: target.z - tmpV.z, rx: rot[0], ry: rot[1], rz: rot[2], s };
  }

  function resizeHero() {
    if (!heroState.gl) return;
    const w = heroCanvas.clientWidth, h = heroCanvas.clientHeight;
    if (!w || !h) return;
    heroRenderer.setSize(w, h, false);
    const aspect = w / h;
    heroCamera.aspect = aspect;
    heroCamera.position.set(0, 0, CAM_DIST);
    heroCamera.lookAt(0, 0, 0);
    heroCamera.updateProjectionMatrix();
    const tan = Math.tan(THREE.MathUtils.degToRad(CAM_FOV / 2));
    const visH = 2 * CAM_DIST * tan, visW = visH * aspect;
    const upp = visH / h;                     // Welteinheiten pro Pixel auf der Bildebene

    // Brille im Foto: Bildschirmposition und Größe
    const r = photoGlasses.getBoundingClientRect();
    const c = heroCanvas.getBoundingClientRect();
    if (!r.width || !c.width) return;          // Foto noch nicht gelayoutet
    const k = r.width / PHOTO.w;
    const ex = r.left - c.left + PHOTO.eyeX * k;
    const ey = r.top - c.top + PHOTO.eyeY * k;
    const s0 = (PHOTO.eyeDist * k * upp) / (heroModel.userData.eyeSpacing * Math.cos(PHOTO.yaw));
    const onFace = new THREE.Vector3((ex - w / 2) * upp, -(ey - h / 2) * upp, 0);

    // Endgröße: Brille füllt einen Teil der Breite, je nach Format
    const frac = aspect > 1 ? 0.42 : aspect > 0.75 ? 0.56 : 0.6;
    const sF = Math.min((frac * visW) / 5.6, (0.42 * visH) / 1.9);
    const center = new THREE.Vector3(aspect > 1 ? 0.05 * visW : 0, 0, 0);
    const lifted = onFace.clone().add(new THREE.Vector3(0, 0.12 * visH, 7));

    // Posen beschreiben, wo die Glasmitte liegt: so kippt die Brille um die Gläser,
    // nicht um die Bügelmitte, und bleibt beim Abheben vor dem Gesicht
    const eyePose = (t, rot, sc) => ({ x: t.x, y: t.y, z: t.z, rx: rot[0], ry: rot[1], rz: rot[2], s: sc });
    const centered = (rot, sc) => {
      // Modellmitte in die Bildmitte, daraus die Lage der Glasmitte
      tmpE.set(rot[0], rot[1], rot[2]);
      const e = heroModel.userData.eyeCenter.clone().multiplyScalar(sc).applyEuler(tmpE).add(center);
      return eyePose(e, rot, sc);
    };
    K = {
      face: eyePose(onFace, [0, PHOTO.yaw, PHOTO.tilt], s0),
      lift: eyePose(lifted, [0.34, 0.04, 0], s0 * 1.04),
      center: centered([0.3, -0.62, 0], sF),
      end: centered([0.16, 0.58, 0], sF),
    };
    // Kopf bleibt dort, wo die Brille im Foto sitzt
    headAnchor.position.copy(onFace);
    headAnchor.rotation.set(0, PHOTO.yaw, PHOTO.tilt);
    headAnchor.scale.setScalar(s0);
    current = null;
  }

  /* Farben, Fotos, Navigation: hängen nur am Scrollstand (auch ohne WebGL) */
  const rootStyle = document.documentElement.style;
  const rootClass = document.documentElement.classList;
  let lastT = -1, lastTf = -1;
  function updateHeroTheme() {
    const rect = hero.getBoundingClientRect();
    let p, t, tf;
    if (reduceMotion) {
      const past = rect.bottom <= 60;
      p = 0; t = tf = past ? 1 : 0;
      rootClass.toggle('hero-top', !past);
    } else {
      p = heroProgress();
      t = smooth(0.9, 1.0, p);
      tf = smooth(0.9, 0.97, p);
      rootClass.toggle('hero-top', rect.bottom > 0 && p < 0.9);
    }
    if (heroState.gl) {
      // Brille im Foto wird zur 3D-Brille, das Gesicht tritt unscharf zurück
      photoGlasses.style.opacity = String(1 - smooth(0.02, 0.07, p));
      const o = smooth(0.004, 0.035, p);
      heroCanvas.style.opacity = String(o);
      heroCanvas.style.visibility = o > 0 ? 'visible' : 'hidden';
      heroState.canvasOn = o > 0;
      photoBare.style.opacity = String(1 - smooth(0.2, 0.46, p));
      photoBare.style.transform = `scale(${1 + 0.1 * smooth(0.02, 0.5, p)})`;
    }
    heroLogo.style.opacity = String(1 - smooth(0.84, 0.92, p));
    t = Math.round(t * 1000) / 1000;
    tf = Math.round(tf * 1000) / 1000;
    if (t !== lastT) { rootStyle.setProperty('--t', t); lastT = t; }
    if (tf !== lastTf) { rootStyle.setProperty('--tf', tf); lastTf = tf; }
  }
  window.addEventListener('scroll', updateHeroTheme, { passive: true });
  window.addEventListener('resize', updateHeroTheme);

  function heroProgress() {
    const r = hero.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    return total > 0 ? clamp(-r.top / total) : 0;
  }

  const mixPose = (a, b, t) => {
    const o = {};
    for (const key in a) o[key] = lerp(a[key], b[key], t);
    return o;
  };
  let current = null;
  const clock = THREE ? new THREE.Clock() : null;
  function renderHero() {
    if (!K) return;
    const p = heroProgress();
    const time = clock.getElapsedTime();
    const lift = smooth(0.03, 0.3, p);       // von der Nase nach vorn oben
    const turn = smooth(0.3, 0.58, p);        // in die Bildmitte, Dreiviertelansicht
    const spin = smooth(0.58, 1.0, p);        // langsame Drehung
    let target = mixPose(mixPose(mixPose(K.face, K.lift, lift), K.center, turn), K.end, spin);

    // Maus und leichtes Schweben erst, wenn die Brille frei ist
    const free = smooth(0.35, 0.6, p);
    target.ry += heroState.pointerX * 0.07 * free;
    target.rx += heroState.pointerY * 0.04 * free;
    target.y += Math.sin(time * 0.9) * 0.04 * free * target.s;

    // Am Anfang exakt auf dem Foto, danach weich nachgeführt
    current = !current || p < 0.004 ? target : mixPose(current, target, 0.14);
    const hp = poseAt(new THREE.Vector3(current.x, current.y, current.z), [current.rx, current.ry, current.rz], current.s);
    heroHolder.position.set(hp.x, hp.y, hp.z);
    heroHolder.rotation.set(current.rx, current.ry, current.rz);
    heroHolder.scale.setScalar(current.s);

    // Bügel sitzen am Kopf eng an, danach öffnen sie sich leicht
    heroModel.userData.pivots.forEach((pv, i) => { pv.rotation.y = (i ? 1 : -1) * lerp(0.16, 0.1, lift); });
    headAnchor.visible = lift < 0.55;
    const ground = heroScene.userData.ground;
    if (ground) {
      ground.material.opacity = 0.22 * smooth(0.42, 0.62, p);
      ground.position.y = hp.y - 1.8 * current.s;
    }
    heroRenderer.render(heroScene, heroCamera);
  }

  /* =========================================================
     KONFIGURATOR — zweite Szene, ziehbar, Farbwechsel
     ========================================================= */
  const configCanvas = $('#configCanvas');
  const config = { finish: loadDraft().finish, visible: false, rotY: -0.5, velY: 0, dragging: false, lastX: 0, idle: 0 };
  let cRenderer, cScene, cCamera, cModel;

  function initConfigurator() {
    cRenderer = new THREE.WebGLRenderer({ canvas: configCanvas, antialias: true, alpha: true });
    cRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
    configureRenderer(cRenderer);
    cScene = createStage(cRenderer);
    cCamera = new THREE.PerspectiveCamera(26, 1, 0.1, 200);
    cModel = createGlasses(config.finish, cRenderer);
    cModel.rotation.x = 0.28;
    cScene.add(cModel);
    if (cScene.userData.ground) cScene.userData.ground.position.y = -1.45;
    resizeConfig();
    window.addEventListener('resize', resizeConfig);
    new IntersectionObserver(([e]) => { config.visible = e.isIntersecting; }).observe(configCanvas);

    configCanvas.addEventListener('pointerdown', (e) => {
      config.dragging = true;
      config.lastX = e.clientX;
      configCanvas.setPointerCapture(e.pointerId);
    });
    configCanvas.addEventListener('pointermove', (e) => {
      if (!config.dragging) return;
      const dx = e.clientX - config.lastX;
      config.lastX = e.clientX;
      config.velY = dx * 0.008;
      config.rotY += config.velY;
      config.idle = 0;
    });
    const end = () => { config.dragging = false; };
    configCanvas.addEventListener('pointerup', end);
    configCanvas.addEventListener('pointercancel', end);
  }

  function resizeConfig() {
    const w = configCanvas.clientWidth, h = configCanvas.clientHeight;
    if (!w || !h) return;
    cRenderer.setSize(w, h, false);
    cCamera.aspect = w / h;
    cCamera.position.set(0, 1.5, 19);
    cCamera.lookAt(0, -0.2, 0);
    cCamera.updateProjectionMatrix();
  }

  function renderConfig(dt) {
    if (!config.dragging) {
      config.velY *= 0.94;
      config.rotY += config.velY;
      config.idle += dt;
      if (config.idle > 1.5 && !reduceMotion) config.rotY += dt * 0.25;
    }
    cModel.rotation.y = config.rotY;
    cRenderer.render(cScene, cCamera);
  }

  function buildSwatches() {
    const wrap = $('#swatches');
    Object.entries(FINISH_META).forEach(([key, f]) => {
      const b = document.createElement('button');
      b.className = 'swatch';
      b.type = 'button';
      b.id = `swatch-${key}`;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(key === config.finish));
      b.setAttribute('aria-label', `${f.name}, ${f.note}`);
      b.style.background = f.swatch;
      b.addEventListener('click', () => selectFinish(key));
      wrap.appendChild(b);
    });
    $('#finishName').textContent = FINISH_META[config.finish].name;
    $('#finishNote').textContent = FINISH_META[config.finish].note;
  }

  function selectFinish(key) {
    config.finish = key;
    $$('.swatch').forEach((s) => s.setAttribute('aria-checked', String(s.id === `swatch-${key}`)));
    $('#finishName').textContent = FINISH_META[key].name;
    $('#finishNote').textContent = FINISH_META[key].note;
    saveDraft({ ...loadDraft(), finish: key });
    if (cModel) {
      setFinish(cModel, key, cRenderer);
      config.velY += 0.12; // kleiner Dreh-Impuls beim Farbwechsel
      config.idle = 0;
    }
  }

  // Gewählte Farbe in den Konfigurator mitnehmen
  $('#openConfigurator').addEventListener('click', () => saveDraft({ ...loadDraft(), finish: config.finish }));
  $('#quickAdd').addEventListener('click', () => addToCart({ finish: config.finish, size: 'M', lens: 'demo' }));

  /* =========================================================
     KOLLEKTION — Produktbilder aus dem 3D-Modell gerendert
     ========================================================= */
  function buildCards() {
    const cards = $('#cards');
    Object.entries(FINISH_META).forEach(([key, f]) => {
      const el = document.createElement('article');
      el.className = 'card';
      el.dataset.reveal = '';
      el.innerHTML = `
        <div class="card__img"><img alt="${PRODUCT} in ${f.name}" data-thumb="${key}" width="800" height="600"></div>
        <div class="card__meta"><h3>${PRODUCT} · ${f.name}</h3><p>${f.note}</p></div>
        <div class="card__buy"><span class="card__price">${euro.format(BASE_PRICE)}</span>
          <button class="btn btn--neon" type="button" data-add="${key}">Hinzufügen</button></div>`;
      cards.appendChild(el);
    });
    $$('[data-add]', cards).forEach((b) => b.addEventListener('click', () => addToCart({ finish: b.dataset.add, size: 'M', lens: 'demo' })));
  }

  async function renderThumbnails() {
    const W = 800, H = 600;
    const canvas = document.createElement('canvas');
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1);
    r.setSize(W, H, false);
    configureRenderer(r);
    const scene = createStage(r);
    await scene.userData.envPromise;
    const cam = new THREE.PerspectiveCamera(24, W / H, 0.1, 100);
    cam.position.set(0, 2.0, 15);
    cam.lookAt(0, -0.25, 0);
    const model = createGlasses('havana', r);
    model.rotation.set(0.2, -0.62, 0);
    scene.add(model);
    if (scene.userData.ground) scene.userData.ground.position.y = -1.45;
    for (const key of Object.keys(FINISHES)) {
      setFinish(model, key, r);
      r.render(scene, cam);
      const url = canvas.toDataURL('image/png');
      $$(`img[data-thumb="${key}"]`).forEach((img) => { img.src = url; });
      await new Promise((res) => setTimeout(res, 0));
    }
    r.dispose();
    r.forceContextLoss();
  }

  /* =========================================================
     SCROLL-CHOREOGRAFIE (GSAP)
     ========================================================= */
  function splitWords(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(' ');
    return $$('.w', el);
  }

  function initScrollFx() {
    if (!gsap || !ScrollTrigger || reduceMotion) return;

    // Hero: Logo erscheint beim Laden
    gsap.from('#heroLogo', { y: -16, opacity: 0, duration: 1.4, ease: 'expo.out', delay: 0.2, clearProps: 'transform' });

    // Hero: Text blendet aus, Callouts erscheinen nacheinander
    const tl = gsap.timeline({
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom bottom', scrub: 0.6 },
      defaults: { ease: 'none' },
    });
    // Hinweise erscheinen, sobald die Brille frei im Raum schwebt (noch auf Grün)
    tl.fromTo('#calloutA', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.05 }, 0.56)
      .to('#calloutA', { opacity: 0, y: -30, duration: 0.05 }, 0.67)
      .fromTo('#calloutB', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.05 }, 0.67)
      .to('#calloutB', { opacity: 0, y: -30, duration: 0.05 }, 0.77)
      .fromTo('#calloutC', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.05 }, 0.77)
      .to('#calloutC', { opacity: 0, y: -30, duration: 0.04 }, 0.86);

    // Statement: Wort für Wort aufhellen
    const words = splitWords($('#statementText'));
    gsap.fromTo(words, { opacity: 0.14 }, {
      opacity: 1, ease: 'none', stagger: 0.05,
      scrollTrigger: { trigger: '#statementText', start: 'top 80%', end: 'bottom 45%', scrub: true },
    });

    // Foto: öffnet sich von der Karte zur vollen Breite
    gsap.fromTo('#photoFrame',
      { clipPath: 'inset(6% 12% 6% 12% round 36px)' },
      { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
        scrollTrigger: { trigger: '#photoFrame', start: 'top 95%', end: 'top 10%', scrub: true } });
    gsap.fromTo('#photoImg', { scale: 1.12 }, {
      scale: 1, ease: 'none',
      scrollTrigger: { trigger: '#photoFrame', start: 'top bottom', end: 'bottom top', scrub: true },
    });

    // Überschriften & Kacheln gleiten herein
    $$('.section-head, .photo__caption, .config__panel, .service__grid, .process__head').forEach((el) => {
      gsap.from(el.children, {
        y: 50, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08,
        scrollTrigger: { trigger: el, start: 'top 85%' },
      });
    });
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 90%',
      onEnter: (els) => gsap.from(els, { y: 70, opacity: 0, duration: 1.3, ease: 'expo.out', stagger: 0.1, overwrite: true }),
      once: true,
    });

    // Zahlen zählen hoch
    $$('[data-count]').forEach((el) => {
      const end = +el.dataset.count;
      const obj = { v: 0 };
      gsap.to(obj, {
        v: end, duration: 1.8, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%' },
        onUpdate: () => { el.textContent = Math.round(obj.v); },
      });
    });

    // Konfigurator-Bühne: sanfter Parallax
    gsap.fromTo('.config__stage', { y: 60 }, {
      y: -30, ease: 'none',
      scrollTrigger: { trigger: '.config', start: 'top bottom', end: 'bottom top', scrub: true },
    });

    // Prozess: horizontales Scrollen (nur Desktop)
    const mm = gsap.matchMedia();
    mm.add('(min-width: 761px)', () => {
      const track = $('#processTrack');
      const distance = () => Math.max(0, track.scrollWidth - document.documentElement.clientWidth);
      gsap.to(track, {
        x: () => -distance(), ease: 'none',
        scrollTrigger: {
          trigger: '#processPin', start: 'top top', end: () => '+=' + distance(),
          pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
        },
      });
    });

    window.addEventListener('load', () => ScrollTrigger.refresh());
  }

  /* =========================================================
     START
     ========================================================= */
  initShop({ lenis });
  buildSwatches();
  buildCards();
  initScrollFx();

  let webgl = true;
  try {
    initHero();
    initConfigurator();
  } catch (err) {
    webgl = false;
    heroState.gl = false;
    document.documentElement.classList.remove('hero-gl');
    console.warn('WebGL nicht verfügbar:', err);
    document.documentElement.classList.add('no-webgl');
  }
  updateHeroTheme();
  // Fotos erst vermessen, wenn sie geladen sind
  photoGlasses.addEventListener('load', () => { if (heroState.gl) resizeHero(); });

  if (webgl) {
    Promise.resolve().finally(() => {
      let last = performance.now();
      const loop = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (heroState.gl && heroState.visible && heroState.canvasOn) renderHero();
        if (config.visible) renderConfig(dt);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
      if (heroState.gl) renderHero();
      renderThumbnails().catch((e) => console.warn('Thumbnails:', e));
    });
  }
})();
