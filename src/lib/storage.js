// localStorage persistence with defensive loading.
// Data stays in this browser only; it is not synchronised across devices or users.

import { MIN_OPTIONS, MAX_OPTIONS, MAX_TIME_LIMIT, createOption, uid, nowIso, validateQuiz } from './model.js';
import { buildSampleAttempts, buildSampleQuiz } from './sampleData.js';

export const STORAGE_KEY = 'classlens:v1';
export const SCHEMA_VERSION = 1;

export const DEFAULT_SETTINGS = { includeSample: true, showGuide: true };

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const str = (v, fallback = '') => (typeof v === 'string' ? v : typeof v === 'number' && Number.isFinite(v) ? String(v) : fallback);
const iso = (v, fallback) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : fallback);

export function emptyState() {
  return { version: SCHEMA_VERSION, quizzes: [], attempts: [], revision: {}, settings: { ...DEFAULT_SETTINGS } };
}

export function seededState(now = new Date()) {
  const quiz = buildSampleQuiz(now);
  return { ...emptyState(), quizzes: [quiz], attempts: buildSampleAttempts(quiz, now) };
}

function sanitizeOptions(rawOptions) {
  const seen = new Set();
  let options = (Array.isArray(rawOptions) ? rawOptions : [])
    .map((o) => {
      if (typeof o === 'string') return { id: uid('opt'), text: o };
      if (isObj(o)) return { id: str(o.id) || uid('opt'), text: str(o.text) };
      return null;
    })
    .filter(Boolean)
    .slice(0, MAX_OPTIONS)
    .map((o) => {
      const fixed = seen.has(o.id) ? { ...o, id: uid('opt') } : o;
      seen.add(fixed.id);
      return fixed;
    });
  while (options.length < MIN_OPTIONS) options = [...options, createOption()];
  return options;
}

export function sanitizeQuestion(raw) {
  if (!isObj(raw)) return null;
  const options = sanitizeOptions(raw.options);
  let correctOptionId = str(raw.correctOptionId) || null;
  if (correctOptionId && !options.some((o) => o.id === correctOptionId)) correctOptionId = null;
  if (!correctOptionId && Number.isInteger(raw.correctIndex) && options[raw.correctIndex]) {
    correctOptionId = options[raw.correctIndex].id; // older format stored the index
  }
  const optionNotes = {};
  if (isObj(raw.optionNotes)) {
    for (const [k, v] of Object.entries(raw.optionNotes)) {
      if (typeof v === 'string' && v.trim() && options.some((o) => o.id === k)) optionNotes[k] = v;
    }
  }
  return {
    id: str(raw.id) || uid('q'),
    prompt: str(raw.prompt),
    options,
    correctOptionId,
    explanation: str(raw.explanation),
    topic: str(raw.topic),
    optionNotes,
  };
}

export function sanitizeQuiz(raw) {
  if (!isObj(raw)) return null;
  const now = nowIso();
  const seenQ = new Set();
  const questions = (Array.isArray(raw.questions) ? raw.questions : [])
    .map(sanitizeQuestion)
    .filter(Boolean)
    .map((q) => {
      const fixed = seenQ.has(q.id) ? { ...q, id: uid('q') } : q;
      seenQ.add(fixed.id);
      return fixed;
    });
  const t = Number(raw.timeLimit);
  const quiz = {
    id: str(raw.id) || uid('quiz'),
    title: str(raw.title),
    description: str(raw.description),
    grade: str(raw.grade),
    subject: str(raw.subject),
    chapter: str(raw.chapter),
    timeLimit: raw.timeLimit !== null && raw.timeLimit !== '' && Number.isInteger(t) && t >= 1 && t <= MAX_TIME_LIMIT ? t : null,
    status: raw.status === 'published' ? 'published' : 'draft',
    isSample: raw.isSample === true,
    questions,
    createdAt: iso(raw.createdAt, now),
    updatedAt: iso(raw.updatedAt, iso(raw.createdAt, now)),
    publishedAt: iso(raw.publishedAt, null),
    origin: isObj(raw.origin) ? raw.origin : null,
  };
  // A published quiz that no longer passes validation (e.g. outdated data) is kept as a draft.
  if (quiz.status === 'published' && !validateQuiz(quiz).valid) quiz.status = 'draft';
  return quiz;
}

function sanitizeResponse(raw) {
  if (!isObj(raw) || !str(raw.questionId)) return null;
  const options = (Array.isArray(raw.options) ? raw.options : [])
    .filter(isObj)
    .map((o) => ({ id: str(o.id), text: str(o.text) }))
    .filter((o) => o.id);
  const correctOptionId = str(raw.correctOptionId) || null;
  let selectedOptionId = str(raw.selectedOptionId) || null;
  if (selectedOptionId && options.length && !options.some((o) => o.id === selectedOptionId)) selectedOptionId = null;
  const optionNotes = {};
  if (isObj(raw.optionNotes)) {
    for (const [k, v] of Object.entries(raw.optionNotes)) if (typeof v === 'string' && v.trim()) optionNotes[k] = v;
  }
  return {
    questionId: str(raw.questionId),
    prompt: str(raw.prompt),
    topic: str(raw.topic).trim(),
    options,
    correctOptionId,
    selectedOptionId,
    // Correctness is always recomputed from the stored answer key snapshot.
    isCorrect: selectedOptionId !== null && selectedOptionId === correctOptionId,
    explanation: str(raw.explanation),
    optionNotes,
  };
}

export function sanitizeAttempt(raw) {
  if (!isObj(raw) || !str(raw.quizId)) return null;
  const responses = (Array.isArray(raw.responses) ? raw.responses : []).map(sanitizeResponse).filter(Boolean);
  if (!responses.length) return null;
  const submittedAt = iso(raw.submittedAt, null);
  if (!submittedAt) return null;
  const startedAt = iso(raw.startedAt, submittedAt);
  const duration = Number(raw.durationSeconds);
  return {
    id: str(raw.id) || uid('att'),
    quizId: str(raw.quizId),
    quizTitle: str(raw.quizTitle) || 'Untitled quiz',
    studentName: str(raw.studentName) || 'Unnamed student',
    isSample: raw.isSample === true,
    startedAt,
    submittedAt,
    durationSeconds: Number.isFinite(duration) && duration >= 0 ? Math.round(duration) : 0,
    timedOut: raw.timedOut === true,
    responses,
  };
}

const REVISION_STATUSES = ['todo', 'in-progress', 'done'];

function sanitizeRevision(raw) {
  const out = {};
  if (!isObj(raw)) return out;
  for (const [key, v] of Object.entries(raw)) {
    if (!isObj(v) || !REVISION_STATUSES.includes(v.status)) continue;
    const baseline = Number(v.baselineAccuracy);
    out[key] = {
      status: v.status,
      topicName: str(v.topicName) || key,
      updatedAt: iso(v.updatedAt, nowIso()),
      completedAt: v.status === 'done' ? iso(v.completedAt, iso(v.updatedAt, nowIso())) : null,
      baselineAccuracy: Number.isFinite(baseline) ? baseline : null,
    };
  }
  return out;
}

function uniqueById(list) {
  const seen = new Set();
  return list.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function sanitizeState(raw) {
  if (!isObj(raw)) throw new Error('Saved data is not an object');
  const settings = { ...DEFAULT_SETTINGS };
  if (isObj(raw.settings)) {
    if (typeof raw.settings.includeSample === 'boolean') settings.includeSample = raw.settings.includeSample;
    if (typeof raw.settings.showGuide === 'boolean') settings.showGuide = raw.settings.showGuide;
  }
  return {
    version: SCHEMA_VERSION,
    quizzes: uniqueById((Array.isArray(raw.quizzes) ? raw.quizzes : []).map(sanitizeQuiz).filter(Boolean)),
    attempts: uniqueById((Array.isArray(raw.attempts) ? raw.attempts : []).map(sanitizeAttempt).filter(Boolean)),
    revision: sanitizeRevision(raw.revision),
    settings,
  };
}

/**
 * Load saved data. Returns { state, notice } where notice is null or a message for the teacher.
 * First visit → sample data is loaded. Unreadable data → a backup copy is kept and the app starts fresh.
 */
export function loadState() {
  let raw;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return {
      state: seededState(),
      notice: 'This browser is blocking local storage, so changes will be lost when the page is closed. Try a normal (non-private) browser window.',
    };
  }
  if (raw === null) return { state: seededState(), notice: null };
  try {
    return { state: sanitizeState(JSON.parse(raw)), notice: null };
  } catch {
    const backupKey = `${STORAGE_KEY}:unreadable-backup:${Date.now()}`;
    try {
      window.localStorage.setItem(backupKey, raw);
    } catch {
      /* ignore — backup is best effort */
    }
    return {
      state: seededState(),
      notice: `Saved ClassLens data in this browser could not be read, so the app started again with sample data. A copy of the unreadable data was kept under the storage key "${backupKey}".`,
    };
  }
}

export function saveState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
