/**
 * Bottarga Brothers — Stock Enforcement
 * - Disables OOS size options + Add to Cart buttons (stock = 0)
 * - Shows "Only X left!" in red when stock ≤ 10 and > 0
 */
(function () {
  var WORKER = 'https://bottarga-brothers-chat.zoozoomfast.workers.dev';
  var CACHE_KEY = 'bb_stock_v1';
  var CACHE_TTL = 60 * 1000; // 1 minute
  var LOW_STOCK_THRESHOLD = 10;

  function getStockLabel(qty) {
    if (qty === null || qty === undefined) return null; // unlimited
    if (qty <= 0) return null; // handled separately (OOS)
    if (qty <= LOW_STOCK_THRESHOLD) return 'Only ' + qty + ' left!';
    return null;
  }

  function updateStockUI(sel, stock) {
    // Find or create the stock-notice element near this select
    var card = sel.closest('.product-info') || sel.parentElement;
    var notice = sel.parentElement.querySelector('.bb-stock-notice');
    if (!notice) {
      notice = document.createElement('div');
      notice.className = 'bb-stock-notice';
      notice.style.cssText = 'font-size:.78rem;font-weight:600;color:#ef4444;margin-top:.3rem;min-height:1.1em;';
      sel.parentNode.insertBefore(notice, sel.nextSibling);
    }

    // Update each option
    var anyEnabled = false;
    Array.from(sel.options).forEach(function (opt) {
      var pid = opt.value;
      var qty = stock[pid];
      if (qty !== null && qty !== undefined && qty <= 0) {
        opt.disabled = true;
        if (opt.textContent.indexOf('— Out of Stock') === -1) {
          opt.textContent = opt.textContent.replace(' — Out of Stock', '') + ' — Out of Stock';
        }
        opt.style.color = '#555';
      } else {
        opt.disabled = false;
        opt.textContent = opt.textContent.replace(' — Out of Stock', '');
        opt.style.color = '';
        anyEnabled = true;
      }
    });

    // Move selection off a disabled option
    if (sel.options[sel.selectedIndex] && sel.options[sel.selectedIndex].disabled) {
      var first = Array.from(sel.options).find(function (o) { return !o.disabled; });
      if (first) sel.value = first.value;
    }

    // Show low-stock notice for currently selected option
    var chosen = sel.options[sel.selectedIndex];
    var chosenQty = chosen ? stock[chosen.value] : null;
    notice.textContent = getStockLabel(chosenQty) || '';

    // ATC button
    var atcBtn = card ? card.querySelector('.bb-atc-btn') : null;
    if (atcBtn) {
      if (!anyEnabled) {
        atcBtn.disabled = true;
        atcBtn.textContent = 'Out of Stock';
        atcBtn.style.opacity = '0.45';
        atcBtn.style.cursor = 'not-allowed';
      } else {
        atcBtn.disabled = false;
        if (atcBtn.textContent === 'Out of Stock') atcBtn.textContent = 'Add to Cart';
        atcBtn.style.opacity = '';
        atcBtn.style.cursor = '';
      }
    }
  }

  function applyStock(stock) {
    if (!stock || typeof stock !== 'object') return;

    // Handle selects (multi-size products)
    document.querySelectorAll('select.bb-size-select').forEach(function (sel) {
      updateStockUI(sel, stock);

      // Re-check on size change
      if (!sel._stockWired) {
        sel._stockWired = true;
        sel.addEventListener('change', function () {
          updateStockUI(sel, stock);
        });
      }
    });

    // Handle single-SKU ATC buttons (no select)
    document.querySelectorAll('.bb-atc-btn[onclick]').forEach(function (btn) {
      var card = btn.closest('.product-info') || btn.parentElement;
      if (card && card.querySelector('select.bb-size-select')) return;
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
        // Low-stock notice for single-SKU
        var parent = btn.parentElement;
        var notice = parent.querySelector('.bb-stock-notice');
        var label = getStockLabel(qty);
        if (label) {
          if (!notice) {
            notice = document.createElement('div');
            notice.className = 'bb-stock-notice';
            notice.style.cssText = 'font-size:.78rem;font-weight:600;color:#ef4444;margin-top:.3rem;';
            parent.appendChild(notice);
          }
          notice.textContent = label;
        } else if (notice) {
          notice.textContent = '';
        }
      }
    });
  }

  function fetchAndApply() {
    fetch(WORKER + '/stock')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data })); } catch (e) {}
        applyStock(data);
      })
      .catch(function () {});
  }

  // Apply from cache first (instant)
  try {
    var cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
    if (cached && cached.data && (Date.now() - cached.ts) < CACHE_TTL) {
      applyStock(cached.data);
    }
  } catch (e) {}

  // Always fetch fresh
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchAndApply);
  } else {
    fetchAndApply();
  }
})();
