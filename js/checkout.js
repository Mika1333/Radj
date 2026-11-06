// Luxlens — Kasse: Zusammenfassung aus dem Warenkorb, Formularprüfung,
// Versand- und Zahlungsauswahl, Bestätigung (Demo, ohne echte Zahlung)
(function () {
  'use strict';
  const { $, $$, euro, euro2, escapeHTML, PRODUCT, FINISH_META, SHIPPING, getCart, itemPrice, cartTotal, itemDetails, cartImage, clearCart, initShop, } = window.LXShop;


  const PAYMENTS = {
    card: { label: 'Kredit- oder Debitkarte', note: 'Visa, Mastercard, American Express' },
    paypal: { label: 'PayPal', note: 'Weiterleitung zu PayPal' },
    klarna: { label: 'Rechnung mit Klarna', note: 'Zahlung innerhalb von 30 Tagen' },
    applepay: { label: 'Apple Pay', note: 'Mit Face ID oder Touch ID bestätigen' },
  };
  const state = { shipping: 'standard', payment: 'card' };

  function radios(container, name, entries, current, render, onPick) {
    container.innerHTML = '';
    entries.forEach(([key, data]) => {
      const id = `${name}-${key}`;
      const label = document.createElement('label');
      label.className = 'cfg-opt';
      label.htmlFor = id;
      label.innerHTML = `<input type="radio" name="${name}" id="${id}" value="${key}" ${key === current ? 'checked' : ''}>${render(data)}`;
      $('input', label).addEventListener('change', () => onPick(key));
      container.appendChild(label);
    });
  }

  radios($('#shippingOptions'), 'ship', Object.entries(SHIPPING), state.shipping,
    (d) => `<span class="cfg-opt__text"><span class="cfg-opt__name">${d.label}</span><span class="cfg-opt__note">${d.note}</span></span>
      <span class="cfg-opt__price">${d.price ? euro.format(d.price) : 'kostenlos'}</span>`,
    (k) => { state.shipping = k; renderSummary(); });

  radios($('#paymentOptions'), 'pay', Object.entries(PAYMENTS), state.payment,
    (d) => `<span class="cfg-opt__text"><span class="cfg-opt__name">${d.label}</span><span class="cfg-opt__note">${d.note}</span></span>`,
    (k) => { state.payment = k; });

  function itemsHTML(items) {
    return items.map((i) => `
      <div class="co-item">
        <div class="co-item__img"><img src="${cartImage(i.finish)}" alt="${PRODUCT} in ${FINISH_META[i.finish].name}" width="80" height="80"><span>${i.qty}</span></div>
        <div class="co-item__body"><p class="co-item__name">${PRODUCT} · ${FINISH_META[i.finish].name}</p>
          <p class="co-item__sub">${itemDetails(i).map(escapeHTML).join('<br>')}</p></div>
        <p class="co-item__price">${euro.format(itemPrice(i))}</p>
      </div>`).join('');
  }

  function totals() {
    const sub = cartTotal();
    const ship = SHIPPING[state.shipping].price;
    const total = sub + ship;
    return { sub, ship, total, vat: total - total / 1.19 };
  }

  function renderSummary() {
    const items = getCart();
    const empty = items.length === 0;
    $('.co__grid').hidden = empty;
    $('#emptyState').hidden = !empty;
    if (empty) return;
    $('#sumItems').innerHTML = itemsHTML(items);
    const t = totals();
    $('#sumSub').textContent = euro.format(t.sub);
    $('#sumShip').textContent = t.ship ? euro.format(t.ship) : 'kostenlos';
    $('#sumTotal').textContent = euro.format(t.total);
    $('#sumVat').textContent = euro2.format(t.vat);
    $('#payTotal').textContent = euro.format(t.total);
  }

  /* ---------- Formularprüfung ---------- */
  const ZIP = { DE: /^\d{5}$/, AT: /^\d{4}$/, CH: /^\d{4}$/ };
  const rules = {
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Bitte gib eine gültige E-Mail-Adresse ein, z. B. name@beispiel.de.'),
    first: (v) => (v ? '' : 'Bitte gib deinen Vornamen ein.'),
    last: (v) => (v ? '' : 'Bitte gib deinen Nachnamen ein.'),
    street: (v) => (/\d/.test(v) && v.length > 3 ? '' : 'Bitte gib Straße und Hausnummer ein.'),
    zip: (v) => {
      const c = $('#country').value;
      return ZIP[c].test(v) ? '' : `Die PLZ für ${$('#country').selectedOptions[0].textContent} hat ${c === 'DE' ? '5' : '4'} Ziffern.`;
    },
    city: (v) => (v ? '' : 'Bitte gib deinen Ort ein.'),
    terms: () => ($('#terms').checked ? '' : 'Bitte bestätige die AGB, um zu bestellen.'),
  };

  function check(id, show = true) {
    const el = $('#' + id);
    const msg = rules[id](el.type === 'checkbox' ? '' : el.value.trim());
    const err = $(`.field__err[data-for="${id}"]`);
    if (show || !msg) {
      err.textContent = msg;
      el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      el.closest('.field')?.classList.toggle('is-invalid', !!msg);
    }
    return !msg;
  }
  Object.keys(rules).forEach((id) => {
    const el = $('#' + id);
    el.addEventListener('blur', () => { if (el.value || el.type === 'checkbox') check(id); });
    el.addEventListener('input', () => { if (el.getAttribute('aria-invalid') === 'true') check(id); });
    el.addEventListener('change', () => { if (el.type === 'checkbox') check(id); });
  });
  $('#country').addEventListener('change', () => { if ($('#zip').value) check('zip'); });

  // Kontakt und Adresse für den nächsten Besuch merken (nur in diesem Browser)
  const saved = (() => { try { return JSON.parse(localStorage.getItem('luxlens-address')) || {}; } catch { return {}; } })();
  ['email', 'first', 'last', 'street', 'extra', 'zip', 'city', 'country'].forEach((id) => {
    if (saved[id]) $('#' + id).value = saved[id];
    $('#' + id).addEventListener('change', () => {
      saved[id] = $('#' + id).value;
      try { localStorage.setItem('luxlens-address', JSON.stringify(saved)); } catch { /* ohne Speicher weiter */ }
    });
  });

  $('#orderForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = Object.keys(rules).map((id) => check(id)).every(Boolean);
    if (!ok) {
      const first = $('[aria-invalid="true"]');
      first?.focus();
      first?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    const btn = $('#placeOrder');
    btn.disabled = true;
    btn.textContent = 'Bestellung wird angelegt …';
    setTimeout(() => complete(), 900);
  });

  function complete() {
    const items = getCart().map((i) => ({ ...i }));
    const t = totals();
    const no = `LX-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`;
    $('#orderNo').textContent = no;
    $('#doneTitle').textContent = `Danke, ${$('#first').value.trim()}.`;
    const ship = SHIPPING[state.shipping];
    $('#doneLead').textContent = state.shipping === 'pickup'
      ? `Wir melden uns unter ${$('#email').value.trim()}, sobald deine Brille im Atelier zur Anpassung bereitliegt.`
      : `Die Bestätigung geht an ${$('#email').value.trim()}. ${ship.label}, ${ship.note.split(',')[0]}.`;
    $('#doneItems').innerHTML = itemsHTML(items) + `
      <div class="co-sum__rows"><div class="co-sum__total"><span>Gesamt</span><span>${euro.format(t.total)}</span></div></div>`;
    clearCart();
    $('.co__grid').hidden = true;
    $('#emptyState').hidden = true;
    $('#doneState').hidden = false;
    window.scrollTo({ top: 0 });
    $('#doneTitle').setAttribute('tabindex', '-1');
    $('#doneTitle').focus({ preventScroll: true });
  }

  renderSummary();
  window.LXCheckout = {
    onShow() {
      // Nach einer Bestellung beim nächsten Öffnen wieder mit leerem Formular starten
      if (!$('#doneState').hidden) {
        $('#doneState').hidden = true;
        const btn = $('#placeOrder');
        btn.disabled = false;
        btn.innerHTML = 'Zahlungspflichtig bestellen · <span id="payTotal">0 €</span>';
        $('#terms').checked = false;
      }
      renderSummary();
    },
  };
  window.addEventListener('storage', (e) => { if (e.key === 'luxlens-cart' && $('#doneState').hidden) renderSummary(); });
})();
