import { useMemo } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, ClipboardCheck, ClipboardList, PencilRuler, Printer, RefreshCcw, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useApp } from '../store.jsx';
import { useRouter } from '../router.jsx';
import { SECURE_AT, analyse, beforeAfter } from '../lib/analysis.js';
import { buildFollowUpQuiz } from '../lib/followUp.js';
import { nowIso } from '../lib/model.js';
import { pct } from '../lib/scoring.js';
import { Badge, Card, EmptyState, Link, MasteryBadge, PageHeader, Switch, formatDate } from '../components/ui.jsx';
import { PriorityBadge } from './LearningGaps.jsx';

const STATUSES = [
  { id: 'todo', label: 'To do' },
  { id: 'in-progress', label: 'In progress' },
  { id: 'done', label: 'Done' },
];

function StatusControl({ value, onChange, topicName }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={`Status for ${topicName}`}>
      {STATUSES.map((s) => (
        <button
          key={s.id}
          type="button"
          role="radio"
          aria-checked={value === s.id}
          className={`segment ${value === s.id ? 'is-active' : ''} segment-${s.id}`}
          onClick={() => onChange(s.id)}
        >
          {s.id === 'done' && value === 'done' && <CheckCircle2 size={14} aria-hidden="true" />}
          {s.label}
        </button>
      ))}
    </div>
  );
}

function ImprovementCheck({ attempts, entry, topicKey, includeSample }) {
  const { before, after } = beforeAfter(attempts, topicKey, entry.completedAt, includeSample);
  if (!after.total) {
    return (
      <div className="improve improve-wait">
        <RefreshCcw size={16} aria-hidden="true" />
        <span>
          Marked done on {formatDate(entry.completedAt)}. No answers on this topic have been recorded since then. Give students a follow-up quiz to check whether re-teaching helped.
        </span>
      </div>
    );
  }
  const diff = before.accuracy === null ? null : after.accuracy - before.accuracy;
  const Icon = diff === null || Math.abs(diff) < 1 ? Minus : diff > 0 ? TrendingUp : TrendingDown;
  return (
    <div className={`improve ${diff > 0 ? 'improve-up' : diff < 0 ? 'improve-down' : ''}`}>
      <Icon size={16} aria-hidden="true" />
      <span>
        <strong>
          Before: {pct(before.accuracy)} ({before.correct}/{before.total}) → After: {pct(after.accuracy)} ({after.correct}/{after.total})
        </strong>
        {diff !== null && <> · {diff >= 0 ? '+' : ''}{Math.round(diff)} percentage points</>}
        <br />
        <span className="small muted">
          “After” counts answers recorded since you marked this done on {formatDate(entry.completedAt)}. Different questions or students can affect the comparison, so treat it as an indication, not proof.
        </span>
      </span>
    </div>
  );
}

export default function RevisionPlanner() {
  const { state, actions, toast } = useApp();
  const { navigate } = useRouter();
  const includeSample = state.settings.includeSample;
  const hasSample = state.quizzes.some((q) => q.isSample) || state.attempts.some((a) => a.isSample);
  const a = useMemo(() => analyse(state.attempts, state.quizzes, { includeSample }), [state.attempts, state.quizzes, includeSample]);
  const bank = useMemo(() => state.quizzes.filter((q) => includeSample || !q.isSample), [state.quizzes, includeSample]);

  const statusOf = (key) => state.revision[key]?.status || 'todo';
  const setStatus = (topic, status) => {
    const prev = state.revision[topic.key];
    if (status === 'todo') {
      actions.setRevision(topic.key, null);
      return;
    }
    actions.setRevision(topic.key, {
      status,
      topicName: topic.name,
      updatedAt: nowIso(),
      completedAt: status === 'done' ? nowIso() : null,
      baselineAccuracy: status === 'done' ? topic.accuracy : prev?.baselineAccuracy ?? null,
    });
    if (status === 'done') toast(`${topic.name} marked as re-taught. Assess again to check progress.`);
  };

  const makeFollowUp = (topics) => {
    const result = buildFollowUpQuiz(
      topics.map((t) => ({ key: t.key, name: t.name })),
      bank,
      a.questions,
    );
    if (!result) {
      toast(`No complete questions tagged ${topics.map((t) => t.name).join(', ')} exist in your quizzes yet. Write some in the quiz builder first.`, 'error');
      return;
    }
    actions.saveQuiz(result.quiz);
    const missing = topics.filter((t) => !result.perTopic.some((p) => p.name === t.name)).map((t) => t.name);
    toast(
      `Follow-up draft created with ${result.count} existing question${result.count === 1 ? '' : 's'} from ${result.sourceQuizCount} quiz${result.sourceQuizCount === 1 ? '' : 'zes'}.${missing.length ? ` No questions found for: ${missing.join(', ')}.` : ''}`,
    );
    navigate(`/edit/${result.quiz.id}?notice=followup`);
  };

  const gapKeys = new Set(a.gaps.map((g) => g.key));
  const completedElsewhere = Object.entries(state.revision)
    .filter(([key, v]) => v.status === 'done' && !gapKeys.has(key))
    .map(([key, v]) => ({ key, entry: v, topic: a.topics.find((t) => t.key === key) }));
  const doneCount = a.gaps.filter((g) => statusOf(g.key) === 'done').length;
  const openGaps = a.gaps.filter((g) => statusOf(g.key) !== 'done');

  return (
    <div className="page page-planner">
      <PageHeader
        title="Revision Planner"
        subtitle="A practical plan for each weak topic: why it needs attention, what to do in class, a task to set, and how to check again."
        actions={
          a.gaps.length > 0 && (
            <button type="button" className="btn btn-secondary no-print" onClick={() => window.print()}>
              <Printer size={17} aria-hidden="true" /> Print plan
            </button>
          )
        }
      />

      {hasSample && (
        <div className="filter-bar no-print">
          <Switch checked={includeSample} onChange={(v) => actions.setSettings({ includeSample: v })} label="Include sample data" />
        </div>
      )}

      {a.attempts.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nothing to plan yet"
          actions={
            <Link to="/quizzes" className="btn btn-primary">
              Choose a quiz to run
            </Link>
          }
        >
          The planner is built from learning gaps, which appear after students submit a published quiz.
          {!includeSample && hasSample ? ' Sample data is currently hidden.' : ''}
        </EmptyState>
      ) : a.gaps.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="No topics need re-teaching right now">
          Every assessed topic is at {SECURE_AT}% or above. Create a quiz on your next chapter to keep checking understanding.
        </EmptyState>
      ) : (
        <>
          <div className="planner-summary">
            <div>
              <strong>
                {a.gaps.length} topic{a.gaps.length === 1 ? '' : 's'} to revise
              </strong>{' '}
              <span className="muted">
                · {a.gaps.filter((g) => g.priority === 'high').length} high priority · {doneCount} marked done
              </span>
              <div className="progress planner-progress" role="progressbar" aria-valuemin={0} aria-valuemax={a.gaps.length} aria-valuenow={doneCount} aria-label="Topics marked done">
                <div className="progress-fill" style={{ width: `${(doneCount / a.gaps.length) * 100}%` }} />
              </div>
            </div>
            {openGaps.length > 1 && (
              <button type="button" className="btn btn-primary no-print" onClick={() => makeFollowUp(openGaps)}>
                <RefreshCcw size={16} aria-hidden="true" /> Follow-up quiz for all {openGaps.length} open topics
              </button>
            )}
          </div>

          <ol className="plan-list">
            {a.gaps.map((g) => {
              const status = statusOf(g.key);
              const entry = state.revision[g.key];
              const s = g.suggestions;
              return (
                <li key={g.key} className={`plan-card priority-${g.priority} ${status === 'done' ? 'is-done' : ''}`}>
                  <div className="plan-head">
                    <div>
                      <h2>{g.name}</h2>
                      <div className="gap-badges">
                        <PriorityBadge priority={g.priority} />
                        <MasteryBadge mastery={g.mastery} />
                        {g.limitedEvidence && <Badge tone="neutral">Limited evidence</Badge>}
                        <span className="muted small">
                          {pct(g.accuracy)} correct · {g.correct}/{g.total} answers
                        </span>
                      </div>
                    </div>
                    <StatusControl value={status} topicName={g.name} onChange={(v) => setStatus(g, v)} />
                  </div>

                  <div className="plan-grid">
                    <section className="plan-block plan-why">
                      <h3>Why it needs attention</h3>
                      <ul className="evidence">
                        {g.evidence.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </section>
                    <section className="plan-block">
                      <h3>
                        <BookOpen size={16} aria-hidden="true" /> Re-teach in class
                      </h3>
                      <p>{s.explain}</p>
                    </section>
                    <section className="plan-block">
                      <h3>
                        <PencilRuler size={16} aria-hidden="true" /> Revision task
                      </h3>
                      <p>{s.task}</p>
                    </section>
                    <section className="plan-block">
                      <h3>
                        <ClipboardCheck size={16} aria-hidden="true" /> Follow-up assessment
                      </h3>
                      <p>{s.followUp}</p>
                      <button type="button" className="btn btn-secondary btn-sm no-print" onClick={() => makeFollowUp([g])}>
                        <RefreshCcw size={15} aria-hidden="true" /> Build follow-up quiz from my questions
                      </button>
                    </section>
                  </div>
                  <p className="plan-source small muted">
                    {s.source === 'library'
                      ? `Suggestions from the ClassLens teaching library (${s.libraryName}).`
                      : 'General re-teaching plan — this topic is not in the ClassLens teaching library.'}
                  </p>
                  {status === 'done' && entry?.completedAt && (
                    <ImprovementCheck attempts={state.attempts} entry={entry} topicKey={g.key} includeSample={includeSample} />
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}

      {completedElsewhere.length > 0 && (
        <Card title="Re-taught topics" subtitle="Topics you marked done that are no longer below the gap threshold, or not in the current results.">
          <ul className="done-list">
            {completedElsewhere.map(({ key, entry, topic }) => (
              <li key={key}>
                <div className="done-head">
                  <strong>{entry.topicName}</strong>
                  {topic ? <MasteryBadge mastery={topic.mastery} /> : <Badge tone="neutral">Not in current results</Badge>}
                  <button type="button" className="btn btn-ghost btn-sm no-print" onClick={() => actions.setRevision(key, null)}>
                    Clear status
                  </button>
                </div>
                {entry.completedAt && <ImprovementCheck attempts={state.attempts} entry={entry} topicKey={key} includeSample={includeSample} />}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {a.strengths.length > 0 && (
        <Card title="Secure topics — no re-teaching needed" subtitle={`At ${SECURE_AT}% or more correct. A quick recap question in a later quiz keeps them fresh.`}>
          <ul className="chip-list">
            {a.strengths.map((t) => (
              <li key={t.key} className="chip chip-good">
                <CheckCircle2 size={13} aria-hidden="true" /> {t.name} · {pct(t.accuracy)}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {a.gaps.length > 0 && (
        <p className="small muted no-print">
          Suggestions are fixed classroom ideas matched by topic name — adapt them to your class. The follow-up quiz only re-uses questions that already exist in your quizzes (most-missed first, up to 10); ClassLens does not write new questions.{' '}
          <Link to="/gaps" className="link-arrow">
            See the full evidence <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </p>
      )}
    </div>
  );
}
