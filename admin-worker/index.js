/**
 * Bottarga Brothers Admin Worker
 * POST /me             → validates username + password, returns role
 * GET  /content        → returns current content JSON from KV (public)
 * POST /content        → saves content to KV (requires auth)
 * POST /change-password → updates the admin password
 * POST /add-user       → adds a new user (admin only)
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password, X-Admin-User, X-Session-ID',
  'Content-Type': 'application/json',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

async function validateAuth(request, env) {
  const user = request.headers.get('X-Admin-User') || '';
  const pwd  = request.headers.get('X-Admin-Password') || '';

  // Check stored users first (KV: "users" is a JSON map of username -> {password, role})
  const usersRaw = await env.CONTENT.get('users');
  if (usersRaw) {
    const users = JSON.parse(usersRaw);
    if (users[user] && users[user].password === pwd) {
      return { ok: true, role: users[user].role || 'user' };
    }
  }

  // Fall back to master admin credentials
  const storedPwd = await env.CONTENT.get('admin_password') || env.ADMIN_PASSWORD;
  const adminUser = await env.CONTENT.get('admin_username') || env.ADMIN_USERNAME || 'admin';
  if (user === adminUser && pwd === storedPwd) {
    return { ok: true, role: 'admin' };
  }

  return { ok: false };
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);

    // ── POST /me — login / session validation ─────────────────────
    if (request.method === 'POST' && url.pathname === '/me') {
      const auth = await validateAuth(request, env);
      if (!auth.ok) return json({ error: 'Incorrect username or password.' }, 401);
      return json({ role: auth.role });
    }

    // ── GET /content — public ─────────────────────────────────────
    if (request.method === 'GET' && url.pathname === '/content') {
      const data = await env.CONTENT.get('site_content', { type: 'json' });
      return json(data || {});
    }

    // ── POST /content — save site content ────────────────────────
    if (request.method === 'POST' && url.pathname === '/content') {
      const auth = await validateAuth(request, env);
      if (!auth.ok) return json({ error: 'Unauthorized' }, 401);
      const body = await request.json();
      await env.CONTENT.put('site_content', JSON.stringify(body));
      return json({ ok: true, saved: new Date().toISOString() });
    }

    // ── POST /change-password ─────────────────────────────────────
    if (request.method === 'POST' && url.pathname === '/change-password') {
      const auth = await validateAuth(request, env);
      if (!auth.ok) return json({ error: 'Unauthorized' }, 401);
      const body = await request.json();
      if (!body.new_password || body.new_password.length < 8) {
        return json({ error: 'Password must be at least 8 characters' }, 400);
      }
      await env.CONTENT.put('admin_password', body.new_password);
      return json({ ok: true });
    }

    // ── POST /add-user — admin only ───────────────────────────────
    if (request.method === 'POST' && url.pathname === '/add-user') {
      const auth = await validateAuth(request, env);
      if (!auth.ok || auth.role !== 'admin') return json({ error: 'Unauthorized' }, 401);
      const body = await request.json();
      if (!body.new_username || !body.new_password) return json({ error: 'Username and password required' }, 400);
      const usersRaw = await env.CONTENT.get('users');
      const users = usersRaw ? JSON.parse(usersRaw) : {};
      users[body.new_username] = { password: body.new_password, role: body.role || 'user' };
      await env.CONTENT.put('users', JSON.stringify(users));
      return json({ ok: true });
    }

    // ── GET /stock — public ───────────────────────────────────────
    if (request.method === 'GET' && url.pathname === '/stock') {
      const data = await env.CONTENT.get('product_stock', { type: 'json' }) || {};
      return new Response(JSON.stringify(data), {
        headers: { ...CORS, 'Cache-Control': 'public, max-age=30' },
      });
    }

    // ── POST /stock — save stock quantities ───────────────────────
    if (request.method === 'POST' && url.pathname === '/stock') {
      const auth = await validateAuth(request, env);
      if (!auth.ok) return json({ error: 'Unauthorized' }, 401);
      const body = await request.json();
      if (typeof body !== 'object' || Array.isArray(body)) {
        return json({ error: 'Invalid payload' }, 400);
      }
      const clean = {};
      for (const [k, v] of Object.entries(body)) {
        if (v === null) clean[k] = null;
        else if (typeof v === 'number' && v >= 0) clean[k] = Math.floor(v);
      }
      await env.CONTENT.put('product_stock', JSON.stringify(clean));
      return json({ ok: true });
    }

    return json({ error: 'Not found' }, 404);
  },
};
