// Luxlens — Ansichten auf einer Seite: Startseite, Konfigurator (#farbe, #groesse …)
// und Kasse (#kasse). Alles liegt in index.html, damit kein Seitenwechsel nötig ist.
(function () {
  'use strict';
  const root = document.documentElement;
  const STEPS = (window.LXConfigurator && window.LXConfigurator.steps) ||
    ['farbe', 'groesse', 'glaeser', 'sehstaerke', 'gravur', 'uebersicht'];
  const MAIN_TITLE = document.title;
  const routeFor = (h) => (STEPS.includes(h) ? 'config' : h === 'kasse' ? 'checkout' : 'main');
  let current = null;

  function toTop() {
    const lenis = window.LXMain && window.LXMain.lenis;
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
    window.scrollTo(0, 0);
  }

  function apply(route, { scroll = true } = {}) {
    const changed = route !== current;
    current = route;
    root.setAttribute('data-route', route);
    if (route === 'main') document.title = MAIN_TITLE;
    if (route === 'checkout') document.title = 'Kasse · Luxlens';
    if (changed) {
      if (scroll && route !== 'main') toTop();
      if (route === 'config' && window.LXConfigurator) window.LXConfigurator.onShow();
      if (route === 'checkout' && window.LXCheckout) window.LXCheckout.onShow();
      if (route === 'main') {
        if (window.LXMain) window.LXMain.resizeHero();
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      }
    }
    if (window.LXMain) window.LXMain.updateHeroTheme();
  }

  window.addEventListener('hashchange', () => apply(routeFor(location.hash.slice(1))));

  // Links aus Konfigurator oder Kasse zu Abschnitten der Startseite (#kollektion, #top …):
  // erst zur Startseite wechseln, das Scrollen übernimmt danach main.js
  document.addEventListener('click', (e) => {
    const a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a || current === 'main') return;
    const h = a.getAttribute('href').slice(1);
    if (!h || routeFor(h) !== 'main') return;
    const el = document.getElementById(h);
    if (!el || !el.closest('.view--main')) return;
    history.replaceState(null, '', location.pathname + location.search);
    toTop();
    apply('main', { scroll: false });
  }, true);

  apply(routeFor(location.hash.slice(1)), { scroll: false });
})();
