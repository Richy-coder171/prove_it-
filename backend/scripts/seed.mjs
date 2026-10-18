import 'dotenv/config';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { Challenge, Submission, User } from '../src/models.js';
import { generateChallenge, gradeSubmission } from '../src/graders.js';
import { hashPassword, hashSecret, signBadge } from '../src/util.js';

if (process.env.AI_MOCK !== '1') {
  console.error('Run with AI_MOCK=1 so seeding does not use your AI quota');
  process.exit(1);
}

const text = 'Junior Data Analyst at a 10-person D2C startup (SQL, Excel, dashboards)';
const ownerKey = crypto.randomBytes(16).toString('hex');
const names = ['Aarav Sharma', 'Priya Nair', 'Rohan Mehta', 'Sneha Iyer', 'Imran Khan'];
const candidateProfiles = [
  { headline: 'Aspiring data analyst', college: 'Maharaja Sayajirao University of Baroda', city: 'Vadodara' },
  { headline: 'Business analytics graduate', college: 'Savitribai Phule Pune University', city: 'Pune' },
  { headline: 'Junior data analyst', college: 'Devi Ahilya Vishwavidyalaya', city: 'Indore' },
  { headline: 'Statistics and reporting enthusiast', college: 'University of Mysore', city: 'Mysuru' },
  { headline: 'SQL and dashboard learner', college: 'Dr. Babasaheb Ambedkar Marathwada University', city: 'Aurangabad' },
];
const candidates = [
  {
    answer: 'Because duplicate order IDs can distort totals, I would use SQL to flag duplicates before comparing weekly revenue. I would assume each order timestamp uses the same timezone and verify that assumption with a small example. I would measure revenue and repeat purchases against a four-week baseline, then segment by product and promotion. The main trade-off is speed versus validating every anomaly, so I would check the largest changes first. I would report the risk of missing rare errors before recommending a campaign change.',
    spoken: [
      'I would compare the duplicate rate before and after the SQL cleanup, because that shows whether the total changed for a real reason.',
      'For example, I would check a few source orders and confirm the timezone assumption before trusting the weekly baseline.',
      'The trade-off is spending more time on edge cases, but I would measure the largest product changes and report the risk clearly.',
    ],
  },
  {
    answer: 'First I would check nulls, duplicates, refunds, and SKU joins, because one bad join can multiply revenue. For example, I would compare ten orders against the source export before trusting the query. I would measure weekly conversion and average order value against the prior four-week baseline, then split the result by campaign. I assume campaign tags are complete, so I would validate several records and document missing tags. The trade-off is a fast dashboard versus a careful cohort cut; I would show both and flag the risk before recommending spend.',
    spoken: [
      'I would validate the join with source rows, because a duplicated SKU could inflate the revenue trend.',
      'My assumption is that campaign tags are complete, and I would check missing values before comparing cohorts.',
      'I would measure the same four-week baseline and explain the trade-off between a quick chart and a careful cohort view.',
    ],
  },
  {
    answer: 'I would group order totals by product and week. Then a dashboard can show the founders a basic trend. I would check one total in Excel against the SQL output. A promotion or stock change could explain a weekly difference. I would measure sales against the prior week before sharing the chart.',
    spoken: [
      'I would check a few order rows in Excel to make sure the weekly chart matches the source table.',
      'If revenue changes sharply, I would ask the founders whether promotions or inventory changed that week.',
      'I would update the dashboard after confirming the product grouping and explaining the trend in simple terms.',
    ],
  },
  {
    answer: 'SQL totals could be grouped by week. An Excel chart could show product changes to the founders. I would check the SQL total against the source sheet. The main risk is a promotion changing totals, and I have not checked that yet.',
    spoken: [
      'I would compare one product total with the SQL output before sharing the chart.',
      'If a weekly value changed, I would ask whether a promotion or stock issue could explain it.',
      'I would make the result clear for the founders and correct the Excel chart if the total was wrong.',
    ],
  },
  {
    answer: 'The SQL gives totals. I put them in a chart. The dashboard looks fine. I do not know why sales changed.',
    spoken: [
      'I would explain that I am unsure how to validate the chart without more guidance.',
      'I would ask someone to check the sales sheet before I shared a conclusion.',
      'I would describe the chart in simple words, but I do not know which SQL check to run.',
    ],
  },
];

function makeBadge(submission, challenge) {
  const badge = {
    badgeId: `PI-${crypto.randomBytes(2).toString('hex').toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
    name: submission.name,
    skill: challenge.skill,
    level: submission.score.total >= 85 ? 'Advanced' : 'Intermediate',
    total: submission.score.total,
    issuedAt: new Date().toISOString(),
    authenticity: submission.score.authenticity?.level || null,
    mentor: submission.mentor?.name ? { name: submission.mentor.name, note: submission.mentor.note || '' } : null,
    challengeTitle: challenge.title,
    criteria: submission.score.criteria.map(({ name, weight, points, why }) => ({ name, weight, points, why })),
  };
  badge.signature = signBadge(badge);
  return badge;
}

try {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/proveit');
  const generated = await generateChallenge({ mode: 'job', text });
  const challenge = await Challenge.create({
    ...generated,
    mode: 'job',
    posterName: 'Demo Startup',
    sourceText: text,
    status: 'live',
    ownerKeyHash: hashSecret(ownerKey),
  });
  const startedAt = new Date(Date.now() - 40 * 60 * 1000);
  const deadline = new Date(Date.now() - 10 * 60 * 1000);
  const submissions = [];
  const users = await Promise.all(names.map(async (name, index) => {
    const email = `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`;
    const profile = candidateProfiles[index];
    return User.findOneAndUpdate(
      { email },
      { $set: { name, email, passwordHash: hashPassword('demo12345'), ...profile, showOnLeaderboard: true } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  }));

  for (let index = 0; index < candidates.length; index++) {
    const { answer, spoken } = candidates[index];
    const qa = spoken.map((a, questionIndex) => ({
      q: [
        'How would you validate that part of your approach?',
        'What assumption or risk would you check first?',
        'How would you explain the result to the founders?',
      ][questionIndex],
      a,
    }));
    const submission = new Submission({
      challengeId: challenge._id,
      userId: users[index]._id,
      name: names[index],
      email: `${names[index].toLowerCase().replace(/\s+/g, '.')}@example.com`,
      startedAt,
      deadline,
      answer,
      questions: qa.map(({ q }) => q),
      qa,
      status: 'graded',
      late: true,
      shortlisted: false,
      badgeBreakdownPublic: false,
    });
    submission.score = await gradeSubmission(challenge, answer, qa);
    if (submission.score.total >= 70) {
      submission.badge = makeBadge(submission, challenge);
      submission.badgeId = submission.badge.badgeId;
    }
    submissions.push(submission);
  }

  submissions.sort((left, right) => right.score.total - left.score.total);
  const best = submissions[0];
  best.mentor = { name: 'A. Sharma', note: 'Strong reasoning and clear trade-offs.', at: new Date() };
  if (best.badge) {
    best.badge.mentor = { name: best.mentor.name, note: best.mentor.note };
    best.badge.signature = signBadge(best.badge);
    best.markModified('badge');
  }
  submissions[1].shortlisted = true;
  await Promise.all(submissions.map((submission) => submission.save()));

  for (const submission of submissions) {
    console.log(`${submission.name}: ${submission.score.total} — ${submission.badgeId || 'no badge'}`);
  }
  console.log(`Challenge ID: ${challenge.id}`);
  console.log(`Owner key: ${ownerKey}`);
  console.log(`Candidate link: /c/${challenge.id}`);
  console.log(`Dashboard path: /dashboard/${challenge.id}`);
  console.log(`Paste this once in the frontend browser console: localStorage.setItem("pi_owner_${challenge.id}", JSON.stringify("${ownerKey}"))`);
  console.log('Demo candidate login: aarav.sharma@example.com / demo12345');
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
