import { useMemo } from 'react';
import { ArrowRight, CheckCircle2, ClipboardCheck, Info, ScanSearch, SearchX, Target } from 'lucide-react';
import { useApp } from '../store.jsx';
import { useRouter } from '../router.jsx';
import { DEVELOPING_AT, LIMITED_EVIDENCE_BELOW, MISCONCEPTION_SHARE, SECURE_AT, analyse } from '../lib/analysis.js';
import { pct } from '../lib/scoring.js';
import { Badge, Card, EmptyState, Link, MasteryBadge, PageHeader, Switch, plainText } from '../components/ui.jsx';
import { OptionBars, TopicBars } from '../components/charts.jsx';

export function PriorityBadge({ priority }) {
  return priority === 'high' ? <Badge tone="crit">High priority</Badge> : <Badge tone="warn">Medium priority</Badge>;
}

export function AnalysisRules() {
  return (
    <section className="card rules" aria-labelledby="rules-title">
      <h2 className="card-title" id="rules-title">
        <Info size={17} aria-hidden="true" /> How this analysis works
      </h2>
      <p className="card-subtitle">
        Response-based learning-gap analysis: simple, fixed rules applied to your students’ recorded answers. It is not artificial intelligence. Use it as a starting point for your own professional judgement.
      </p>
      <ol className="rules-list">
        <li>Every question carries a topic tag. Each answer in each included attempt is counted under that topic.</li>
        <li>Topic accuracy = correct answers ÷ all answers on that topic. Unanswered questions count as not correct.</li>
        <li>
          Bands: <strong>Secure</strong> {SECURE_AT}% or more · <strong>Developing</strong> {DEVELOPING_AT}–{SECURE_AT - 1}% · <strong>Needs attention</strong> below {DEVELOPING_AT}%.
        </li>
        <li>
          Topics below {SECURE_AT}% are listed as learning gaps: high priority below {DEVELOPING_AT}%, medium priority from {DEVELOPING_AT}% to {SECURE_AT - 1}%.
        </li>
        <li>A wrong option chosen in at least {Math.round(MISCONCEPTION_SHARE * 100)}% of the answers to a question is reported as a likely shared misconception.</li>
        <li>Topics with fewer than {LIMITED_EVIDENCE_BELOW} answers are marked “limited evidence”. Collect more responses before drawing firm conclusions.</li>
        <li>Teaching suggestions come from a fixed library of ideas for common Computer Science topics, matched by topic name. Other topics get a general re-teaching plan.</li>
      </ol>
    </section>
  );
}

export default function LearningGaps({ quizFilter = 'all' }) {
  const { state, actions } = useApp();
  const { navigate } = useRouter();
  const includeSample = state.settings.includeSample;
  const hasSample = state.quizzes.some((q) => q.isSample) || state.attempts.some((a) => a.isSample);

  const quizOptions = useMemo(() => {
    const withAttempts = new Set(state.attempts.map((a) => a.quizId));
    return state.quizzes.filter((q) => (q.status === 'published' || withAttempts.has(q.id)) && (includeSample || !q.isSample));
  }, [state.quizzes, state.attempts, includeSample]);
  const quizId = quizFilter !== 'all' && state.quizzes.some((q) => q.id === quizFilter) ? quizFilter : 'all';
  const selectedQuiz = state.quizzes.find((q) => q.id === quizId);

  const a = useMemo(() => analyse(state.attempts, state.quizzes, { quizId, includeSample }), [state.attempts, state.quizzes, quizId, includeSample]);
  const missed = a.questions.filter((q) => q.accuracy !== null && q.accuracy < SECURE_AT).slice(0, 6);

  const setQuiz = (id) => navigate(id === 'all' ? '/gaps' : `/gaps?quiz=${encodeURIComponent(id)}`, { keepScroll: true });
  const high = a.gaps.filter((g) => g.priority === 'high').length;
  const medium = a.gaps.length - high;

  return (
    <div className="page">
      <PageHeader
        title="Learning Gaps"
        subtitle="Response-based learning-gap analysis: which topics, questions and wrong answers need your attention, based on recorded student answers."
        actions={
          a.gaps.length > 0 && (
            <Link to="/planner" className="btn btn-primary">
              <ClipboardCheck size={17} aria-hidden="true" /> Plan revision
            </Link>
          )
        }
      />

      <div className="filter-bar">
        <div className="field field-inline">
          <label htmlFor="gap-quiz">Analyse</label>
          <select id="gap-quiz" value={quizId} onChange={(e) => setQuiz(e.target.value)}>
            <option value="all">All quizzes</option>
            {quizOptions.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title || 'Untitled quiz'}
                {q.isSample ? ' (sample)' : ''}
                {q.status === 'draft' ? ' (draft)' : ''}
              </option>
            ))}
          </select>
        </div>
        {hasSample && (
          <Switch checked={includeSample} onChange={(v) => actions.setSettings({ includeSample: v })} label="Include sample data" />
        )}
      </div>

      {a.attempts.length === 0 ? (
        <>
          <EmptyState
            icon={SearchX}
            title="No answers to analyse yet"
            actions={
              <Link to="/quizzes" className="btn btn-primary">
                Choose a quiz to run
              </Link>
            }
          >
            {selectedQuiz
              ? `No attempts have been recorded on “${selectedQuiz.title}”${!includeSample && hasSample ? ' (sample data is hidden)' : ''}.`
              : `Learning gaps appear after students submit a published quiz.${!includeSample && hasSample ? ' Sample data is currently hidden.' : ''}`}{' '}
            ClassLens never shows made-up results.
          </EmptyState>
          {a.unassessed.length > 0 && (
            <Card title="Topics waiting for answers" subtitle="These topics appear in your published quizzes but no student has answered them yet.">
              <ul className="chip-list">
                {a.unassessed.map((t) => (
                  <li key={t.key} className="chip">
                    {t.name}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <AnalysisRules />
        </>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat">
              <div className="stat-label">Attempts analysed</div>
              <div className="stat-value">{a.attempts.length}</div>
              <div className="stat-sub">
                {a.newAttempts} recorded by you{a.sampleAttempts ? ` · ${a.sampleAttempts} sample` : ''}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Answers analysed</div>
              <div className="stat-value">{a.responsesCount}</div>
              <div className="stat-sub">Average score {pct(a.averageScore)}</div>
            </div>
            <div className="stat stat-crit">
              <div className="stat-label">High-priority gaps</div>
              <div className="stat-value">{high}</div>
              <div className="stat-sub">Topics below {DEVELOPING_AT}% correct</div>
            </div>
            <div className="stat stat-warn">
              <div className="stat-label">Developing topics</div>
              <div className="stat-value">{medium}</div>
              <div className="stat-sub">
                {DEVELOPING_AT}–{SECURE_AT - 1}% correct · {a.strengths.length} secure
              </div>
            </div>
          </div>

          <Card
            title="Topic accuracy"
            subtitle={`Correct answers as a share of all answers on each topic${selectedQuiz ? ` in “${selectedQuiz.title}”` : ''}. Lowest first. Hover or focus a bar for details.`}
            help="Bars are coloured by band and also carry an icon and label. Thin vertical lines mark the 50% and 75% thresholds."
          >
            <TopicBars topics={a.topics} />
            <details className="table-details">
              <summary>Show as a table</summary>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Topic</th>
                      <th scope="col" className="num">
                        Correct / answers
                      </th>
                      <th scope="col" className="num">
                        Accuracy
                      </th>
                      <th scope="col" className="num">
                        Unanswered
                      </th>
                      <th scope="col" className="num">
                        Questions
                      </th>
                      <th scope="col">Band</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.topics.map((t) => (
                      <tr key={t.key}>
                        <th scope="row">
                          {t.name}
                          {t.limitedEvidence && <span className="tb-flag">limited evidence</span>}
                        </th>
                        <td className="num tabular">{t.total ? `${t.correct} / ${t.total}` : '—'}</td>
                        <td className="num tabular">{pct(t.accuracy)}</td>
                        <td className="num tabular">{t.total ? t.unanswered : '—'}</td>
                        <td className="num tabular">{t.questionCount || '—'}</td>
                        <td>
                          <MasteryBadge mastery={t.mastery} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </Card>

          <section aria-labelledby="gaps-title">
            <div className="section-head">
              <h2 className="section-title" id="gaps-title">
                <Target size={18} aria-hidden="true" /> Priority learning gaps
              </h2>
              <p className="muted small">Topics below {SECURE_AT}% correct, weakest first, with the evidence behind each one.</p>
            </div>
            {a.gaps.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="No learning gaps found">
                Every assessed topic is at {SECURE_AT}% or above. Keep checking with new quizzes as you move to the next chapter.
              </EmptyState>
            ) : (
              <ul className="gap-list">
                {a.gaps.map((g) => (
                  <li key={g.key} className={`gap-card priority-${g.priority}`}>
                    <div className="gap-head">
                      <h3>{g.name}</h3>
                      <div className="gap-badges">
                        <PriorityBadge priority={g.priority} />
                        <MasteryBadge mastery={g.mastery} />
                        {g.limitedEvidence && <Badge tone="neutral">Limited evidence</Badge>}
                      </div>
                      <div className="gap-score">
                        <strong>{pct(g.accuracy)}</strong>
                        <span className="muted small">
                          {g.correct} of {g.total} correct
                        </span>
                      </div>
                    </div>
                    <div className="gap-body">
                      <div>
                        <h4>Evidence</h4>
                        <ul className="evidence">
                          {g.evidence.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4>Suggested intervention</h4>
                        <p>{g.suggestions.explain}</p>
                        <Link to="/planner" className="link-arrow">
                          Activity, task and follow-up in the Revision Planner <ArrowRight size={14} aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="grid-2">
            <Card
              title="Frequently missed questions"
              subtitle={`Questions answered correctly less than ${SECURE_AT}% of the time, with how answers were spread across the options.`}
            >
              {missed.length === 0 ? (
                <p className="muted small">No question is below {SECURE_AT}% correct.</p>
              ) : (
                <ol className="missed-list">
                  {missed.map((q) => (
                    <li key={q.key} className="missed-item">
                      <div className="missed-head">
                        <span className="missed-prompt">{plainText(q.prompt, 140)}</span>
                        <span className="missed-score tabular">
                          <strong>{pct(q.accuracy)}</strong> <span className="muted">{q.correct}/{q.total}</span>
                        </span>
                      </div>
                      <p className="small muted">
                        {q.topic} · {q.quizTitle}
                        {q.unanswered ? ` · ${q.unanswered} unanswered` : ''}
                      </p>
                      <OptionBars options={q.optionStats} total={q.total} />
                    </li>
                  ))}
                </ol>
              )}
            </Card>

            <div className="stack">
              <Card
                title="Likely misconceptions"
                subtitle={`Wrong options chosen in at least ${Math.round(MISCONCEPTION_SHARE * 100)}% of answers to a question.`}
                help="A wrong option chosen by many students usually points to a shared misunderstanding, not a careless slip. Notes come from the question’s author."
              >
                {a.misconceptions.length === 0 ? (
                  <p className="muted small">No wrong option was chosen often enough to suggest a shared misunderstanding.</p>
                ) : (
                  <ul className="misconception-list">
                    {a.misconceptions.slice(0, 8).map((m) => (
                      <li key={m.key}>
                        <p className="mc-line">
                          <strong>
                            {m.count} of {m.total}
                          </strong>{' '}
                          chose “{m.option.text}” instead of “{m.correctText}”
                        </p>
                        <p className="small muted">
                          {m.topic} · {plainText(m.question.prompt, 80)}
                        </p>
                        {m.note ? <p className="mc-note">Suggests: {m.note}</p> : <p className="small muted">No note was written for this option.</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card title="Strengths" subtitle={`Topics at ${SECURE_AT}% or more correct.`}>
                {a.strengths.length === 0 ? (
                  <p className="muted small">No topic has reached {SECURE_AT}% yet.</p>
                ) : (
                  <ul className="strength-list">
                    {a.strengths.map((t) => (
                      <li key={t.key}>
                        <CheckCircle2 size={16} className="ico-good" aria-hidden="true" />
                        <span>
                          <strong>{t.name}</strong>{' '}
                          <span className="muted">
                            {pct(t.accuracy)} · {t.correct}/{t.total}
                            {t.limitedEvidence ? ' · limited evidence' : ''}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              {a.unassessed.length > 0 && (
                <Card title="Not assessed yet" subtitle="Topics in your quizzes with no recorded answers. They are not counted as strengths or gaps.">
                  <ul className="chip-list">
                    {a.unassessed.map((t) => (
                      <li key={t.key} className="chip">
                        {t.name}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          </div>

          <div className="cta-row">
            <ScanSearch size={18} aria-hidden="true" />
            <span>
              Next step: turn these gaps into a plan.{' '}
              <Link to="/planner" className="link-arrow">
                Open the Revision Planner <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </span>
          </div>

          <AnalysisRules />
        </>
      )}
    </div>
  );
}
