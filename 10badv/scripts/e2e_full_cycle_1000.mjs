import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3001';
const TEST_PRICE = 1000;
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

async function getUserPoints(conn, userId) {
  const [rows] = await conn.execute('SELECT points FROM users WHERE id = ?', [userId]);
  return Number(rows[0]?.points || 0);
}

async function main() {
  const suffix = Date.now().toString().slice(-6);
  const password = 'Test!2345';
  let failed = 0;

  const advertiser = {
    username: `adv_cycle_${suffix}`,
    password,
    name: 'Cycle Advertiser',
    email: `adv_cycle_${suffix}@test.com`,
    role: 'user',
  };

  const designer = {
    username: `des_cycle_${suffix}`,
    password,
    name: 'Cycle Designer',
    email: `des_cycle_${suffix}@test.com`,
    role: 'designer',
  };

  const admin = {
    username: `adm_cycle_${suffix}`,
    password,
    name: 'Cycle Admin',
    email: `adm_cycle_${suffix}@test.com`,
    role: 'admin',
  };

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
  const desClient = new SessionClient();
  const admClient = new SessionClient();

  const advSession = await login(advClient, advertiser.username, advertiser.password);
  const advLoginOk = !!advSession.data?.user;
  printResult('login advertiser', advLoginOk, advSession.res.status, advSession.data?.user?.role || '');
  if (!advLoginOk) failed++;

  const desSession = await login(desClient, designer.username, designer.password);
  const desLoginOk = !!desSession.data?.user;
  printResult('login designer', desLoginOk, desSession.res.status, desSession.data?.user?.role || '');
  if (!desLoginOk) failed++;

  const admSession = await login(admClient, admin.username, admin.password);
  const admLoginOk = !!admSession.data?.user;
  printResult('login admin', admLoginOk, admSession.res.status, admSession.data?.user?.role || '');
  if (!admLoginOk) failed++;

  const advertiserId = Number(advSession.data?.user?.id);
  const designerId = Number(desSession.data?.user?.id);

  const adminApi = await admClient.req('/api/admin/users?page=1&limit=5');
  const adminApiOk = adminApi.res.status === 200 && adminApi.data?.success === true;
  printResult('admin api allowed', adminApiOk, adminApi.res.status);
  if (!adminApiOk) failed++;

  const designerPointsBefore = await getUserPoints(conn, designerId);
  const advertiserPointsBefore = await getUserPoints(conn, advertiserId);

  const portfolioCreate = await desClient.req('/api/portfolios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: `Cycle Portfolio ${suffix}`,
      description: 'E2E portfolio for 1000 KRW cycle test',
      category: '배너 디자인',
      price: TEST_PRICE,
      images: [],
    }),
  });

  const portfolioCreateOk = portfolioCreate.data?.success === true;
  printResult('create portfolio (1000 KRW)', portfolioCreateOk, portfolioCreate.res.status, portfolioCreate.data?.error || '');
  if (!portfolioCreateOk) failed++;

  const portfolioId = Number(portfolioCreate.data?.portfolioId);

  if (portfolioId) {
    await conn.execute('UPDATE portfolios SET status = ? WHERE id = ?', ['approved', portfolioId]);
    await conn.execute('UPDATE portfolios SET price = ? WHERE id = ?', [TEST_PRICE, portfolioId]);
  }

  const [portfolioRows] = await conn.execute('SELECT price, status FROM portfolios WHERE id = ?', [portfolioId]);
  const portfolioPriceOk = Number(portfolioRows[0]?.price) === TEST_PRICE;
  printResult('portfolio price fixed to 1000', portfolioPriceOk, 200, `price=${portfolioRows[0]?.price}, status=${portfolioRows[0]?.status}`);
  if (!portfolioPriceOk) failed++;

  const paymentPrepare = await advClient.req('/api/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: TEST_PRICE,
      payment_method: 'card',
      order_name: `Cycle Charge ${TEST_PRICE}`,
    }),
  });

  const paymentPrepareOk = paymentPrepare.data?.success === true && !!paymentPrepare.data?.merchant_uid;
  printResult('payment prepare', paymentPrepareOk, paymentPrepare.res.status, paymentPrepare.data?.error || paymentPrepare.data?.merchant_uid || '');
  if (!paymentPrepareOk) failed++;

  const merchantUid = paymentPrepare.data?.merchant_uid;

  const paymentVerify = await advClient.req('/api/payments/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paymentId: `mock_${merchantUid}`,
      merchant_uid: merchantUid,
    }),
  });

  const paymentVerifyOk = paymentVerify.data?.success === true;
  printResult(
    'payment verify (mock)',
    paymentVerifyOk,
    paymentVerify.res.status,
    paymentVerifyOk ? 'mock verified' : JSON.stringify(paymentVerify.data)
  );
  if (!paymentVerifyOk) failed++;

  const advertiserPointsAfterCharge = await getUserPoints(conn, advertiserId);
  const chargePointsOk = advertiserPointsAfterCharge === advertiserPointsBefore + TEST_PRICE;
  printResult(
    'advertiser points after charge',
    chargePointsOk,
    200,
    `before=${advertiserPointsBefore}, after=${advertiserPointsAfterCharge}`
  );
  if (!chargePointsOk) failed++;

  const txCreate = await advClient.req('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ portfolio_id: portfolioId, amount: TEST_PRICE }),
  });

  const txCreateOk = txCreate.data?.success === true && !!txCreate.data?.transactionId;
  printResult('create transaction (purchase)', txCreateOk, txCreate.res.status, txCreate.data?.error || '');
  if (!txCreateOk) failed++;

  const transactionId = Number(txCreate.data?.transactionId);

  const roomCreate = await advClient.req('/api/chat/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      designerId,
      portfolioId,
      transactionId,
      initialMessage: 'Payment completed. Starting design collaboration.',
    }),
  });

  const roomCreateOk = roomCreate.data?.success === true && !!roomCreate.data?.roomId;
  printResult('create chat room', roomCreateOk, roomCreate.res.status, roomCreate.data?.error || '');
  if (!roomCreateOk) failed++;

  const roomId = Number(roomCreate.data?.roomId);

  const advMsg = await advClient.req(`/api/chat/rooms/${roomId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Please share first draft.' }),
  });
  const advMsgOk = advMsg.data?.success === true;
  printResult('advertiser sends message', advMsgOk, advMsg.res.status, advMsg.data?.error || '');
  if (!advMsgOk) failed++;

  const desMsg = await desClient.req(`/api/chat/rooms/${roomId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Draft uploaded. Marking progress now.' }),
  });
  const desMsgOk = desMsg.data?.success === true;
  printResult('designer sends message', desMsgOk, desMsg.res.status, desMsg.data?.error || '');
  if (!desMsgOk) failed++;

  const toInProgress = await desClient.req(`/api/transactions/${transactionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'in_progress' }),
  });
  const toInProgressOk = toInProgress.data?.success === true;
  printResult('transaction -> in_progress', toInProgressOk, toInProgress.res.status, toInProgress.data?.error || '');
  if (!toInProgressOk) failed++;

  const toAwaiting = await desClient.req(`/api/transactions/${transactionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'awaiting_confirmation' }),
  });
  const toAwaitingOk = toAwaiting.data?.success === true;
  printResult('transaction -> awaiting_confirmation', toAwaitingOk, toAwaiting.res.status, toAwaiting.data?.error || '');
  if (!toAwaitingOk) failed++;

  const toCompleted = await advClient.req(`/api/transactions/${transactionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'completed' }),
  });
  const toCompletedOk = toCompleted.data?.success === true;
  printResult('transaction -> completed', toCompletedOk, toCompleted.res.status, toCompleted.data?.error || '');
  if (!toCompletedOk) failed++;

  const [txRows] = await conn.execute(
    'SELECT status, payment_status, amount, commission, buyer_id, designer_id FROM transactions WHERE id = ?',
    [transactionId]
  );

  const tx = txRows[0] || {};
  const expectedCommission = Math.floor(TEST_PRICE * 0.1);
  const expectedDesignerEarn = TEST_PRICE - expectedCommission;

  const txCompletedOk = tx.status === 'completed' && Number(tx.amount) === TEST_PRICE && Number(tx.commission) === expectedCommission;
  printResult(
    'transaction settled',
    txCompletedOk,
    200,
    `status=${tx.status}, amount=${tx.amount}, commission=${tx.commission}`
  );
  if (!txCompletedOk) failed++;

  const advertiserPointsAfterAll = await getUserPoints(conn, advertiserId);
  const designerPointsAfterAll = await getUserPoints(conn, designerId);

  const advertiserFinalOk = advertiserPointsAfterAll === advertiserPointsBefore;
  printResult(
    'advertiser final points',
    advertiserFinalOk,
    200,
    `before=${advertiserPointsBefore}, final=${advertiserPointsAfterAll}`
  );
  if (!advertiserFinalOk) failed++;

  const designerFinalOk = designerPointsAfterAll === designerPointsBefore + expectedDesignerEarn;
  printResult(
    'designer final points (money moved)',
    designerFinalOk,
    200,
    `before=${designerPointsBefore}, final=${designerPointsAfterAll}, earned=${expectedDesignerEarn}`
  );
  if (!designerFinalOk) failed++;

  const [ptRows] = await conn.execute(
    `SELECT user_id, type, amount, reference_type, reference_id
       FROM point_transactions
      WHERE (reference_type = 'transaction' AND reference_id = ?)
         OR (reference_type = 'payment' AND user_id = ?)
      ORDER BY id ASC`,
    [transactionId, advertiserId]
  );

  const hasUse = ptRows.some((r) => Number(r.user_id) === advertiserId && r.type === 'use' && Number(r.amount) === TEST_PRICE && r.reference_type === 'transaction' && Number(r.reference_id) === transactionId);
  const hasEarn = ptRows.some((r) => Number(r.user_id) === designerId && r.type === 'earn' && Number(r.amount) === expectedDesignerEarn && r.reference_type === 'transaction' && Number(r.reference_id) === transactionId);
  const hasCharge = ptRows.some((r) => Number(r.user_id) === advertiserId && r.type === 'charge' && Number(r.amount) === TEST_PRICE && r.reference_type === 'payment');

  const pointTxOk = hasUse && hasEarn && hasCharge;
  printResult('point transaction logs', pointTxOk, 200, `charge=${hasCharge}, use=${hasUse}, earn=${hasEarn}`);
  if (!pointTxOk) failed++;

  const advRooms = await advClient.req('/api/chat/rooms');
  const desRooms = await desClient.req('/api/chat/rooms');

  const advRoom = (advRooms.data?.rooms || []).find((r) => Number(r.id) === roomId);
  const desRoom = (desRooms.data?.rooms || []).find((r) => Number(r.id) === roomId);

  const roomStatusOk =
    advRoom?.transaction_status === 'completed' &&
    desRoom?.transaction_status === 'completed' &&
    Number(advRoom?.transaction_id) === transactionId;

  printResult(
    'chat room linked and completed',
    roomStatusOk,
    200,
    `adv_status=${advRoom?.transaction_status}, des_status=${desRoom?.transaction_status}`
  );
  if (!roomStatusOk) failed++;

  await conn.end();

  console.log('\nSUMMARY');
  console.log(JSON.stringify({
    baseUrl: BASE,
    testPrice: TEST_PRICE,
    portfolioId,
    transactionId,
    roomId,
    advertiser: {
      username: advertiser.username,
      id: advertiserId,
      pointsBefore: advertiserPointsBefore,
      pointsAfter: advertiserPointsAfterAll,
    },
    designer: {
      username: designer.username,
      id: designerId,
      pointsBefore: designerPointsBefore,
      pointsAfter: designerPointsAfterAll,
      earned: expectedDesignerEarn,
    },
    failed,
    passed: 20 - failed,
    total: 20,
  }, null, 2));

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('FATAL', error.message);
  process.exit(1);
});
