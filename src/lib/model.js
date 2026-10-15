// Data model for ClassLens: factories, validation and safe copies.
//
// Quiz      { id, title, description, grade, subject, chapter, timeLimit, status,
//             isSample, questions[], createdAt, updatedAt, publishedAt, origin }
// Question  { id, prompt, options[{ id, text }], correctOptionId, explanation,
//             topic, optionNotes{ [optionId]: string } }
// Attempt   { id, quizId, quizTitle, studentName, isSample, startedAt, submittedAt,
//             durationSeconds, timedOut, responses[] }  (see scoring.js)
//
// Every entity uses a stable string ID. Array positions are never used as identifiers.

export const MIN_OPTIONS = 4;
export const MAX_OPTIONS = 6;
export const MAX_TIME_LIMIT = 180;

export const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export const SUGGESTED_TOPICS = [
  'Variables & Data Types',
  'Operators & Expressions',
  'Input & Output',
  'Conditional Statements',
  'Loops',
  'Arrays & Lists',
  'Strings',
  'Functions',
  'Algorithms & Flowcharts',
  'Computer Fundamentals',
  'Networking & Internet',
  'Cyber Safety',
  'HTML & Web Pages',
  'Databases & SQL',
];

export function uid(prefix = 'id') {
  let rand;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    rand = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  } else {
    rand = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
  }
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}

export function nowIso() {
  return new Date().toISOString();
}

/** Normalised key used to group topic tags: "  Loops " and "loops" are the same topic. */
export function topicKey(topic) {
  return String(topic ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function createOption(text = '') {
  return { id: uid('opt'), text };
}

export function createQuestion(topic = '') {
  return {
    id: uid('q'),
    prompt: '',
    options: Array.from({ length: MIN_OPTIONS }, () => createOption()),
    correctOptionId: null,
    explanation: '',
    topic,
    optionNotes: {},
  };
}

export function createQuiz() {
  const now = nowIso();
  return {
    id: uid('quiz'),
    title: '',
    description: '',
    grade: '',
    subject: 'Computer Science',
    chapter: '',
    timeLimit: null,
    status: 'draft',
    isSample: false,
    questions: [createQuestion()],
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
    origin: null,
  };
}

/** Copy a question with fresh IDs for the question and every option. */
export function cloneQuestion(question) {
  const idMap = {};
  const options = question.options.map((o) => {
    const id = uid('opt');
    idMap[o.id] = id;
    return { id, text: o.text };
  });
  const optionNotes = {};
  for (const [oldId, note] of Object.entries(question.optionNotes || {})) {
    if (idMap[oldId] && note) optionNotes[idMap[oldId]] = note;
  }
  return {
    id: uid('q'),
    prompt: question.prompt,
    options,
    correctOptionId: question.correctOptionId ? idMap[question.correctOptionId] ?? null : null,
    explanation: question.explanation,
    topic: question.topic,
    optionNotes,
  };
}

/** Copy a quiz as a new, unpublished draft. Attempts are never copied. */
export function cloneQuiz(quiz, overrides = {}) {
  const now = nowIso();
  return {
    ...quiz,
    id: uid('quiz'),
    title: quiz.title ? `Copy of ${quiz.title}` : 'Copy of untitled quiz',
    status: 'draft',
    isSample: false,
    questions: quiz.questions.map(cloneQuestion),
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
    origin: { type: 'copy', fromQuizId: quiz.id, fromTitle: quiz.title, createdAt: now },
    ...overrides,
  };
}

export function quizTopics(quiz) {
  const seen = new Map();
  for (const q of quiz.questions) {
    const key = topicKey(q.topic);
    if (key && !seen.has(key)) seen.set(key, q.topic.trim());
  }
  return [...seen.values()];
}

function isBlank(value) {
  return !String(value ?? '').trim();
}

/**
 * Validate a quiz for publishing.
 * Returns { valid, errors: { [fieldKey]: message }, list: [{ key, message, questionId }], warnings: [...] }.
 * Field keys: 'title', 'grade', 'subject', 'chapter', 'timeLimit', 'questions',
 * 'q:<id>:prompt', 'q:<id>:options', 'q:<id>:opt:<optionId>', 'q:<id>:correct', 'q:<id>:topic'.
 */
export function validateQuiz(quiz) {
  const errors = {};
  const list = [];
  const warnings = [];
  const add = (key, message, questionId = null) => {
    if (!errors[key]) {
      errors[key] = message;
      list.push({ key, message, questionId });
    }
  };

  if (isBlank(quiz.title)) add('title', 'Add a quiz title.');
  else if (quiz.title.trim().length > 120) add('title', 'Keep the title under 120 characters.');
  if (isBlank(quiz.grade)) add('grade', 'Choose the class or grade.');
  if (isBlank(quiz.subject)) add('subject', 'Add the subject.');
  if (isBlank(quiz.chapter)) add('chapter', 'Add the topic or chapter this quiz covers.');
  if (quiz.timeLimit !== null && quiz.timeLimit !== undefined && quiz.timeLimit !== '') {
    const t = Number(quiz.timeLimit);
    if (!Number.isInteger(t) || t < 1 || t > MAX_TIME_LIMIT) {
      add('timeLimit', `Time limit must be a whole number of minutes from 1 to ${MAX_TIME_LIMIT}, or left empty.`);
    }
  }
  if (!quiz.questions.length) add('questions', 'Add at least one question.');

  quiz.questions.forEach((q, index) => {
    const n = index + 1;
    if (isBlank(q.prompt)) add(`q:${q.id}:prompt`, `Question ${n}: write the question.`, q.id);
    if (q.options.length < MIN_OPTIONS) {
      add(`q:${q.id}:options`, `Question ${n}: needs at least ${MIN_OPTIONS} answer options.`, q.id);
    }
    const seenText = new Map();
    q.options.forEach((o, oi) => {
      if (isBlank(o.text)) {
        add(`q:${q.id}:opt:${o.id}`, `Question ${n}: option ${OPTION_LETTERS[oi]} is empty.`, q.id);
        return;
      }
      const norm = o.text.trim().toLowerCase();
      if (seenText.has(norm)) {
        add(`q:${q.id}:opt:${o.id}`, `Question ${n}: option ${OPTION_LETTERS[oi]} repeats option ${OPTION_LETTERS[seenText.get(norm)]}.`, q.id);
      } else {
        seenText.set(norm, oi);
      }
    });
    if (!q.correctOptionId || !q.options.some((o) => o.id === q.correctOptionId)) {
      add(`q:${q.id}:correct`, `Question ${n}: mark the correct answer.`, q.id);
    }
    if (isBlank(q.topic)) add(`q:${q.id}:topic`, `Question ${n}: add a topic tag (for example "Loops").`, q.id);
    if (isBlank(q.explanation)) warnings.push({ key: `q:${q.id}:explanation`, message: `Question ${n} has no explanation. Students see explanations after submitting.`, questionId: q.id });
  });

  return { valid: list.length === 0, errors, list, warnings };
}

/** True if the question has no content yet (safe to delete without asking). */
export function isQuestionEmpty(q) {
  return isBlank(q.prompt) && q.options.every((o) => isBlank(o.text)) && isBlank(q.explanation);
}
