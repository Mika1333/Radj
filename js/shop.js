// Luxlens — gemeinsame Shop-Logik für alle Seiten:
// Produktdaten, Warenkorb (localStorage), Warenkorb-Leiste, Navigation, Hinweise
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
export const euro2 = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
export const escapeHTML = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const PRODUCT = 'Panto No. 01';
export const BASE_PRICE = 289;

export const FINISH_META = {
  havana: { name: 'Havana', note: 'Klassisches Schildpatt', swatch: 'radial-gradient(circle at 30% 30%, #e0a14a, #8a4a16 45%, #2a1206 75%)' },
  honig: { name: 'Honig', note: 'Helles Bernstein-Schildpatt', swatch: 'radial-gradient(circle at 30% 30%, #ffd79a, #d38d3a 50%, #6b3510 85%)' },
  espresso: { name: 'Espresso', note: 'Tiefes Braun, dezent marmoriert', swatch: 'radial-gradient(circle at 30% 30%, #6a3f24, #2e190c 60%, #140a05)' },
  onyx: { name: 'Onyx', note: 'Poliertes Schwarz', swatch: 'radial-gradient(circle at 30% 30%, #4a4440, #141110 55%, #050404)' },
};

// Größenangabe wie auf dem Bügel: Glasbreite □ Stegbreite – Bügellänge
export const SIZES = {
  S: { label: 'S', code: '45 □ 21 – 140', fit: 'Schmale Gesichter, bis ca. 13 cm Kopfbreite', scale: 0.96 },
  M: { label: 'M', code: '47 □ 21 – 145', fit: 'Die meisten Gesichter, 13 bis 14 cm', scale: 1 },
  L: { label: 'L', code: '49 □ 22 – 145', fit: 'Breite Gesichter, ab ca. 14 cm', scale: 1.04 },
};

export const LENSES = {
  demo: { label: 'Nur Fassung', note: 'Mit Demogläsern, ideal für deinen Optiker', add: 0, rx: false },
  single: { label: 'Einstärkengläser 1.6', note: 'Superentspiegelt, Hartschicht, UV400', add: 79, rx: true },
  blue: { label: 'Einstärken mit Blaufilter', note: 'Für lange Tage am Bildschirm', add: 119, rx: true },
  progressive: { label: 'Gleitsichtgläser 1.6', note: 'Nah, mittel und fern in einem Glas', add: 249, rx: true },
  sun: { label: 'Sonnenschutz Braun', note: 'Kategorie 3, UV400, auf Wunsch mit Stärke', add: 99, rx: false },
};

export const RX_MODES = {
  none: 'Keine Sehstärke',
  manual: 'Werte eingegeben',
  later: 'Rezept wird nachgereicht',
  atelier: 'Sehtest im Atelier',
};

export const SHIPPING = {
  standard: { label: 'Standardversand', note: '3–5 Werktage, versichert', price: 0 },
  express: { label: 'Expressversand', note: '1–2 Werktage', price: 15 },
  pickup: { label: 'Abholung im Atelier', note: 'Hamburg, mit kostenloser Anpassung', price: 0 },
};

export const cartImage = (finish) => `assets/cart/cart-${FINISH_META[finish] ? finish : 'havana'}.jpg`;

/* ---------- Speicher ---------- */
const store = {
  get(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ohne Speicher weiter */ }
  },
};

export function loadDraft() {
  const d = store.get('luxlens-draft', {}) || {};
  return {
    finish: FINISH_META[d.finish] ? d.finish : 'havana',
    size: SIZES[d.size] ? d.size : 'M',
    lens: LENSES[d.lens] ? d.lens : 'demo',
    rxMode: RX_MODES[d.rxMode] ? d.rxMode : 'none',
    rx: d.rx || null,
    engraving: typeof d.engraving === 'string' ? d.engraving.slice(0, 20) : '',
  };
}
export const saveDraft = (d) => store.set('luxlens-draft', d);

/* ---------- Warenkorb ---------- */
function normalize(i) {
  return {
    finish: FINISH_META[i.finish] ? i.finish : 'havana',
    size: SIZES[i.size] ? i.size : 'M',
    lens: LENSES[i.lens] ? i.lens : 'demo',
    rxMode: RX_MODES[i.rxMode] ? i.rxMode : 'none',
    rx: i.rx || null,
    engraving: typeof i.engraving === 'string' ? i.engraving.slice(0, 20) : '',
    qty: Math.max(1, Math.min(9, parseInt(i.qty, 10) || 1)),
  };
}
const itemKey = (i) => [i.finish, i.size, i.lens, i.rxMode, JSON.stringify(i.rx), i.engraving].join('|');

let cart = (store.get('luxlens-cart', []) || []).map(normalize);
const listeners = new Set();
const saveCart = () => { store.set('luxlens-cart', cart); listeners.forEach((fn) => fn(cart)); };

export const getCart = () => cart;
export const onCartChange = (fn) => listeners.add(fn);
export const unitPrice = (i) => BASE_PRICE + LENSES[i.lens].add;
export const itemPrice = (i) => unitPrice(i) * i.qty;
export const cartTotal = () => cart.reduce((s, i) => s + itemPrice(i), 0);
export const cartCount = () => cart.reduce((n, i) => n + i.qty, 0);
export function clearCart() { cart = []; saveCart(); renderCart(); }

export function itemDetails(i) {
  const parts = [`Größe ${i.size} · ${SIZES[i.size].code}`, LENSES[i.lens].label];
  if (LENSES[i.lens].rx && i.rxMode !== 'none') parts.push(RX_MODES[i.rxMode]);
  if (i.engraving) parts.push(`Gravur „${i.engraving}“`);
  return parts;
}

export function addToCart(config, { silent = false } = {}) {
  const item = normalize({ ...config, qty: 1 });
  const existing = cart.find((i) => itemKey(i) === itemKey(item));
  if (existing) existing.qty = Math.min(9, existing.qty + 1);
  else cart.push(item);
  saveCart();
  renderCart();
  const btn = $('#cartOpen');
  if (btn) { btn.classList.remove('is-bump'); void btn.offsetWidth; btn.classList.add('is-bump'); }
  if (!silent) toast(`<b>✓</b> ${PRODUCT} · ${FINISH_META[item.finish].name} im Warenkorb`);
}

export function renderCart() {
  const countEl = $('#cartCount');
  if (countEl) countEl.textContent = cartCount();
  const list = $('#cartItems');
  if (!list) return;
  list.innerHTML = '';
  cart.forEach((i) => {
    const f = FINISH_META[i.finish];
    const row = document.createElement('div');
    row.className = 'item';
    row.innerHTML = `
      <img class="item__img" src="${cartImage(i.finish)}" alt="${PRODUCT} in ${f.name}" width="72" height="72">
      <div class="item__body"><p class="item__name">${PRODUCT} · ${f.name}</p>
        <p class="item__sub">${itemDetails(i).map(escapeHTML).join('<br>')}</p>
        <div class="qty"><button type="button" aria-label="Menge verringern" data-dec>−</button><span>${i.qty}</span><button type="button" aria-label="Menge erhöhen" data-inc>+</button></div></div>
      <div class="item__right"><span class="item__price">${euro.format(itemPrice(i))}</span><button class="item__remove" type="button" data-rm>Entfernen</button></div>`;
    $('[data-inc]', row).addEventListener('click', () => { i.qty = Math.min(9, i.qty + 1); saveCart(); renderCart(); });
    $('[data-dec]', row).addEventListener('click', () => { i.qty -= 1; if (i.qty < 1) cart = cart.filter((x) => x !== i); saveCart(); renderCart(); });
    $('[data-rm]', row).addEventListener('click', () => { cart = cart.filter((x) => x !== i); saveCart(); renderCart(); });
    list.appendChild(row);
  });
  const empty = cart.length === 0;
  $('#cartEmpty').hidden = !empty;
  $('#cartFoot').hidden = empty;
  list.hidden = empty;
  $('#cartSubtotal').textContent = euro.format(cartTotal());
}

/* ---------- Leiste, Menü, Hinweise ---------- */
let lenisRef = null;
let lastFocus = null;

export function openCart() {
  const drawer = $('#drawer'), scrim = $('#scrim');
  if (!drawer) return;
  lastFocus = document.activeElement;
  scrim.hidden = false;
  requestAnimationFrame(() => scrim.classList.add('is-open'));
  drawer.classList.add('is-open');
  drawer.setAttribute('aria-hidden', 'false');
  lenisRef?.stop();
  setTimeout(() => $('#cartClose').focus(), 50);
}
export function closeCart() {
  const drawer = $('#drawer'), scrim = $('#scrim');
  if (!drawer || !drawer.classList.contains('is-open')) return;
  scrim.classList.remove('is-open');
  drawer.classList.remove('is-open');
  drawer.setAttribute('aria-hidden', 'true');
  setTimeout(() => { scrim.hidden = true; }, 450);
  lenisRef?.start();
  lastFocus?.focus?.();
}

export function closeMenu() {
  const t = $('#menuToggle'), m = $('#mobileMenu');
  if (!t || !m) return;
  t.setAttribute('aria-expanded', 'false');
  t.setAttribute('aria-label', 'Menü öffnen');
  m.hidden = true;
}

let toastTimer;
export function toast(html) {
  const t = $('#toast');
  if (!t) return;
  t.innerHTML = html;
  t.classList.add('is-show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-show'), 2800);
}

export function initShop({ lenis = null } = {}) {
  lenisRef = lenis;
  const toggle = $('#menuToggle');
  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    $('#mobileMenu').hidden = !open;
  });
  $('#cartOpen')?.addEventListener('click', openCart);
  $('#cartClose')?.addEventListener('click', closeCart);
  $('#scrim')?.addEventListener('click', closeCart);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCart(); });
  $('#checkout')?.addEventListener('click', () => { window.location.href = 'kasse.html'; });
  // Warenkorb in anderen Tabs geändert
  window.addEventListener('storage', (e) => {
    if (e.key === 'luxlens-cart') { cart = (store.get('luxlens-cart', []) || []).map(normalize); renderCart(); }
  });
  renderCart();
}
