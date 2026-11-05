// Luxlens — Konfigurator: sechs Schritt-Seiten mit eigener Adresse,
// 3D-Vorschau, Entwurf im Browser gespeichert, Übergabe an Warenkorb und Kasse
import * as THREE from 'three';
import { createGlasses, createStage, configureRenderer, setFinish, makeAcetateCanvas } from './glasses.js';
import {
  $, $$, euro, escapeHTML, PRODUCT, BASE_PRICE, FINISH_META, SIZES, LENSES, RX_MODES,
  initShop, addToCart, openCart, loadDraft, saveDraft,
} from './shop.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const STEPS = ['farbe', 'groesse', 'glaeser', 'sehstaerke', 'gravur', 'uebersicht'];
const draft = loadDraft();
const persist = () => saveDraft(draft);
const price = () => BASE_PRICE + LENSES[draft.lens].add;
const needsRx = () => LENSES[draft.lens].rx;

initShop();

/* ---------- Optionen aufbauen ---------- */
function optionGroup(container, name, entries, current, render, onPick) {
  container.innerHTML = '';
  entries.forEach(([key, data]) => {
    const id = `${name}-${key}`;
    const label = document.createElement('label');
    label.className = 'cfg-opt';
    label.htmlFor = id;
    label.innerHTML = `<input type="radio" name="${name}" id="${id}" value="${key}" ${key === current ? 'checked' : ''}>${render(key, data)}`;
    $('input', label).addEventListener('change', () => onPick(key));
    container.appendChild(label);
  });
}

optionGroup($('#finishOptions'), 'finish', Object.entries(FINISH_META), draft.finish,
  (k, f) => `<span class="cfg-opt__swatch" style="background:${f.swatch}"></span>
    <span class="cfg-opt__text"><span class="cfg-opt__name">${f.name}</span><span class="cfg-opt__note">${f.note}</span></span>
    <span class="cfg-opt__price">${euro.format(BASE_PRICE)}</span>`,
  (k) => { draft.finish = k; persist(); if (model) { setFinish(model, k, renderer); spin(0.14); } update(); });

optionGroup($('#sizeOptions'), 'size', Object.entries(SIZES), draft.size,
  (k, s) => `<span class="cfg-opt__badge">${s.label}</span>
    <span class="cfg-opt__text"><span class="cfg-opt__name">${s.code}</span><span class="cfg-opt__note">${s.fit}</span></span>`,
  (k) => { draft.size = k; persist(); update(); });

optionGroup($('#lensOptions'), 'lens', Object.entries(LENSES), draft.lens,
  (k, l) => `<span class="cfg-opt__text"><span class="cfg-opt__name">${l.label}</span><span class="cfg-opt__note">${l.note}</span></span>
    <span class="cfg-opt__price">${l.add ? '+ ' + euro.format(l.add) : 'inklusive'}</span>`,
  (k) => {
    draft.lens = k;
    if (!LENSES[k].rx) draft.rxMode = 'none';
    else if (draft.rxMode === 'none') draft.rxMode = 'later';
    persist(); applyLens(); syncRx(); update();
  });

const rxChoices = Object.entries(RX_MODES).filter(([k]) => k !== 'none');
const rxNotes = {
  manual: 'Werte aus deinem Brillenpass eintragen',
  later: 'Foto vom Brillenpass nach der Bestellung per E-Mail',
  atelier: 'Kostenloser Sehtest in Hamburg, wir melden uns',
};
optionGroup($('#rxModes'), 'rxmode', rxChoices, draft.rxMode,
  (k, label) => `<span class="cfg-opt__text"><span class="cfg-opt__name">${label}</span><span class="cfg-opt__note">${rxNotes[k]}</span></span>`,
  (k) => { draft.rxMode = k; persist(); syncRx(); update(); });

/* ---------- Sehstärke ---------- */
const fmt = (v) => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(2).replace('.', ',');
function fillSelect(sel, from, to, step, def, formatter = fmt) {
  for (let v = from; v <= to + 1e-9; v += step) {
    const o = document.createElement('option');
    o.value = v.toFixed(2);
    o.textContent = formatter(v);
    if (Math.abs(v - def) < 1e-9) o.selected = true;
    sel.appendChild(o);
  }
}
['od', 'os'].forEach((eye) => {
  fillSelect($(`#rx-${eye}-sph`), -10, 6, 0.25, 0);
  fillSelect($(`#rx-${eye}-cyl`), -4, 0, 0.25, 0);
});
fillSelect($('#rx-pd'), 54, 74, 0.5, 63, (v) => v.toFixed(1).replace('.', ',') + ' mm');

const rxFields = ['od-sph', 'od-cyl', 'od-axis', 'os-sph', 'os-cyl', 'os-axis', 'pd'];
if (draft.rx) rxFields.forEach((f) => { if (draft.rx[f] != null) $(`#rx-${f}`).value = draft.rx[f]; });
rxFields.forEach((f) => $(`#rx-${f}`).addEventListener('change', () => { readRx(); validateRx(false); }));

function readRx() {
  draft.rx = Object.fromEntries(rxFields.map((f) => [f, $(`#rx-${f}`).value]));
  persist();
  update();
}
function validateRx(show = true) {
  if (!needsRx() || draft.rxMode !== 'manual') { $('#rxError').hidden = true; return true; }
  readRx();
  const problems = [];
  ['od', 'os'].forEach((eye) => {
    const cyl = parseFloat(draft.rx[`${eye}-cyl`]);
    const axisRaw = draft.rx[`${eye}-axis`];
    const axis = Number(axisRaw);
    const name = eye === 'od' ? 'rechts' : 'links';
    if (cyl !== 0 && (axisRaw === '' || !Number.isInteger(axis) || axis < 0 || axis > 180)) {
      problems.push(`Achse ${name} fehlt: Bei Zylinder ${fmt(cyl)} brauchen wir eine Achse zwischen 0 und 180°.`);
    }
  });
  const err = $('#rxError');
  if (problems.length && show) { err.textContent = problems.join(' '); err.hidden = false; }
  else if (!problems.length) err.hidden = true;
  return problems.length === 0;
}
function syncRx() {
  const need = needsRx();
  $('#rxNone').hidden = need;
  $('#rxNeeded').hidden = !need;
  $('#rxNoneLens').textContent = LENSES[draft.lens].label;
  $('#rxForm').hidden = !(need && draft.rxMode === 'manual');
  $$('#rxModes input').forEach((i) => { i.checked = i.value === draft.rxMode; });
}
$('#rxNext').addEventListener('click', (e) => {
  if (!validateRx(true)) { e.preventDefault(); $('#rxError').scrollIntoView({ block: 'center', behavior: 'smooth' }); }
});

/* ---------- Gravur ---------- */
const engraveInput = $('#engraveInput');
const ENGRAVE_OK = /^[A-Za-zÄÖÜäöüß0-9 .,&'+\-·]*$/;
engraveInput.value = draft.engraving;
const templeCache = {};
function templeTexture() {
  const f = draft.finish;
  if (!templeCache[f]) templeCache[f] = makeAcetateCanvas(f, 512, 3).toDataURL('image/jpeg', 0.8);
  $('#templePreview').style.backgroundImage = `url(${templeCache[f]})`;
}
function syncEngraving() {
  const v = engraveInput.value;
  const ok = ENGRAVE_OK.test(v);
  $('#engraveError').hidden = ok;
  $('#engraveError').textContent = ok ? '' : 'Erlaubt sind Buchstaben, Zahlen, Leerzeichen und . , & \' + - ·';
  if (ok) { draft.engraving = v.trim(); persist(); }
  $('#engraveText').textContent = v.trim() || 'Dein Text';
  $('#engraveText').classList.toggle('is-placeholder', !v.trim());
  $('#engraveCount').textContent = `${v.length} / 20`;
  update();
}
engraveInput.addEventListener('input', syncEngraving);

/* ---------- Übersicht ---------- */
function rxSummary() {
  if (!needsRx()) return 'Keine Werte nötig';
  if (draft.rxMode !== 'manual' || !draft.rx) return RX_MODES[draft.rxMode];
  const r = draft.rx;
  const eye = (e) => `${fmt(+r[`${e}-sph`])} / ${fmt(+r[`${e}-cyl`])}${+r[`${e}-cyl`] !== 0 ? ' / ' + (r[`${e}-axis`] || '–') + '°' : ''}`;
  return `R ${eye('od')} · L ${eye('os')} · PD ${String(r.pd).replace('.', ',')}`;
}
function renderReview() {
  const rows = [
    ['Farbe', `${FINISH_META[draft.finish].name} · ${FINISH_META[draft.finish].note}`, euro.format(BASE_PRICE), 'farbe'],
    ['Größe', `${draft.size} · ${SIZES[draft.size].code}`, '', 'groesse'],
    ['Gläser', LENSES[draft.lens].label, LENSES[draft.lens].add ? '+ ' + euro.format(LENSES[draft.lens].add) : 'inklusive', 'glaeser'],
    ['Sehstärke', rxSummary(), '', 'sehstaerke'],
    ['Gravur', draft.engraving ? `„${draft.engraving}“` : 'Keine', draft.engraving ? 'kostenlos' : '', 'gravur'],
  ];
  $('#review').innerHTML = rows.map(([k, v, p, step]) => `
    <div class="review__row">
      <dt>${k}</dt>
      <dd><span>${escapeHTML(v)}</span><a href="#${step}">Ändern</a></dd>
      <dd class="review__price">${p}</dd>
    </div>`).join('');
  $('#reviewTotal').textContent = euro.format(price());
  $('#reviewNote').textContent = needsRx()
    ? 'Inkl. MwSt. · Fertigung mit deinen Gläsern in 7–10 Werktagen · Kostenloser Versand'
    : 'Inkl. MwSt. · Versand in 3–5 Werktagen · Kostenloser Versand · 30 Tage Rückgabe';
}

const cartConfig = () => ({ ...draft, rx: needsRx() && draft.rxMode === 'manual' ? draft.rx : null });
$('#addToCart').addEventListener('click', () => {
  if (!validateRx(true)) { go('sehstaerke'); return; }
  addToCart(cartConfig());
  setTimeout(openCart, 350);
});
$('#buyNow').addEventListener('click', () => {
  if (!validateRx(true)) { go('sehstaerke'); return; }
  addToCart(cartConfig(), { silent: true });
  window.location.href = 'kasse.html';
});

/* ---------- Zusammenfassung unter der Bühne ---------- */
function update() {
  $('#sumFinish').textContent = FINISH_META[draft.finish].name;
  const meta = [`Größe ${draft.size}`, LENSES[draft.lens].label];
  if (draft.engraving) meta.push('mit Gravur');
  $('#sumMeta').textContent = meta.join(' · ');
  $('#sumPrice').textContent = euro.format(price());
  $('#templeSize').textContent = SIZES[draft.size].code.replace(' – ', ' ');
  if (model) model.scale.setScalar(SIZES[draft.size].scale);
  templeTexture();
  renderReview();
}

/* ---------- Schritt-Seiten (Hash-Routing) ---------- */
let currentStep = null;
const visited = new Set(['farbe']);
function go(step) { if (location.hash !== '#' + step) location.hash = step; else show(step); }
function show(step) {
  if (!STEPS.includes(step)) step = 'farbe';
  if (step === currentStep) return;
  const prev = currentStep ? $(`#step-${currentStep}`) : null;
  const next = $(`#step-${step}`);
  const dir = currentStep && STEPS.indexOf(step) < STEPS.indexOf(currentStep) ? -1 : 1;
  currentStep = step;
  visited.add(step);
  if (prev) prev.hidden = true;
  next.hidden = false;
  if (!reduceMotion && prev) {
    next.animate(
      [{ opacity: 0, transform: `translateX(${dir * 28}px)` }, { opacity: 1, transform: 'none' }],
      { duration: 520, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
    );
  }
  const i = STEPS.indexOf(step);
  $$('[data-step-link]').forEach((a) => {
    const j = STEPS.indexOf(a.dataset.stepLink);
    a.classList.toggle('is-done', j < i);
    a.classList.toggle('is-current', j === i);
    if (j === i) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
  });
  $('#progressBar').style.transform = `scaleX(${(i + 1) / STEPS.length})`;
  document.title = `${$('#' + 'h-' + step).textContent.replace(/\.$/, '')} · Luxlens Konfigurator`;
  setView(step === 'groesse' ? 'front' : step === 'gravur' ? 'side' : 'three');
  if (prev && window.innerWidth < 900) $('#steps').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  else if (prev) window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  if (prev) $('.cfg-step__title', next).focus({ preventScroll: true });
}
$$('.cfg-step__title').forEach((h) => h.setAttribute('tabindex', '-1'));
window.addEventListener('hashchange', () => show(location.hash.slice(1)));

/* ---------- 3D-Bühne ---------- */
const canvas = $('#cfgCanvas');
let renderer, scene, camera, model;
const view = { target: { y: -0.5, x: 0.22 }, rotY: -0.5, rotX: 0.22, vel: 0, drag: false, lastX: 0, idle: 0 };
const VIEWS = { front: { y: 0, x: 0.06 }, three: { y: -0.55, x: 0.24 }, side: { y: -1.35, x: 0.12 } };

function setView(name) {
  view.target = { ...VIEWS[name] };
  view.idle = 0;
  view.vel = 0;
  view.manual = false;
  $$('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === name)));
}
$$('[data-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
function spin(v) { view.vel += v; view.manual = true; view.idle = 0; }

function initStage() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  configureRenderer(renderer);
  scene = createStage(renderer);
  camera = new THREE.PerspectiveCamera(26, 1, 0.1, 200);
  model = createGlasses(draft.finish, renderer);
  scene.add(model);
  if (scene.userData.ground) scene.userData.ground.position.y = -1.5;
  applyLens();
  resize();
  window.addEventListener('resize', resize);

  canvas.addEventListener('pointerdown', (e) => {
    view.drag = true; view.manual = true; view.lastX = e.clientX;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!view.drag) return;
    const dx = e.clientX - view.lastX;
    view.lastX = e.clientX;
    view.vel = dx * 0.008;
    view.rotY += view.vel;
    view.idle = 0;
  });
  const end = () => { view.drag = false; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!view.drag) {
      if (view.manual) {
        view.vel *= 0.94;
        view.rotY += view.vel;
        view.idle += dt;
        if (view.idle > 4) { view.manual = false; view.target.y = view.rotY; }
      } else {
        view.rotY += (view.target.y - view.rotY) * 0.07;
      }
    }
    view.rotX += (view.target.x - view.rotX) * 0.07;
    model.rotation.set(view.rotX, view.rotY, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const dist = Math.max(9.6 / (2 * tan * Math.min(camera.aspect, 1.25)), 15);
  camera.position.set(0, 1.4, dist);
  camera.lookAt(0, -0.15, 0);
  camera.updateProjectionMatrix();
}

function applyLens() {
  if (!model) return;
  const m = model.userData.materials.lens;
  if (draft.lens === 'sun') { m.color.set('#4a2a14'); m.opacity = 0.78; }
  else if (draft.lens === 'blue') { m.color.set('#e4ecff'); m.opacity = 0.12; }
  else { m.color.set('#ffffff'); m.opacity = draft.lens === 'demo' ? 0.05 : 0.08; }
}

/* ---------- Start ---------- */
try {
  initStage();
} catch (err) {
  console.warn('WebGL nicht verfügbar:', err);
  $('.cfg-stage__box').classList.add('no-webgl');
}
syncRx();
syncEngraving();
update();
show(location.hash.slice(1) || 'farbe');
