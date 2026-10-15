// Build a follow-up quiz from weak topics by re-using questions that already exist
// in the teacher's quizzes. ClassLens does not write new questions itself.

import { cloneQuestion, createQuiz, topicKey } from './model.js';

const MAX_QUESTIONS = 10;

function promptKey(prompt) {
  return String(prompt || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * @param topics     [{ key, name }] weak topics, highest priority first
 * @param quizzes    all quizzes (the question bank)
 * @param questionStats analysis.questions (used to put the most-missed questions first)
 * @returns null if no usable questions exist, otherwise { quiz, count, perTopic: [{ name, count }], sourceQuizCount }
 */
export function buildFollowUpQuiz(topics, quizzes, questionStats = []) {
  const wanted = new Map(topics.map((t) => [t.key, { ...t, pool: [] }]));
  const statByKey = new Map(questionStats.map((s) => [`${s.quizId}::${s.questionId}`, s]));
  const seenPrompts = new Set();

  for (const quiz of quizzes) {
    for (const q of quiz.questions) {
      const bucket = wanted.get(topicKey(q.topic));
      if (!bucket) continue;
      const complete = q.prompt.trim() && q.correctOptionId && q.options.every((o) => o.text.trim());
      const pk = promptKey(q.prompt);
      if (!complete || seenPrompts.has(pk)) continue;
      seenPrompts.add(pk);
      const stat = statByKey.get(`${quiz.id}::${q.id}`);
      bucket.pool.push({ question: q, quizId: quiz.id, accuracy: stat?.accuracy ?? null, quiz });
    }
  }

  for (const bucket of wanted.values()) {
    // Most-missed questions first; questions nobody has answered yet go last.
    bucket.pool.sort((a, b) => (a.accuracy ?? 101) - (b.accuracy ?? 101));
  }

  const picked = [];
  const buckets = [...wanted.values()];
  let added = true;
  while (picked.length < MAX_QUESTIONS && added) {
    added = false;
    for (const bucket of buckets) {
      if (picked.length >= MAX_QUESTIONS) break;
      const next = bucket.pool.shift();
      if (next) {
        picked.push({ ...next, topicName: bucket.name });
        added = true;
      }
    }
  }
  if (!picked.length) return null;

  const names = topics.filter((t) => picked.some((p) => topicKey(p.question.topic) === t.key)).map((t) => t.name);
  const sourceQuizzes = [...new Set(picked.map((p) => p.quizId))].map((id) => picked.find((p) => p.quizId === id).quiz);
  const mostCommon = (field) => {
    const counts = new Map();
    for (const q of sourceQuizzes) if (q[field]) counts.set(q[field], (counts.get(q[field]) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  };

  const base = createQuiz();
  const dateText = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const quiz = {
    ...base,
    title: `Follow-up: ${names.join(', ')}`.slice(0, 120),
    description: `A short follow-up check on topics flagged by the learning-gap analysis on ${dateText}. Answer every question and read the explanations after submitting.`,
    grade: mostCommon('grade'),
    subject: mostCommon('subject') || 'Computer Science',
    chapter: `Revision — ${names.join(', ')}`.slice(0, 120),
    questions: picked.map((p) => cloneQuestion(p.question)),
    origin: { type: 'follow-up', topics: names, createdAt: base.createdAt },
  };

  return {
    quiz,
    count: picked.length,
    perTopic: names.map((name) => ({ name, count: picked.filter((p) => p.topicName === name).length })),
    sourceQuizCount: sourceQuizzes.length,
  };
}
