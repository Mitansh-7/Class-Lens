// Response-based learning-gap analysis.
//
// Transparent rules, no AI: every answer in every included attempt is grouped by
// the topic tag of its question. Accuracy = correct answers ÷ answers given for that
// topic (unanswered questions count as not correct). Thresholds are listed in MASTERY.

import { topicKey } from './model.js';
import { summarizeAttempt } from './scoring.js';
import { suggestionsFor } from './teachingLibrary.js';

export const SECURE_AT = 75;
export const DEVELOPING_AT = 50;
/** Fewer answers than this on a topic is flagged as "limited evidence". */
export const LIMITED_EVIDENCE_BELOW = 5;
/** A wrong option chosen in at least this share of a question's answers is reported as a likely misconception. */
export const MISCONCEPTION_SHARE = 0.3;

export const MASTERY = {
  secure: { label: 'Secure', rule: `${SECURE_AT}% or more correct`, tone: 'good' },
  developing: { label: 'Developing', rule: `${DEVELOPING_AT}–${SECURE_AT - 1}% correct`, tone: 'warn' },
  attention: { label: 'Needs attention', rule: `Below ${DEVELOPING_AT}% correct`, tone: 'crit' },
  none: { label: 'No answers yet', rule: 'No student answers recorded for this topic', tone: 'none' },
};

export function masteryFor(accuracy) {
  if (accuracy === null || accuracy === undefined) return 'none';
  if (accuracy >= SECURE_AT) return 'secure';
  if (accuracy >= DEVELOPING_AT) return 'developing';
  return 'attention';
}

export function filterAttempts(attempts, { quizId = 'all', includeSample = true, after = null } = {}) {
  return attempts.filter(
    (a) =>
      (includeSample || !a.isSample) &&
      (quizId === 'all' || a.quizId === quizId) &&
      (!after || Date.parse(a.submittedAt) > Date.parse(after)),
  );
}

function shorten(text, max = 90) {
  const clean = String(text || '').replace(/```[a-z]*\n?/gi, '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/**
 * Analyse stored attempts.
 * @returns {{
 *   attempts, responsesCount, averageScore, sampleAttempts, newAttempts,
 *   topics: TopicStat[], questions: QuestionStat[], misconceptions, gaps, strengths, unassessed
 * }}
 */
export function analyse(attempts, quizzes, options = {}) {
  const { quizId = 'all', includeSample = true } = options;
  const included = filterAttempts(attempts, { quizId, includeSample }).sort(
    (a, b) => Date.parse(a.submittedAt) - Date.parse(b.submittedAt),
  );
  const quizById = new Map(quizzes.map((q) => [q.id, q]));

  const topicMap = new Map();
  const questionMap = new Map();
  let responsesCount = 0;
  let scoreSum = 0;

  const ensureTopic = (key, name) => {
    if (!topicMap.has(key)) {
      topicMap.set(key, { key, name, correct: 0, total: 0, unanswered: 0, questionKeys: new Set(), quizIds: new Set(), declaredOnly: false });
    }
    return topicMap.get(key);
  };

  for (const attempt of included) {
    scoreSum += summarizeAttempt(attempt).percentage;
    const liveQuiz = quizById.get(attempt.quizId);
    for (const r of attempt.responses) {
      responsesCount += 1;
      const tKey = topicKey(r.topic) || 'untagged';
      const topic = ensureTopic(tKey, r.topic || 'Untagged');
      topic.name = r.topic || 'Untagged'; // most recent spelling wins
      topic.total += 1;
      if (r.isCorrect) topic.correct += 1;
      if (r.selectedOptionId === null) topic.unanswered += 1;

      const qKey = `${attempt.quizId}::${r.questionId}`;
      topic.questionKeys.add(qKey);
      topic.quizIds.add(attempt.quizId);
      if (!questionMap.has(qKey)) {
        questionMap.set(qKey, { key: qKey, quizId: attempt.quizId, questionId: r.questionId, total: 0, correct: 0, unanswered: 0, counts: new Map() });
      }
      const q = questionMap.get(qKey);
      // Keep the latest snapshot of the question's wording and options.
      q.prompt = r.prompt;
      q.topic = r.topic || 'Untagged';
      q.topicKey = tKey;
      q.options = r.options;
      q.correctOptionId = r.correctOptionId;
      q.optionNotes = r.optionNotes || {};
      q.quizTitle = liveQuiz?.title || attempt.quizTitle || 'Deleted quiz';
      q.total += 1;
      if (r.isCorrect) q.correct += 1;
      if (r.selectedOptionId === null) q.unanswered += 1;
      else q.counts.set(r.selectedOptionId, (q.counts.get(r.selectedOptionId) || 0) + 1);
    }
  }

  // Topics that appear in quizzes in scope but have no answers yet.
  const scopeQuizzes =
    quizId === 'all'
      ? quizzes.filter((q) => q.status === 'published' && (includeSample || !q.isSample))
      : quizzes.filter((q) => q.id === quizId);
  for (const quiz of scopeQuizzes) {
    for (const q of quiz.questions) {
      const key = topicKey(q.topic);
      if (key && !topicMap.has(key)) {
        const t = ensureTopic(key, q.topic.trim());
        t.declaredOnly = true;
      }
    }
  }

  const questions = [...questionMap.values()].map((q) => {
    const optionStats = (q.options || []).map((o) => ({
      id: o.id,
      text: o.text,
      count: q.counts.get(o.id) || 0,
      share: q.total ? (q.counts.get(o.id) || 0) / q.total : 0,
      isCorrect: o.id === q.correctOptionId,
      note: q.optionNotes?.[o.id] || '',
    }));
    const wrongChoices = optionStats.filter((o) => !o.isCorrect && o.count > 0).sort((a, b) => b.count - a.count);
    const { counts, ...rest } = q;
    return {
      ...rest,
      accuracy: q.total ? (q.correct / q.total) * 100 : null,
      optionStats,
      topWrong: wrongChoices[0] || null,
    };
  });

  const misconceptions = [];
  for (const q of questions) {
    for (const o of q.optionStats) {
      if (!o.isCorrect && o.count > 0 && o.share >= MISCONCEPTION_SHARE) {
        misconceptions.push({
          key: `${q.key}::${o.id}`,
          question: q,
          option: o,
          count: o.count,
          total: q.total,
          share: o.share,
          note: o.note,
          topic: q.topic,
          topicKey: q.topicKey,
          correctText: q.optionStats.find((x) => x.isCorrect)?.text || '',
        });
      }
    }
  }
  misconceptions.sort((a, b) => b.count - a.count || b.share - a.share);

  const topics = [...topicMap.values()]
    .map((t) => {
      const accuracy = t.total ? (t.correct / t.total) * 100 : null;
      const topicQuestions = questions.filter((q) => q.topicKey === t.key);
      return {
        key: t.key,
        name: t.name,
        correct: t.correct,
        total: t.total,
        unanswered: t.unanswered,
        accuracy,
        mastery: masteryFor(accuracy),
        limitedEvidence: t.total > 0 && t.total < LIMITED_EVIDENCE_BELOW,
        questionCount: t.questionKeys.size,
        quizCount: t.quizIds.size,
        questions: topicQuestions.sort((a, b) => (a.accuracy ?? 101) - (b.accuracy ?? 101)),
        misconceptions: misconceptions.filter((m) => m.topicKey === t.key),
      };
    })
    .sort((a, b) => {
      if (a.accuracy === null && b.accuracy === null) return a.name.localeCompare(b.name);
      if (a.accuracy === null) return 1;
      if (b.accuracy === null) return -1;
      return a.accuracy - b.accuracy || b.total - a.total;
    });

  const gaps = topics
    .filter((t) => t.accuracy !== null && t.accuracy < SECURE_AT)
    .map((t) => ({ ...t, priority: t.accuracy < DEVELOPING_AT ? 'high' : 'medium', evidence: buildEvidence(t), suggestions: suggestionsFor(t.name) }));

  const strengths = topics.filter((t) => t.mastery === 'secure').sort((a, b) => b.accuracy - a.accuracy);
  const unassessed = topics.filter((t) => t.accuracy === null);

  return {
    attempts: included,
    responsesCount,
    averageScore: included.length ? scoreSum / included.length : null,
    sampleAttempts: included.filter((a) => a.isSample).length,
    newAttempts: included.filter((a) => !a.isSample).length,
    topics,
    questions: questions.sort((a, b) => (a.accuracy ?? 101) - (b.accuracy ?? 101) || b.total - a.total),
    misconceptions,
    gaps,
    strengths,
    unassessed,
  };
}

/** Plain-language evidence explaining why a topic was flagged. */
export function buildEvidence(topic) {
  const lines = [];
  const pctText = `${Math.round(topic.accuracy)}%`;
  lines.push(
    `${topic.correct} of ${topic.total} answers on ${topic.name} were correct (${pctText}), across ${topic.questionCount} question${topic.questionCount === 1 ? '' : 's'} in ${topic.quizCount} quiz${topic.quizCount === 1 ? '' : 'zes'}.`,
  );
  const worst = topic.questions.find((q) => q.accuracy !== null);
  if (worst && topic.questionCount > 1) {
    lines.push(`Most-missed question: "${shorten(worst.prompt)}" — ${worst.correct} of ${worst.total} correct.`);
  }
  const m = topic.misconceptions[0];
  if (m) {
    const base = `${m.count} of ${m.total} answer${m.total === 1 ? '' : 's'} to "${shorten(m.question.prompt, 60)}" chose "${shorten(m.option.text, 40)}" instead of "${shorten(m.correctText, 40)}".`;
    lines.push(m.note ? `${base} This suggests: ${m.note}` : base);
  }
  if (topic.unanswered > 0) {
    lines.push(`${topic.unanswered} question${topic.unanswered === 1 ? ' was' : 's were'} left unanswered — students may not have known where to start.`);
  }
  if (topic.limitedEvidence) {
    lines.push(`Based on only ${topic.total} answer${topic.total === 1 ? '' : 's'}. Collect more responses to confirm this gap.`);
  }
  return lines;
}

/**
 * Compare a topic's accuracy before and after a date (used to check whether
 * re-teaching helped). Only counts attempts included by the same filters.
 */
export function beforeAfter(attempts, key, dateIso, includeSample) {
  const tally = (list) => {
    let correct = 0;
    let total = 0;
    for (const a of list) {
      for (const r of a.responses) {
        if ((topicKey(r.topic) || 'untagged') !== key) continue;
        total += 1;
        if (r.isCorrect) correct += 1;
      }
    }
    return { correct, total, accuracy: total ? (correct / total) * 100 : null };
  };
  const scoped = filterAttempts(attempts, { includeSample });
  const cutoff = Date.parse(dateIso);
  return {
    before: tally(scoped.filter((a) => Date.parse(a.submittedAt) <= cutoff)),
    after: tally(scoped.filter((a) => Date.parse(a.submittedAt) > cutoff)),
  };
}
