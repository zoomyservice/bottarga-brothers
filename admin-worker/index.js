/**
 * Bottarga Brothers Admin Worker
 * GET  /content        → returns current content JSON from KV (public)
 * POST /content        → saves content to KV (requires admin password)
 * POST /change-password → updates the admin password
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
  'Content-Type': 'application/json',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);

    // ── GET /content ──────────────────────────────────────────────
    if (request.method === 'GET' && url.pathname === '/content') {
      const data = await env.CONTENT.get('site_content', { type: 'json' });
      return new Response(JSON.stringify(data || {}), { headers: CORS });
    }

    // ── POST /change-password ─────────────────────────────────────
    if (request.method === 'POST' && url.pathname === '/change-password') {
      const pwd = request.headers.get('X-Admin-Password');
      const storedPwd = await env.CONTENT.get('admin_password') || env.ADMIN_PASSWORD;
      if (pwd !== storedPwd) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });
      }
      const body = await request.json();
      if (!body.new_password || body.new_password.length < 8) {
        return new Response(JSON.stringify({ error: 'Password must be at least 8 characters' }), { status: 400, headers: CORS });
      }
      await env.CONTENT.put('admin_password', body.new_password);
      return new Response(JSON.stringify({ ok: true }), { headers: CORS });
    }

    // ── POST /content ─────────────────────────────────────────────
    if (request.method === 'POST' && url.pathname === '/content') {
      const pwd = request.headers.get('X-Admin-Password');
      const storedPwd = await env.CONTENT.get('admin_password') || env.ADMIN_PASSWORD;
      if (pwd !== storedPwd) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });
      }
      const body = await request.json();
      await env.CONTENT.put('site_content', JSON.stringify(body));
      return new Response(JSON.stringify({ ok: true, saved: new Date().toISOString() }), { headers: CORS });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: CORS });
  },
};
