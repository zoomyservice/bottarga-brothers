(function () {
  'use strict';

  // ── Worker URL — fill in after deploying checkout-worker.js to Cloudflare ──
  const WORKER_URL = 'https://bottarga-brothers-chat.zoozoomfast.workers.dev/checkout';

  // ── Shipping options (USA only — Canada uses flat $12 CAD) ──────────────
  const SHIPPING_OPTIONS = [
    { id: 'free',     label: 'Free Standard',     sub: 'USPS Ground Advantage · 2–5 days',    amount: 0    },
    { id: 'priority', label: 'Priority Mail',      sub: 'USPS Priority Mail · 1–3 days',       amount: 1295 },
    { id: 'express',  label: 'Priority Express',   sub: 'USPS Priority Express · Overnight',   amount: 2895 },
  ];
  let selectedShipping = 0; // index — default Free

  // ── Stripe price catalog ──
  const CATALOG = {
    'sardinian-gold': {
      name: 'Sardinian Gold', flag: '\u{1f1ee}\u{1f1f9}',
      prices: [
        { id: 'price_1TNOZyPnG7UtHDWeAuJDmAZ3', size: 'M \u2014 4.9 oz (138g)', amount: 3899 },
        { id: 'price_1TNOa1PnG7UtHDWeHUYgHYKQ', size: 'L \u2014 5.3 oz (150g)', amount: 4199 },
        { id: 'price_1TNOaCPnG7UtHDWei9RS1166', size: 'XL \u2014 5.6 oz (160g)', amount: 4299 },
      ]
    },
    'boutargue-classique': {
      name: 'Boutargue Classique', flag: '\u{1f1eb}\u{1f1f7}',
      prices: [
        { id: 'price_1TNOaKPnG7UtHDWeV3VUEg9c', size: 'S \u2014 3.7 oz', amount: 3399 },
        { id: 'price_1TNOaNPnG7UtHDWeuwRK2Lht', size: 'M \u2014 4.4 oz', amount: 4599 },
        { id: 'price_1TNOaQPnG7UtHDWeQmTmyYG2', size: 'L \u2014 6.0 oz', amount: 4799 },
        { id: 'price_1TNOaUPnG7UtHDWePfhyYmtJ', size: 'XL \u2014 6.2 oz', amount: 4999 },
        { id: 'price_1TNOaZPnG7UtHDWekdPixmu9', size: 'Jumbo \u2014 7.7 oz', amount: 5899 },
        { id: 'price_1TNOacPnG7UtHDWe9oHxRUA2', size: 'Mega \u2014 8.5 oz', amount: 6299 },
        { id: 'price_1TNOafPnG7UtHDWeYVx3dNrQ', size: 'Giant \u2014 13.0 oz', amount: 9199 },
      ]
    },
    'boutargue-imperiale': {
      name: 'Boutargue Imp\u00e9riale', flag: '\u{1f1eb}\u{1f1f7}',
      prices: [
        { id: 'price_1TNOaoPnG7UtHDWeFmu9uCvf', size: 'XS \u2014 ~3.2 oz', amount: 3099 },
        { id: 'price_1TNOauPnG7UtHDWeLGWVZ4Kq', size: 'S \u2014 ~3.5 oz', amount: 3299 },
        { id: 'price_1TNOaxPnG7UtHDWebqUDLzFj', size: 'M \u2014 ~6.1 oz', amount: 4999 },
        { id: 'price_1TNOb1PnG7UtHDWeHD8CY1rY', size: 'L \u2014 ~6.4 oz', amount: 5199 },
      ]
    },
    'greek-avgotaraho': {
      name: 'Greek Avgotaraho', flag: '\u{1f1ec}\u{1f1f7}',
      prices: [
        { id: 'price_1TNOb8PnG7UtHDWeyv82gxhs', size: 'S \u2014 ~5.6 oz', amount: 4499 },
        { id: 'price_1TNObDPnG7UtHDWesuTGsqZM', size: 'M \u2014 ~5.8 oz', amount: 4599 },
        { id: 'price_1TNObGPnG7UtHDWeZuGYEjkG', size: 'L \u2014 ~6.3 oz', amount: 4899 },
        { id: 'price_1TNObJPnG7UtHDWeq5hsjZ2C', size: 'XL \u2014 ~6.6 oz', amount: 5099 },
        { id: 'price_1TNObOPnG7UtHDWeVUiEXUbm', size: 'Mega \u2014 ~7.4 oz', amount: 5599 },
      ]
    },
    'ouro-do-brasil': {
      name: 'Ouro do Brasil', flag: '\u{1f1e7}\u{1f1f7}',
      prices: [
        { id: 'price_1TOSiNPnG7UtHDWeFy6FXLWK', size: 'M \u2014 ~5.1 oz', amount: 4599 },
        { id: 'price_1TOSiQPnG7UtHDWeBfdlLwxR', size: 'L \u2014 ~5.5 oz', amount: 4899 },
        { id: 'price_1TOSiTPnG7UtHDWeHewoNs9K', size: 'XL \u2014 ~6.9 oz', amount: 5899 },
        { id: 'price_1TOSiWPnG7UtHDWeZfc8fJAS', size: 'Jumbo \u2014 ~7.2 oz', amount: 6099 },
        { id: 'price_1TOSiZPnG7UtHDWegRwyIkKR', size: 'Mega \u2014 ~8.1 oz', amount: 6699 },
      ]
    },
    'grated-gold': {
      name: 'Grated Gold', flag: '\u{1f1ee}\u{1f1f9}',
      prices: [
        { id: 'price_1TNObfPnG7UtHDWeWcqHE9Tc', size: '1 jar \u2014 40g', amount: 1999 },
        { id: 'price_1TNObiPnG7UtHDWeF1wfWLdd', size: '2 jars \u2014 80g', amount: 3599 },
        { id: 'price_1TNObmPnG7UtHDWekiBG9rPF', size: '3 jars \u2014 120g', amount: 5099 },
      ]
    },
    'boutargue-imperiale-aged': {
      name: 'Boutargue Imp\u00e9riale Aged', flag: '\u{1f1eb}\u{1f1f7}',
      prices: [
        { id: 'price_1TOSMxPnG7UtHDWewExHTy4V', size: 'XS \u2014 ~3.2 oz', amount: 3099 },
        { id: 'price_1TOSN0PnG7UtHDWefPxlLuKz', size: 'S \u2014 ~3.5 oz', amount: 3299 },
        { id: 'price_1TOSN3PnG7UtHDWen1LoecT7', size: 'M \u2014 ~6.1 oz', amount: 4999 },
        { id: 'price_1TOSN6PnG7UtHDWepYm5XwXs', size: 'L \u2014 ~6.4 oz', amount: 5199 },
      ]
    },
    'aged-ouro-do-brasil': {
      name: 'Aged Ouro do Brasil', flag: '\u{1f1e7}\u{1f1f7}',
      prices: [
        { id: 'price_1TOSN9PnG7UtHDWefStquhjb', size: 'Standard', amount: 2299 },
      ]
    },
    'grated-bottarga-pouch': {
      name: 'Grated Bottarga Pouch', flag: '\u{1f1ee}\u{1f1f9}',
      prices: [
        { id: 'price_1TOSSNPnG7UtHDWeWlLntCbn', size: '1 Pouch \u2014 50g', amount: 1499 },
        { id: 'price_1TOSSQPnG7UtHDWePuOG9FIj', size: '2 Pouches \u2014 50g', amount: 2499 },
        { id: 'price_1TOSSTPnG7UtHDWe2u5hmV4U', size: '6 Pouches \u2014 50g', amount: 7299 },
      ]
    },
    'sardinian-gold-ca': {
      name: 'Sardinian Gold', flag: '\u{1f1ee}\u{1f1f9}', currency: 'CAD',
      prices: [
        { id: 'price_1TOSNPPnG7UtHDWerTwMzQCz', size: 'S \u2014 ~97g', amount: 3399 },
        { id: 'price_1TOSNSPnG7UtHDWezzZOuw21', size: 'L \u2014 ~145g', amount: 4599 },
        { id: 'price_1TOSNVPnG7UtHDWeJkuXjIux', size: 'Jumbo \u2014 ~154g', amount: 4799 },
      ]
    },
    'boutargue-imperiale-ca': {
      name: 'Boutargue Imp\u00e9riale', flag: '\u{1f1eb}\u{1f1f7}', currency: 'CAD',
      prices: [
        { id: 'price_1TOSNYPnG7UtHDWe8nO9Wl8Z', size: 'S \u2014 ~100g', amount: 3799 },
        { id: 'price_1TOSNbPnG7UtHDWeCPPS5cJy', size: 'L \u2014 ~175g', amount: 4999 },
      ]
    },
    'ouro-do-brasil-ca': {
      name: 'Ouro do Brasil', flag: '\u{1f1e7}\u{1f1f7}', currency: 'CAD',
      prices: [
        { id: 'price_1TOSNePnG7UtHDWeUvlv5Q4S', size: 'L \u2014 ~133g', amount: 4699 },
      ]
    },
    'grated-gold-ca': {
      name: 'Grated Gold', flag: '\u{1f1ee}\u{1f1f9}', currency: 'CAD',
      prices: [
        { id: 'price_1TOSNhPnG7UtHDWegxMgc7RX', size: '1 pouch \u2014 50g', amount: 1699 },
        { id: 'price_1TOSNkPnG7UtHDWeQfHgUcgV', size: '2 pouches \u2014 100g', amount: 2999 },
        { id: 'price_1TOSNnPnG7UtHDWeQBUZVkK1', size: '6 pouches \u2014 300g', amount: 9299 },
      ]
    },
  };

  // ── Cart state ──
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem('bb_cart') || '[]'); } catch(e) { cart = []; }

  function saveCart() { localStorage.setItem('bb_cart', JSON.stringify(cart)); updateBadge(); }
  function cartTotal() { const isCA = window.location.pathname.includes('canada'); return cart.reduce((s, i) => s + i.amount * i.qty, 0) + (isCA ? 0 : SHIPPING_OPTIONS[selectedShipping].amount); }
  function cartCount() { return cart.reduce((s, i) => s + i.qty, 0); }

  function addToCart(productId, priceId) {
    const product = CATALOG[productId];
    if (!product) return;
    const priceObj = product.prices.find(p => p.id === priceId);
    if (!priceObj) return;
    const existing = cart.find(i => i.priceId === priceId);
    if (existing) { existing.qty++; }
    else { cart.push({ priceId, productId, name: product.name, flag: product.flag, size: priceObj.size, amount: priceObj.amount, currency: product.currency || 'USD', qty: 1 }); }
    saveCart();
    // Button feedback
    const btns = document.querySelectorAll('[data-atc-product="' + productId + '"]');
    btns.forEach(btn => {
      const origText = btn.textContent;
      btn.textContent = '\u2713 Added!';
      btn.style.background = '#2d6a4f';
      setTimeout(() => { btn.textContent = origText; btn.style.background = ''; }, 1400);
    });
    openDrawer();
  }

  function removeFromCart(priceId) {
    cart = cart.filter(i => i.priceId !== priceId);
    saveCart(); renderCartItems();
  }

  function updateQty(priceId, delta) {
    const item = cart.find(i => i.priceId === priceId);
    if (!item) return;
    item.qty += delta;
    if (item.qty < 1) { removeFromCart(priceId); return; }
    saveCart(); renderCartItems();
  }

  function updateBadge() {
    const badge = document.getElementById('bb-cart-badge');
    if (!badge) return;
    const n = cartCount();
    badge.textContent = n;
    badge.style.display = n > 0 ? 'flex' : 'none';
  }

  function renderCartItems() {
    const el = document.getElementById('bb-cart-items');
    const footer = document.getElementById('bb-cart-footer');
    if (!el) return;
    if (cart.length === 0) {
      el.innerHTML = '<div class="bb-empty-cart"><div style="font-size:2.2rem;margin-bottom:0.8rem">\ud83d\uded2</div><p>Your cart is empty.</p><p style="font-size:0.78rem;color:#777;margin-top:0.4rem">Select a size and click Add to Cart.</p></div>';
      if (footer) footer.style.display = 'none';
      return;
    }
    if (footer) footer.style.display = 'flex';
    // Shipping selector (USA only)
    const isCA = window.location.pathname.includes('canada');
    const shipEl = document.getElementById('bb-cart-shipping-picker');
    if (shipEl) {
      if (!isCA) {
        shipEl.style.display = 'block';
        shipEl.innerHTML = SHIPPING_OPTIONS.map((opt, idx) => `
          <label class="bb-ship-opt${idx === selectedShipping ? ' selected' : ''}" onclick="(function(){window._bbCart.setShipping(${idx});})()">
            <span class="bb-ship-radio">${idx === selectedShipping ? '●' : '○'}</span>
            <span class="bb-ship-info">
              <span class="bb-ship-label">${opt.label}${opt.amount > 0 ? ' — <strong>$' + (opt.amount/100).toFixed(2) + '</strong>' : ' — <strong style=\"color:#4ade80\">FREE</strong>'}</span>
              <span class="bb-ship-sub">${opt.sub}</span>
            </span>
          </label>`).join('');
      } else {
        shipEl.style.display = 'none';
      }
    }
    el.innerHTML = cart.map(item => `
      <div class="bb-cart-item">
        <div class="bb-ci-info">
          <div class="bb-ci-name">${item.flag} ${item.name}</div>
          <div class="bb-ci-size">${item.size}</div>
          <div class="bb-ci-price">$${(item.amount / 100).toFixed(2)} ${item.currency || 'USD'} each</div>
        </div>
        <div class="bb-ci-controls">
          <button class="bb-qty-btn" onclick="window._bbCart.qty('${item.priceId}',-1)">\u2212</button>
          <span class="bb-qty-num">${item.qty}</span>
          <button class="bb-qty-btn" onclick="window._bbCart.qty('${item.priceId}',1)">+</button>
          <button class="bb-rm-btn" onclick="window._bbCart.rm('${item.priceId}')" title="Remove">\u2715</button>
        </div>
      </div>
    `).join('');
    const subOnly = document.getElementById('bb-cart-subtotal-only');
    const prodTotal = cart.reduce((s, i) => s + i.amount * i.qty, 0);
    if (subOnly) subOnly.textContent = '$' + (prodTotal / 100).toFixed(2);
    const tot = document.getElementById('bb-cart-total');
    if (tot) tot.textContent = '$' + (cartTotal() / 100).toFixed(2);
  }

  function openDrawer() {
    document.getElementById('bb-cart-drawer').classList.add('open');
    document.getElementById('bb-cart-overlay').classList.add('open');
    document.body.classList.add('cart-open');
    renderCartItems();
  }

  function closeDrawer() {
    document.getElementById('bb-cart-drawer').classList.remove('open');
    document.getElementById('bb-cart-overlay').classList.remove('open');
    document.body.classList.remove('cart-open');
  }

  async function checkout() {
    if (cart.length === 0) return;
    const btn = document.getElementById('bb-checkout-btn');
    if (btn) { btn.textContent = 'Redirecting\u2026'; btn.disabled = true; }
    try {
      const base = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
      const isCAcheckout = window.location.pathname.includes('canada');
      const lineItems = cart.map(i => ({ priceId: i.priceId, quantity: i.qty }));
      if (!isCAcheckout && selectedShipping > 0) {
        const ship = SHIPPING_OPTIONS[selectedShipping];
        lineItems.push({ priceData: { currency: 'usd', unitAmount: ship.amount, productData: { name: ship.label + ' (' + ship.sub + ')' } }, quantity: 1 });
      }
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: lineItems,
          successUrl: base + 'success.html',
          cancelUrl: window.location.href,
        })
      });
      const data = await res.json();
      if (data.url) { cart = []; saveCart(); window.location.href = data.url; }
      else throw new Error('No URL returned');
    } catch(e) {
      console.error('[BB Cart] Checkout error:', e);
      const msg = e && e.message ? e.message : String(e);
      if (btn) { btn.textContent = msg.slice(0,40) || 'Error \u2014 try again'; btn.disabled = false; setTimeout(() => { if(btn) btn.textContent = 'Proceed to Checkout'; }, 6000); }
    }
  }

  // ── Global namespace ──
  function setShipping(idx) { selectedShipping = idx; renderCartItems(); }
  window._bbCart = { add: addToCart, rm: removeFromCart, qty: updateQty, open: openDrawer, close: closeDrawer, checkout, setShipping };

  // ── CSS ──
  const CSS = `
    .bb-cart-icon{background:none;border:none;cursor:pointer;color:var(--cream,#f5f0e8);padding:0.4rem 0.5rem;margin-right:0.5rem;position:relative;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .bb-cart-icon:hover{color:var(--gold,#c9a84c)}
    #bb-cart-badge{position:absolute;top:-5px;right:-5px;background:var(--gold,#c9a84c);color:#0e0c09;font-size:0.58rem;font-weight:700;width:17px;height:17px;border-radius:50%;display:flex!important;align-items:center;justify-content:center;font-family:sans-serif;line-height:1}
    #bb-cart-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:1000}
    #bb-cart-overlay.open{display:block}
    #bb-cart-drawer{position:fixed;top:0;right:-440px;width:420px;max-width:100vw;height:100dvh;background:#181512;border-left:1px solid #2a2520;z-index:1001;display:flex;flex-direction:column;transition:right 0.3s cubic-bezier(.4,0,.2,1);box-shadow:-4px 0 32px rgba(0,0,0,0.6)}
    #bb-cart-drawer.open{right:0}
    .bb-cart-header{display:flex;align-items:center;justify-content:space-between;padding:1.1rem 1.4rem;border-bottom:1px solid #2a2520;flex-shrink:0}
    .bb-cart-title{font-family:Georgia,serif;font-size:1.05rem;color:#f5f0e8;letter-spacing:0.05em}
    .bb-cart-close{background:none;border:none;color:#666;font-size:1.2rem;cursor:pointer;padding:0.2rem 0.5rem;line-height:1}
    .bb-cart-close:hover{color:#f5f0e8}
    .bb-cart-items{flex:1;overflow-y:auto;padding:0.8rem 1.4rem}
    .bb-empty-cart{text-align:center;padding:3rem 1rem;color:#777;font-size:0.88rem}
    .bb-cart-item{display:flex;align-items:flex-start;justify-content:space-between;gap:0.8rem;padding:0.9rem 0;border-bottom:1px solid #2a2520}
    .bb-ci-info{flex:1;min-width:0}
    .bb-ci-name{font-family:Georgia,serif;font-size:0.88rem;color:#f5f0e8;margin-bottom:0.2rem}
    .bb-ci-size{font-size:0.73rem;color:#888;margin-bottom:0.25rem}
    .bb-ci-price{font-size:0.75rem;color:var(--gold,#c9a84c)}
    .bb-ci-controls{display:flex;align-items:center;gap:0.25rem;flex-shrink:0}
    .bb-qty-btn{background:#252118;border:1px solid #3a3530;color:#f5f0e8;width:26px;height:26px;border-radius:2px;cursor:pointer;font-size:0.9rem;display:flex;align-items:center;justify-content:center;line-height:1}
    .bb-qty-btn:hover{background:#3a3530}
    .bb-qty-num{font-size:0.83rem;color:#f5f0e8;min-width:22px;text-align:center}
    .bb-rm-btn{background:none;border:none;color:#555;cursor:pointer;font-size:0.72rem;margin-left:0.2rem;padding:0.3rem;line-height:1}
    .bb-rm-btn:hover{color:#c0392b}
    #bb-cart-footer{padding:1rem 1.4rem 1.6rem;border-top:1px solid #2a2520;flex-shrink:0;flex-direction:column;gap:0.5rem}
    .bb-cart-subtotal{display:flex;justify-content:space-between;align-items:center;font-size:0.88rem;color:#f5f0e8}
    .bb-cart-subtotal span:last-child{font-family:Georgia,serif;font-size:1.05rem;color:var(--gold,#c9a84c)}
    .bb-cart-shipping{font-size:0.7rem;color:#666;text-align:center;padding:0.3rem 0}
    #bb-checkout-btn{width:100%;padding:0.85rem;background:var(--gold,#c9a84c);color:#0e0c09;border:none;font-size:0.7rem;letter-spacing:0.15em;text-transform:uppercase;font-weight:700;cursor:pointer;font-family:inherit;transition:opacity 0.2s;margin-top:0.3rem}
    #bb-checkout-btn:hover{opacity:0.88}
    #bb-checkout-btn:disabled{opacity:0.5;cursor:not-allowed}
    .bb-size-select{width:100%;padding:0.45rem 0.6rem;background:#0e0c09;border:1px solid #2a2520;color:#f5f0e8;font-size:0.77rem;font-family:inherit;margin-bottom:0.5rem;cursor:pointer;border-radius:2px;appearance:auto}
    .bb-size-select:focus{outline:none;border-color:var(--gold,#c9a84c)}
    .bb-atc-btn{display:inline-block;padding:0.5rem 1.2rem;background:var(--gold,#c9a84c);color:#0e0c09;border:none;font-size:0.65rem;letter-spacing:0.15em;text-transform:uppercase;font-weight:700;cursor:pointer;font-family:inherit;transition:background 0.2s,opacity 0.2s}
    .bb-atc-btn:hover{opacity:0.85}
    @media(max-width:480px){#bb-cart-drawer{width:100vw}}
    .bb-ship-opt{display:flex;align-items:flex-start;gap:.7rem;padding:.65rem .8rem;border:1px solid #2a2520;border-radius:6px;cursor:pointer;margin-bottom:.4rem;transition:border-color .15s,background .15s}
    .bb-ship-opt:hover{border-color:#4a4038;background:rgba(255,255,255,.02)}
    .bb-ship-opt.selected{border-color:var(--gold,#c9a84c);background:rgba(201,168,76,.06)}
    .bb-ship-radio{font-size:.85rem;color:var(--gold,#c9a84c);flex-shrink:0;margin-top:1px}
    .bb-ship-info{display:flex;flex-direction:column;gap:.15rem}
    .bb-ship-label{font-size:.8rem;color:#f5f0e8}
    .bb-ship-sub{font-size:.7rem;color:#777}
  `;

  // ── Render ──
  function render() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    // Cart icon — insert before hamburger
    const navInner = document.querySelector('.nav-inner');
    const toggle = document.getElementById('navToggle');
    if (navInner && toggle) {
      const iconBtn = document.createElement('button');
      iconBtn.id = 'bb-cart-icon';
      iconBtn.className = 'bb-cart-icon';
      iconBtn.setAttribute('aria-label', 'Open cart');
      iconBtn.innerHTML = '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg><span id="bb-cart-badge" style="display:none">0</span>';
      iconBtn.addEventListener('click', openDrawer);
      const shopNowBtn = document.getElementById('nav-shop-now'); navInner.insertBefore(iconBtn, shopNowBtn || toggle);
    }

    // Overlay
    const overlay = document.createElement('div');
    overlay.id = 'bb-cart-overlay';
    overlay.addEventListener('click', closeDrawer);
    document.body.appendChild(overlay);

    // Drawer
    const drawer = document.createElement('div');
    drawer.id = 'bb-cart-drawer';
    drawer.innerHTML = `
      <div class="bb-cart-header">
        <div class="bb-cart-title">Your Cart</div>
        <button class="bb-cart-close" onclick="window._bbCart.close()">\u2715</button>
      </div>
      <div id="bb-cart-items" class="bb-cart-items"></div>
      <div id="bb-cart-footer" class="bb-cart-footer" style="display:none">
        <div class="bb-cart-subtotal"><span>Subtotal</span><span id="bb-cart-total">$0.00</span></div>
        <div class="bb-cart-shipping" id="bb-cart-shipping-msg">\ud83c\uddfa\ud83c\uddf8 Free USPS shipping on all US orders</div>
        <button id="bb-checkout-btn" onclick="window._bbCart.checkout()">Proceed to Checkout</button>
      </div>
    `;
    document.body.appendChild(drawer);

    updateBadge();
    // Set shipping message based on page
    if (window.location.pathname.includes('canada')) {
      const msg = document.getElementById('bb-cart-shipping-msg');
      if (msg) msg.textContent = '\ud83c\udde8\ud83c\udde6 $12 CAD flat shipping via Canada Post';
    }
  }

  render();
})();
