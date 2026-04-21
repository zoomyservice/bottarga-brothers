(function () {
  'use strict';

  // ─── Cloudflare Worker — Gemini fallback ──────────────────────────────────
  const WORKER_URL = 'https://bottarga-brothers-chat.zoozoomfast.workers.dev';

  // ─── Business Facts ────────────────────────────────────────────────────────
  const BIZ = {
    name:    'Bottarga Brothers',
    brand:   'Supreme Bottarga™',
    addrUS:  'Stamford, Connecticut — USA',
    addrCA:  'Montreal, Québec — Canada',
    phone:   '1-844-MAD-BROS',
    phoneNum:'1-844-623-2767',
    email:   'info@bottargabrothers.com',
    shop:    'shop.html',
    contact: 'contact.html',
    amazon:  'https://www.amazon.com',
    ebay:    'https://www.ebay.com',
    tagline: 'One product. Perfected.',
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function norm(s) {
    return s.toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }
  function kwMatch(n, kw) {
    const nkw = norm(kw);
    if (nkw.length <= 4) {
      const re = new RegExp('(?:^|\\s)' + nkw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:\\s|$)');
      return re.test(n);
    }
    return n.includes(nkw);
  }
  function anyKw(n, arr) { return arr.some(k => kwMatch(n, k)); }
  function md(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:var(--gold,#c9a84c);">$1</a>')
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  // ─── Context ───────────────────────────────────────────────────────────────
  const ctx = { lastEntry: null, product: null };

  // ─── Knowledge Base ────────────────────────────────────────────────────────
  const KB = [

    // ── Greetings ──
    { id: 'greeting',
      kw: ['hello','hi','hey','bonjour','good morning','good afternoon','good evening','howdy','sup','what up','greetings'],
      r: () => {
        ctx.lastEntry = 'greeting';
        return `Welcome to **Bottarga Brothers** 🐟\n\nI'm here to help you discover the world's finest bottarga — sourced from Sardinia, France, Greece, Brazil, and Egypt.\n\nAsk me about any of our products, what bottarga is, how to use it in your kitchen, or how to place an order. What can I help you with?`;
      }
    },

    // ── Thanks ──
    { id: 'thanks',
      kw: ['thank','thanks','thank you','merci','perfect','great','awesome','wonderful','helpful','appreciate'],
      r: () => {
        ctx.lastEntry = 'thanks';
        return `Happy to help! 😊 Is there anything else you'd like to know about bottarga — products, recipes, or ordering?\n\n📞 **${BIZ.phone}** · [Contact Us](${BIZ.contact})`;
      }
    },

    // ── What is bottarga ──
    { id: 'what-is',
      kw: ['what is bottarga','what is it','explain bottarga','tell me about bottarga','describe bottarga','bottarga mean','what are you selling','what do you sell','what is batarekh','what is avgotaraho','what is boutargue','never heard','first time','never tried'],
      r: () => {
        ctx.lastEntry = 'what-is';
        return `Bottarga is **cured, salted fish roe** — one of the oldest delicacies in the Mediterranean 🌊\n\nThe roe sac (typically from Grey Mullet) is carefully cleaned, salted, and pressed over weeks until it transforms into a firm, amber-golden block of concentrated umami flavor.\n\n**What does it taste like?**\nRich, briny, and deeply savory — often compared to the sea itself. Not fishy. Umami-forward, with a long oceanic finish.\n\n**How old is the tradition?**\nBottarga has been made for over **3,000 years** — it was a staple of ancient Phoenician traders and Mediterranean fishing communities.\n\n**How do you eat it?**\nSliced thin as an aperitif, grated over pasta or eggs, on toast with olive oil, or in salads. [Learn more →](what-is.html)`;
      }
    },

    // ── How to eat / serve ──
    { id: 'how-to-eat',
      kw: ['how to eat','how to use','how do i eat','how to serve','serving','how to prepare','how to cook','sliced','grated','eat it','use it','cook with','how do i use'],
      r: () => {
        ctx.lastEntry = 'how-to-eat';
        return `Bottarga is incredibly versatile 🍽️\n\n**Classic ways to serve it:**\n• **Sliced thin** — as an aperitif, with Arak, Scotch, or a crisp white wine\n• **Grated over pasta** — especially spaghetti with olive oil, garlic, and lemon\n• **On toast** — with good olive oil and a squeeze of lemon\n• **Over scrambled eggs** — grated at the end for a luxurious finish\n• **On salads** — shaved thin over arugula or simple greens\n\n**Pro tip:** Never cook bottarga with heat — always add it at the very end or raw. Heat kills the delicate flavor.\n\nFor whole lobe: slice with a sharp knife or use a fine grater. For our Grated Gold: ready to use straight from the package.\n\n[Browse recipes →](recipes.html)`;
      }
    },

    // ── Sardinian Gold ──
    { id: 'sardinian',
      kw: ['sardinian','sardinia','sardinian gold','italy','italian','italian bottarga','mullet roe sardinia','sardinian bottarga','sardin','on sale','sale','cheapest','most affordable'],
      r: () => {
        ctx.lastEntry = 'sardinian'; ctx.product = 'sardinian';
        return `**Sardinian Gold** 🇮🇹\n\n_The origin of Italian bottarga culture._\n\nWild Grey Mullet roe from the waters of Sardinia — the most iconic bottarga origin in the world. Rich, complex, and deeply satisfying with a full umami backbone.\n\n• **Price:** $24.99 (currently on sale)\n• **Form:** Whole lobe, shrink-wrapped for freshness\n• **Use:** Slice thin or grate over any dish\n• **Origin:** Sardinia, Italy\n\nThis is a classic — if you're new to bottarga and want to try the most traditional version, start here.\n\n[Order →](${BIZ.contact})`;
      }
    },

    // ── Boutargue Classique ──
    { id: 'classique',
      kw: ['boutargue classique','classique','french bottarga','france','waxed','paraffin','kosher passover','passover','classique','classic french','boutargue'],
      r: () => {
        ctx.lastEntry = 'classique'; ctx.product = 'classique';
        return `**Boutargue Classique** 🇫🇷\n\n_Centuries-old French craftsmanship, paraffin-sealed._\n\nImported from France. Sealed in paraffin wax using a method that dates back hundreds of years — the wax coating locks in freshness and develops the flavor over time. Firm amber lobes with a clean, briny depth.\n\n**Also certified Kosher for Passover** — certified by the Grand-Rabbinat de Paris.\n\n**Available Sizes:**\n• S — 3.7 oz → **$33.99**\n• M — 4.4 oz → **$45.99**\n• L — 6.0 oz → **$47.99**\n• XL — 6.2 oz → **$49.99**\n• Jumbo — 7.7 oz → **$58.99**\n• Mega — 8.5 oz → **$62.99**\n• Giant — 13.0 oz → **$91.99**\n\n[Order →](${BIZ.contact})`;
      }
    },

    // ── Boutargue Impériale ──
    { id: 'imperiale',
      kw: ['imperiale','imperiale','imperial','boutargue imperiale','premium french','top french','best french','premium grade'],
      r: () => {
        ctx.lastEntry = 'imperiale'; ctx.product = 'imperiale';
        return `**Boutargue Impériale** 🇫🇷\n\n_France's finest — top selection from the best producers._\n\nThe premium grade French bottarga. Exceptional depth of flavor — whether sliced as an aperitif or grated over pasta. Selected from the very top of the harvest.\n\n• **Price:** From **$22.99**\n• **Available in multiple sizes**\n• **Form:** Whole lobe, paraffin-waxed\n\nIf you want to compare French vs Sardinian, the Impériale tends to have a slightly more delicate, refined character vs the deeper, earthier Sardinian.\n\n[Order →](${BIZ.contact})`;
      }
    },

    // ── Boutargue Impériale Aged ──
    { id: 'imperiale-aged',
      kw: ['imperiale aged','aged french','aged imperiale','aged reserve','aged bottarga','reserve','aged lobe','extended cure','deep aged','limited aged'],
      r: () => {
        ctx.lastEntry = 'imperiale-aged'; ctx.product = 'imperiale-aged';
        return `**Boutargue Impériale Aged** 🇫🇷 _(Limited)_\n\nExtended cure time produces a sharper, more intense flavor and deeper amber color. This is for the serious bottarga enthusiast who wants the **full experience**.\n\n• **Price:** From **$22.99**\n• **Availability:** Limited — sells out quickly\n• **Character:** Sharper, more concentrated, deeper color than regular Impériale\n\nIf you already love French bottarga and want to go deeper, this is the one to try. Don't wait — limited stock.\n\n[Order →](${BIZ.contact})`;
      }
    },

    // ── Greek Avgotaraho ──
    { id: 'greek',
      kw: ['greek','greece','avgotaraho','avgotaraho','avgotaraho','kaviari','kaviari','caviar of mediterranean','greek bottarga','greek roe','hellenic'],
      r: () => {
        ctx.lastEntry = 'greek'; ctx.product = 'greek';
        return `**Greek Avgotaraho** 🇬🇷\n\n_"Caviar of the Mediterranean"_\n\nGreece's prized bottarga — known locally as _avgotaraho_. A distinctly different character from Italian or French: more delicate, slightly nutty, with a long oceanic finish. Exceptionally refined.\n\n• **Price:** $28.50 – $34.99\n• **Form:** Whole lobe\n• **Character:** Delicate, nutty, elegant\n\nMany bottarga connoisseurs consider the Greek variety the most refined of all. If you love oysters or fine caviar, you'll love this.\n\n[Order →](${BIZ.contact})`;
      }
    },

    // ── Brazilian Bottarga ──
    { id: 'brazilian',
      kw: ['brazil','brazilian','ouro do brasil','ouro','brasil','south american','mild','entry','beginner','first time bottarga','mild bottarga','sweet bottarga'],
      r: () => {
        ctx.lastEntry = 'brazilian'; ctx.product = 'brazilian';
        return `**Ouro do Brasil** 🇧🇷 — _Gold of Brazil_\n\nBrazilian mullet roe with a milder, slightly sweeter character. The **best entry point** to the world of bottarga — approachable enough for first-timers, complex enough for connoisseurs.\n\n• **Price:** $22.99 – $33.99 (full lobe)\n• **Half lobe also available** → $22.99 – $33.99\n• **Character:** Mild, clean, slightly sweet\n\nIf someone in your household is new to bottarga, start with this one. It's forgiving and easy to love immediately.\n\n[Order →](${BIZ.contact})`;
      }
    },

    // ── Egyptian Bottarga ──
    { id: 'egyptian',
      kw: ['egyptian','egypt','batarekh','batarikh','egyptian royale','port said','egyptian bottarga','egyptian roe','sold out egypt','bouri'],
      r: () => {
        ctx.lastEntry = 'egyptian'; ctx.product = 'egyptian';
        return `**Egyptian Royale** 🇪🇬 — _Batarekh from Port Said_\n\nThe ancient Egyptian tradition — called _batarekh_ (البوري المصري). Whole shrink-wrapped Grey Mullet roe from the waters of Port Said. Soft, moist texture with a sublime ocean taste. Traditionally served sliced thin with garlic, olive oil, and flatbread.\n\n• **Price:** $24.00 – $39.99 (when available)\n• **Status:** Currently **sold out** — check back soon or contact us to be notified\n\n📞 **${BIZ.phone}** — contact us to get on the waitlist\n[Contact →](${BIZ.contact})`;
      }
    },

    // ── Grated Bottarga ──
    { id: 'grated',
      kw: ['grated','grated bottarga','grated gold','bottarga powder','grated sardinian','50 gram','50g','pouch','ready to use','shaker','sprinkle','pasta ready'],
      r: () => {
        ctx.lastEntry = 'grated'; ctx.product = 'grated';
        return `**Grated Gold** 🇮🇹 — _Sardinian Grated Bottarga_\n\nThe fastest way to bring the flavor of the sea to any dish. Finely grated Sardinian bottarga — ready to use straight from the package. No slicing, no grater needed.\n\n**Perfect for:**\n• Pasta (just toss in at the end)\n• Scrambled eggs — finish with a generous shower\n• Toast with olive oil\n• Popcorn, risotto, even pizza\n\n**Available:**\n• **Grated Gold jar** — $20.00 – $54.00 (multiple sizes)\n• **50g Resealable Pouch** — convenient kitchen-ready format\n\nIf you want bottarga in your regular cooking rotation without fuss, grated is the answer.\n\n[Order →](${BIZ.contact})`;
      }
    },

    // ── Comparison / Which is best ──
    { id: 'comparison',
      kw: ['which is best','best one','best bottarga','which should i get','difference between','which to choose','which country','recommend','where to start','which variety','compare','vs','versus','better'],
      r: () => {
        ctx.lastEntry = 'comparison';
        return `Great question — here's a quick guide to choosing:\n\n🇮🇹 **Sardinian Gold** — Classic, bold, full-flavored. The most traditional. Start here if you want the "benchmark" bottarga.\n\n🇫🇷 **Boutargue Classique / Impériale** — Refined, paraffin-waxed, elegant. Best for those who prefer a cleaner, less earthy flavor. Classique is also Kosher certified.\n\n🇬🇷 **Greek Avgotaraho** — Delicate and nutty. For connoisseurs and fine-palate lovers.\n\n🇧🇷 **Ouro do Brasil** — Mild and sweet. The perfect first-timer's choice.\n\n🇪🇬 **Egyptian Royale** — Soft and oceanic. Currently sold out.\n\n**My recommendation for a first purchase:** Sardinian Gold ($24.99) — it's on sale, it's classic, and it gives you the full bottarga experience. If you want milder, go Brazilian.\n\n[Shop all →](${BIZ.shop})`;
      }
    },

    // ── Kosher ──
    { id: 'kosher',
      kw: ['kosher','kasher','passover','pesach','kosher certified','grand rabbinat','paris kosher','halal','jewish','certified'],
      r: () => {
        ctx.lastEntry = 'kosher';
        return `**Kosher Certified Bottarga 🕍**\n\nThree of our products carry full kosher certification:\n\n🇮🇹 **Sardinian Gold** — Certified Kosher by the **Officio Rabbinico, Comunità Ebraica di Roma** (Rabbinical Office of Rome). From $38.99.\n\n🇫🇷 **Boutargue Classique** — Certified **Kosher for Passover — Pareve** by the **Grand-Rabbinat de Paris / Beth'Din de Paris**. One of the few waxed bottargas in the world with this distinction. From $33.99.\n\n🇫🇷 **Boutargue Impériale** — Also certified **Kosher for Passover — Pareve** by the Grand-Rabbinat de Paris. Unwaxed, easier to grate. From $30.99.\n\nAll three are all-natural, no preservatives, just fish roe and salt.\n\n[Full kosher details →](kosher.html) or call **${BIZ.phone}**`;
      }
    },

    // ── Pricing ──
    { id: 'pricing',
      kw: ['price','prices','pricing','how much','cost','costs','how much does','what does it cost','expensive','cheap','budget','affordable','rates'],
      r: () => {
        ctx.lastEntry = 'pricing';
        return `**Our Pricing** (US orders, includes free shipping):\n\n• 🇮🇹 Sardinian Gold → **$24.99** _(on sale)_\n• 🇫🇷 Boutargue Classique → **$33.99 – $91.99** (7 sizes)\n• 🇫🇷 Boutargue Impériale → **From $22.99**\n• 🇫🇷 Boutargue Impériale Aged → **From $22.99** _(limited)_\n• 🇬🇷 Greek Avgotaraho → **$28.50 – $34.99**\n• 🇧🇷 Ouro do Brasil → **$22.99 – $33.99**\n• 🇪🇬 Egyptian Royale → **$24.00 – $39.99** _(sold out)_\n• 🇮🇹 Grated Gold → **$20.00 – $54.00**\n\nAll US orders ship free via USPS. Canada orders — contact us for pricing.\n\n[See full shop →](${BIZ.shop})`;
      }
    },

    // ── Shipping ──
    { id: 'shipping',
      kw: ['shipping','ship','delivery','deliver','usps','how long','how fast','free shipping','international','canada','worldwide','where do you ship','ship to','do you ship'],
      r: () => {
        ctx.lastEntry = 'shipping';
        return `**Shipping 📦**\n\n**United States:**\n• Free USPS shipping on every US order — no minimum\n• Typically 2–5 business days depending on destination\n\n**Canada:**\n• We ship from our Montreal office\n• Contact us directly for Canada pricing and shipping details\n• 📞 **${BIZ.phone}**\n\n**International:**\n• We ship worldwide — [contact us](${BIZ.contact}) for international shipping rates and options\n\nAll products are carefully packaged to maintain freshness during transit.`;
      }
    },

    // ── Ordering ──
    { id: 'ordering',
      kw: ['how to order','place order','buy','purchase','order','add to cart','checkout','how do i buy','where to buy','how to purchase','can i buy','ordering'],
      r: () => {
        ctx.lastEntry = 'ordering';
        return `**How to Order 🛒**\n\nYou can order in a few ways:\n\n**1. Contact us directly (recommended)**\n→ [Contact form](${BIZ.contact}) or call **${BIZ.phone}**\nWe'll confirm availability, your preferred variety and size, and arrange shipping.\n\n**2. Amazon**\nSome products are available on Amazon — search "Supreme Bottarga" or "Bottarga Brothers"\n\n**3. eBay**\nAlso available on eBay — we have **100% positive feedback** on both platforms\n\n**For wholesale / chef / restaurant inquiries:**\n→ [Contact us](${BIZ.contact}) — we have a professional program`;
      }
    },

    // ── Amazon / eBay ──
    { id: 'amazon-ebay',
      kw: ['amazon','ebay','marketplace','online','buy online','feedback','reviews','rating','trust','verified'],
      r: () => {
        ctx.lastEntry = 'amazon-ebay';
        return `**Available on Amazon & eBay 🌟**\n\nWe sell on both Amazon and eBay with **100% positive feedback** — verified by thousands of customers.\n\nSearch for **"Supreme Bottarga"** or **"Bottarga Brothers"** on either platform.\n\nFor the full selection and best service (especially for larger orders, Canada, or international), we recommend ordering directly through our [contact page](${BIZ.contact}) — we can help you find the right variety and size.\n\n📞 **${BIZ.phone}**`;
      }
    },

    // ── Wholesale / Chef Program ──
    { id: 'wholesale',
      kw: ['wholesale','chef','restaurant','bulk','professional','chef program','food service','catering','distributor','case price','large quantity','large order','bulk order'],
      r: () => {
        ctx.lastEntry = 'wholesale';
        return `**Wholesale & Chef Program 👨‍🍳**\n\nWe work directly with chefs, restaurants, specialty retailers, and food distributors.\n\n**What we offer:**\n• Wholesale pricing on all varieties\n• Consistent supply from world-class producers\n• Multiple origin options to build your menu around\n\nBottarga Brothers is trusted by professional kitchens because we carry only one product — and we do it better than anyone else in North America.\n\n[Get in touch →](${BIZ.contact}) or call us at **${BIZ.phone}**\nWe respond promptly to all professional inquiries.`;
      }
    },

    // ── Health / Nutrition ──
    { id: 'health',
      kw: ['health','nutrition','healthy','protein','omega','omega 3','nutrients','calories','diet','fat','sodium','allergen','allergy','gluten','additives','natural','ingredients','what is in it'],
      r: () => {
        ctx.lastEntry = 'health';
        return `**Bottarga & Nutrition 🌿**\n\nBottarga is one of the most nutrient-dense foods in the Mediterranean diet.\n\n**Key nutritional highlights:**\n• **High in protein** — a complete protein with all essential amino acids\n• **Rich in Omega-3 fatty acids** — supports heart and brain health\n• **Vitamins & minerals** — especially Vitamin D, B12, selenium, and phosphorus\n• **100% natural** — no additives, no preservatives, no artificial ingredients\n• Just roe, salt, and time — that's it\n\n**Allergen note:** Bottarga is fish roe — unsuitable for those with fish allergies. It is naturally gluten-free.\n\n**Sodium:** Naturally high due to the curing process — those monitoring sodium intake should be mindful of portion size.`;
      }
    },

    // ── History / Origin ──
    { id: 'history',
      kw: ['history','origin','ancient','tradition','how old','3000 years','phoenician','mediterranean','madar','roger','herbert','jean','family','story','founder','who are you','who started','background','heritage'],
      r: () => {
        ctx.lastEntry = 'history';
        return `**The Story Behind Bottarga Brothers 🏛️**\n\nBottarga Brothers was founded by **Herbert and Jean Madar** — two brothers who grew up eating their father's handcrafted bottarga in Montreal.\n\nTheir father, **Roger Madar**, owned Comosa — a sardine fishing and canning company on the Atlantic coast of **Safi, Morocco** in the 1950s. He learned to cure Grey Mullet roe the old way: salt, patience, and time.\n\nWhen the family emigrated to Montreal in the mid-1960s, Roger brought the craft with him. **Every Friday night** became a ritual — bottarga sliced thin, served as an aperitif with Arak or Scotch.\n\nHerbert and Jean grew up with that taste. They eventually decided to share it with the world — building the finest bottarga company in North America.\n\nThe tradition itself goes back **over 3,000 years** — bottarga was traded by Phoenician merchants across the ancient Mediterranean.\n\n[Read the full story →](about.html)`;
      }
    },

    // ── Recipes ──
    { id: 'recipes',
      kw: ['recipe','recipes','pasta','how to cook','cooking','dish','dishes','meal','food','what to make','spaghetti','linguine','toast','eggs','bruschetta','appetizer','aperitif','ideas','inspiration','serve with'],
      r: () => {
        ctx.lastEntry = 'recipes';
        return `**Bottarga in the Kitchen 🍝**\n\nBottarga shines in simple, high-quality preparations. The rule: **let it be the star.**\n\n**Classic recipes:**\n\n🍝 **Spaghetti alla Bottarga** — Cook pasta al dente. Toss with olive oil, garlic, chili flakes. Plate and finish with a generous shower of grated bottarga. Never heat the bottarga.\n\n🥚 **Bottarga Scrambled Eggs** — Soft-scramble with butter, plate, then grate bottarga over the top. Life-changing breakfast.\n\n🍞 **Toast with Olive Oil** — Quality sourdough, lightly toasted. Drizzle with olive oil, lay thin slices of bottarga, finish with lemon zest.\n\n🥗 **Arugula & Bottarga** — Simple green salad. Dress with lemon and olive oil. Shave bottarga over the top.\n\n**Drink pairings:** Dry white wine (Vermentino, Muscadet), Champagne, Arak, or a peaty Scotch — all outstanding.\n\n[More recipes →](recipes.html)`;
      }
    },

    // ── Storage ──
    { id: 'storage',
      kw: ['store','storage','keep','how to store','refrigerate','fridge','freeze','shelf life','expiry','expire','how long does it last','last','preserve','fresh'],
      r: () => {
        ctx.lastEntry = 'storage';
        return `**Storing Your Bottarga 🧊**\n\n**Whole lobe (shrink-wrapped or waxed):**\n• Refrigerate once received\n• Keeps for **several months** refrigerated, unopened\n• For longer storage: freeze (up to 12 months). Thaw slowly in fridge overnight.\n\n**Once opened / after cutting:**\n• Wrap tightly in plastic wrap or place in an airtight container\n• Refrigerate and use within **2–3 weeks** for best flavor\n\n**Grated bottarga:**\n• Refrigerate after opening\n• Use within **4–6 weeks** of opening\n\n**Pro tip:** The wax coating on French boutargue (Classique / Impériale) helps preserve it longer than shrink-wrapped varieties.`;
      }
    },

    // ── Contact ──
    { id: 'contact',
      kw: ['contact','phone','call','email','reach','get in touch','message','talk to someone','speak','where are you','location','address','montreal','canada','office'],
      r: () => {
        ctx.lastEntry = 'contact';
        return `**Contact Bottarga Brothers 📬**\n\n📞 **${BIZ.phone}** (${BIZ.phoneNum})\n✉️ ${BIZ.email}\n\n🇺🇸 **USA Office:** ${BIZ.addrUS}\n🇨🇦 **Canada Office:** ${BIZ.addrCA}\n\n→ [Contact form](${BIZ.contact})\n\nWe're happy to help with:\n• Product questions & recommendations\n• USA & Canada orders\n• Wholesale & chef program inquiries\n• Custom or gift orders\n\nWe respond to all messages promptly.`;
      }
    },

    // ── Gift ──
    { id: 'gift',
      kw: ['gift','present','gifting','gift idea','for a gift','someone special','anniversary','birthday','holiday','christmas','hanukkah','valentine','food lover','gourmet gift'],
      r: () => {
        ctx.lastEntry = 'gift';
        return `**Bottarga as a Gift 🎁**\n\nBottarga Brothers makes an extraordinary gift for any food lover, chef, or someone who appreciates rare and authentic flavors.\n\n**Best gift options:**\n• **Sardinian Gold** ($24.99) — a classic intro gift\n• **Boutargue Classique** (any size) — elegant, waxed, beautifully presented\n• **A mixed selection** — contact us and we can help you put together a curated set of varieties\n\nFor special gift packaging or a handwritten note, just mention it when you [contact us](${BIZ.contact}). We're happy to accommodate.\n\n📞 **${BIZ.phone}**`;
      }
    },

    // ── Tell me more ──
    { id: 'more',
      kw: ['tell me more','more info','more details','more about','go on','elaborate','explain more','what else','continue','i want to know more'],
      r: () => {
        if (ctx.lastEntry && ctx.lastEntry !== 'more') {
          const entryMap = {
            'sardinian': 'sardinian',
            'classique': 'classique',
            'imperiale': 'imperiale',
            'greek': 'greek',
            'brazilian': 'brazilian',
            'egyptian': 'egyptian',
            'grated': 'grated',
          };
          if (entryMap[ctx.lastEntry]) {
            const entry = KB.find(e => e.id === entryMap[ctx.lastEntry]);
            if (entry) return entry.r();
          }
        }
        ctx.lastEntry = 'more';
        return `I'd love to tell you more! You can ask me about:\n• Any specific product (Sardinian, French, Greek, Brazilian, Egyptian)\n• What bottarga tastes like\n• How to use it in recipes\n• How to place an order\n• Shipping & pricing\n• The Bottarga Brothers story\n\nWhat interests you most?`;
      }
    },

    // ── Fallback ──
    { id: 'fallback',
      kw: [],
      r: () => {
        ctx.lastEntry = 'fallback';
        return `I didn't quite catch that — try asking me:\n• _"What is bottarga?"_\n• _"Which variety should I try first?"_\n• _"How much does the French bottarga cost?"_\n• _"Do you ship to Canada?"_\n\n📞 Or reach us directly: **${BIZ.phone}** · [Contact →](${BIZ.contact})`;
      }
    },
  ];

  // ─── Follow-up system ──────────────────────────────────────────────────────
  function isFollowUp(n) {
    return anyKw(n, [
      'which one','the best','best one','specifically','that one','this one',
      'pick one','choose one','tell me more','more details','explain more',
      'go on','what else','vs','versus','compared','difference','or the',
      'which is better','which is best','better option','recommend','would you choose',
      'how much','price','cost','how to order','where to buy','can i get',
      'what does it taste','what is it like','is it worth','good deal',
      'available','in stock','do you have','shelf life','store it',
      'half lobe','full lobe','whole lobe','which size','what size',
    ]);
  }

  const FOLLOW_UP = {
    'classique': (n) => {
      if (anyKw(n, ['best size','which size','size','how much','cost','price'])) {
        return `**Boutargue Classique Sizes:**\n\n• **S — 3.7 oz → $33.99** ← best intro size\n• M — 4.4 oz → $45.99\n• L — 6.0 oz → $47.99\n• XL — 6.2 oz → $49.99\n• Jumbo — 7.7 oz → $58.99\n• Mega — 8.5 oz → $62.99\n• **Giant — 13.0 oz → $91.99** ← best value if you know you love it\n\nFor a first purchase, I'd recommend the **S or M**. [Order →](${BIZ.contact})`;
      }
      if (anyKw(n, ['kosher','passover','kasher'])) {
        return `Yes — three products are kosher certified: **Sardinian Gold** (Officio Rabbinico di Roma), **Boutargue Classique** and **Boutargue Impériale** (both Kosher for Passover — Pareve, Grand-Rabbinat de Paris). [Full details →](kosher.html)`;
      }
      return null;
    },
    'comparison': (n) => {
      if (anyKw(n, ['first','start','beginner','entry','never tried','new to'])) {
        return `**For a first-timer:** Start with **Sardinian Gold** ($24.99, on sale) — it's the classic benchmark of what bottarga tastes like. If you prefer something milder, go for **Ouro do Brasil** ($22.99). Both are excellent entry points.\n\n[Shop →](${BIZ.shop})`;
      }
      if (anyKw(n, ['gift','present'])) {
        return `For a gift, the **Boutargue Classique** is the most impressive — the paraffin-wax seal looks beautiful and the French provenance impresses food lovers. The Giant (13 oz, $91.99) makes a spectacular gift. Or contact us for a curated multi-variety selection.\n\n📞 **${BIZ.phone}**`;
      }
      return null;
    },
    'sardinian': (n) => {
      if (anyKw(n, ['where','how','order','buy','purchase'])) {
        return `To order **Sardinian Gold**, [contact us here](${BIZ.contact}) or call **${BIZ.phone}**. It's currently on sale at **$24.99** with free USPS shipping in the US.`;
      }
      return null;
    },
    'greek': (n) => {
      if (anyKw(n, ['how much','price','cost'])) {
        return `**Greek Avgotaraho pricing:** $28.50 – $34.99 depending on size. [Contact us to order →](${BIZ.contact})`;
      }
      if (anyKw(n, ['taste','flavor','like what'])) {
        return `Greek avgotaraho has a more delicate, slightly nutty character compared to Italian bottarga. Less earthy, more refined — with a long oceanic finish. Many bottarga experts consider it the most elegant variety. Closer in spirit to fine caviar than to the bold Sardinian style.`;
      }
      return null;
    },
    'history': (n) => {
      if (anyKw(n, ['roger','father','dad','comosa','safi','morocco'])) {
        return `**Roger Madar** owned Comosa, a sardine fishing and canning operation in **Safi, Morocco** in the 1950s. He became an expert in curing Grey Mullet roe using traditional Mediterranean methods. When the family emigrated to Montreal in the mid-1960s, he continued making bottarga at home — a Friday night ritual that shaped his sons' lives. [Read the full story →](about.html)`;
      }
      if (anyKw(n, ['3000','ancient','phoenician','how old','origin'])) {
        return `Bottarga has been made for over **3,000 years**. It was a staple food of ancient Phoenician traders — light, non-perishable, and packed with nutrients for long sea voyages. The curing method used today is essentially unchanged from that ancient process: salt, pressure, and time.`;
      }
      return null;
    },
  };

  // ─── Main router ──────────────────────────────────────────────────────────
  function getResponse(userInput) {
    // All queries handled by Gemini via Cloudflare Worker
    return '__WORKER__';
  }

  // ─── Conversation history for Gemini context ──────────────────────────────
  const geminiHistory = [];

  // ─── UI ───────────────────────────────────────────────────────────────────
  function render() {
    const GOLD = '#c9a84c';
    const GOLD_LIGHT = '#e0c070';
    const BLACK = '#0e0c09';
    const DARK = '#1a1713';
    const DARK_MID = '#221f1a';
    const CREAM = '#f0e8d8';
    const MUTED = '#8a7f72';

    // Styles
    const style = document.createElement('style');
    style.textContent = `
      #bb-chat-btn {
        position: fixed; bottom: 24px; right: 24px; z-index: 9998;
        width: 58px; height: 58px; border-radius: 50%;
        background: linear-gradient(135deg, ${GOLD}, ${GOLD_LIGHT});
        border: none; cursor: pointer; box-shadow: 0 4px 20px rgba(201,168,76,0.4);
        display: flex; align-items: center; justify-content: center;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      #bb-chat-btn:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(201,168,76,0.55); }
      #bb-chat-btn svg { width:26px; height:26px; fill: ${BLACK}; }

      #bb-chat-bubble {
        position: fixed; bottom: 92px; right: 24px; z-index: 9997;
        background: ${DARK_MID}; border: 1px solid ${GOLD};
        color: ${CREAM}; font-family: sans-serif; font-size: 13px;
        padding: 9px 14px; border-radius: 8px 8px 0 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.5);
        white-space: nowrap; animation: bbFadeIn 0.35s ease;
        max-width: 200px; line-height: 1.4;
      }
      #bb-chat-bubble::after {
        content: ''; position: absolute; bottom: -8px; right: 14px;
        border: 8px solid transparent; border-top-color: ${GOLD};
        border-bottom: 0; margin-left: -8px;
      }

      #bb-chat-window {
        position: fixed; bottom: 92px; right: 24px; z-index: 9999;
        width: 360px; max-width: calc(100vw - 32px);
        background: ${BLACK}; border: 1px solid rgba(201,168,76,0.3);
        border-radius: 12px; display: flex; flex-direction: column;
        box-shadow: 0 16px 48px rgba(0,0,0,0.7);
        overflow: hidden; display: none; max-height: 540px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }

      #bb-chat-header {
        background: ${DARK}; border-bottom: 1px solid rgba(201,168,76,0.25);
        padding: 14px 16px; display: flex; align-items: center; gap: 10px; flex-shrink: 0;
      }
      #bb-chat-avatar {
        width: 36px; height: 36px; border-radius: 50%;
        background: linear-gradient(135deg, ${GOLD}, ${GOLD_LIGHT});
        display: flex; align-items: center; justify-content: center;
        font-size: 18px; flex-shrink: 0;
      }
      #bb-chat-title { flex: 1; }
      #bb-chat-title strong { display: block; color: ${CREAM}; font-size: 13.5px; line-height: 1.2; }
      #bb-chat-title span { color: ${GOLD}; font-size: 11px; letter-spacing: 0.05em; }
      #bb-chat-close {
        background: none; border: none; cursor: pointer;
        color: ${MUTED}; font-size: 20px; line-height: 1; padding: 4px;
        transition: color 0.2s;
      }
      #bb-chat-close:hover { color: ${CREAM}; }

      #bb-chat-msgs {
        flex: 1; overflow-y: auto; padding: 14px; display: flex;
        flex-direction: column; gap: 10px; min-height: 200px; max-height: 360px;
        scrollbar-width: thin; scrollbar-color: ${DARK_MID} transparent;
      }
      #bb-chat-msgs::-webkit-scrollbar { width: 4px; }
      #bb-chat-msgs::-webkit-scrollbar-track { background: transparent; }
      #bb-chat-msgs::-webkit-scrollbar-thumb { background: ${DARK_MID}; border-radius: 4px; }

      .bb-msg {
        max-width: 86%; padding: 10px 13px; border-radius: 10px;
        font-size: 13.5px; line-height: 1.55; animation: bbFadeIn 0.25s ease;
      }
      .bb-msg-bot {
        background: ${DARK_MID}; color: ${CREAM};
        border-radius: 2px 10px 10px 10px; align-self: flex-start;
      }
      .bb-msg-user {
        background: linear-gradient(135deg, ${GOLD}, ${GOLD_LIGHT});
        color: ${BLACK}; font-weight: 500;
        border-radius: 10px 10px 2px 10px; align-self: flex-end;
      }
      .bb-msg-bot a { color: ${GOLD}; text-decoration: none; }
      .bb-msg-bot a:hover { text-decoration: underline; }
      .bb-msg-bot strong { color: ${CREAM}; }

      .bb-typing {
        display: flex; gap: 5px; align-items: center;
        padding: 12px 14px; background: ${DARK_MID};
        border-radius: 2px 10px 10px 10px; align-self: flex-start;
        animation: bbFadeIn 0.25s ease;
      }
      .bb-typing span {
        width: 7px; height: 7px; border-radius: 50%;
        background: ${GOLD}; opacity: 0.5;
        animation: bbBounce 1.2s infinite ease-in-out;
      }
      .bb-typing span:nth-child(2) { animation-delay: 0.2s; }
      .bb-typing span:nth-child(3) { animation-delay: 0.4s; }

      #bb-chat-input-row {
        display: flex; gap: 8px; padding: 10px 12px;
        border-top: 1px solid rgba(201,168,76,0.15);
        background: ${DARK}; flex-shrink: 0;
      }
      #bb-chat-input {
        flex: 1; background: ${DARK_MID}; border: 1px solid rgba(201,168,76,0.2);
        border-radius: 8px; color: ${CREAM}; font-size: 16px;
        padding: 9px 12px; resize: none; height: 40px; max-height: 100px;
        font-family: inherit; outline: none; transition: border-color 0.2s;
        overflow: hidden;
      }
      #bb-chat-input::placeholder { color: ${MUTED}; }
      #bb-chat-input:focus { border-color: rgba(201,168,76,0.5); }
      #bb-chat-send {
        width: 40px; height: 40px; border-radius: 8px;
        background: ${GOLD}; border: none; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0; transition: background 0.2s, transform 0.15s;
      }
      #bb-chat-send:hover { background: ${GOLD_LIGHT}; transform: scale(1.06); }
      #bb-chat-send svg { width:18px; height:18px; fill: ${BLACK}; }

      @keyframes bbFadeIn { from { opacity:0; transform: translateY(6px); } to { opacity:1; transform: none; } }
      @keyframes bbBounce { 0%,80%,100% { transform: scale(0.7); opacity:0.4; } 40% { transform: scale(1); opacity:1; } }

      @media (max-width: 400px) {
        #bb-chat-window { right: 8px; bottom: 80px; width: calc(100vw - 16px); }
        #bb-chat-btn { bottom: 16px; right: 16px; }
      }
    `;
    document.head.appendChild(style);

    // Bubble button
    const btn = document.createElement('button');
    btn.id = 'bb-chat-btn';
    btn.setAttribute('aria-label', 'Chat with Bottarga Brothers');
    btn.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 10H6v-2h12v2zm0-3H6V7h12v2z"/></svg>`;
    document.body.appendChild(btn);

    // Chat window
    const win = document.createElement('div');
    win.id = 'bb-chat-window';
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-label', 'Bottarga Brothers Chat');
    win.innerHTML = `
      <div id="bb-chat-header">
        <div id="bb-chat-avatar">🐟</div>
        <div id="bb-chat-title">
          <strong>Bottarga Brothers</strong>
          <span>Supreme Bottarga™</span>
        </div>
        <button id="bb-chat-close" aria-label="Close chat">✕</button>
      </div>
      <div id="bb-chat-msgs" role="log" aria-live="polite"></div>
      <div id="bb-chat-input-row">
        <textarea id="bb-chat-input" placeholder="Ask me anything…" rows="1" aria-label="Chat input"></textarea>
        <button id="bb-chat-send" aria-label="Send">
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
    `;
    document.body.appendChild(win);

    const msgs = document.getElementById('bb-chat-msgs');
    const input = document.getElementById('bb-chat-input');
    const sendBtn = document.getElementById('bb-chat-send');
    const closeBtn = document.getElementById('bb-chat-close');
    let isOpen = false;
    // Persist greeting state across page navigation within same session
    let hasGreeted = sessionStorage.getItem('bb_greeted') === '1';

    function addMsg(text, role) {
      const div = document.createElement('div');
      div.className = 'bb-msg bb-msg-' + role;
      if (role === 'bot') {
        div.innerHTML = md(text);
      } else {
        div.textContent = text;
      }
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
      return div;
    }

    function addTyping() {
      const t = document.createElement('div');
      t.className = 'bb-typing';
      t.innerHTML = '<span></span><span></span><span></span>';
      msgs.appendChild(t);
      msgs.scrollTop = msgs.scrollHeight;
      return { remove: () => t.remove() };
    }

    async function send() {
      const raw = input.value.trim();
      if (!raw) return;
      addMsg(raw, 'user');
      input.value = '';
      input.style.height = '40px';

      // Track user message for Gemini context
      geminiHistory.push({ role: 'user', content: raw });
      if (geminiHistory.length > 12) geminiHistory.splice(0, 2); // keep last 6 turns

      const typing = addTyping();
      const result = getResponse(raw);

      if (result === '__WORKER__') {
        // KB didn't match — ask Gemini via Cloudflare Worker
        try {
          const res = await fetch(`${WORKER_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: geminiHistory }),
          });
          const data = await res.json();
          const reply = data.reply || `I didn't catch that — try asking about a specific product, or call us at **${BIZ.phone}**.`;
          typing.remove();
          addMsg(reply, 'bot');
          geminiHistory.push({ role: 'assistant', content: reply });
        } catch {
          typing.remove();
          addMsg(`I'm having trouble connecting right now. Please call us directly: **${BIZ.phone}**`, 'bot');
        }
      } else {
        // KB matched — respond locally
        const delay = 480 + Math.random() * 400;
        setTimeout(() => {
          typing.remove();
          addMsg(result, 'bot');
          geminiHistory.push({ role: 'assistant', content: result });
        }, delay);
      }
    }

    function open() {
      win.style.display = 'flex';
      win.style.flexDirection = 'column';
      isOpen = true;
      btn.setAttribute('aria-expanded', 'true');
      removeBubble();
      if (!hasGreeted) {
        hasGreeted = true;
        sessionStorage.setItem('bb_greeted', '1');
        setTimeout(() => {
          addMsg(`Welcome to **Bottarga Brothers** 🐟\n\nI can help you find the perfect bottarga — from Sardinia, France, Greece, Brazil, or Egypt. Ask me anything about our products, how to use them, or how to order!\n\nFree US shipping on every order. 📦`, 'bot');
        }, 220);
      }
      setTimeout(() => { input.focus(); }, 300);
    }

    function close() {
      win.style.display = 'none';
      isOpen = false;
      btn.setAttribute('aria-expanded', 'false');
    }

    function removeBubble() {
      const b = document.getElementById('bb-chat-bubble');
      if (b) b.remove();
    }

    btn.addEventListener('click', () => isOpen ? close() : open());
    closeBtn.addEventListener('click', close);
    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
    input.addEventListener('input', () => {
      input.style.height = '40px';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });

    // Attention bubble — only on first page of session, not when nav is open
    setTimeout(() => {
      if (isOpen) return;
      if (document.body.classList.contains('nav-open')) return;
      if (localStorage.getItem('bb_bubble_shown')) return;
      localStorage.setItem('bb_bubble_shown', '1');
      const bubble = document.createElement('div');
      bubble.id = 'bb-chat-bubble';
      bubble.textContent = 'Questions about bottarga? Ask me! 🐟';
      document.body.appendChild(bubble);
      setTimeout(() => bubble.remove(), 7000);
    }, 2500);

    // Visual viewport resize (iOS keyboard)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        if (!isOpen) return;
        const avail = window.visualViewport.height - 92 - 64 - 20;
        msgs.style.maxHeight = Math.max(120, avail) + 'px';
        msgs.scrollTop = msgs.scrollHeight;
      });
    }
  }

  render();

})();
