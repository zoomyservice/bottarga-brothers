/**
 * admin-overrides.js
 * Fetches content overrides from Cloudflare KV and applies them to the page.
 * Runs on every page load — lightweight, non-blocking, never breaks the site.
 */
(function () {
  'use strict';
  const WORKER = 'https://bottarga-admin.zoozoomfast.workers.dev/content';

  // Map KV keys to CSS selectors
  const TEXT_MAP = {
    // ── Nav / Brand ──────────────────────────────────────────────
    logo_tagline:          '.nav-logo span',
    nav_cta:               '.nav-cta',

    // ── Hero ─────────────────────────────────────────────────────
    hero_eyebrow:          '.hero-eyebrow',
    hero_headline:         '.hero-title',
    hero_sub:              '.hero-sub',
    hero_cta:              '.hero-cta-btn',

    // ── Homepage Stats Strip (all 4) ─────────────────────────────
    stats_n1:              '.stat-n-1',
    stats_l1:              '.stat-l-1',
    stats_n2:              '.stat-n-2',
    stats_l2:              '.stat-l-2',
    stats_n3:              '.stat-n-3',
    stats_l3:              '.stat-l-3',
    stats_n4:              '.stat-n-4',
    stats_l4:              '.stat-l-4',

    // ── Heritage Section ─────────────────────────────────────────
    heritage_label:        '.heritage-label',
    heritage_h2:           '.heritage-h2',
    heritage_p1:           '.heritage-p1',
    heritage_p2:           '.heritage-p2',
    heritage_cta:          '.heritage-cta',

    // ── Quote Block ──────────────────────────────────────────────
    quote_text:            '.quote-text',
    quote_source:          '.quote-source',

    // ── What Is Bottarga (homepage section) ──────────────────────
    whatis_section_label:  '.whatis-section-label',
    whatis_section_h2:     '.whatis-section-h2',
    whatis_section_p1:     '.whatis-section-p1',
    whatis_section_p2:     '.whatis-section-p2',
    whatis_section_cta:    '.whatis-section-cta',

    // ── Featured Products ────────────────────────────────────────
    featured_label:        '.featured-label',
    featured_h2:           '.featured-h2',
    featured_sub:          '.featured-sub',
    featured_cta:          '.featured-cta',

    // ── How to Use ───────────────────────────────────────────────
    howto_label:           '.howto-label',
    howto_h2:              '.howto-h2',
    howto_p1:              '.howto-p1',
    howto_p2:              '.howto-p2',
    howto_p3:              '.howto-p3',
    howto_cta:             '.howto-cta',

    // ── Press Section ────────────────────────────────────────────
    press_label:           '.press-label',

    // ── About Page ───────────────────────────────────────────────
    about_page_label:      '.about-page-label',
    about_headline:        '.about-headline',
    about_large_intro:     '.about-large-intro',
    about_pull_quote:      '.about-pull-quote',
    about_pull_source:     '.about-pull-source',
    origin_label:          '.origin-label',
    origin_h2:             '.origin-h2',
    origin_p1:             '.origin-p1',
    origin_p2:             '.origin-p2',
    origin_p3:             '.origin-p3',
    timeline_label:        '.timeline-label',
    timeline_h2:           '.timeline-h2',
    timeline_intro:        '.timeline-intro',
    timeline_cta:          '.timeline-cta',
    tl1_year:              '.tl1-year',
    tl1_h3:                '.tl1-h3',
    tl1_p:                 '.tl1-p',
    tl2_year:              '.tl2-year',
    tl2_h3:                '.tl2-h3',
    tl2_p:                 '.tl2-p',
    tl3_year:              '.tl3-year',
    tl3_h3:                '.tl3-h3',
    tl3_p:                 '.tl3-p',
    tl4_year:              '.tl4-year',
    tl4_h3:                '.tl4-h3',
    tl4_p:                 '.tl4-p',
    mission_label:         '.mission-label',
    mission_h2:            '.mission-h2',
    mission1_h3:           '.mission1-h3',
    mission1_p:            '.mission1-p',
    mission2_h3:           '.mission2-h3',
    mission2_p:            '.mission2-p',
    mission3_h3:           '.mission3-h3',
    mission3_p:            '.mission3-p',
    philosophy_label:      '.philosophy-label',
    philosophy_h2:         '.philosophy-h2',
    philosophy_p1:         '.philosophy-p1',
    philosophy_p2:         '.philosophy-p2',
    philosophy_p3:         '.philosophy-p3',

    // ── Footer & Contact ─────────────────────────────────────────
    footer_tagline:        '.footer-tagline',
    footer_copyright:      '.footer-copyright',
    contact_phone:         '.contact-phone',
    addr_us:               '.addr-us',
    addr_ca:               '.addr-ca',
    contact_email:         '.contact-email',

    // ── Legacy keys (kept for backward compat) ───────────────────
    about_intro:           '.about-intro',
    founder_name:          '.founder-name',
    stat1_label:           '.stat-1-label',
    stat1_sub:             '.stat-1-sub',
    stat2_label:           '.stat-2-label',
    stat2_sub:             '.stat-2-sub',
  };

  // All product IDs (underscored)
  const PRODUCT_KEYS = [
    'sardinian_gold', 'boutargue_classique', 'boutargue_imperiale',
    'boutargue_imperiale_aged', 'greek_avgotaraho', 'ouro_do_brasil',
    'aged_ouro_do_brasil', 'egyptian_royale', 'grated_gold', 'grated_pouch',
  ];

  // CSS selector for each product's DOM section
  const PRODUCT_SELECTORS = {
    sardinian_gold:         '#sardinia',
    boutargue_classique:    '#france',
    boutargue_imperiale:    '#imperiale',
    boutargue_imperiale_aged: '#imperiale-aged',
    greek_avgotaraho:       '#greece',
    ouro_do_brasil:         '#brazil',
    aged_ouro_do_brasil:    '#brazil-aged',
    egyptian_royale:        '#egypt',
    grated_gold:            '#grated',
    grated_pouch:           '#grated-pouch',
  };

  fetch(WORKER)
    .then(r => r.json())
    .then(data => {
      if (!data || Object.keys(data).length === 0) return;

      // ── Text overrides ─────────────────────────────────────────────
      Object.entries(TEXT_MAP).forEach(([key, sel]) => {
        if (!data[key]) return;
        document.querySelectorAll(sel).forEach(el => { el.textContent = data[key]; });
      });

      // Social links
      if (data.social_ig) document.querySelectorAll('a[href*="instagram"]').forEach(a => a.href = data.social_ig);
      if (data.social_fb) document.querySelectorAll('a[href*="facebook"]').forEach(a => a.href = data.social_fb);
      if (data.newsletter_url) document.querySelectorAll('a[href*="list-manage"]').forEach(a => a.href = data.newsletter_url);

      // ── Product overrides ──────────────────────────────────────────
      PRODUCT_KEYS.forEach(key => {
        const root = document.querySelector(PRODUCT_SELECTORS[key]);
        if (!root) return;

        const name  = data['product_' + key + '_name'];
        const desc  = data['product_' + key + '_desc'];
        const img   = data['product_' + key + '_img'];
        const badge = data['product_' + key + '_badge'];
        const sizes = data['product_' + key + '_sizes'];

        if (name)  { const el = root.querySelector('.product-name');  if (el) el.textContent = name; }
        if (desc)  { const el = root.querySelector('.product-desc');  if (el) el.textContent = desc; }
        if (img)   { const el = root.querySelector('.product-img');   if (el) el.src = img; }

        if (badge !== undefined) {
          let badgeEl = root.querySelector('.product-badge');
          if (badge === '') {
            if (badgeEl) badgeEl.style.display = 'none';
          } else {
            if (!badgeEl) {
              badgeEl = document.createElement('div');
              badgeEl.className = 'product-badge';
              root.querySelector('.product-info')?.prepend(badgeEl);
            }
            badgeEl.style.display = '';
            badgeEl.textContent = badge;
            if (badge === 'Sold Out') { badgeEl.style.background = 'var(--dark)'; badgeEl.style.color = 'var(--muted)'; badgeEl.style.border = '1px solid var(--muted)'; }
            else if (badge === 'Limited') { badgeEl.style.background = 'var(--dark-mid)'; badgeEl.style.color = 'var(--gold)'; badgeEl.style.border = '1px solid var(--gold)'; }
            else if (badge === 'On Sale') { badgeEl.style.background = 'var(--gold-dim)'; badgeEl.style.color = 'var(--cream)'; badgeEl.style.border = 'none'; }
          }
        }

        if (sizes) {
          try {
            const parsed = JSON.parse(sizes);
            if (!parsed.length) return;

            // Update size table display
            const sizeGrid = root.querySelector('[style*="grid-template-columns:1fr 1fr"]');
            if (sizeGrid) {
              sizeGrid.innerHTML = parsed.map(s =>
                `<span style="color:var(--muted);">${s.l}</span><span style="color:var(--cream);text-align:right;">${s.p}</span>`
              ).join('');
            }

            // Update select options display text (keeps Stripe price IDs as values)
            const sel = root.querySelector('select.bb-size-select');
            if (sel) {
              const opts = sel.querySelectorAll('option');
              parsed.forEach((s, i) => { if (opts[i]) opts[i].textContent = `${s.l} — ${s.p}`; });
            }

            // Update "From $X.XX" display price
            const priceEl = root.querySelector('.product-price');
            if (priceEl && parsed[0]) {
              const from = parsed.length > 1;
              priceEl.innerHTML = from
                ? `<span class="from">From</span>${parsed[0].p}`
                : parsed[0].p;
            }
          } catch (e) {}
        }
      });

      // ── Color / CSS variable overrides ─────────────────────────────
      const cssVarMap = {
        css_gold:       '--gold',
        css_dark:       '--black',
        css_dark_mid:   '--dark-mid',
        css_cream:      '--cream',
        css_muted:      '--muted',
        css_gold_light: '--gold-light',
      };
      let cssText = '';
      Object.entries(cssVarMap).forEach(([key, cssVar]) => {
        if (data[key]) cssText += `${cssVar}:${data[key]};`;
      });
      if (cssText) {
        const style = document.createElement('style');
        style.id = 'admin-color-overrides';
        style.textContent = `:root{${cssText}}`;
        document.head.appendChild(style);
      }

      // ── Font overrides ─────────────────────────────────────────────
      if (data.font_serif || data.font_sans) {
        let fontCss = ':root{';
        if (data.font_serif) fontCss += `--serif:${data.font_serif};`;
        if (data.font_sans)  fontCss += `--sans:${data.font_sans};`;
        fontCss += '}';
        const style = document.createElement('style');
        style.id = 'admin-font-overrides';
        style.textContent = fontCss;
        document.head.appendChild(style);
      }
    })
    .catch(() => {}); // never break the site
})();
