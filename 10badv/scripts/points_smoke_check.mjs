const BASE = process.env.TEST_BASE_URL || 'http://localhost:3001';

function parseSetCookie(setCookieHeaders) {
  const jar = {};
  for (const line of setCookieHeaders || []) {
    const first = line.split(';')[0];
    const idx = first.indexOf('=');
    if (idx > 0) {
      jar[first.slice(0, idx)] = first.slice(idx + 1);
    }
  }
  return jar;
}

class SessionClient {
  constructor() {
    this.cookies = {};
  }

  cookieHeader() {
    return Object.entries(this.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  async req(path, options = {}) {
    const headers = new Headers(options.headers || {});
    const cookie = this.cookieHeader();
    if (cookie) {
      headers.set('Cookie', cookie);
    }

    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers,
      redirect: 'manual',
    });

    const setCookie = typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')] : []);

    Object.assign(this.cookies, parseSetCookie(setCookie));

    const raw = await res.text();
    let data;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { raw };
    }

    return { res, data };
  }
}

async function main() {
  const suffix = Date.now().toString().slice(-6);
  const user = {
    username: `pt_${suffix}`,
    password: 'Test!2345',
    name: '포인트검증',
    email: `pt_${suffix}@test.com`,
    role: 'user',
  };

  const regRes = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  const regData = await regRes.json();
  if (!regData.success) {
    throw new Error(`register failed: ${JSON.stringify(regData)}`);
  }

  const client = new SessionClient();
  const csrf = await client.req('/api/auth/csrf');
  const body = new URLSearchParams({
    csrfToken: csrf.data.csrfToken,
    username: user.username,
    password: user.password,
    callbackUrl: `${BASE}/dashboard`,
    json: 'true',
  });

  await client.req('/api/auth/callback/credentials?json=true', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const points = await client.req('/api/points?page=1&limit=10');
  const tx = await client.req('/api/transactions/my?status=all&page=1&limit=10');

  const pointsOk = points.res.status === 200 && points.data.success === true;
  const txOk = tx.res.status === 200 && tx.data.success === true;

  console.log(`points_status=${points.res.status} success=${points.data.success === true}`);
  console.log(`transactions_my_status=${tx.res.status} success=${tx.data.success === true}`);

  if (!pointsOk || !txOk) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
