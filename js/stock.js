/**
 * Bottarga Brothers — Stock Enforcement
 * Fetches /stock from the main worker and disables out-of-stock size options.
 * Called on shop-usa.html and shop-canada.html.
 */
(function () {
  const WORKER = 'https://bottarga-brothers-chat.zoozoomfast.workers.dev';
  const CACHE_KEY = 'bb_stock_v1';
  const CACHE_TTL = 60 * 1000; // 1 minute

  function applyStock(stock) {
    if (!stock || typeof stock !== 'object') return;

    // For every size <select> on the page, check each <option>
    document.querySelectorAll('select.bb-size-select').forEach(function (sel) {
      var anyEnabled = false;
      sel.querySelectorAll('option').forEach(function (opt) {
        var pid = opt.value;
        if (!pid) return;
        var qty = stock[pid];
        // null/undefined = unlimited; 0 = out of stock
        if (qty !== null && qty !== undefined && qty <= 0) {
          opt.disabled = true;
          // Append OOS label if not already there
          if (opt.textContent.indexOf('— Out of Stock') === -1) {
            opt.textContent = opt.textContent + ' — Out of Stock';
          }
          opt.style.color = '#666';
        } else {
          opt.disabled = false;
          // Remove OOS label if it was previously added
          opt.textContent = opt.textContent.replace(' — Out of Stock', '');
          opt.style.color = '';
          anyEnabled = true;
        }
      });

      // After patching options, if the currently selected option is disabled,
      // move selection to the first enabled option (or leave as-is if all OOS).
      if (sel.options[sel.selectedIndex] && sel.options[sel.selectedIndex].disabled) {
        var firstEnabled = Array.from(sel.options).find(function (o) { return !o.disabled; });
        if (firstEnabled) sel.value = firstEnabled.value;
      }

      // Find the Add to Cart button associated with this select
      // They live in the same .product-info container
      var card = sel.closest('.product-info') || sel.parentElement;
      var atcBtn = card ? card.querySelector('.bb-atc-btn') : null;
      if (!atcBtn) return;

      // All sizes OOS?
      var allOos = Array.from(sel.options).every(function (o) { return o.disabled; });
      if (allOos) {
        atcBtn.disabled = true;
        atcBtn.textContent = 'Out of Stock';
        atcBtn.style.opacity = '0.45';
        atcBtn.style.cursor = 'not-allowed';
      } else {
        // Re-check on change too
        atcBtn.disabled = false;
        if (atcBtn.textContent === 'Out of Stock') atcBtn.textContent = 'Add to Cart';
        atcBtn.style.opacity = '';
        atcBtn.style.cursor = '';
      }
    });

    // Handle products with a hardcoded priceId on the ATC button (no select — single SKU)
    document.querySelectorAll('.bb-atc-btn[onclick]').forEach(function (btn) {
      // Skip buttons already handled via a select
      var card = btn.closest('.product-info') || btn.parentElement;
      if (card && card.querySelector('select.bb-size-select')) return;

      // Extract priceId from onclick attr: _bbCart.add('...','{priceId}')
      var match = btn.getAttribute('onclick').match(/'(price_[^']+)'/);
      if (!match) return;
      var pid = match[1];
      var qty = stock[pid];
      if (qty !== null && qty !== undefined && qty <= 0) {
        btn.disabled = true;
        btn.textContent = 'Out of Stock';
        btn.style.opacity = '0.45';
        btn.style.cursor = 'not-allowed';
      } else {
        btn.disabled = false;
        if (btn.textContent === 'Out of Stock') btn.textContent = 'Add to Cart';
        btn.style.opacity = '';
        btn.style.cursor = '';
      }
    });

    // Re-wire select change events to keep ATC button in sync
    document.querySelectorAll('select.bb-size-select').forEach(function (sel) {
      if (sel._stockListenerAttached) return;
      sel._stockListenerAttached = true;
      sel.addEventListener('change', function () {
        var card = sel.closest('.product-info') || sel.parentElement;
        var atcBtn = card ? card.querySelector('.bb-atc-btn') : null;
        if (!atcBtn) return;
        var chosen = sel.options[sel.selectedIndex];
        var pid = chosen ? chosen.value : null;
        if (!pid) return;
        var qty = stock[pid];
        if (qty !== null && qty !== undefined && qty <= 0) {
          atcBtn.disabled = true;
          atcBtn.textContent = 'Out of Stock';
          atcBtn.style.opacity = '0.45';
          atcBtn.style.cursor = 'not-allowed';
        } else {
          atcBtn.disabled = false;
          atcBtn.textContent = 'Add to Cart';
          atcBtn.style.opacity = '';
          atcBtn.style.cursor = '';
        }
      });
    });
  }

  function fetchAndApply() {
    fetch(WORKER + '/stock')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data }));
        } catch (e) {}
        applyStock(data);
      })
      .catch(function () {});
  }

  // Apply from cache immediately (synchronous, no flash)
  try {
    var cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
    if (cached && cached.data && (Date.now() - cached.ts) < CACHE_TTL) {
      applyStock(cached.data);
    }
  } catch (e) {}

  // Always fetch fresh in background
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchAndApply);
  } else {
    fetchAndApply();
  }
})();
