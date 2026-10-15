import { useMemo } from 'react';
import { BarChart3, CheckCircle2, CircleDashed, Clock, FileQuestion, Lightbulb, Trash2, UserPlus, XCircle } from 'lucide-react';
import { useApp } from '../store.jsx';
import { useRouter } from '../router.jsx';
import { OPTION_LETTERS } from '../lib/model.js';
import { masteryFor } from '../lib/analysis.js';
import { pct, summarizeAttempt } from '../lib/scoring.js';
import { EmptyState, Link, MasteryBadge, PageHeader, RichText, SampleBadge, formatDate, formatDuration, useConfirm } from '../components/ui.jsx';

/** Score, topic summary and question-by-question feedback for one attempt. */
export function AttemptDetails({ attempt }) {
  const s = useMemo(() => summarizeAttempt(attempt), [attempt]);
  return (
    <div className="attempt">
      <section className="score-hero" aria-label="Score">
        <div className="score-main">
          <span className="score-pct">{pct(s.percentage)}</span>
          <span className="score-raw">
            {s.score} out of {s.total} correct
          </span>
        </div>
        <ul className="score-facts">
          <li>
            <CheckCircle2 size={16} className="ico-good" aria-hidden="true" /> {s.score} correct
          </li>
          <li>
            <XCircle size={16} className="ico-crit" aria-hidden="true" /> {s.incorrect} incorrect
          </li>
          <li>
            <CircleDashed size={16} className="ico-none" aria-hidden="true" /> {s.unanswered} unanswered
          </li>
          {attempt.durationSeconds > 0 && (
            <li>
              <Clock size={16} aria-hidden="true" /> {formatDuration(attempt.durationSeconds)}
              {attempt.timedOut ? ' (time ran out)' : ''}
            </li>
          )}
        </ul>
      </section>

      <section className="card" aria-labelledby="topic-summary-title">
        <h2 className="card-title" id="topic-summary-title">
          Result by topic
        </h2>
        <p className="card-subtitle">One student’s answers only. See Learning Gaps for the whole class.</p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Topic</th>
                <th scope="col" className="num">
                  Correct
                </th>
                <th scope="col" className="num">
                  Accuracy
                </th>
                <th scope="col">Band</th>
              </tr>
            </thead>
            <tbody>
              {s.topics.map((t) => (
                <tr key={t.key}>
                  <th scope="row">{t.name}</th>
                  <td className="num tabular">
                    {t.correct} / {t.total}
                  </td>
                  <td className="num tabular">{pct(t.accuracy)}</td>
                  <td>
                    <MasteryBadge mastery={masteryFor(t.accuracy)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="answers-title">
        <h2 className="section-title" id="answers-title">
          Answers and explanations
        </h2>
        <ol className="answer-review">
          {attempt.responses.map((r, i) => {
            const status = r.selectedOptionId === null ? 'unanswered' : r.isCorrect ? 'correct' : 'incorrect';
            const note = !r.isCorrect && r.selectedOptionId ? r.optionNotes?.[r.selectedOptionId] : '';
            const hasKey = r.options.some((o) => o.id === r.correctOptionId);
            return (
              <li key={r.questionId} className={`ar-item is-${status}`}>
                <div className="ar-head">
                  <span className="ar-num">Q{i + 1}</span>
                  <span className={`ar-status status-${status}`}>
                    {status === 'correct' && <CheckCircle2 size={15} aria-hidden="true" />}
                    {status === 'incorrect' && <XCircle size={15} aria-hidden="true" />}
                    {status === 'unanswered' && <CircleDashed size={15} aria-hidden="true" />}
                    {status === 'correct' ? 'Correct' : status === 'incorrect' ? 'Incorrect' : 'Not answered'}
                  </span>
                  {r.topic && <span className="chip">{r.topic}</span>}
                </div>
                <RichText text={r.prompt} className="ar-prompt" />
                <ul className="ar-options">
                  {r.options.map((o, oi) => {
                    const isKey = o.id === r.correctOptionId;
                    const isChosen = o.id === r.selectedOptionId;
                    return (
                      <li key={o.id} className={`${isKey ? 'is-key' : ''} ${isChosen && !isKey ? 'is-wrong' : ''}`}>
                        <span className="ar-letter">{OPTION_LETTERS[oi]}</span>
                        <span className="ar-text">{o.text}</span>
                        <span className="ar-tags">
                          {isChosen && <span className="ar-tag">Chosen</span>}
                          {isKey && <span className="ar-tag ar-tag-key">Correct answer</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {!hasKey && <p className="muted small">No correct answer was marked for this question.</p>}
                {note && (
                  <p className="ar-note">
                    <Lightbulb size={15} aria-hidden="true" /> <span>Common misunderstanding behind this choice: {note}</span>
                  </p>
                )}
                {r.explanation?.trim() && (
                  <div className="ar-explain">
                    <strong>Explanation</strong>
                    <RichText text={r.explanation} />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

export default function AttemptResult({ attemptId }) {
  const { state, actions, toast } = useApp();
  const { route, navigate } = useRouter();
  const confirm = useConfirm();
  const attempt = state.attempts.find((a) => a.id === attemptId);

  if (!attempt) {
    return (
      <div className="page">
        <EmptyState
          icon={FileQuestion}
          title="Result not found"
          actions={
            <Link to="/dashboard" className="btn btn-primary">
              Go to dashboard
            </Link>
          }
        >
          This attempt may have been deleted, or it was recorded in another browser.
        </EmptyState>
      </div>
    );
  }

  const quiz = state.quizzes.find((q) => q.id === attempt.quizId);
  const fresh = route.query.fresh === '1';
  const edited = quiz && Date.parse(quiz.updatedAt) > Date.parse(attempt.submittedAt);

  const remove = async () => {
    const ok = await confirm({
      title: 'Delete this attempt?',
      message: `The result for ${attempt.studentName} on “${attempt.quizTitle}” will be removed and the learning-gap analysis will be recalculated without it. This cannot be undone.`,
      confirmLabel: 'Delete attempt',
      tone: 'danger',
    });
    if (ok) {
      actions.deleteAttempt(attempt.id);
      toast('Attempt deleted.');
      navigate('/quizzes', { force: true });
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Quiz result"
        title={
          <>
            {attempt.studentName} {attempt.isSample && <SampleBadge />}
          </>
        }
        subtitle={`${attempt.quizTitle} · submitted ${formatDate(attempt.submittedAt)}`}
        actions={
          <>
            {quiz?.status === 'published' && (
              <Link to={`/take/${quiz.id}?run=${Date.now()}`} className="btn btn-primary">
                <UserPlus size={17} aria-hidden="true" /> Next student
              </Link>
            )}
            <Link to={`/gaps?quiz=${encodeURIComponent(attempt.quizId)}`} className="btn btn-secondary">
              <BarChart3 size={17} aria-hidden="true" /> Class learning gaps
            </Link>
          </>
        }
      />
      {fresh && (
        <div className="banner banner-good" role="status">
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>Submitted and saved. This attempt is now included in the dashboard, Learning Gaps and Revision Planner.</span>
        </div>
      )}
      {attempt.isSample && (
        <div className="banner banner-sample">
          <span>This is a fictional sample attempt included for demonstration. It is not a real student’s result.</span>
        </div>
      )}
      {edited && (
        <p className="muted small">The quiz has been edited since this attempt. The questions below are shown exactly as this student saw them.</p>
      )}
      {!quiz && <p className="muted small">The quiz for this attempt has been deleted.</p>}

      <AttemptDetails attempt={attempt} />

      <div className="page-foot">
        <button type="button" className="btn btn-danger-ghost btn-sm" onClick={remove}>
          <Trash2 size={15} aria-hidden="true" /> Delete this attempt
        </button>
      </div>
    </div>
  );
}
