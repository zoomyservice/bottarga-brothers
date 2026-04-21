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
          params.set(`line_items[${i}][price]`, item.priceId);
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
      try {
        const body = await request.json();
        const messages = body.messages || [];
        if (!messages.length) {
          return Response.json({ reply: 'How can I help you with bottarga today?' }, { headers: CORS });
        }

        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
          return Response.json({ reply: 'Service temporarily unavailable. Please call 1-844-MAD-BROS.' }, { status: 503, headers: CORS });
        }

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`,
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
