import mongoose from 'mongoose';
import crypto from 'crypto';

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
    ownerKey: { type: String, default: () => crypto.randomBytes(12).toString('hex') },
  },
  { timestamps: true },
);

const submissionSchema = new Schema(
  {
    challengeId: { type: Schema.Types.ObjectId, ref: 'Challenge', index: true },
    name: String,
    email: String,
    startedAt: Date,
    deadline: Date,
    late: { type: Boolean, default: false },
    answer: { type: String, default: '' },
    questions: [String],
    qa: [{ _id: false, q: String, a: String }],
    status: { type: String, enum: ['started', 'answered', 'graded'], default: 'started' },
    score: Schema.Types.Mixed,
    shortlisted: { type: Boolean, default: false },
    rereviewRequested: { type: Boolean, default: false },
    mentor: { name: String, note: String, at: Date },
    badge: Schema.Types.Mixed,
    badgeId: { type: String, index: true, sparse: true },
  },
  { timestamps: true },
);

export const Challenge = mongoose.models.Challenge || mongoose.model('Challenge', challengeSchema);
export const Submission = mongoose.models.Submission || mongoose.model('Submission', submissionSchema);
