import { useMemo, useState } from 'react';
import { BarChart3, Copy, Eye, FilePlus2, Library, Pencil, PlayCircle, Search, Trash2 } from 'lucide-react';
import { useApp } from '../store.jsx';
import { useRouter } from '../router.jsx';
import { cloneQuiz, quizTopics } from '../lib/model.js';
import { pct, summarizeAttempt } from '../lib/scoring.js';
import { Badge, EmptyState, Link, PageHeader, SampleBadge, formatDate, useConfirm } from '../components/ui.jsx';
import { SampleDataBanner } from './Dashboard.jsx';
import { QuizPreview } from './TakeQuiz.jsx';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'published', label: 'Published' },
  { id: 'draft', label: 'Drafts' },
];

export default function Quizzes() {
  const { state, actions, toast } = useApp();
  const { navigate } = useRouter();
  const confirm = useConfirm();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState(null);

  const stats = useMemo(() => {
    const map = new Map();
    for (const a of state.attempts) {
      const s = map.get(a.quizId) || { count: 0, sum: 0, sample: 0 };
      s.count += 1;
      s.sum += summarizeAttempt(a).percentage;
      if (a.isSample) s.sample += 1;
      map.set(a.quizId, s);
    }
    return map;
  }, [state.attempts]);

  const term = search.trim().toLowerCase();
  const quizzes = [...state.quizzes]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .filter((q) => tab === 'all' || q.status === tab)
    .filter(
      (q) =>
        !term ||
        [q.title, q.chapter, q.grade, q.subject, ...quizTopics(q)].some((f) => String(f || '').toLowerCase().includes(term)),
    );
  const counts = {
    all: state.quizzes.length,
    published: state.quizzes.filter((q) => q.status === 'published').length,
    draft: state.quizzes.filter((q) => q.status === 'draft').length,
  };

  const duplicate = (quiz) => {
    const copy = cloneQuiz(quiz);
    actions.saveQuiz(copy);
    toast(`Duplicated as “${copy.title}” (draft). Attempts on the original are unchanged.`);
    navigate(`/edit/${copy.id}`);
  };

  const remove = async (quiz) => {
    const s = stats.get(quiz.id);
    const n = s?.count || 0;
    const ok = await confirm({
      title: `Delete “${quiz.title || 'Untitled quiz'}”?`,
      message: n
        ? `This permanently deletes the quiz and its ${n} recorded attempt${n === 1 ? '' : 's'}. Learning-gap results will no longer include them. This cannot be undone.`
        : 'This permanently deletes the quiz. It has no recorded attempts. This cannot be undone.',
      confirmLabel: n ? `Delete quiz and ${n} attempt${n === 1 ? '' : 's'}` : 'Delete quiz',
      tone: 'danger',
    });
    if (ok) {
      actions.deleteQuiz(quiz.id);
      toast('Quiz deleted.');
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="My Quizzes"
        subtitle="Create, edit and publish quizzes. Students can only take published quizzes."
        actions={
          <Link to="/create" className="btn btn-primary">
            <FilePlus2 size={17} aria-hidden="true" /> Create quiz
          </Link>
        }
      />
      <SampleDataBanner />

      {state.quizzes.length === 0 ? (
        <EmptyState
          icon={Library}
          title="No quizzes yet"
          actions={
            <>
              <Link to="/create" className="btn btn-primary">
                <FilePlus2 size={17} aria-hidden="true" /> Create your first quiz
              </Link>
              <button type="button" className="btn btn-secondary" onClick={actions.restoreSample}>
                Load sample quiz
              </button>
            </>
          }
        >
          Quizzes you create are saved in this browser. Tag each question with a topic so ClassLens can show which topics students find hard.
        </EmptyState>
      ) : (
        <>
          <div className="toolbar">
            <div className="tabs" role="tablist" aria-label="Filter quizzes by status">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  className={`tab ${tab === t.id ? 'is-active' : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label} <span className="tab-count">{counts[t.id]}</span>
                </button>
              ))}
            </div>
            <label className="search">
              <Search size={16} aria-hidden="true" />
              <span className="sr-only">Search quizzes</span>
              <input type="search" placeholder="Search title, chapter or topic" value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
          </div>

          {quizzes.length === 0 ? (
            <EmptyState icon={Search} title="No quizzes match">
              Try a different search or switch the filter to “All”.
            </EmptyState>
          ) : (
            <ul className="quiz-grid">
              {quizzes.map((q) => {
                const s = stats.get(q.id);
                const topics = quizTopics(q);
                const published = q.status === 'published';
                return (
                  <li key={q.id} className="quiz-card">
                    <div className="quiz-card-top">
                      <div className="quiz-badges">
                        <Badge tone={published ? 'good' : 'neutral'}>{published ? 'Published' : 'Draft'}</Badge>
                        {q.isSample && <SampleBadge />}
                        {q.origin?.type === 'follow-up' && <Badge tone="accent">Follow-up</Badge>}
                      </div>
                      <h2 className="quiz-title">{q.title || 'Untitled quiz'}</h2>
                      <p className="quiz-meta">
                        {[q.grade, q.subject, q.chapter].filter(Boolean).join(' · ') || 'Details not filled in yet'}
                      </p>
                    </div>
                    <dl className="quiz-facts">
                      <div>
                        <dt>Questions</dt>
                        <dd>{q.questions.length}</dd>
                      </div>
                      <div>
                        <dt>Attempts</dt>
                        <dd>{s?.count || 0}</dd>
                      </div>
                      <div>
                        <dt>Average</dt>
                        <dd>{s ? pct(s.sum / s.count) : '—'}</dd>
                      </div>
                      <div>
                        <dt>Time limit</dt>
                        <dd>{q.timeLimit ? `${q.timeLimit} min` : 'None'}</dd>
                      </div>
                    </dl>
                    {topics.length > 0 && (
                      <ul className="chip-list" aria-label="Topics">
                        {topics.slice(0, 6).map((t) => (
                          <li key={t} className="chip">
                            {t}
                          </li>
                        ))}
                        {topics.length > 6 && <li className="chip chip-more">+{topics.length - 6} more</li>}
                      </ul>
                    )}
                    <p className="quiz-updated">
                      Updated {formatDate(q.updatedAt)}
                      {q.origin?.type === 'copy' && q.origin.fromTitle ? ` · copied from “${q.origin.fromTitle}”` : ''}
                    </p>
                    <div className="quiz-actions">
                      {published ? (
                        <Link to={`/take/${q.id}`} className="btn btn-primary btn-sm">
                          <PlayCircle size={15} aria-hidden="true" /> Take quiz
                        </Link>
                      ) : (
                        <Link to={`/edit/${q.id}`} className="btn btn-primary btn-sm">
                          <Pencil size={15} aria-hidden="true" /> Continue editing
                        </Link>
                      )}
                      {published && (
                        <Link to={`/edit/${q.id}`} className="btn btn-secondary btn-sm">
                          <Pencil size={15} aria-hidden="true" /> Edit
                        </Link>
                      )}
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPreview(q)}>
                        <Eye size={15} aria-hidden="true" /> Preview
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => duplicate(q)}>
                        <Copy size={15} aria-hidden="true" /> Duplicate
                      </button>
                      {s?.count > 0 && (
                        <Link to={`/gaps?quiz=${encodeURIComponent(q.id)}`} className="btn btn-secondary btn-sm">
                          <BarChart3 size={15} aria-hidden="true" /> Results
                        </Link>
                      )}
                      <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => remove(q)} aria-label={`Delete ${q.title || 'untitled quiz'}`}>
                        <Trash2 size={15} aria-hidden="true" /> Delete
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
      {preview && <QuizPreview quiz={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
