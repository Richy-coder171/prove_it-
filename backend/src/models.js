import mongoose from 'mongoose';

const { Schema } = mongoose;

const challengeSchema = new Schema(
  {
    mode: { type: String, enum: ['job', 'idea'], default: 'job' },
    posterName: String,
    sourceText: String,
    title: String,
    skill: String,
    level: String,
    timeLimitMin: { type: Number, default: 30 },
    task: String,
    rubric: [{ _id: false, name: String, weight: Number, description: String }],
    seedQuestions: [String],
    status: { type: String, enum: ['draft', 'live'], default: 'draft' },
    ownerKeyHash: { type: String, select: false },
    // Temporary compatibility for legacy records. Middleware migrates a valid key and unsets it.
    ownerKey: { type: String, select: false },
  },
  { timestamps: true },
);

const submissionSchema = new Schema(
  {
    challengeId: { type: Schema.Types.ObjectId, ref: 'Challenge', index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    name: String,
    email: String,
    startedAt: Date,
    deadline: Date,
    late: { type: Boolean, default: false },
    answer: { type: String, default: '' },
    questions: [String],
    qa: [{ _id: false, q: String, a: String }],
    status: { type: String, enum: ['started', 'answered', 'graded', 'expired'], default: 'started' },
    candidateTokenHash: { type: String, select: false },
    score: Schema.Types.Mixed,
    shortlisted: { type: Boolean, default: false },
    rereviewRequested: { type: Boolean, default: false },
    mentor: { name: String, note: String, at: Date },
    badge: Schema.Types.Mixed,
    badgeId: { type: String, index: true, sparse: true },
    badgeStatus: { type: String, enum: ['valid', 'revoked'] },
    badgeRevokedAt: Date,
    badgeEvents: [{ _id: false, type: { type: String }, reason: String, at: Date, total: Number, badgeId: String }],
    scoreOverrides: [{ _id: false, criterion: String, previousPoints: Number, newPoints: Number, note: String, at: Date }],
    badgeBreakdownPublic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const userSchema = new Schema(
  {
    name: String,
    email: { type: String, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, select: false },
    sessions: { type: [{ hash: String, createdAt: Date }], select: false },
    headline: { type: String, default: '' },
    college: { type: String, default: '' },
    city: { type: String, default: '' },
    bio: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    github: { type: String, default: '' },
    showOnLeaderboard: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Challenge = mongoose.models.Challenge || mongoose.model('Challenge', challengeSchema);
export const Submission = mongoose.models.Submission || mongoose.model('Submission', submissionSchema);
export const User = mongoose.models.User || mongoose.model('User', userSchema);
