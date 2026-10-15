// Logic tests for ClassLens. Run with: npm test
// Uses only Node's built-in assert module. Imports the real modules from src/lib.

import assert from 'node:assert/strict';
import { MIN_OPTIONS, cloneQuiz, createQuiz, topicKey, validateQuiz } from '../src/lib/model.js';
import { gradeAttempt, pct, summarizeAttempt } from '../src/lib/scoring.js';
import { analyse, beforeAfter, masteryFor } from '../src/lib/analysis.js';
import { buildFollowUpQuiz } from '../src/lib/followUp.js';
import { suggestionsFor } from '../src/lib/teachingLibrary.js';
import { SAMPLE_QUIZ_ID } from '../src/lib/sampleData.js';
import { STORAGE_KEY, loadState, sanitizeState, saveState, seededState } from '../src/lib/storage.js';

const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
    console.log(`  PASS  ${name}`);
  } catch (err) {
    results.push({ name, ok: false, err });
    console.log(`  FAIL  ${name}\n        ${String(err.message).split('\n').join('\n        ')}`);
  }
}

const near = (actual, expected, msg) => assert.ok(Math.abs(actual - expected) < 0.01, `${msg}: expected ≈${expected}, got ${actual}`);

// ---- helpers -------------------------------------------------------------

function makeQuestion(id, topic, texts, correct, prompt) {
  const options = texts.map((text, i) => ({ id: `${id}-o${i}`, text }));
  return {
    id,
    prompt: prompt ?? `Prompt for ${id}`,
    topic,
    options,
    correctOptionId: correct === null ? null : options[correct].id,
    explanation: `Explanation for ${id}.`,
    optionNotes: {},
  };
}

function makeQuiz(id, questions, extra = {}) {
  return {
    ...createQuiz(),
    id,
    title: `Quiz ${id}`,
    grade: 'Class 9',
    subject: 'Computer Science',
    chapter: 'Programming basics',
    status: 'published',
    questions,
    ...extra,
  };
}

const ABCD = ['Option A', 'Option B', 'Option C', 'Option D'];

// ---- 1. The required workflow, at logic level ------------------------------

console.log('\nRequired workflow');

test('create a 3-topic quiz, publish, grade 1 correct / 1 incorrect / 1 unanswered, gaps reflect it', () => {
  const quiz = makeQuiz('wf', [
    makeQuestion('wq1', 'Loops', ABCD, 2),
    makeQuestion('wq2', 'Functions', ABCD, 0),
    makeQuestion('wq3', 'Arrays & Lists', ABCD, 1),
  ]);
  assert.equal(validateQuiz(quiz).valid, true, 'quiz should be publishable');

  const attempt = gradeAttempt(quiz, { wq1: 'wq1-o2', wq2: 'wq2-o3' }, { studentName: 'Test student' });
  assert.equal(attempt.quizId, 'wf');
  assert.ok(attempt.id && attempt.submittedAt, 'attempt has id and timestamp');
  assert.equal(attempt.responses.length, 3);

  const s = summarizeAttempt(attempt);
  assert.equal(s.score, 1);
  assert.equal(s.total, 3);
  assert.equal(s.incorrect, 1);
  assert.equal(s.unanswered, 1);
  near(s.percentage, 33.333, 'percentage');

  const a = analyse([attempt], [quiz]);
  const byName = Object.fromEntries(a.topics.map((t) => [t.name, t]));
  assert.equal(byName.Loops.accuracy, 100);
  assert.equal(byName.Functions.accuracy, 0);
  assert.equal(byName['Arrays & Lists'].accuracy, 0);
  assert.equal(byName['Arrays & Lists'].unanswered, 1);
  assert.deepEqual(a.gaps.map((g) => g.name).sort(), ['Arrays & Lists', 'Functions']);
  assert.ok(a.gaps.every((g) => g.priority === 'high'));
  assert.ok(a.gaps.every((g) => g.limitedEvidence), 'one answer per topic is limited evidence');
  assert.deepEqual(a.strengths.map((t) => t.name), ['Loops']);
  assert.equal(a.misconceptions.length, 1, 'the single wrong answer is 100% of answers to that question');
});

// ---- 2. Grading -----------------------------------------------------------

console.log('\nGrading');

test('an option id that does not belong to the question counts as unanswered', () => {
  const quiz = makeQuiz('g1', [makeQuestion('gq1', 'Loops', ABCD, 0)]);
  const att = gradeAttempt(quiz, { gq1: 'not-an-option' });
  assert.equal(att.responses[0].selectedOptionId, null);
  assert.equal(att.responses[0].isCorrect, false);
  assert.equal(summarizeAttempt(att).unanswered, 1);
});

test('editing the quiz after an attempt does not change the recorded attempt', () => {
  const quiz = makeQuiz('g2', [makeQuestion('gq1', 'Loops', ABCD, 0), makeQuestion('gq2', 'Strings', ABCD, 1)]);
  const att = gradeAttempt(quiz, { gq1: 'gq1-o0', gq2: 'gq2-o0' });
  const edited = structuredClone(quiz);
  edited.questions[0].correctOptionId = 'gq1-o3';
  edited.questions[0].topic = 'Functions';
  edited.questions[0].options[0].text = 'Changed text';
  edited.title = 'Renamed quiz';

  const s = summarizeAttempt(att);
  assert.equal(s.score, 1, 'score uses the answer key the student saw');
  const a = analyse([att], [edited]);
  const loops = a.topics.find((t) => t.name === 'Loops');
  assert.equal(loops.correct, 1);
  assert.equal(loops.total, 1);
  assert.equal(att.responses[0].options[0].text, 'Option A');
});

test('duplicating a quiz leaves attempts linked to the original only', () => {
  const quiz = makeQuiz('g3', [makeQuestion('gq1', 'Loops', ABCD, 0)]);
  const att = gradeAttempt(quiz, { gq1: 'gq1-o0' });
  const copy = cloneQuiz(quiz);
  const all = [quiz, copy];
  assert.equal(analyse([att], all, { quizId: quiz.id }).attempts.length, 1);
  assert.equal(analyse([att], all, { quizId: copy.id }).attempts.length, 0);
});

test('pct and mastery bands', () => {
  assert.equal(pct(null), '—');
  assert.equal(pct(59.1666), '59%');
  assert.equal(masteryFor(null), 'none');
  assert.equal(masteryFor(75), 'secure');
  assert.equal(masteryFor(74.9), 'developing');
  assert.equal(masteryFor(50), 'developing');
  assert.equal(masteryFor(49.9), 'attention');
});

// ---- 3. Sample data analysis ------------------------------------------------

console.log('\nSample data analysis');

const seeded = seededState(new Date('2026-03-10T12:00:00Z'));

test('sample: 10 questions, 12 fictional attempts, all flagged as sample', () => {
  assert.equal(seeded.quizzes.length, 1);
  assert.equal(seeded.quizzes[0].id, SAMPLE_QUIZ_ID);
  assert.equal(seeded.quizzes[0].questions.length, 10);
  assert.equal(seeded.attempts.length, 12);
  assert.ok(seeded.quizzes[0].isSample);
  assert.ok(seeded.attempts.every((a) => a.isSample && a.studentName.startsWith('Sample Student')));
  assert.equal(validateQuiz(seeded.quizzes[0]).valid, true);
});

test('sample: average score and topic accuracy match a hand count of the answer grid', () => {
  const a = analyse(seeded.attempts, seeded.quizzes);
  assert.equal(a.responsesCount, 120);
  near(a.averageScore, 59.1667, 'average score (71 of 120 correct)');
  const expected = {
    'Variables & Data Types': [19, 24],
    'Conditional Statements': [15, 24],
    Loops: [9, 24],
    'Arrays & Lists': [13, 24],
    Functions: [15, 24],
  };
  for (const [name, [correct, total]] of Object.entries(expected)) {
    const t = a.topics.find((x) => x.name === name);
    assert.ok(t, `topic ${name} present`);
    assert.equal(t.correct, correct, `${name} correct`);
    assert.equal(t.total, total, `${name} total`);
  }
  assert.equal(a.topics[0].name, 'Loops', 'weakest topic first');
});

test('sample: gaps, priorities and strengths', () => {
  const a = analyse(seeded.attempts, seeded.quizzes);
  assert.deepEqual(
    a.gaps.map((g) => [g.name, g.priority]),
    [
      ['Loops', 'high'],
      ['Arrays & Lists', 'medium'],
      ['Conditional Statements', 'medium'],
      ['Functions', 'medium'],
    ],
  );
  assert.deepEqual(a.strengths.map((t) => t.name), ['Variables & Data Types']);
  assert.ok(a.gaps.every((g) => g.evidence.length >= 2 && g.suggestions.explain));
});

test('sample: misconceptions are wrong options chosen by at least 30% of answers', () => {
  const a = analyse(seeded.attempts, seeded.quizzes);
  const got = a.misconceptions.map((m) => `${m.question.questionId}|${m.option.text}|${m.count}`).sort();
  assert.deepEqual(
    got,
    [
      'sample-q10|The value the function returns|4',
      'sample-q4|=|4',
      'sample-q5|1 time|6',
      'sample-q6|5|6',
      'sample-q7|56|6',
    ].sort(),
  );
});

test('excluding sample data leaves nothing to analyse (no invented results)', () => {
  const a = analyse(seeded.attempts, seeded.quizzes, { includeSample: false });
  assert.equal(a.attempts.length, 0);
  assert.equal(a.averageScore, null);
  assert.equal(a.topics.length, 0);
  assert.equal(a.gaps.length, 0);
});

test('topics with no answers are "not assessed", never gaps or strengths', () => {
  const quiz = makeQuiz('ua', [makeQuestion('uq1', 'Networking & Internet', ABCD, 0)]);
  const a = analyse([], [quiz]);
  assert.equal(a.unassessed.length, 1);
  assert.equal(a.unassessed[0].accuracy, null);
  assert.equal(a.unassessed[0].mastery, 'none');
  assert.equal(a.gaps.length, 0);
  assert.equal(a.strengths.length, 0);
});

test('topic tags are grouped ignoring case and extra spaces', () => {
  assert.equal(topicKey('  Loops  '), topicKey('loops'));
  const q1 = makeQuiz('t1', [makeQuestion('a', 'Loops', ABCD, 0)]);
  const q2 = makeQuiz('t2', [makeQuestion('b', '  loops ', ABCD, 0)]);
  const a = analyse([gradeAttempt(q1, { a: 'a-o0' }), gradeAttempt(q2, { b: 'b-o1' })], [q1, q2]);
  assert.equal(a.topics.length, 1);
  assert.equal(a.topics[0].total, 2);
  assert.equal(a.topics[0].accuracy, 50);
});

// ---- 4. Quiz validation and copying -----------------------------------------

console.log('\nQuiz builder rules');

test('a new blank quiz cannot be published', () => {
  const v = validateQuiz(createQuiz());
  assert.equal(v.valid, false);
  for (const key of ['title', 'grade', 'chapter']) assert.ok(v.errors[key], `error for ${key}`);
  assert.ok(v.list.some((e) => e.key.endsWith(':prompt')));
  assert.ok(v.list.some((e) => e.key.endsWith(':correct')));
  assert.ok(v.list.some((e) => e.key.endsWith(':topic')));
});

test('validation catches duplicate options, bad time limits, and warns on missing explanations', () => {
  const q = makeQuestion('v1', 'Loops', ['Same', 'same ', 'C', 'D'], 0);
  q.explanation = '';
  for (const bad of [0, 181, 1.5, 'abc']) {
    assert.ok(validateQuiz(makeQuiz('v', [makeQuestion('ok', 'Loops', ABCD, 0)], { timeLimit: bad })).errors.timeLimit, `time limit ${bad}`);
  }
  assert.equal(validateQuiz(makeQuiz('v', [makeQuestion('ok', 'Loops', ABCD, 0)], { timeLimit: null })).valid, true);
  const v = validateQuiz(makeQuiz('v', [q]));
  assert.ok(v.errors['q:v1:opt:v1-o1'], 'duplicate option text');
  assert.equal(v.warnings.length, 1);
  const three = makeQuestion('v3', 'Loops', ['A', 'B', 'C'], 0);
  assert.ok(validateQuiz(makeQuiz('v', [three])).errors['q:v3:options'], `needs ${MIN_OPTIONS} options`);
});

test('duplicating a quiz gives fresh ids, keeps the answer key, and starts as a draft', () => {
  const original = makeQuiz('c1', [makeQuestion('cq1', 'Loops', ABCD, 2)]);
  original.questions[0].optionNotes = { 'cq1-o1': 'off-by-one' };
  const before = structuredClone(original);
  const copy = cloneQuiz(original);
  assert.notEqual(copy.id, original.id);
  assert.equal(copy.status, 'draft');
  assert.equal(copy.title, 'Copy of Quiz c1');
  assert.equal(copy.origin.type, 'copy');
  const cq = copy.questions[0];
  assert.notEqual(cq.id, 'cq1');
  assert.ok(cq.options.every((o, i) => o.id !== original.questions[0].options[i].id && o.text === original.questions[0].options[i].text));
  assert.equal(cq.options.find((o) => o.id === cq.correctOptionId).text, 'Option C');
  assert.equal(cq.optionNotes[cq.options[1].id], 'off-by-one');
  assert.deepEqual(original, before, 'original is not modified');
});

// ---- 5. Follow-up quiz --------------------------------------------------------

console.log('\nFollow-up quiz');

test('re-uses existing questions only, most-missed first, alternating topics', () => {
  const a = analyse(seeded.attempts, seeded.quizzes);
  const topics = a.gaps.filter((g) => g.name === 'Loops' || g.name === 'Arrays & Lists').map((g) => ({ key: g.key, name: g.name }));
  const r = buildFollowUpQuiz(topics, seeded.quizzes, a.questions);
  assert.ok(r);
  assert.equal(r.count, 4);
  assert.equal(r.quiz.status, 'draft');
  assert.equal(r.quiz.origin.type, 'follow-up');
  const source = seeded.quizzes[0].questions;
  const sourceIdOf = (q) => source.find((s) => s.prompt === q.prompt)?.id;
  assert.deepEqual(r.quiz.questions.map(sourceIdOf), ['sample-q5', 'sample-q7', 'sample-q6', 'sample-q8']);
  const sourceIds = new Set(source.flatMap((q) => [q.id, ...q.options.map((o) => o.id)]));
  for (const q of r.quiz.questions) {
    assert.ok(!sourceIds.has(q.id), 'fresh question id');
    assert.ok(q.options.every((o) => !sourceIds.has(o.id)), 'fresh option ids');
    const src = source.find((s) => s.id === sourceIdOf(q));
    const srcCorrect = src.options.find((o) => o.id === src.correctOptionId).text;
    assert.equal(q.options.find((o) => o.id === q.correctOptionId).text, srcCorrect, 'answer key preserved');
  }
  assert.equal(validateQuiz(r.quiz).valid, true, 'follow-up quiz is ready to publish');
});

test('caps at 10 questions, skips duplicates and incomplete questions, returns null when nothing fits', () => {
  const many = Array.from({ length: 14 }, (_, i) => makeQuestion(`m${i}`, 'Loops', ABCD, 0, `Loop question ${i}`));
  many.push(makeQuestion('dup', 'Loops', ABCD, 0, 'Loop question 0'));
  const incomplete = makeQuestion('inc', 'Strings', ABCD, null, 'No answer key yet');
  const bank = [makeQuiz('bank', [...many, incomplete])];
  const r = buildFollowUpQuiz([{ key: 'loops', name: 'Loops' }], bank, []);
  assert.equal(r.count, 10);
  assert.equal(new Set(r.quiz.questions.map((q) => q.prompt)).size, 10);
  assert.equal(buildFollowUpQuiz([{ key: 'strings', name: 'Strings' }], bank, []), null);
  assert.equal(buildFollowUpQuiz([{ key: 'databases & sql', name: 'Databases & SQL' }], bank, []), null);
});

// ---- 6. Before / after -------------------------------------------------------

console.log('\nRevision tracking');

test('beforeAfter splits answers on a topic at the date it was marked done', () => {
  const quiz = makeQuiz('ba', [makeQuestion('b1', 'Loops', ABCD, 0), makeQuestion('b2', 'Strings', ABCD, 0)]);
  const early = gradeAttempt(quiz, { b1: 'b1-o1', b2: 'b2-o0' }, { submittedAt: '2026-01-01T10:00:00.000Z' });
  const early2 = gradeAttempt(quiz, { b1: 'b1-o0' }, { submittedAt: '2026-01-01T11:00:00.000Z' });
  const late = gradeAttempt(quiz, { b1: 'b1-o0' }, { submittedAt: '2026-01-03T10:00:00.000Z' });
  const r = beforeAfter([early, early2, late], 'loops', '2026-01-02T00:00:00.000Z', true);
  assert.deepEqual(r.before, { correct: 1, total: 2, accuracy: 50 });
  assert.deepEqual(r.after, { correct: 1, total: 1, accuracy: 100 });
  const none = beforeAfter([early], 'loops', '2026-01-02T00:00:00.000Z', true);
  assert.equal(none.after.total, 0);
  assert.equal(none.after.accuracy, null);
});

test('teaching library matches common topics and falls back to a general plan', () => {
  assert.equal(suggestionsFor('Loops').libraryName, 'Loops');
  assert.equal(suggestionsFor('For loops').libraryName, 'Loops');
  assert.equal(suggestionsFor('Arrays & Lists').libraryName, 'Arrays & Lists');
  assert.equal(suggestionsFor('Conditional Statements').libraryName, 'Conditional Statements');
  assert.equal(suggestionsFor('Variables & Data Types').libraryName, 'Variables & Data Types');
  assert.equal(suggestionsFor('Functions').libraryName, 'Functions');
  const general = suggestionsFor('Photosynthesis');
  assert.equal(general.source, 'general');
  assert.ok(general.explain && general.task && general.followUp);
});

// ---- 7. Storage and malformed data -------------------------------------------

console.log('\nStorage and malformed data');

test('saved data that is not an object is rejected', () => {
  for (const bad of [null, undefined, 42, 'text', [1, 2]]) assert.throws(() => sanitizeState(bad));
});

test('malformed quizzes, attempts and settings are repaired or dropped', () => {
  const raw = {
    quizzes: [
      null,
      42,
      'text',
      {
        id: 'qz1',
        title: 'Broken',
        status: 'published',
        timeLimit: 'abc',
        questions: [{ prompt: 'P', options: ['a', 'b'], correctIndex: 1, topic: 'Loops' }, 'junk'],
      },
      { id: 'qz1', title: 'Same id again' },
    ],
    attempts: [
      null,
      { id: 'a1' },
      { id: 'a2', quizId: 'qz1', submittedAt: 'not a date', responses: [{ questionId: 'x', options: [{ id: 'o1', text: 'A' }], correctOptionId: 'o1', selectedOptionId: 'o1' }] },
      { id: 'a3', quizId: 'qz1', submittedAt: '2026-01-01T00:00:00Z', responses: [] },
      {
        id: 'a4',
        quizId: 'qz1',
        submittedAt: '2026-01-01T00:00:00Z',
        durationSeconds: -5,
        responses: [
          { questionId: 'x', topic: ' Loops ', options: [{ id: 'o1', text: 'A' }, { id: 'o2', text: 'B' }], correctOptionId: 'o1', selectedOptionId: 'o2', isCorrect: true },
          { questionId: 'y', options: [{ id: 'o1', text: 'A' }], correctOptionId: 'o1', selectedOptionId: 'zzz', isCorrect: true },
          'junk',
        ],
      },
    ],
    revision: { loops: { status: 'done', completedAt: '2026-01-02T00:00:00Z' }, bad: { status: 'weird' }, worse: 5 },
    settings: { includeSample: 'yes', showGuide: false },
  };
  const s = sanitizeState(raw);
  assert.equal(s.quizzes.length, 1);
  const quiz = s.quizzes[0];
  assert.equal(quiz.title, 'Broken');
  assert.equal(quiz.status, 'draft', 'an invalid "published" quiz is kept as a draft');
  assert.equal(quiz.timeLimit, null);
  assert.equal(quiz.questions.length, 1);
  assert.equal(quiz.questions[0].options.length, MIN_OPTIONS, 'options padded to the minimum');
  assert.equal(quiz.questions[0].correctOptionId, quiz.questions[0].options[1].id, 'old index format converted');

  assert.equal(s.attempts.length, 1);
  const att = s.attempts[0];
  assert.equal(att.id, 'a4');
  assert.equal(att.durationSeconds, 0);
  assert.equal(att.responses.length, 2);
  assert.equal(att.responses[0].isCorrect, false, 'correctness is recomputed, not trusted');
  assert.equal(att.responses[0].topic, 'Loops');
  assert.equal(att.responses[1].selectedOptionId, null);
  assert.equal(att.responses[1].isCorrect, false);

  assert.deepEqual(Object.keys(s.revision), ['loops']);
  assert.equal(s.settings.includeSample, true);
  assert.equal(s.settings.showGuide, false);
});

test('saving and loading round-trips the data unchanged', () => {
  const again = sanitizeState(JSON.parse(JSON.stringify(seeded)));
  assert.deepEqual(again, seeded);
});

test('loadState: first visit, valid data, unreadable data, and blocked storage', () => {
  const store = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
    },
  };
  try {
    const first = loadState();
    assert.equal(first.notice, null);
    assert.equal(first.state.quizzes[0].id, SAMPLE_QUIZ_ID, 'first visit loads labelled sample data');

    const mine = { ...first.state, quizzes: [makeQuiz('mine', [makeQuestion('mq', 'Loops', ABCD, 0)])], attempts: [] };
    assert.equal(saveState(mine), true);
    const loaded = loadState();
    assert.equal(loaded.notice, null);
    assert.deepEqual(loaded.state.quizzes.map((q) => q.id), ['mine']);

    store.set(STORAGE_KEY, '{ this is not json');
    const broken = loadState();
    assert.match(broken.notice, /could not be read/);
    const backupKey = [...store.keys()].find((k) => k.startsWith(`${STORAGE_KEY}:unreadable-backup:`));
    assert.ok(backupKey, 'unreadable data is backed up');
    assert.equal(store.get(backupKey), '{ this is not json');

    store.set(STORAGE_KEY, '"just a string"');
    assert.match(loadState().notice, /could not be read/);

    globalThis.window = {
      localStorage: {
        getItem: () => {
          throw new Error('SecurityError');
        },
        setItem: () => {
          throw new Error('SecurityError');
        },
      },
    };
    const blocked = loadState();
    assert.match(blocked.notice, /blocking local storage/);
    assert.equal(saveState(blocked.state), false);
  } finally {
    delete globalThis.window;
  }
});

// ---- summary ----------------------------------------------------------------

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed, ${results.length} total\n`);
if (failed.length) process.exit(1);
