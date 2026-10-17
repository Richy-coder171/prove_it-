// Start the backend with AI_MOCK=1 and MongoDB running: cd backend && AI_MOCK=1 npm run dev
// In another terminal, run: cd backend && npm run full-check (optional: API_URL=http://localhost:5000)

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
    throw new Error(`${method} ${path}: ${error.cause?.message || error.message}`);
  }
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  return { status: response.status, data };
}

function expect(result, status, label) {
  if (result.status !== status) throw new Error(`${label} expected HTTP ${status}, got ${result.status}: ${JSON.stringify(result.data)}`);
  return result.data;
}

async function step(number, label, run) {
  if (blocked) {
    console.log(`FAIL ${number}/10 ${label}: skipped because an earlier step failed`);
    failures.push({ number, label });
    return;
  }
  try {
    const result = await run();
    console.log(`PASS ${number}/10 ${label}: ${JSON.stringify(result)}`);
  } catch (error) {
    blocked = true;
    failures.push({ number, label });
    console.log(`FAIL ${number}/10 ${label}: ${error.message}`);
  }
}

await step(1, 'Founder Mode end to end', async () => {
  const generated = expect(await request('POST', '/challenges/generate', { body: {
    mode: 'idea',
    text: 'A neighborhood tiffin delivery service for university hostels, connecting students with nearby home cooks through weekly meal subscriptions and simple UPI payments.',
    posterName: 'Full check founder',
  } }), 201, 'Generate Founder Mode challenge');
  if (!generated.challenge?.id || !generated.ownerKey) throw new Error(`Missing challenge id or owner key: ${JSON.stringify(generated)}`);
  state.challengeId = generated.challenge.id;
  state.ownerKey = generated.ownerKey;

  const updated = expect(await request('PUT', `/challenges/${state.challengeId}`, { ownerKey: state.ownerKey, body: {
    title: 'Founder Mode: validate a tiffin delivery launch',
    task: 'Plan a small launch for a hostel tiffin service. Choose how to recruit cooks, test weekly subscriptions, measure repeat orders, and validate whether UPI payments and delivery operations are reliable.',
    timeLimitMin: 30,
    rubric: [
      { name: 'Customer insight', weight: 30, description: 'Uses student needs to shape the launch.' },
      { name: 'Execution plan', weight: 30, description: 'Builds a practical pilot and cook onboarding plan.' },
      { name: 'Measurement', weight: 20, description: 'Defines useful metrics and validation.' },
      { name: 'Risk handling', weight: 20, description: 'Anticipates operational and payment risks.' },
    ],
    seedQuestions: ['How would you know students will subscribe again?', 'What would you test before expanding?'],
  } }), 200, 'Update Founder Mode draft');
  if (updated.status !== 'draft' || updated.rubric?.reduce((sum, row) => sum + Number(row.weight), 0) !== 100) throw new Error(`Unexpected updated challenge: ${JSON.stringify(updated)}`);

  const approved = expect(await request('POST', `/challenges/${state.challengeId}/approve`, { ownerKey: state.ownerKey }), 200, 'Approve Founder Mode challenge');
  if (approved.status !== 'live') throw new Error(`Expected live status: ${JSON.stringify(approved)}`);
  const started = expect(await request('POST', `/challenges/${state.challengeId}/start`, { body: { name: 'Full Check Candidate', email: `full-check-${Date.now()}@example.test` } }), 201, 'Start Founder Mode submission');
  if (!started.id) throw new Error(`Missing submission id: ${JSON.stringify(started)}`);
  state.submissionId = started.id;
  const answered = expect(await request('POST', `/submissions/${state.submissionId}/answer`, { body: {
    answer: 'I would begin with two hostels and interview students about meal timing, price, dietary needs, and what makes them renew a subscription. I would onboard a small group of nearby cooks, agree on a limited menu and daily capacity, and run a one-week pilot. Students could order through a simple mobile form and pay with UPI. I would track delivery completion, late orders, refunds, repeat orders, and contribution margin by meal. I would compare the results across weekdays, ask students and cooks what failed, and verify payment records against orders before deciding whether to expand to another hostel.',
  } }), 200, 'Submit Founder Mode answer');
  if (answered.status !== 'answered' || !Array.isArray(answered.questions) || answered.questions.length < 2 || answered.questions.length > 3) throw new Error(`Expected answered status and 2-3 questions: ${JSON.stringify(answered)}`);
  const graded = expect(await request('POST', `/submissions/${state.submissionId}/defend`, { body: {
    answers: answered.questions.map((question, index) => `For follow-up ${index + 1}, I would compare order and payment records, check delivery timing and repeat purchases, speak with students and cooks about exceptions, and repeat the pilot before expanding.`),
  } }), 200, 'Defend Founder Mode answer');
  if (graded.status !== 'graded' || !Number.isFinite(Number(graded.score?.total))) throw new Error(`Expected graded status and numeric score: ${JSON.stringify(graded)}`);
  if (graded.score.total >= 70 && !graded.badgeId) throw new Error(`Score ${graded.score.total} qualifies but no badge was issued: ${JSON.stringify(graded)}`);
  state.score = graded.score;
  state.badgeId = graded.badgeId || null;
  return { challengeId: state.challengeId, submissionId: state.submissionId, status: graded.status, total: graded.score.total, authenticity: graded.score.authenticity, graderConfidence: graded.score.graderConfidence, badgeId: state.badgeId };
});

await step(2, 'Reject edits after publishing', async () => {
  const result = await request('PUT', `/challenges/${state.challengeId}`, { ownerKey: state.ownerKey, body: { title: 'Should not update', task: 'This edit must be rejected.', timeLimitMin: 30, rubric: [{ name: 'Criterion', weight: 100, description: 'A valid rubric.' }], seedQuestions: [] } });
  const data = expect(result, 409, 'Update published challenge');
  return { status: result.status, error: data.error };
});

await step(3, 'Keep draft challenge private', async () => {
  const generated = expect(await request('POST', '/challenges/generate', { body: { mode: 'job', text: 'Operations analyst to review a small delivery business pilot, clean order records, and explain patterns to the founding team.', posterName: 'Unpublished full check draft' } }), 201, 'Generate private draft');
  if (!generated.challenge?.id) throw new Error(`Missing draft id: ${JSON.stringify(generated)}`);
  state.draftId = generated.challenge.id;
  const get = await request('GET', `/challenges/${state.draftId}`);
  const start = await request('POST', `/challenges/${state.draftId}/start`, { body: { name: 'Should not start', email: 'draft@example.test' } });
  if (get.status !== 404 || start.status !== 404) throw new Error(`Expected GET and start to return 404; got GET ${get.status}: ${JSON.stringify(get.data)}, start ${start.status}: ${JSON.stringify(start.data)}`);
  return { draftId: state.draftId, publicGet: get.status, publicStart: start.status };
});

await step(4, 'Enforce challenge owner key', async () => {
  const wrong = await request('GET', `/challenges/${state.challengeId}/owner`, { ownerKey: 'deliberately-wrong-owner-key' });
  if (wrong.status !== 403) throw new Error(`Wrong key expected HTTP 403, got ${wrong.status}: ${JSON.stringify(wrong.data)}`);
  const correctResult = await request('GET', `/challenges/${state.challengeId}/owner`, { ownerKey: state.ownerKey });
  const correct = expect(correctResult, 200, 'Get challenge with correct owner key');
  return { wrongKey: wrong.status, correctKey: correctResult.status, challengeId: correct.id };
});

await step(5, 'Toggle shortlist twice', async () => {
  const first = expect(await request('POST', `/submissions/${state.submissionId}/shortlist`, { ownerKey: state.ownerKey }), 200, 'First shortlist toggle');
  const second = expect(await request('POST', `/submissions/${state.submissionId}/shortlist`, { ownerKey: state.ownerKey }), 200, 'Second shortlist toggle');
  if (Boolean(first.shortlisted) === Boolean(second.shortlisted)) throw new Error(`Expected shortlist to flip; got ${first.shortlisted} then ${second.shortlisted}`);
  return { first: Boolean(first.shortlisted), second: Boolean(second.shortlisted) };
});

await step(6, 'Override criterion and re-sign badge', async () => {
  const criteria = state.score?.criteria || [];
  const criterion = [...criteria].filter((row) => Number(row.weight) > 0).sort((a, b) => Number(b.weight) - Number(a.weight)).find((row) => {
    const sum = criteria.reduce((total, item) => total + Number(item.points || 0), 0);
    const before = Number(state.score.total);
    return [0, Number(row.weight), Number(row.weight) / 2].some((value) => Math.round(sum - Number(row.points || 0) + value) !== before);
  });
  if (!criterion) throw new Error(`No positive-weight criterion found in score: ${JSON.stringify(state.score)}`);
  const before = Number(state.score.total);
  const sum = criteria.reduce((total, item) => total + Number(item.points || 0), 0);
  const points = [0, Number(criterion.weight), Number(criterion.weight) / 2].find((value) => Math.round(sum - Number(criterion.points || 0) + value) !== before);
  const result = expect(await request('POST', `/submissions/${state.submissionId}/override`, { ownerKey: state.ownerKey, body: { criterion: criterion.name, points, note: 'Full-check override validation.' } }), 200, 'Override criterion');
  if (Number(result.score?.total) === before) throw new Error(`Override did not change total from ${before}: ${JSON.stringify(result.score)}`);
  const adjusted = result.score?.criteria?.find((row) => row.name === criterion.name);
  if (!adjusted?.overridden || Number(adjusted.points) !== points) throw new Error(`Override not reflected in criterion: ${JSON.stringify(adjusted)}`);
  state.score = result.score;
  if (state.badgeId) {
    const badge = expect(await request('GET', `/badges/${state.badgeId}`), 200, 'Read adjusted badge');
    if (badge.verified !== true || Number(badge.total) !== Number(result.score.total)) throw new Error(`Adjusted badge not verified or total differs: ${JSON.stringify(badge)}`);
  }
  return { criterion: criterion.name, oldTotal: before, newTotal: result.score.total, overridden: adjusted.overridden, badgeChecked: Boolean(state.badgeId) };
});

await step(7, 'Require owner key for mentor endorsement', async () => {
  const body = { mentorName: 'Full Check Mentor', note: 'Reviewed the candidate’s pilot plan and evidence checks.' };
  const missingKey = await request('POST', `/submissions/${state.submissionId}/mentor`, { body });
  if (missingKey.status !== 403) throw new Error(`Mentor request without key expected HTTP 403, got ${missingKey.status}: ${JSON.stringify(missingKey.data)}`);
  const result = expect(await request('POST', `/submissions/${state.submissionId}/mentor`, { ownerKey: state.ownerKey, body }), 200, 'Endorse submission with owner key');
  if (result.mentor?.name !== body.mentorName || result.mentor?.note !== body.note) throw new Error(`Mentor details missing from response: ${JSON.stringify(result.mentor)}`);
  if (state.badgeId) {
    const badge = expect(await request('GET', `/badges/${state.badgeId}`), 200, 'Read endorsed badge');
    if (badge.verified !== true || badge.mentor?.name !== body.mentorName || badge.mentor?.note !== body.note) throw new Error(`Endorsed badge mismatch: ${JSON.stringify(badge)}`);
  }
  return { missingKey: missingKey.status, mentor: result.mentor, badgeChecked: Boolean(state.badgeId) };
});

await step(8, 'Request human re-review', async () => {
  const result = expect(await request('POST', `/submissions/${state.submissionId}/rereview`), 200, 'Request re-review');
  if (result.rereviewRequested !== true) throw new Error(`Expected rereviewRequested true: ${JSON.stringify(result)}`);
  return { rereviewRequested: result.rereviewRequested };
});

await step(9, 'Return skill-gap guide', async () => {
  const result = expect(await request('POST', `/submissions/${state.submissionId}/skill-gap`), 200, 'Get skill-gap guide');
  if (!Array.isArray(result.gaps)) throw new Error(`Expected gaps array: ${JSON.stringify(result)}`);
  return { gaps: result.gaps.length };
});

await step(10, 'List approved public feed challenges', async () => {
  const result = expect(await request('GET', '/challenges'), 200, 'Get public challenge feed');
  if (!Array.isArray(result)) throw new Error(`Expected a challenge list: ${JSON.stringify(result)}`);
  const founder = result.find((challenge) => challenge.id === state.challengeId);
  if (!founder || founder.mode !== 'idea') throw new Error(`Founder Mode challenge missing from feed: ${JSON.stringify(result)}`);
  const smokeJob = result.find((challenge) => challenge.title === 'Smoke test: explain a sales trend');
  if (result.some((challenge) => challenge.id === state.draftId)) throw new Error(`Unpublished draft appeared in feed: ${JSON.stringify(result)}`);
  return { founderModeListed: true, smokeJobListed: Boolean(smokeJob), draftExcluded: true, listed: result.length };
});

if (failures.length) {
  console.error(`Full check failed: ${failures.length} step(s) did not pass.`);
  process.exitCode = 1;
} else {
  console.log('All 10 full-check steps passed.');
}
