import { clamp, extractJson, tokenOverlap } from './util.js';

const rubricFor = (skill, seed) => {
  const sets = [
    [30, 25, 20, 15, 10],
    [25, 25, 20, 20, 10],
    [30, 20, 20, 20, 10],
    [25, 20, 20, 20, 15],
  ];
  const weights = sets[seed % sets.length];
  return [
    ['Task understanding', 'Interprets the goal and constraints'],
    [`${skill} fundamentals`, 'Applies the core skills needed for the work'],
    ['Practical execution', 'Presents a feasible, usable solution'],
    ['Reasoning and trade-offs', 'Explains choices, assumptions, and trade-offs'],
    ['Clear communication', 'Communicates the result in a clear, structured way'],
  ].map(([name, description], index) => ({ name, weight: weights[index], description }));
};

const hashText = (text) => [...String(text)].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7);

function mockChallenge({ mode, text }) {
  const seed = hashText(text);
  const lower = text.toLowerCase();
  const skill = /sql|excel|data|statistic|dashboard/.test(lower) ? 'Data analysis'
    : /market|growth|customer|sales|brand/.test(lower) ? 'Growth strategy'
      : /design|product|app|user|interface/.test(lower) ? 'Product development'
        : /code|software|engineer|api|technical/.test(lower) ? 'Software development'
          : 'Problem solving';
  const subject = text.replace(/\s+/g, ' ').trim().split(/[.!?]/)[0].slice(0, 90) || 'the proposed work';
  const title = `${skill}: ${subject.slice(0, 54)}${subject.length > 54 ? '…' : ''}`;
  const task = mode === 'idea'
    ? `Create a practical first-step plan for this venture: “${subject}”. Identify the primary user, outline a small testable solution, and explain how you would validate it with limited time and resources. Include the key assumptions, a simple success measure, and the first two actions you would take.`
    : `Prepare a short work sample based on this role: “${subject}”. Use a realistic example to show how you would approach one important responsibility, explain your method, and describe how you would check the result. State assumptions and any trade-offs clearly.`;
  return {
    title,
    skill,
    level: ['Beginner', 'Intermediate', 'Advanced'][seed % 3],
    timeLimitMin: 30 + (seed % 16),
    task,
    rubric: rubricFor(skill, seed),
    seedQuestions: [
      `Which part of your approach best addresses ${skill.toLowerCase()} for this challenge, and why?`,
      `What assumption in your plan would you test first for “${subject.slice(0, 45)}”?`,
      'What would you change if your first result did not meet the goal?',
    ],
  };
}

function scaleRubric(rows) {
  const valid = rows.slice(0, 6).map((row) => ({
    name: String(row.name || '').trim(),
    description: String(row.description || '').trim(),
    weight: Math.max(1, Number(row.weight) || 1),
  })).filter((row) => row.name && row.description);
  if (valid.length < 4) throw new Error('AI returned fewer than four rubric criteria');
  const sum = valid.reduce((n, row) => n + row.weight, 0);
  const scaled = valid.map((row) => row.weight / sum * 100);
  const weights = scaled.map(Math.floor);
  let remaining = 100 - weights.reduce((n, value) => n + value, 0);
  [...scaled.keys()].sort((a, b) => (scaled[b] % 1) - (scaled[a] % 1)).slice(0, remaining).forEach((i) => weights[i]++);
  return valid.map((row, i) => ({ name: row.name, description: row.description, weight: weights[i] }));
}

function validateChallenge(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('AI returned an invalid challenge');
  const title = String(raw.title || '').trim();
  const skill = String(raw.skill || '').trim();
  const task = String(raw.task || '').trim();
  if (!title || !skill || task.length < 40) throw new Error('AI returned an incomplete challenge');
  const seedQuestions = (Array.isArray(raw.seedQuestions) ? raw.seedQuestions : []).map((q) => String(q).trim()).filter(Boolean).slice(0, 3);
  while (seedQuestions.length < 2) seedQuestions.push('What assumption would you test first, and why?');
  return {
    title,
    skill,
    level: ['Beginner', 'Intermediate', 'Advanced'].includes(raw.level) ? raw.level : 'Intermediate',
    timeLimitMin: Math.round(clamp(Number(raw.timeLimitMin) || 35, 30, 45)),
    task,
    rubric: scaleRubric(Array.isArray(raw.rubric) ? raw.rubric : []),
    seedQuestions,
  };
}

async function callProvider(provider, system, user) {
  const base = provider.baseUrl.replace(/\/+$/, '').replace(/\/chat\/completions$/, '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(process.env.AI_TIMEOUT_MS) || 45000);
  try {
    const response = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${provider.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: provider.model, temperature: 0.4, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error?.message || `AI provider returned ${response.status}`);
    const content = data.choices?.[0]?.message?.content;
    const text = Array.isArray(content) ? content.map((part) => part.text || '').join('') : content;
    return extractJson(text);
  } finally {
    clearTimeout(timer);
  }
}

async function structuredAI({ system, user, mock, validate }) {
  if (process.env.AI_MOCK === '1') return validate(mock());
  const providers = [
    ['AI_BASE_URL', 'AI_API_KEY', 'AI_MODEL'],
    ['AI2_BASE_URL', 'AI2_API_KEY', 'AI2_MODEL'],
    ['AI3_BASE_URL', 'AI3_API_KEY', 'AI3_MODEL'],
  ].map(([base, key, model]) => ({ baseUrl: process.env[base], apiKey: process.env[key], model: process.env[model] }))
    .filter((provider) => provider.baseUrl && provider.apiKey && provider.model);
  let lastError;
  for (const provider of providers) {
    try {
      return validate(await callProvider(provider, system, user));
    } catch (error) {
      lastError = error;
    }
  }
  if (process.env.AI_FALLBACK_MOCK === '1') return validate(mock());
  throw new Error(lastError?.message || 'No AI provider is configured');
}

export function generateChallenge({ mode, text }) {
  const input = { mode, text };
  return structuredAI({
    system: 'Draft a practical 30-45 minute hiring or founder challenge from the provided source. Produce 4-6 rubric criteria with integer weights totaling 100, and 2-3 useful starter questions. Return only valid JSON with title, skill, level, timeLimitMin, task, rubric (name, weight, description), and seedQuestions.',
    user: JSON.stringify(input),
    mock: () => mockChallenge(input),
    validate: validateChallenge,
  });
}

function validateQuestions(raw) {
  const questions = Array.isArray(raw) ? raw : raw?.questions;
  const result = (Array.isArray(questions) ? questions : []).map((item) => String(typeof item === 'string' ? item : item.question || item.q || '').trim()).filter(Boolean).slice(0, 3);
  if (result.length < 2) throw new Error('AI returned fewer than two follow-up questions');
  return result;
}

function mockFollowups({ answer, seedQuestions = [] }) {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const snippet = words.slice(0, Math.min(5, words.length)).join(' ') || 'your proposed approach';
  const seed = hashText(answer);
  return [
    `You wrote “${snippet}”. What evidence or experience led you to that choice?`,
    `Which risk in your answer would you test first, and what result would change your plan?`,
    seedQuestions[seed % Math.max(seedQuestions.length, 1)] || 'What would you change if your first approach did not work?',
  ];
}

export function generateFollowups(challenge, answer) {
  const input = { challengeTitle: challenge.title, skill: challenge.skill, seedQuestions: challenge.seedQuestions || [], answer };
  return structuredAI({
    system: 'Write 2-3 specific follow-up questions about the candidate answer and challenge. Quote or reference details from this candidate answer, probe reasoning and evidence, and avoid generic interview questions. Return only JSON: {"questions":["..."]}.',
    user: JSON.stringify(input),
    mock: () => mockFollowups(input),
    validate: validateQuestions,
  });
}

const answerExcerpt = (answer, offset = 0) => {
  const text = String(answer || '').replace(/\s+/g, ' ').trim();
  if (!text) return [];
  const start = Math.min(offset, Math.max(0, text.length - 1));
  return [text.slice(start, start + 100).trim() || text.slice(0, 100)];
};

function answerEvidence(items, answer, index) {
  const valid = (Array.isArray(items) ? items : []).map(String).filter((quote) => quote.trim() && tokenOverlap(quote, answer) >= 0.55).slice(0, 2);
  return valid.length ? valid : answerExcerpt(answer, index * 13);
}

function mockGrade({ challenge, candidateAnswer, defendTranscript, runIndex = 0 }) {
  const answerWords = candidateAnswer.trim().split(/\s+/).filter(Boolean);
  const defenseWords = defendTranscript.trim().split(/\s+/).filter(Boolean);
  const answerSet = new Set(answerWords.map((word) => word.toLowerCase().replace(/[^a-z0-9]/g, '')).filter(Boolean));
  const overlap = defenseWords.length ? defenseWords.filter((word) => answerSet.has(word.toLowerCase().replace(/[^a-z0-9]/g, ''))).length / defenseWords.length : 0;
  const confidenceKey = overlap >= 0.25 ? 'high' : overlap >= 0.1 ? 'medium' : 'low';
  const seed = hashText(candidateAnswer + defendTranscript);
  const completeness = clamp(48 + Math.min(answerWords.length, 80) * 0.45, 45, 88);
  const criteria = challenge.rubric.map((item, index) => {
    const percent = clamp(completeness + ((seed + index * 7 + runIndex * 3) % 13) - 6, 35, 96);
    return {
      name: item.name,
      max: item.weight,
      score: Math.round(item.weight * percent / 100 * 10) / 10,
      evidence: answerExcerpt(candidateAnswer, index * 17),
      why: answerWords.length < 35
        ? `The response addresses ${item.name.toLowerCase()} but gives limited detail to support a stronger score.`
        : `The response provides a concrete explanation relevant to ${item.name.toLowerCase()}, with room to make the result more measurable.`,
    };
  });
  return {
    total: criteria.reduce((sum, item) => sum + item.score, 0),
    criteria,
    authenticity_signal: {
      level: confidenceKey,
      reasons: confidenceKey === 'high'
        ? ['The spoken follow-up reused details from the written solution.']
        : confidenceKey === 'medium'
          ? ['Some details in the spoken follow-up aligned with the written solution.']
          : ['The spoken follow-up contained few details that overlapped with the written solution.'],
    },
    grader_confidence: 0.72 + (seed % 20) / 100,
  };
}

function validateGrade(raw, challenge, answer) {
  const source = Array.isArray(raw?.criteria) ? raw.criteria : [];
  const criteria = challenge.rubric.map((rubric, index) => {
    const result = source.find((item) => item.name === rubric.name) || source[index] || {};
    const max = Number(rubric.weight);
    let points = Number(result.score ?? result.points);
    if (!Number.isFinite(points) && Number.isFinite(Number(result.percent))) points = max * Number(result.percent) / 100;
    points = clamp(Number.isFinite(points) ? points : 0, 0, max);
    const percent = max ? points / max * 100 : 0;
    return {
      name: rubric.name, weight: max,
      points: Math.round(points * 100) / 100,
      percent: Math.round(percent * 100) / 100,
      evidence: answerEvidence(result.evidence, answer, index),
      why: String(result.why || 'This criterion was scored from the evidence present in the submitted answer.'),
      overridden: false,
      aiPoints: Math.round(points * 100) / 100,
    };
  });
  const signal = raw.authenticity_signal || raw.authenticity || {};
  const rawLevel = String(signal.level || signal.key || 'medium').toLowerCase();
  const key = rawLevel.includes('high') ? 'high' : rawLevel.includes('low') ? 'low' : 'medium';
  return {
    total: clamp(Number(raw.total) || criteria.reduce((sum, item) => sum + item.points, 0), 0, 100),
    criteria,
    authenticity: {
      key,
      level: key[0].toUpperCase() + key.slice(1) + ' confidence',
      reasons: Array.isArray(signal.reasons) ? signal.reasons.map(String).slice(0, 5) : [],
    },
    graderConfidence: clamp(Number(raw.grader_confidence) || 0.5, 0, 1),
  };
}

export function gradeOnce({ challenge, candidateAnswer, defendTranscript, runIndex = 0 }) {
  const input = { challenge: { title: challenge.title, skill: challenge.skill, rubric: challenge.rubric }, rubric: challenge.rubric, candidateAnswer, defendTranscript, runIndex };
  return structuredAI({
    system: 'Grade the candidate answer against the supplied rubric. Never reward length by itself. Cite only exact evidence actually present in the candidate answer; never invent quotes. Consider the defend transcript for reasoning and consistency, not accent or demographics. Return ONLY JSON with total (0-100), criteria [{name, weight, score (points out of weight), max, evidence (exact quotes from candidateAnswer), why}], authenticity_signal {level: low|medium|high, reasons: string[]}, grader_confidence (0-1). No markdown or prose.',
    user: JSON.stringify(input),
    mock: () => mockGrade({ ...input, runIndex }),
    validate: (raw) => validateGrade(raw, challenge, candidateAnswer),
  });
}

export async function gradeSubmission(challenge, candidateAnswer, qa) {
  const runs = clamp(Math.floor(Number(process.env.GRADE_RUNS) || 3), 1, 5);
  const defendTranscript = (qa || []).map(({ q, a }) => `Question: ${q}\nAnswer: ${a}`).join('\n\n');
  const grades = await Promise.all(Array.from({ length: runs }, (_, runIndex) => gradeOnce({ challenge, candidateAnswer, defendTranscript, runIndex })));
  const criteria = challenge.rubric.map((rubric) => {
    const points = grades.reduce((sum, grade) => sum + (grade.criteria.find((item) => item.name === rubric.name)?.points || 0), 0) / grades.length;
    const first = grades[0].criteria.find((item) => item.name === rubric.name);
    return { ...first, points: Math.round(points * 100) / 100, aiPoints: Math.round(points * 100) / 100, percent: rubric.weight ? Math.round(points / rubric.weight * 10000) / 100 : 0 };
  });
  const totals = grades.map((grade) => grade.total);
  const averageTotal = totals.reduce((sum, total) => sum + total, 0) / totals.length;
  const variance = totals.reduce((sum, total) => sum + (total - averageTotal) ** 2, 0) / totals.length;
  const reasoningCriterion = criteria.find((item) => /reason|analysis|problem.?solv/i.test(item.name));
  const confidence = { low: 1, medium: 2, high: 3 };
  const meanConfidence = grades.reduce((sum, grade) => sum + confidence[grade.authenticity.key], 0) / grades.length;
  const authKey = meanConfidence >= 2.5 ? 'high' : meanConfidence <= 1.5 ? 'low' : 'medium';
  return {
    total: Math.round(criteria.reduce((sum, item) => sum + item.points, 0)),
    reasoning: reasoningCriterion?.points || 0,
    reasoningMax: reasoningCriterion?.weight || 0,
    flagged: variance >= 36,
    variance: Math.round(variance * 100) / 100,
    graderConfidence: Math.round(grades.reduce((sum, grade) => sum + grade.graderConfidence, 0) / grades.length * 100) / 100,
    authenticity: {
      key: authKey,
      level: `${authKey[0].toUpperCase()}${authKey.slice(1)} confidence`,
      reasons: [...new Set(grades.flatMap((grade) => grade.authenticity.reasons))].slice(0, 5),
    },
    criteria,
  };
}

export function generateSkillGaps(score) {
  const weak = (score.criteria || []).filter((criterion) => criterion.percent < 75).sort((a, b) => a.percent - b.percent).slice(0, 3);
  const mock = () => ({ gaps: weak.map((criterion) => ({
    criterion: criterion.name,
    whatToLearn: `Review the core methods behind ${criterion.name.toLowerCase()} and practice applying them to a small, realistic example.`,
    practice: `Write a short response that demonstrates ${criterion.name.toLowerCase()}, includes one measurable result, and explains the trade-off you considered.`,
  })) });
  return structuredAI({
    system: 'Create a concise, practical learning plan based on the weak rubric criteria. Return only JSON {"gaps":[{"criterion":"...","whatToLearn":"...","practice":"..."}]}.',
    user: JSON.stringify({ total: score.total, criteria: score.criteria }),
    mock,
    validate: (value) => ({ gaps: Array.isArray(value?.gaps) ? value.gaps.map((gap) => ({ criterion: String(gap.criterion || ''), whatToLearn: String(gap.whatToLearn || ''), practice: String(gap.practice || '') })).filter((gap) => gap.criterion) : [] }),
  });
}
