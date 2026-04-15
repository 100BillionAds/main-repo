import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3001';
const DB = {
  host: process.env.TEST_DB_HOST || '127.0.0.1',
  port: parseInt(process.env.TEST_DB_PORT || '3310', 10),
  user: process.env.TEST_DB_USER || 'root',
  password: process.env.TEST_DB_PASSWORD || '',
  database: process.env.TEST_DB_NAME || '10badv',
};

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

async function registerUser({ username, password, name, email, role }) {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, name, email, role }),
  });

  const raw = await res.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { raw };
  }

  return { status: res.status, data };
}

async function login(client, username, password) {
  const csrf = await client.req('/api/auth/csrf');
  const csrfToken = csrf.data?.csrfToken;
  if (!csrfToken) {
    throw new Error('CSRF token missing');
  }

  const body = new URLSearchParams({
    csrfToken,
    username,
    password,
    callbackUrl: `${BASE}/dashboard`,
    json: 'true',
  });

  await client.req('/api/auth/callback/credentials?json=true', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  return client.req('/api/auth/session');
}

function printResult(name, ok, status, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name} | status=${status}${detail ? ` | ${detail}` : ''}`);
}

async function main() {
  const suffix = Date.now().toString().slice(-6);
  const password = 'Test!2345';

  const advertiser = {
    username: `adv_${suffix}`,
    password,
    name: '광고주 테스트',
    email: `adv_${suffix}@test.com`,
    role: 'user',
  };

  const designer = {
    username: `des_${suffix}`,
    password,
    name: '디자이너 테스트',
    email: `des_${suffix}@test.com`,
    role: 'designer',
  };

  const admin = {
    username: `adm_${suffix}`,
    password,
    name: '관리자 테스트',
    email: `adm_${suffix}@test.com`,
    role: 'admin',
  };

  let failed = 0;

  const regAdv = await registerUser(advertiser);
  const regAdvOk = regAdv.data?.success === true;
  printResult('register advertiser', regAdvOk, regAdv.status, regAdv.data?.error || '');
  if (!regAdvOk) failed++;

  const regDes = await registerUser(designer);
  const regDesOk = regDes.data?.success === true;
  printResult('register designer', regDesOk, regDes.status, regDes.data?.error || '');
  if (!regDesOk) failed++;

  const conn = await mysql.createConnection(DB);
  const hashed = await bcrypt.hash(admin.password, 12);
  await conn.execute(
    'INSERT INTO users (username, password, name, email, role, points) VALUES (?, ?, ?, ?, ?, 0)',
    [admin.username, hashed, admin.name, admin.email, 'admin']
  );
  printResult('create admin', true, 201, 'db insert ok');

  const advClient = new SessionClient();
  const admClient = new SessionClient();

  const advSession = await login(advClient, advertiser.username, advertiser.password);
  const advLoginOk = !!advSession.data?.user;
  printResult('login advertiser', advLoginOk, advSession.res.status, advSession.data?.user?.role || '');
  if (!advLoginOk) failed++;

  const admSession = await login(admClient, admin.username, admin.password);
  const admLoginOk = !!admSession.data?.user;
  printResult('login admin', admLoginOk, admSession.res.status, admSession.data?.user?.role || '');
  if (!admLoginOk) failed++;

  const prep = await advClient.req('/api/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 12345,
      payment_method: 'card',
      order_name: 'PortOne E2E 준비',
    }),
  });
  const prepOk = prep.data?.success === true && !!prep.data?.merchant_uid;
  printResult('payment prepare', prepOk, prep.res.status, prep.data?.merchant_uid ? 'merchant_uid created' : JSON.stringify(prep.data));
  if (!prepOk) failed++;

  const verifyNoReal = await advClient.req('/api/payments/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paymentId: 'nonexistent-payment-id-for-auth-check',
      merchant_uid: prep.data?.merchant_uid,
    }),
  });
  const verifyNoRealOk = verifyNoReal.res.status === 500;
  printResult('payment verify without real payment', verifyNoRealOk, verifyNoReal.res.status, JSON.stringify(verifyNoReal.data));
  if (!verifyNoRealOk) failed++;

  const adminBlocked = await advClient.req('/api/admin/users');
  const adminBlockedOk = adminBlocked.res.status === 403;
  printResult('admin api blocked for advertiser', adminBlockedOk, adminBlocked.res.status);
  if (!adminBlockedOk) failed++;

  const adminAllowed = await admClient.req('/api/admin/users?page=1&limit=5');
  const adminAllowedOk = adminAllowed.res.status === 200 && adminAllowed.data?.success === true;
  printResult('admin api allowed for admin', adminAllowedOk, adminAllowed.res.status);
  if (!adminAllowedOk) failed++;

  await conn.end();

  console.log(`SUMMARY | total=9 | failed=${failed} | passed=${9 - failed}`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('FATAL', error.message);
  process.exit(1);
});
