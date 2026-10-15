// Grading and attempt summaries.
//
// Each attempt stores a snapshot of every question exactly as the student saw it
// (prompt, options, correct answer, topic, explanation). Editing or duplicating a
// quiz later therefore never changes a recorded attempt or its score.

import { topicKey, uid, nowIso } from './model.js';

/**
 * Grade answers against the quiz's own answer key.
 * @param quiz     the quiz being attempted
 * @param answers  { [questionId]: optionId }
 * @param meta     { studentName, isSample, startedAt, submittedAt, timedOut, id }
 */
export function gradeAttempt(quiz, answers, meta = {}) {
  const responses = quiz.questions.map((q) => {
    const chosen = answers?.[q.id];
    const selectedOptionId = chosen && q.options.some((o) => o.id === chosen) ? chosen : null;
    return {
      questionId: q.id,
      prompt: q.prompt,
      topic: String(q.topic ?? '').trim(),
      options: q.options.map((o) => ({ id: o.id, text: o.text })),
      correctOptionId: q.correctOptionId,
      selectedOptionId,
      isCorrect: selectedOptionId !== null && selectedOptionId === q.correctOptionId,
      explanation: q.explanation || '',
      optionNotes: { ...(q.optionNotes || {}) },
    };
  });

  const submittedAt = meta.submittedAt || nowIso();
  const startedAt = meta.startedAt || submittedAt;
  const durationSeconds = Math.max(0, Math.round((Date.parse(submittedAt) - Date.parse(startedAt)) / 1000)) || 0;

  return {
    id: meta.id || uid('att'),
    quizId: quiz.id,
    quizTitle: quiz.title,
    studentName: String(meta.studentName ?? '').trim() || 'Unnamed student',
    isSample: Boolean(meta.isSample),
    startedAt,
    submittedAt,
    durationSeconds,
    timedOut: Boolean(meta.timedOut),
    responses,
  };
}

/** Score summary calculated from stored responses (never from stored totals). */
export function summarizeAttempt(attempt) {
  const total = attempt.responses.length;
  let score = 0;
  let unanswered = 0;
  const topics = new Map();
  for (const r of attempt.responses) {
    if (r.isCorrect) score += 1;
    if (r.selectedOptionId === null) unanswered += 1;
    const key = topicKey(r.topic) || 'untagged';
    if (!topics.has(key)) topics.set(key, { key, name: r.topic || 'Untagged', correct: 0, total: 0, unanswered: 0 });
    const t = topics.get(key);
    t.total += 1;
    if (r.isCorrect) t.correct += 1;
    if (r.selectedOptionId === null) t.unanswered += 1;
  }
  return {
    score,
    total,
    unanswered,
    incorrect: total - score - unanswered,
    percentage: total ? (score / total) * 100 : 0,
    topics: [...topics.values()].map((t) => ({ ...t, accuracy: t.total ? (t.correct / t.total) * 100 : null })),
  };
}

/** Format a percentage for display. Returns an em dash when there is nothing to measure. */
export function pct(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${Math.round(value)}%`;
}

export function ratioPct(correct, total) {
  return total ? pct((correct / total) * 100) : '—';
}
