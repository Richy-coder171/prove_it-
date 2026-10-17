// Start the backend with AI_MOCK=1 and MongoDB running: cd backend && AI_MOCK=1 npm run dev
// In another terminal, run: cd backend && npm run smoke (optional: API_URL=http://localhost:5000)

const baseUrl = (process.env.API_URL || 'http://localhost:5000').replace(/\/+$/, '');
const failures = [];
let blocked = false;
const state = {};

async function request(method, path, { body, ownerKey } = {}) {
  let response;
  try {
    response = await fetch(`${baseUrl}/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(ownerKey ? { 'x-owner-key': ownerKey } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(`${method} ${path}: ${error.message}`);
  }
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!response.ok) throw new Error(`${method} ${path} returned ${response.status}: ${JSON.stringify(data)}`);
  return data;
}

async function step(number, label, run) {
  if (blocked) {
    console.log(`FAIL ${number}/8 ${label}: skipped because an earlier step failed`);
    failures.push(label);
    return null;
  }
  try {
    const result = await run();
    console.log(`PASS ${number}/8 ${label}: ${JSON.stringify(result)}`);
    return result;
  } catch (error) {
    blocked = true;
    failures.push(label);
    console.log(`FAIL ${number}/8 ${label}: ${error.message}`);
    return null;
  }
}

await step(1, 'Generate challenge', async () => {
  const result = await request('POST', '/challenges/generate', {
    body: {
      mode: 'job',
      text: 'Junior Data Analyst at a small online retail startup. Clean sales data, write SQL queries, build weekly spreadsheets, and explain trends to the founders.',
      posterName: 'ProveIt smoke test',
    },
  });
  if (!result.challenge?.id || !result.ownerKey) throw new Error(`Missing challenge id or owner key: ${JSON.stringify(result)}`);
  state.id = result.challenge.id;
  state.ownerKey = result.ownerKey;
  return { id: state.id, mode: result.challenge.mode, ownerKeyCaptured: true };
});

await step(2, 'Update draft', async () => {
  const result = await request('PUT', `/challenges/${state.id}`, {
    ownerKey: state.ownerKey,
    body: {
      title: 'Smoke test: explain a sales trend',
      task: 'Review a sample weekly sales report. Identify one meaningful trend, propose a follow-up analysis, and explain how you would validate the result with the founders.',
      timeLimitMin: 30,
      rubric: [
        { name: 'Data reasoning', weight: 30, description: 'Finds and explains a useful trend.' },
        { name: 'Technical approach', weight: 25, description: 'Chooses practical analysis methods.' },
        { name: 'Validation', weight: 25, description: 'Checks assumptions and data quality.' },
        { name: 'Communication', weight: 20, description: 'Explains findings clearly.' },
      ],
      seedQuestions: ['What evidence supports your trend?', 'How would you check that result?'],
    },
  });
  const totalWeight = result.rubric?.reduce((sum, item) => sum + Number(item.weight), 0);
  if (result.id !== state.id || result.status !== 'draft' || totalWeight !== 100) throw new Error(`Unexpected draft response: ${JSON.stringify(result)}`);
  return { id: result.id, status: result.status, totalWeight };
});

await step(3, 'Approve challenge', async () => {
  const result = await request('POST', `/challenges/${state.id}/approve`, { ownerKey: state.ownerKey });
  if (result.status !== 'live') throw new Error(`Expected status live, received: ${JSON.stringify(result)}`);
  return { id: result.id, status: result.status };
});

await step(4, 'Start submission', async () => {
  const result = await request('POST', `/challenges/${state.id}/start`, {
    body: { name: 'Smoke Candidate', email: `smoke-${Date.now()}@example.test` },
  });
  if (!result.id) throw new Error(`Missing submission id: ${JSON.stringify(result)}`);
  state.submissionId = result.id;
  return { id: result.id, status: result.status };
});

await step(5, 'Submit answer and get follow-ups', async () => {
  const result = await request('POST', `/submissions/${state.submissionId}/answer`, {
    body: { answer: 'I would first validate the weekly sales data for missing values and duplicate orders, then compare revenue by product and acquisition channel. I would use SQL to group comparable weeks, check the effect of promotions, and identify whether one category explains the change. I would put the clearest trend into a short spreadsheet chart, note the sample size, and compare the result against the source report. Before recommending action, I would ask the founders whether inventory, pricing, or a campaign changed during that period. I would then test the same pattern on another time window to see if it repeats and document any assumptions.' },
  });
  if (result.status !== 'answered' || !Array.isArray(result.questions) || result.questions.length < 2 || result.questions.length > 3) {
    throw new Error(`Expected answered status and 2-3 questions: ${JSON.stringify(result)}`);
  }
  state.questions = result.questions;
  return { status: result.status, questions: result.questions };
});

await step(6, 'Defend answers and grade', async () => {
  const result = await request('POST', `/submissions/${state.submissionId}/defend`, {
    body: { answers: state.questions.map((question, index) => `For question ${index + 1}, I would compare the SQL output to the source records, check whether promotions or inventory changed, and repeat the analysis on another week before recommending a decision.`) },
  });
  if (result.status !== 'graded' || !Number.isFinite(Number(result.score?.total))) throw new Error(`Expected graded status and numeric score: ${JSON.stringify(result)}`);
  if (result.score.total >= 70 && !result.badgeId) throw new Error(`Score ${result.score.total} qualifies but no badge was issued: ${JSON.stringify(result)}`);
  state.badgeId = result.badgeId;
  return { status: result.status, total: result.score.total, badgeId: result.badgeId || null };
});

await step(7, 'Verify public badge when issued', async () => {
  if (!state.badgeId) return { skipped: true, reason: 'No badge was issued for this score' };
  const result = await request('GET', `/badges/${state.badgeId}`);
  if (result.verified !== true) throw new Error(`Badge verification was not true: ${JSON.stringify(result)}`);
  return { badgeId: result.badgeId, verified: result.verified };
});

await step(8, 'Confirm submission appears on leaderboard', async () => {
  const result = await request('GET', `/challenges/${state.id}/leaderboard`, { ownerKey: state.ownerKey });
  const submission = result.find((row) => row.id === state.submissionId);
  if (!submission) throw new Error(`Submission ${state.submissionId} not present in response: ${JSON.stringify(result)}`);
  return { submissionId: submission.id, total: submission.total };
});

if (failures.length) {
  console.error(`Smoke test failed: ${failures.length} step(s) did not pass.`);
  process.exitCode = 1;
} else {
  console.log('All 8 smoke-test steps passed.');
}
