import { useMemo } from 'react';
import {
  ArrowRight,
  BarChart3,
  ClipboardCheck,
  FilePlus2,
  FlaskConical,
  Lightbulb,
  PenLine,
  RefreshCcw,
  ScanSearch,
  Users,
} from 'lucide-react';
import { useApp } from '../store.jsx';
import { analyse, SECURE_AT } from '../lib/analysis.js';
import { pct, summarizeAttempt } from '../lib/scoring.js';
import { Card, EmptyState, Link, PageHeader, SampleBadge, Switch, Badge, formatDate, useConfirm } from '../components/ui.jsx';
import { TopicBars } from '../components/charts.jsx';
import { HowItWorks } from '../components/HowItWorks.jsx';

function firstSentence(text) {
  const i = text.indexOf('. ');
  return i > 0 ? text.slice(0, i + 1) : text;
}

export function nextTeachingAction(state, analysis, includeSample) {
  const quizzes = state.quizzes.filter((q) => includeSample || !q.isSample);
  const published = quizzes.filter((q) => q.status === 'published').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (!quizzes.length) {
    return {
      title: 'Create your first quiz',
      body: 'Write a short quiz on the chapter you are teaching. Tag each question with its topic so ClassLens can analyse students’ answers topic by topic.',
      cta: 'Create a quiz',
      to: '/create',
    };
  }
  if (!published.length) {
    return {
      title: 'Publish a quiz so students can take it',
      body: `You have ${quizzes.length} draft quiz${quizzes.length === 1 ? '' : 'zes'}. Open one, check the questions, and press Publish.`,
      cta: 'Go to My Quizzes',
      to: '/quizzes',
    };
  }
  if (!analysis.attempts.length) {
    const q = published[0];
    return {
      title: `Run “${q.title}” with your students`,
      body: 'Open the quiz on a classroom computer and let each student take a turn. Learning gaps appear as soon as the first attempt is submitted.',
      cta: 'Start the quiz',
      to: `/take/${q.id}`,
    };
  }
  const open = analysis.gaps.find((g) => state.revision[g.key]?.status !== 'done');
  if (open) {
    return {
      title: `Re-teach ${open.name}`,
      body: `Only ${open.correct} of ${open.total} answers on ${open.name} were correct (${pct(open.accuracy)}). Suggested approach: ${firstSentence(open.suggestions.explain)}`,
      cta: 'Open the revision plan',
      to: '/planner',
      priority: open.priority,
    };
  }
  if (analysis.gaps.length) {
    return {
      title: 'Check whether re-teaching worked',
      body: 'Every flagged topic is marked as done. Build a follow-up quiz from those topics and give it to the class to see whether accuracy improves.',
      cta: 'Open the revision planner',
      to: '/planner',
    };
  }
  return {
    title: 'All assessed topics are secure',
    body: `Every topic assessed so far is at ${SECURE_AT}% or above. Create a quiz on the next chapter to keep checking understanding.`,
    cta: 'Create a quiz',
    to: '/create',
  };
}

export function SampleDataBanner() {
  const { state, actions, toast } = useApp();
  const confirm = useConfirm();
  const sampleQuizzes = state.quizzes.filter((q) => q.isSample).length;
  const sampleAttempts = state.attempts.filter((a) => a.isSample).length;
  if (!sampleQuizzes && !sampleAttempts) return null;
  const remove = async () => {
    const ok = await confirm({
      title: 'Remove sample data?',
      message: 'This deletes the sample quiz, the sample students’ attempts, and any attempts recorded on the sample quiz. Your own quizzes and attempts are kept. You can restore the sample later from “How it works & data”.',
      confirmLabel: 'Remove sample data',
      tone: 'danger',
    });
    if (ok) {
      actions.removeSample();
      toast('Sample data removed.');
    }
  };
  return (
    <div className="banner banner-sample">
      <div className="banner-text">
        <strong>
          <FlaskConical size={16} aria-hidden="true" /> Sample Data is loaded
        </strong>
        <span>
          {sampleQuizzes} sample quiz and {sampleAttempts} attempts by fictional “Sample Students” are included for demonstration. They are not real results and are marked with a <SampleBadge /> badge.
        </span>
      </div>
      <div className="banner-actions">
        <Switch
          checked={state.settings.includeSample}
          onChange={(v) => actions.setSettings({ includeSample: v })}
          label="Include sample data in results"
        />
        <button type="button" className="btn btn-ghost btn-sm" onClick={remove}>
          Remove sample data
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { state, actions } = useApp();
  const includeSample = state.settings.includeSample;
  const analysis = useMemo(() => analyse(state.attempts, state.quizzes, { includeSample }), [state.attempts, state.quizzes, includeSample]);

  const quizzes = state.quizzes.filter((q) => includeSample || !q.isSample);
  const published = quizzes.filter((q) => q.status === 'published').length;
  const hardest = analysis.topics.find((t) => t.accuracy !== null);
  const action = nextTeachingAction(state, analysis, includeSample);
  const recentAttempts = [...analysis.attempts].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).slice(0, 6);
  const recentQuizzes = [...quizzes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
  const attemptsByQuiz = new Map();
  for (const a of state.attempts) attemptsByQuiz.set(a.quizId, (attemptsByQuiz.get(a.quizId) || 0) + 1);

  const nothingYet = !state.quizzes.length && !state.attempts.length;

  return (
    <div className="page">
      <PageHeader
        title="Dashboard"
        subtitle="An overview of your quizzes, how students answered, and what to teach next."
        actions={
          <Link to="/create" className="btn btn-primary">
            <FilePlus2 size={17} aria-hidden="true" /> Create quiz
          </Link>
        }
      />

      <SampleDataBanner />
      {state.settings.showGuide && <HowItWorks onHide={() => actions.setSettings({ showGuide: false })} />}

      {nothingYet ? (
        <EmptyState
          icon={PenLine}
          title="No quizzes or results yet"
          actions={
            <>
              <Link to="/create" className="btn btn-primary">
                <FilePlus2 size={17} aria-hidden="true" /> Create your first quiz
              </Link>
              <button type="button" className="btn btn-secondary" onClick={actions.restoreSample}>
                <RefreshCcw size={16} aria-hidden="true" /> Load sample data
              </button>
            </>
          }
        >
          Create a quiz, run it with your class, and this dashboard will show which topics students understand and which need re-teaching. Or load the sample data to explore first.
        </EmptyState>
      ) : (
        <>
          <section className="next-action" aria-labelledby="next-action-title">
            <div className="next-action-icon" aria-hidden="true">
              <Lightbulb size={20} />
            </div>
            <div className="next-action-body">
              <div className="eyebrow">Recommended next teaching action</div>
              <h2 id="next-action-title">
                {action.title}
                {action.priority === 'high' && <Badge tone="crit">High priority</Badge>}
              </h2>
              <p>{action.body}</p>
            </div>
            <Link to={action.to} className="btn btn-primary next-action-cta">
              {action.cta} <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </section>

          <div className="stat-grid">
            <div className="stat">
              <div className="stat-label">Quizzes</div>
              <div className="stat-value">{quizzes.length}</div>
              <div className="stat-sub">
                {published} published · {quizzes.length - published} draft{quizzes.length - published === 1 ? '' : 's'}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Student attempts</div>
              <div className="stat-value">{analysis.attempts.length}</div>
              <div className="stat-sub">
                {analysis.newAttempts} recorded by you
                {includeSample && analysis.sampleAttempts > 0 ? ` · ${analysis.sampleAttempts} sample` : ''}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Average score</div>
              <div className="stat-value">{pct(analysis.averageScore)}</div>
              <div className="stat-sub">{analysis.attempts.length ? 'Mean of all included attempts' : 'Appears after the first attempt'}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Most challenging topic</div>
              <div className="stat-value stat-value-text">{hardest ? hardest.name : '—'}</div>
              <div className="stat-sub">
                {hardest ? `${pct(hardest.accuracy)} correct · ${hardest.correct} of ${hardest.total} answers` : 'Appears after the first attempt'}
              </div>
            </div>
          </div>

          <div className="grid-2">
            <Card
              title="Topic-wise mastery"
              subtitle="Share of answers on each topic that were correct, across all included attempts. Lowest first."
              help="Each question carries a topic tag. ClassLens counts every answer to questions with that tag. Thin lines mark the 50% and 75% thresholds."
              actions={
                <Link to="/gaps" className="btn btn-ghost btn-sm">
                  Learning gaps <ArrowRight size={15} aria-hidden="true" />
                </Link>
              }
            >
              <TopicBars topics={analysis.topics} emptyText="Topic results appear after students submit a published quiz." />
            </Card>

            <Card
              title="Recent attempts"
              subtitle="Latest submitted quizzes. Select a row to see the student’s answers."
              actions={
                <Link to="/quizzes" className="btn btn-ghost btn-sm">
                  All quizzes <ArrowRight size={15} aria-hidden="true" />
                </Link>
              }
            >
              {recentAttempts.length ? (
                <ul className="row-list">
                  {recentAttempts.map((a) => {
                    const s = summarizeAttempt(a);
                    return (
                      <li key={a.id}>
                        <Link to={`/attempt/${a.id}`} className="row-link">
                          <span className="row-main">
                            <span className="row-title">
                              {a.studentName} {a.isSample && <SampleBadge />}
                            </span>
                            <span className="row-sub">
                              {a.quizTitle} · {formatDate(a.submittedAt)}
                            </span>
                          </span>
                          <span className="row-score">
                            <strong>{pct(s.percentage)}</strong>
                            <span className="muted tabular">
                              {s.score}/{s.total}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState icon={Users} title="No attempts yet">
                  Open a published quiz from My Quizzes and choose “Take quiz” to record a student attempt.
                </EmptyState>
              )}
            </Card>
          </div>

          <Card
            title="Recent quiz activity"
            subtitle="Quizzes you created or edited most recently."
            actions={
              <Link to="/quizzes" className="btn btn-ghost btn-sm">
                Manage quizzes <ArrowRight size={15} aria-hidden="true" />
              </Link>
            }
          >
            {recentQuizzes.length ? (
              <ul className="row-list">
                {recentQuizzes.map((q) => (
                  <li key={q.id}>
                    <Link to={q.status === 'published' ? `/take/${q.id}` : `/edit/${q.id}`} className="row-link">
                      <span className="row-main">
                        <span className="row-title">
                          {q.title || 'Untitled quiz'} {q.isSample && <SampleBadge />}
                        </span>
                        <span className="row-sub">
                          {q.questions.length} question{q.questions.length === 1 ? '' : 's'} · {attemptsByQuiz.get(q.id) || 0} attempt
                          {(attemptsByQuiz.get(q.id) || 0) === 1 ? '' : 's'} · updated {formatDate(q.updatedAt)}
                        </span>
                      </span>
                      <Badge tone={q.status === 'published' ? 'good' : 'neutral'}>{q.status === 'published' ? 'Published' : 'Draft'}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small">No quizzes to show. {includeSample ? '' : 'Sample data is currently hidden.'}</p>
            )}
          </Card>

          <div className="quick-links">
            <Link to="/gaps" className="quick-link">
              <ScanSearch size={18} aria-hidden="true" />
              <span>
                <strong>Learning Gaps</strong>
                <span>Which topics and questions students found hardest, with evidence.</span>
              </span>
            </Link>
            <Link to="/planner" className="quick-link">
              <ClipboardCheck size={18} aria-hidden="true" />
              <span>
                <strong>Revision Planner</strong>
                <span>Classroom activities and follow-up quizzes for weak topics.</span>
              </span>
            </Link>
            <Link to="/about" className="quick-link">
              <BarChart3 size={18} aria-hidden="true" />
              <span>
                <strong>How the analysis works</strong>
                <span>The exact rules ClassLens uses — no hidden scoring.</span>
              </span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
