/**
 * Bottarga Brothers — Cloudflare Worker
 * Routes:
 *   POST /chat  → Gemini 2.0 Flash AI fallback for chatbot
 *   OPTIONS     → CORS preflight
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const ADMIN_WORKER_URL = 'https://bottarga-admin.zoozoomfast.workers.dev';

const SYSTEM_PROMPT = `You are the expert assistant for Bottarga Brothers, the finest bottarga company in North America. You know everything about bottarga — its history, preparation, uses, and the Bottarga Brothers product range.

STYLE RULES — MANDATORY:
- Never use filler phrases like "Great question!" or "Certainly!"
- Keep answers concise: 2–4 sentences unless a detailed question requires more
- Use **bold** for product names and prices
- Respond in the same language the user writes in (English default)
- Warm, knowledgeable, expert tone — like a passionate food specialist
- Never make up prices or products not listed below

ABOUT BOTTARGA BROTHERS:
Founded by brothers Herbert and Jean Madar. Their father Roger Madar owned Comosa, a sardine fishing and canning company in Safi, Morocco in the 1950s. Roger cured Grey Mullet roe the traditional way. When the family emigrated to Montreal in the mid-1960s, the craft came with them. Every Friday night, bottarga was served as an aperitif — a family ritual. Herbert and Jean built Bottarga Brothers to share this with North America. They do one thing: bottarga. They do it perfectly.

WHAT IS BOTTARGA:
Cured, salted fish roe — typically from Grey Mullet. The roe sac is cleaned, salted, and pressed for weeks until it becomes a firm amber block of concentrated umami. 3,000+ year old Mediterranean tradition. Tastes rich, briny, oceanic — not "fishy." Similar to the sea itself.

CONTACT:
- Phone: 1-844-MAD-BROS (1-844-623-2767)
- Address: Montreal, Canada H4C 2P4
- Website: bottargabrothers.com
- Also on Amazon and eBay with 100% positive feedback

PRODUCTS AND PRICES (USD — US shop):
1. Sardinian Gold (🇮🇹 Sardinia) — Wild Grey Mullet roe. Rich, complex, traditional. Shrink-wrapped. Slice or grate. Sizes: M 4.9oz $38.99 / L 5.3oz $41.99 / XL 5.6oz $42.99. Kosher certified.
2. Boutargue Classique (🇫🇷 France) — Paraffin-waxed French mullet roe. Kosher for Passover, certified Grand-Rabbinat de Paris. 7 sizes: S 3.7oz $33.99 / M 4.4oz $45.99 / L 6.0oz $47.99 / XL 6.2oz $49.99 / Jumbo 7.7oz $58.99 / Mega 8.5oz $62.99 / Giant 13oz $91.99.
3. Boutargue Impériale (🇫🇷 France, premium) — No wax coating, honey-like colour, sharper flavour. Easier to grate. Kosher for Passover. Sizes: XS ~3.2oz $30.99 / S ~3.5oz $32.99 / M ~6.1oz $49.99 / L ~6.4oz $51.99.
4. Boutargue Impériale Aged (🇫🇷 France, aged reserve) — Extended cure, deeper amber colour, far more intense flavour. Limited availability. Same sizes as Impériale: XS $30.99 / S $32.99 / M $49.99 / L $51.99.
5. Greek Avgotaraho (🇬🇷 Greece) — "Caviar of the Mediterranean." Hand-dipped in natural beeswax. Wild-caught grey mullet roe. No preservatives. 5 sizes: S ~5.6oz $44.99 / M ~5.8oz $45.99 / L ~6.3oz $48.99 / XL ~6.6oz $50.99 / Mega ~7.4oz $55.99.
6. Ouro do Brasil (🇧🇷 Brazil) — Wild-caught Grey Mullet, HACCP certified. Mildest, sweetest variety — ideal introduction to bottarga. Standard size $22.99.
7. Egyptian Royale (🇪🇬 Egypt) — Batarekh from Port Said. Soft, moist texture. Currently SOLD OUT — contact us to be notified. Was $24.00–$39.99.
8. Grated Gold (🇮🇹 Sardinia, grated) — Finely grated Sardinian bottarga, ready to use. 40g jar: 1 jar $19.99 / 2 jars $35.99 / 3 jars $50.99.
9. Grated Bottarga Pouch (🇮🇹 Sardinia) — Same premium grated bottarga in a 50g resealable pouch. 1 pouch $14.99 / 2 pouches $24.99 / 6 pouches $72.99.
10. Aged Ouro do Brasil (🇧🇷 Brazil, limited) — Extended aging, more pronounced and complex character than standard Ouro. Limited availability — contact us when interested.

CANADA SHOP (CAD prices, ships from Montreal):
- Sardinian Gold: S ~97g $33.99 / L ~145g $45.99 / Jumbo ~154g $47.99 CAD
- Boutargue Impériale: S ~100g $37.99 / L ~175g $49.99 CAD
- Ouro do Brasil: L ~133g $46.99 CAD
- Grated Gold: 1 pouch 50g $16.99 / 2 pouches $29.99 / 6 pouches $92.99 CAD
- Greek Avgotaraho: Currently sold out for Canada — contact for waitlist
- Egyptian Royale: Contact for Canadian availability and pricing
- Aged Ouro do Brasil: Currently sold out for Canada — contact to be notified

SHIPPING:
- USA: Free USPS on all orders
- Canada: Ships from Montreal office — contact for pricing
- International: Available — contact for rates

HOW TO EAT BOTTARGA:
- Slice thin as aperitif with Arak, Scotch, or dry white wine
- Grate over pasta (spaghetti + olive oil + garlic + lemon — never heat the bottarga)
- On toast with olive oil and lemon
- Over scrambled eggs — add at the very end
- On arugula salad shaved thin
- KEY RULE: Never cook bottarga with direct heat — always add raw at the end

STORAGE:
- Refrigerate whole lobe once received
- Unopened: several months refrigerated, up to 12 months frozen
- After cutting: use within 2–3 weeks refrigerated, wrapped tightly
- Grated: refrigerate after opening, use within 4–6 weeks

WHOLESALE & CHEF PROGRAM:
Available for chefs, restaurants, specialty retailers. Contact via phone or website for professional pricing.

If you don't know something or the user asks outside your knowledge, direct them to call 1-844-MAD-BROS or visit the contact page.`;

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const path = new URL(request.url).pathname;


  // ── Stripe price_id → product_id reverse lookup ──────────────────────────
  const PRICE_TO_PRODUCT = {
    // Sardinian Gold
    'price_1TNOZyPnG7UtHDWeAuJDmAZ3': 'sardinian-gold',
    'price_1TNOa1PnG7UtHDWeHUYgHYKQ': 'sardinian-gold',
    'price_1TNOaCPnG7UtHDWei9RS1166': 'sardinian-gold',
    // Boutargue Classique
    'price_1TNOaKPnG7UtHDWeV3VUEg9c': 'boutargue-classique',
    'price_1TNOaNPnG7UtHDWeuwRK2Lht': 'boutargue-classique',
    'price_1TNOaQPnG7UtHDWeQmTmyYG2': 'boutargue-classique',
    'price_1TNOaUPnG7UtHDWePfhyYmtJ': 'boutargue-classique',
    'price_1TNOaZPnG7UtHDWekdPixmu9': 'boutargue-classique',
    'price_1TNOacPnG7UtHDWe9oHxRUA2': 'boutargue-classique',
    'price_1TNOafPnG7UtHDWeYVx3dNrQ': 'boutargue-classique',
    // Boutargue Impériale
    'price_1TNOaoPnG7UtHDWeFmu9uCvf': 'boutargue-imperiale',
    'price_1TNOauPnG7UtHDWeLGWVZ4Kq': 'boutargue-imperiale',
    'price_1TNOaxPnG7UtHDWebqUDLzFj': 'boutargue-imperiale',
    'price_1TNOb1PnG7UtHDWeHD8CY1rY': 'boutargue-imperiale',
    // Boutargue Impériale Aged
    'price_1TOSMxPnG7UtHDWewExHTy4V': 'boutargue-imperiale-aged',
    'price_1TOSN0PnG7UtHDWefPxlLuKz': 'boutargue-imperiale-aged',
    'price_1TOSN3PnG7UtHDWen1LoecT7': 'boutargue-imperiale-aged',
    'price_1TOSN6PnG7UtHDWepYm5XwXs': 'boutargue-imperiale-aged',
    // Greek Avgotaraho
    'price_1TNOb8PnG7UtHDWeyv82gxhs': 'greek-avgotaraho',
    'price_1TNObDPnG7UtHDWesuTGsqZM': 'greek-avgotaraho',
    'price_1TNObGPnG7UtHDWeZuGYEjkG': 'greek-avgotaraho',
    'price_1TNObJPnG7UtHDWeq5hsjZ2C': 'greek-avgotaraho',
    'price_1TNObOPnG7UtHDWeVUiEXUbm': 'greek-avgotaraho',
    // Ouro do Brasil
    'price_1TOSiNPnG7UtHDWeFy6FXLWK': 'ouro-do-brasil',
    'price_1TOSiQPnG7UtHDWeBfdlLwxR': 'ouro-do-brasil',
    'price_1TOSiTPnG7UtHDWeHewoNs9K': 'ouro-do-brasil',
    'price_1TOSiWPnG7UtHDWeZfc8fJAS': 'ouro-do-brasil',
    'price_1TOSiZPnG7UtHDWegRwyIkKR': 'ouro-do-brasil',
    // Aged Ouro do Brasil
    'price_1TOSN9PnG7UtHDWefStquhjb': 'aged-ouro-do-brasil',
    // Grated Gold
    'price_1TNObfPnG7UtHDWeWcqHE9Tc': 'grated-gold',
    'price_1TNObiPnG7UtHDWeF1wfWLdd': 'grated-gold',
    'price_1TNObmPnG7UtHDWekiBG9rPF': 'grated-gold',
    // Grated Bottarga Pouch
    'price_1TOSSNPnG7UtHDWeWlLntCbn': 'grated-bottarga-pouch',
    'price_1TOSSQPnG7UtHDWePuOG9FIj': 'grated-bottarga-pouch',
    'price_1TOSSTPnG7UtHDWe2u5hmV4U': 'grated-bottarga-pouch',
    // Canada products
    'price_1TOSNPPnG7UtHDWerTwMzQCz': 'sardinian-gold-ca',
    'price_1TOSNSPnG7UtHDWezzZOuw21': 'sardinian-gold-ca',
    'price_1TOSNVPnG7UtHDWeJkuXjIux': 'sardinian-gold-ca',
    'price_1TOSNYPnG7UtHDWe8nO9Wl8Z': 'boutargue-imperiale-ca',
    'price_1TOSNbPnG7UtHDWeCPPS5cJy': 'boutargue-imperiale-ca',
    'price_1TOSNePnG7UtHDWeUvlv5Q4S': 'ouro-do-brasil-ca',
    'price_1TOSNhPnG7UtHDWegxMgc7RX': 'grated-gold-ca',
    'price_1TOSNkPnG7UtHDWeQBUZVkK1': 'grated-gold-ca',
    'price_1TOSNnPnG7UtHDWeQBUZVkK1': 'grated-gold-ca',
  };


    // ── Record sale (called from success.html) ────────────────────────────
    if (request.method === 'POST' && path === '/record-sale') {
      try {
        const { sessionId } = await request.json();
        if (!sessionId || !sessionId.startsWith('cs_')) {
          return Response.json({ error: 'Invalid session' }, { status: 400, headers: CORS });
        }

        // Deduplicate — never count the same session twice
        const dedupKey = 'sale_session_' + sessionId;
        const already = await env.KV.get(dedupKey);
        if (already) return Response.json({ ok: true, skipped: true }, { headers: CORS });

        // Verify with Stripe that payment actually succeeded
        const stripeRes = await fetch(
          'https://api.stripe.com/v1/checkout/sessions/' + sessionId + '/line_items?limit=25',
          { headers: { 'Authorization': 'Bearer ' + env.STRIPE_SECRET_KEY } }
        );
        if (!stripeRes.ok) return Response.json({ error: 'Stripe error' }, { status: 500, headers: CORS });

        const sessionCheck = await fetch(
          'https://api.stripe.com/v1/checkout/sessions/' + sessionId,
          { headers: { 'Authorization': 'Bearer ' + env.STRIPE_SECRET_KEY } }
        );
        const sessionData = await sessionCheck.json();
        if (sessionData.payment_status !== 'paid') {
          return Response.json({ ok: false, reason: 'not_paid' }, { headers: CORS });
        }

        const lineData = await stripeRes.json();
        const counts = {};
        for (const item of (lineData.data || [])) {
          const priceId = item.price?.id;
          const productId = PRICE_TO_PRODUCT[priceId];
          if (productId) {
            counts[productId] = (counts[productId] || 0) + (item.quantity || 1);
          }
        }

        // Update KV counters
        const existing = await env.KV.get('units_sold', { type: 'json' }) || {};
        for (const [pid, qty] of Object.entries(counts)) {
          existing[pid] = (existing[pid] || 0) + qty;
        }
        await env.KV.put('units_sold', JSON.stringify(existing));

        // Decrement stock per price ID
        const stockData = await env.KV.get('product_stock', { type: 'json' }) || {};
        let stockChanged = false;
        for (const item of (lineData.data || [])) {
          const pid = item.price?.id;
          if (!pid) continue;
          const current = stockData[pid];
          if (current === null || current === undefined) continue; // null/missing = unlimited
          const newQty = Math.max(0, current - (item.quantity || 1));
          stockData[pid] = newQty;
          stockChanged = true;
        }
        if (stockChanged) await env.KV.put('product_stock', JSON.stringify(stockData));

        // Mark session as processed (TTL 30 days)
        await env.KV.put(dedupKey, '1', { expirationTtl: 60 * 60 * 24 * 30 });

        return Response.json({ ok: true, counted: counts }, { headers: CORS });
      } catch (e) {
        return Response.json({ error: String(e) }, { status: 500, headers: CORS });
      }
    }

    // ── Units sold (public GET) ────────────────────────────────────────────
    if (request.method === 'GET' && path === '/units-sold') {
      const data = await env.KV.get('units_sold', { type: 'json' }) || {};
      return new Response(JSON.stringify(data), {
        headers: { ...CORS, 'Cache-Control': 'public, max-age=60' },
      });
    }

    // ── Stock — public GET ────────────────────────────────────────────────
    if (request.method === 'GET' && path === '/stock') {
      const data = await env.KV.get('product_stock', { type: 'json' }) || {};
      return new Response(JSON.stringify(data), {
        headers: { ...CORS, 'Cache-Control': 'public, max-age=30' },
      });
    }

    // ── Stock — admin POST (set quantities) ──────────────────────────────
    if (request.method === 'POST' && path === '/stock') {
      try {
        // Delegate auth to admin worker
        const adminUser = request.headers.get('X-Admin-User');
        const adminPwd  = request.headers.get('X-Admin-Password');
        const adminSess = request.headers.get('X-Session-ID') || '';
        if (!adminUser || !adminPwd) {
          return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS });
        }
        const authRes = await fetch(ADMIN_WORKER_URL + '/me', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-User': adminUser,
            'X-Admin-Password': adminPwd,
            'X-Session-ID': adminSess,
          },
          body: '{}',
        });
        if (!authRes.ok) {
          return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS });
        }
        const body = await request.json();
        if (typeof body !== 'object' || Array.isArray(body)) {
          return Response.json({ error: 'Invalid payload' }, { status: 400, headers: CORS });
        }
        // Sanitize: values must be null or non-negative integer
        const clean = {};
        for (const [k, v] of Object.entries(body)) {
          if (v === null) { clean[k] = null; }
          else if (typeof v === 'number' && v >= 0) { clean[k] = Math.floor(v); }
        }
        await env.KV.put('product_stock', JSON.stringify(clean));
        return Response.json({ ok: true }, { headers: CORS });
      } catch (e) {
        return Response.json({ error: String(e) }, { status: 500, headers: CORS });
      }
    }

    // ── Stripe Checkout ──
    if (request.method === 'POST' && path === '/checkout') {
      try {
        const { items, successUrl, cancelUrl } = await request.json();
        if (!items || !items.length) return Response.json({ error: 'No items' }, { status: 400, headers: CORS });

        const params = new URLSearchParams({
          mode: 'payment',
          'payment_method_types[0]': 'card',
          success_url: successUrl || 'https://bottargabrothers.github.io/success.html',
          cancel_url: cancelUrl || 'https://bottargabrothers.github.io/shop-usa.html',
          'shipping_address_collection[allowed_countries][0]': 'US',
          'shipping_address_collection[allowed_countries][1]': 'CA',
        });
        items.forEach((item, i) => {
          if (item.priceId) {
            params.set(`line_items[${i}][price]`, item.priceId);
          } else if (item.priceData) {
            params.set(`line_items[${i}][price_data][currency]`, item.priceData.currency || 'usd');
            params.set(`line_items[${i}][price_data][unit_amount]`, String(item.priceData.unitAmount));
            params.set(`line_items[${i}][price_data][product_data][name]`, item.priceData.productData.name);
          }
          params.set(`line_items[${i}][quantity]`, String(item.quantity || 1));
        });

        const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + env.STRIPE_SECRET_KEY,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });
        const session = await stripeRes.json();
        if (!session.url) return Response.json({ error: session.error || 'Stripe error' }, { status: 500, headers: CORS });
        return Response.json({ url: session.url }, { headers: CORS });
      } catch (e) {
        return Response.json({ error: 'Server error' }, { status: 500, headers: CORS });
      }
    }

    if (request.method === 'POST' && path === '/chat') {
      // ── Bot protection: origin check ──────────────────────────
      const origin = request.headers.get('Origin') || '';
      if (origin && !origin.includes('bottargabrothers') && !origin.includes('github.io')) {
        return Response.json({ error: 'Forbidden' }, { status: 403, headers: CORS });
      }

      try {
        const body = await request.json();
        // Cap messages: max 20 items, 2000 chars each
        const rawMsgs = body.messages || [];
        const messages = rawMsgs.slice(-20).map(m => ({
          ...m, content: String(m.content || '').slice(0, 2000)
        }));
        if (!messages.length) {
          return Response.json({ reply: 'How can I help you with bottarga today?' }, { headers: CORS });
        }

        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
          return Response.json({ reply: 'Service temporarily unavailable. Please call 1-844-MAD-BROS.' }, { status: 503, headers: CORS });
        }

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
              contents: messages.map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }],
              })),
              generationConfig: { temperature: 0.65, maxOutputTokens: 500 },
            }),
          }
        );

        const data = await geminiRes.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
          || 'Sorry, I could not process that. Please call us at 1-844-MAD-BROS.';

        // ── Log transcript to KV (non-blocking, 90-day TTL) ─────────────────
        try {
          if (env.KV) {
            const ts = Date.now();
            const date = new Date().toISOString().slice(0, 10);
            const rand = Math.random().toString(36).slice(2, 8);
            const tKey = `transcript:bottarga:${date}:${ts}:${rand}`;
            const userMsg = body.message || '';
            ctx.waitUntil(env.KV.put(tKey, JSON.stringify({
              ts, client: 'bottarga-brothers', user: userMsg, bot: reply,
              page: request.headers.get('Referer') || '',
            }), { expirationTtl: 7776000 }));
          }
        } catch (_) {}

        return Response.json({ reply }, { headers: CORS });
      } catch (e) {
        return Response.json(
          { reply: 'Something went wrong. Please call us at 1-844-MAD-BROS.' },
          { status: 500, headers: CORS }
        );
      }
    }

    return Response.json({ error: 'Not found' }, { status: 404, headers: CORS });
  },
};
