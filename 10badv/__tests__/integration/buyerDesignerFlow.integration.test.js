/** @jest-environment node */

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
  __esModule: true,
  default: jest.fn(() => ({})),
}));

const REGISTER_PATH = '@/app/api/auth/register/route';
const REQUESTS_PATH = '@/app/api/requests/route';
const PROPOSALS_PATH = '@/app/api/proposals/route';
const PROPOSAL_DETAIL_PATH = '@/app/api/proposals/[id]/route';
const TRANSACTION_DETAIL_PATH = '@/app/api/transactions/[id]/route';

const TEST_SUFFIX = Date.now().toString();

async function loadModules() {
  let registerModule;
  let requestsModule;
  let proposalsModule;
  let proposalDetailModule;
  let transactionDetailModule;
  let dbModule;

  await jest.isolateModulesAsync(async () => {
    registerModule = await import(REGISTER_PATH);
    requestsModule = await import(REQUESTS_PATH);
    proposalsModule = await import(PROPOSALS_PATH);
    proposalDetailModule = await import(PROPOSAL_DETAIL_PATH);
    transactionDetailModule = await import(TRANSACTION_DETAIL_PATH);
    dbModule = await import('@/lib/db');
  });

  return {
    registerModule,
    requestsModule,
    proposalsModule,
    proposalDetailModule,
    transactionDetailModule,
    dbModule,
  };
}

function makeJsonRequest(body) {
  return {
    headers: new Headers(),
    json: async () => body,
  };
}

describe('Buyer-Designer integration flow', () => {
  const { getServerSession } = require('next-auth');

  beforeAll(async () => {
    if (process.env.DATABASE_HOST === undefined) process.env.DATABASE_HOST = '127.0.0.1';
    if (process.env.DATABASE_PORT === undefined) process.env.DATABASE_PORT = '3306';
    if (process.env.DATABASE_USER === undefined) process.env.DATABASE_USER = 'root';
    if (process.env.DATABASE_PASSWORD === undefined) process.env.DATABASE_PASSWORD = 'root';
    if (process.env.DATABASE_NAME === undefined) process.env.DATABASE_NAME = '10badv_test';
    if (process.env.NEXTAUTH_SECRET === undefined) process.env.NEXTAUTH_SECRET = 'integration-secret';
    if (process.env.NEXTAUTH_URL === undefined) process.env.NEXTAUTH_URL = 'http://localhost:3000';
    if (process.env.NODE_ENV === undefined) process.env.NODE_ENV = 'test';

    const { dbModule } = await loadModules();
    await dbModule.initializeDatabase();
  });

  afterEach(() => {
    getServerSession.mockReset();
  });

  it('completes request -> proposal -> transaction -> payout flow', async () => {
    const {
      registerModule,
      requestsModule,
      proposalsModule,
      proposalDetailModule,
      transactionDetailModule,
      dbModule,
    } = await loadModules();

    const buyerUsername = `buyer_${TEST_SUFFIX}`;
    const designerUsername = `designer_${TEST_SUFFIX}`;
    const buyerEmail = `buyer_${TEST_SUFFIX}@test.local`;
    const designerEmail = `designer_${TEST_SUFFIX}@test.local`;

    const registerBuyerResponse = await registerModule.POST(
      makeJsonRequest({
        username: buyerUsername,
        password: 'FlowTest!123',
        name: 'Flow Buyer',
        email: buyerEmail,
        role: 'user',
      })
    );
    const registerBuyerBody = await registerBuyerResponse.json();
    expect(registerBuyerResponse.status).toBe(201);
    expect(registerBuyerBody.success).toBe(true);

    const registerDesignerResponse = await registerModule.POST(
      makeJsonRequest({
        username: designerUsername,
        password: 'FlowTest!123',
        name: 'Flow Designer',
        email: designerEmail,
        role: 'designer',
      })
    );
    const registerDesignerBody = await registerDesignerResponse.json();
    expect(registerDesignerResponse.status).toBe(201);
    expect(registerDesignerBody.success).toBe(true);

    const [buyer] = await dbModule.query('SELECT id FROM users WHERE username = ?', [buyerUsername]);
    const [designer] = await dbModule.query('SELECT id FROM users WHERE username = ?', [designerUsername]);

    expect(buyer).toBeTruthy();
    expect(designer).toBeTruthy();

    await dbModule.query('UPDATE users SET points = ? WHERE id = ?', [100000, buyer.id]);

    getServerSession.mockResolvedValue({
      user: { id: String(buyer.id), role: 'user', username: buyerUsername },
    });

    const createRequestResponse = await requestsModule.POST(
      makeJsonRequest({
        title: 'Landing page design needed',
        description: 'Need responsive page for campaign',
        category: 'web',
        budget: 50000,
        tags: ['landing', 'ads'],
      })
    );
    const createRequestBody = await createRequestResponse.json();
    expect(createRequestResponse.status).toBe(201);
    expect(createRequestBody.success).toBe(true);

    const requestId = createRequestBody.request.id;
    expect(requestId).toBeTruthy();

    getServerSession.mockResolvedValue({
      user: { id: String(designer.id), role: 'designer', username: designerUsername },
    });

    const createProposalResponse = await proposalsModule.POST(
      makeJsonRequest({
        requestId,
        message: 'I can deliver in 7 days',
        offerPrice: 45000,
      })
    );
    const createProposalBody = await createProposalResponse.json();
    expect(createProposalResponse.status).toBe(201);
    expect(createProposalBody.success).toBe(true);

    const proposalId = createProposalBody.proposal.id;
    expect(proposalId).toBeTruthy();

    getServerSession.mockResolvedValue({
      user: { id: String(buyer.id), role: 'user', username: buyerUsername },
    });

    const acceptProposalResponse = await proposalDetailModule.PATCH(
      makeJsonRequest({ status: 'ACCEPTED' }),
      { params: Promise.resolve({ id: String(proposalId) }) }
    );
    const acceptProposalBody = await acceptProposalResponse.json();
    expect(acceptProposalResponse.status).toBe(200);
    expect(acceptProposalBody.success).toBe(true);

    const [transaction] = await dbModule.query(
      'SELECT id, status, amount, buyer_id, designer_id FROM transactions WHERE proposal_id = ?',
      [proposalId]
    );
    expect(transaction).toBeTruthy();
    expect(transaction.status).toBe('pending');
    expect(transaction.amount).toBe(45000);
    expect(transaction.buyer_id).toBe(buyer.id);
    expect(transaction.designer_id).toBe(designer.id);

    getServerSession.mockResolvedValue({
      user: { id: String(designer.id), role: 'designer', username: designerUsername },
    });

    const inProgressResponse = await transactionDetailModule.PATCH(
      makeJsonRequest({ status: 'in_progress' }),
      { params: Promise.resolve({ id: String(transaction.id) }) }
    );
    expect(inProgressResponse.status).toBe(200);

    const awaitingConfirmationResponse = await transactionDetailModule.PATCH(
      makeJsonRequest({ status: 'awaiting_confirmation' }),
      { params: Promise.resolve({ id: String(transaction.id) }) }
    );
    expect(awaitingConfirmationResponse.status).toBe(200);

    getServerSession.mockResolvedValue({
      user: { id: String(buyer.id), role: 'user', username: buyerUsername },
    });

    const completedResponse = await transactionDetailModule.PATCH(
      makeJsonRequest({ status: 'completed' }),
      { params: Promise.resolve({ id: String(transaction.id) }) }
    );
    const completedBody = await completedResponse.json();
    expect(completedResponse.status).toBe(200);
    expect(completedBody.success).toBe(true);

    const [completedTransaction] = await dbModule.query(
      'SELECT status, commission FROM transactions WHERE id = ?',
      [transaction.id]
    );
    expect(completedTransaction.status).toBe('completed');
    expect(completedTransaction.commission).toBe(4500);

    const [updatedDesigner] = await dbModule.query('SELECT points FROM users WHERE id = ?', [designer.id]);
    expect(updatedDesigner.points).toBe(40500);

    const [payoutLog] = await dbModule.query(
      "SELECT amount, type, reference_type FROM point_transactions WHERE user_id = ? AND reference_id = ? AND type = 'earn'",
      [designer.id, transaction.id]
    );
    expect(payoutLog).toBeTruthy();
    expect(payoutLog.amount).toBe(40500);
    expect(payoutLog.reference_type).toBe('transaction');
  });
});
