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
    return res;
  }

  async json(path, options = {}) {
    const res = await this.req(path, options);
    const raw = await res.text();
    let data;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { raw };
    }
    return { res, data, raw };
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
  const csrf = await client.json('/api/auth/csrf');
  if (!csrf.data?.csrfToken) {
    throw new Error(`CSRF token missing. status=${csrf.res.status}`);
  }

  const body = new URLSearchParams({
    csrfToken: csrf.data.csrfToken,
    username,
    password,
    callbackUrl: `${BASE}/dashboard`,
    json: 'true',
  });

  const loginRes = await client.req('/api/auth/callback/credentials?json=true', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const session = await client.json('/api/auth/session');
  return {
    loginStatus: loginRes.status,
    sessionStatus: session.res.status,
    session: session.data,
  };
}

function pushReport(report, name, status, ok, details = undefined) {
  report.push({ name, status, ok, details });
}

(async () => {
  const suffix = Date.now().toString().slice(-6);
  const password = 'Test!2345';

  const advertiser = {
    username: `adv_${suffix}`,
    password,
    name: 'Advertiser Test',
    email: `adv_${suffix}@test.com`,
    role: 'user',
  };

  const designer = {
    username: `des_${suffix}`,
    password,
    name: 'Designer Test',
    email: `des_${suffix}@test.com`,
    role: 'designer',
  };

  const admin = {
    username: `adm_${suffix}`,
    password,
    name: 'Admin Test',
    email: `adm_${suffix}@test.com`,
    role: 'admin',
  };

  const report = [];

  const regAdv = await registerUser(advertiser);
  pushReport(report, 'register advertiser', regAdv.status, regAdv.data?.success === true, regAdv.data?.error);

  const regDes = await registerUser(designer);
  pushReport(report, 'register designer', regDes.status, regDes.data?.success === true, regDes.data?.error);

  const conn = await mysql.createConnection(DB);
  const hashed = await bcrypt.hash(admin.password, 12);
  await conn.execute(
    'INSERT INTO users (username, password, name, email, role, points) VALUES (?, ?, ?, ?, ?, ?)',
    [admin.username, hashed, admin.name, admin.email, admin.role, 0]
  );
  pushReport(report, 'create admin in db', 201, true);

  const advClient = new SessionClient();
  const desClient = new SessionClient();
  const admClient = new SessionClient();

  const advLogin = await login(advClient, advertiser.username, advertiser.password);
  pushReport(report, 'login advertiser', advLogin.loginStatus, !!advLogin.session?.user, advLogin.session);

  const desLogin = await login(desClient, designer.username, designer.password);
  pushReport(report, 'login designer', desLogin.loginStatus, !!desLogin.session?.user, desLogin.session);

  const admLogin = await login(admClient, admin.username, admin.password);
  pushReport(report, 'login admin', admLogin.loginStatus, !!admLogin.session?.user, admLogin.session);

  const anonClient = new SessionClient();
  const anonPayments = await anonClient.json('/api/payments');
  pushReport(report, 'payments unauth blocked', anonPayments.res.status, anonPayments.res.status === 401, anonPayments.data);

  const invalidPayment = await advClient.json('/api/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 0, payment_method: 'card' }),
  });
  pushReport(report, 'payment prepare invalid amount', invalidPayment.res.status, invalidPayment.res.status === 400, invalidPayment.data);

  const paymentReady = await advClient.json('/api/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 120000, payment_method: 'card', order_name: 'E2E Charge' }),
  });
  pushReport(report, 'payment prepare success', paymentReady.res.status, paymentReady.data?.success === true, paymentReady.data);

  const verifyMissing = await advClient.json('/api/payments/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId: 'mock_missing' }),
  });
  pushReport(report, 'payment verify missing fields', verifyMissing.res.status, verifyMissing.res.status === 400, verifyMissing.data);

  const merchantUid = paymentReady.data?.merchant_uid;
  const verifyOk = await advClient.json('/api/payments/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId: `mock_${merchantUid}`, merchant_uid: merchantUid }),
  });
  pushReport(report, 'payment verify success', verifyOk.res.status, verifyOk.data?.success === true, verifyOk.data);

  const verifyAgain = await advClient.json('/api/payments/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId: `mock_${merchantUid}`, merchant_uid: merchantUid }),
  });
  pushReport(report, 'payment verify idempotent', verifyAgain.res.status, verifyAgain.data?.success === true, verifyAgain.data);

  const portfolioRes = await desClient.json('/api/portfolios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: `Validation Portfolio ${suffix}`,
      description: 'e2e flow',
      category: 'design',
      price: 50000,
      images: [],
    }),
  });
  pushReport(report, 'designer creates portfolio', portfolioRes.res.status, portfolioRes.data?.success === true, portfolioRes.data);

  const portfolioId = portfolioRes.data?.portfolioId;
  if (portfolioId) {
    await conn.execute('UPDATE portfolios SET status = ? WHERE id = ?', ['approved', portfolioId]);
  }

  const txRes = await advClient.json('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ portfolio_id: portfolioId, amount: 50000 }),
  });
  pushReport(report, 'advertiser buys portfolio', txRes.res.status, txRes.data?.success === true, txRes.data);

  const adminAsUser = await advClient.json('/api/admin/users');
  pushReport(report, 'admin api blocked for advertiser', adminAsUser.res.status, adminAsUser.res.status === 403, adminAsUser.data);

  const adminOk = await admClient.json('/api/admin/users?page=1&limit=5');
  pushReport(report, 'admin api allowed for admin', adminOk.res.status, adminOk.res.status === 200 && adminOk.data?.success === true, adminOk.data?.pagination);

  const [advRows] = await conn.execute('SELECT id, username, role, points FROM users WHERE username = ?', [advertiser.username]);
  const [desRows] = await conn.execute('SELECT id, username, role, points FROM users WHERE username = ?', [designer.username]);
  const [admRows] = await conn.execute('SELECT id, username, role, points FROM users WHERE username = ?', [admin.username]);

  await conn.end();

  console.log('\n=== Validation Results ===');
  for (const item of report) {
    console.log(`${item.ok ? 'PASS' : 'FAIL'} | ${item.name} | status=${item.status}`);
    if (!item.ok && item.details !== undefined) {
      console.log('  details:', typeof item.details === 'string' ? item.details : JSON.stringify(item.details));
    }
  }

  console.log('\n=== Created Accounts ===');
  console.log(JSON.stringify({
    advertiser: advRows[0],
    designer: desRows[0],
    admin: admRows[0],
    password,
    baseUrl: BASE,
  }, null, 2));

  const failed = report.filter((r) => !r.ok);
  console.log('\n=== Summary ===');
  console.log(JSON.stringify({ total: report.length, pass: report.length - failed.length, fail: failed.length }, null, 2));

  if (failed.length > 0) {
    process.exitCode = 1;
  }
})();
