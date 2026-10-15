import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Copy,
  Eye,
  FileQuestion,
  Info,
  PlayCircle,
  Plus,
  Save,
  Send,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { useApp } from '../store.jsx';
import { useLeaveGuard, useRouter } from '../router.jsx';
import {
  MAX_OPTIONS,
  MAX_TIME_LIMIT,
  MIN_OPTIONS,
  OPTION_LETTERS,
  SUGGESTED_TOPICS,
  cloneQuestion,
  createOption,
  createQuestion,
  createQuiz,
  isQuestionEmpty,
  nowIso,
  quizTopics,
  validateQuiz,
} from '../lib/model.js';
import { Badge, EmptyState, Link, PageHeader, SampleBadge, useConfirm } from '../components/ui.jsx';
import { QuizPreview } from './TakeQuiz.jsx';

const GRADES = ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];

const fieldId = (key) => `field-${key.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
const copyOf = (value) => JSON.parse(JSON.stringify(value));

/** '' → null, '15' → 15, anything else → undefined (invalid). */
function parseTimeLimit(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= MAX_TIME_LIMIT ? n : undefined;
}

function FieldError({ message, id }) {
  if (!message) return null;
  return (
    <p className="field-error" id={id}>
      <AlertTriangle size={14} aria-hidden="true" /> {message}
    </p>
  );
}

function QuestionEditor({ question, index, count, errors, showErrors, onChange, onMove, onDuplicate, onDelete }) {
  const q = question;
  const err = (key) => (showErrors ? errors[`q:${q.id}:${key}`] : undefined);
  const set = (patch) => onChange((cur) => ({ ...cur, ...patch }));
  const setOption = (optId, text) => onChange((cur) => ({ ...cur, options: cur.options.map((o) => (o.id === optId ? { ...o, text } : o)) }));
  const setNote = (optId, note) =>
    onChange((cur) => {
      const optionNotes = { ...cur.optionNotes };
      if (note) optionNotes[optId] = note;
      else delete optionNotes[optId];
      return { ...cur, optionNotes };
    });
  const addOption = () => onChange((cur) => ({ ...cur, options: [...cur.options, createOption()] }));
  const removeOption = (optId) =>
    onChange((cur) => {
      const optionNotes = { ...cur.optionNotes };
      delete optionNotes[optId];
      return {
        ...cur,
        options: cur.options.filter((o) => o.id !== optId),
        correctOptionId: cur.correctOptionId === optId ? null : cur.correctOptionId,
        optionNotes,
      };
    });

  const wrongOptions = q.options.filter((o) => o.id !== q.correctOptionId);
  const noteCount = Object.keys(q.optionNotes || {}).length;
  const hasError = showErrors && Object.keys(errors).some((k) => k.startsWith(`q:${q.id}:`));

  return (
    <li className={`q-editor ${hasError ? 'has-error' : ''}`} id={`question-${q.id}`}>
      <div className="q-editor-head">
        <h3>
          Question {index + 1}
          {q.topic.trim() && <span className="chip">{q.topic.trim()}</span>}
        </h3>
        <div className="q-editor-tools">
          <button type="button" className="icon-btn" onClick={() => onMove(-1)} disabled={index === 0} aria-label={`Move question ${index + 1} up`} title="Move up">
            <ArrowUp size={17} />
          </button>
          <button type="button" className="icon-btn" onClick={() => onMove(1)} disabled={index === count - 1} aria-label={`Move question ${index + 1} down`} title="Move down">
            <ArrowDown size={17} />
          </button>
          <button type="button" className="icon-btn" onClick={onDuplicate} aria-label={`Duplicate question ${index + 1}`} title="Duplicate">
            <Copy size={17} />
          </button>
          <button type="button" className="icon-btn icon-btn-danger" onClick={onDelete} aria-label={`Delete question ${index + 1}`} title="Delete">
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      <div className="field">
        <label htmlFor={fieldId(`q:${q.id}:prompt`)}>Question</label>
        <textarea
          id={fieldId(`q:${q.id}:prompt`)}
          rows={3}
          value={q.prompt}
          onChange={(e) => set({ prompt: e.target.value })}
          aria-invalid={Boolean(err('prompt'))}
          placeholder="What will this program print?"
        />
        <p className="field-hint">To show code, put ``` on its own line before and after the code.</p>
        <FieldError message={err('prompt')} />
      </div>

      <fieldset className="field options-field" id={fieldId(`q:${q.id}:correct`)}>
        <legend>
          Answer options <span className="muted">— select the correct one</span>
        </legend>
        <ul className="option-edit-list">
          {q.options.map((o, oi) => {
            const optErr = err(`opt:${o.id}`);
            const isCorrect = q.correctOptionId === o.id;
            return (
              <li key={o.id} className={`option-edit ${isCorrect ? 'is-correct' : ''}`}>
                <label className="option-radio" title="Mark as the correct answer">
                  <input
                    type="radio"
                    name={`correct-${q.id}`}
                    checked={isCorrect}
                    onChange={() => set({ correctOptionId: o.id })}
                    aria-label={`Option ${OPTION_LETTERS[oi]} is the correct answer`}
                  />
                  <span className="option-letter">{OPTION_LETTERS[oi]}</span>
                </label>
                <input
                  type="text"
                  id={fieldId(`q:${q.id}:opt:${o.id}`)}
                  className="option-input"
                  value={o.text}
                  onChange={(e) => setOption(o.id, e.target.value)}
                  placeholder={`Option ${OPTION_LETTERS[oi]}`}
                  aria-label={`Option ${OPTION_LETTERS[oi]} text`}
                  aria-invalid={Boolean(optErr)}
                />
                {isCorrect && (
                  <span className="correct-tag">
                    <CheckCircle2 size={14} aria-hidden="true" /> Correct
                  </span>
                )}
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => removeOption(o.id)}
                  disabled={q.options.length <= MIN_OPTIONS}
                  aria-label={`Remove option ${OPTION_LETTERS[oi]}`}
                  title={q.options.length <= MIN_OPTIONS ? `At least ${MIN_OPTIONS} options are needed` : 'Remove option'}
                >
                  <X size={16} />
                </button>
                {optErr && <FieldError message={optErr} />}
              </li>
            );
          })}
        </ul>
        {q.options.length < MAX_OPTIONS && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={addOption}>
            <Plus size={15} aria-hidden="true" /> Add option
          </button>
        )}
        <FieldError message={err('correct')} />
        <FieldError message={err('options')} />
      </fieldset>

      <details className="notes-details" open={noteCount > 0 ? true : undefined}>
        <summary>
          What a wrong answer may reveal <span className="muted">(optional{noteCount ? `, ${noteCount} added` : ''})</span>
        </summary>
        <p className="field-hint">
          If many students pick the same wrong option, ClassLens shows your note on the Learning Gaps page. Example: “thinks a while loop runs only once”.
        </p>
        {q.correctOptionId ? (
          <ul className="note-list">
            {wrongOptions.map((o) => {
              const oi = q.options.findIndex((x) => x.id === o.id);
              return (
                <li key={o.id} className="field">
                  <label htmlFor={`note-${o.id}`}>
                    If a student picks {OPTION_LETTERS[oi]}
                    {o.text.trim() ? ` (“${o.text.trim()}”)` : ''}, it may suggest…
                  </label>
                  <input id={`note-${o.id}`} type="text" value={q.optionNotes?.[o.id] || ''} onChange={(e) => setNote(o.id, e.target.value)} />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="muted small">Mark the correct answer first.</p>
        )}
      </details>

      <div className="field-row">
        <div className="field">
          <label htmlFor={fieldId(`q:${q.id}:explanation`)}>
            Explanation <span className="muted">(shown to students after they submit)</span>
          </label>
          <textarea
            id={fieldId(`q:${q.id}:explanation`)}
            rows={2}
            value={q.explanation}
            onChange={(e) => set({ explanation: e.target.value })}
            placeholder="Why the correct answer is right"
          />
        </div>
        <div className="field field-topic">
          <label htmlFor={fieldId(`q:${q.id}:topic`)}>Topic tag</label>
          <input
            id={fieldId(`q:${q.id}:topic`)}
            type="text"
            list="topic-suggestions"
            value={q.topic}
            onChange={(e) => set({ topic: e.target.value })}
            placeholder="e.g. Loops"
            aria-invalid={Boolean(err('topic'))}
          />
          <p className="field-hint">Questions with the same tag are analysed together.</p>
          <FieldError message={err('topic')} />
        </div>
      </div>
    </li>
  );
}

export default function QuizBuilder({ quizId, notice }) {
  const { state, actions, toast } = useApp();
  const { navigate } = useRouter();
  const confirm = useConfirm();

  const stored = quizId ? state.quizzes.find((q) => q.id === quizId) : null;
  const [draft, setDraft] = useState(() => copyOf(stored || createQuiz()));
  const [baseline, setBaseline] = useState(() => JSON.stringify(draft));
  const [showErrors, setShowErrors] = useState(false);
  const [flash, setFlash] = useState(notice || null);
  const [preview, setPreview] = useState(false);
  const focusQuestion = useRef(null);

  const validation = useMemo(() => validateQuiz(draft), [draft]);
  const dirty = JSON.stringify(draft) !== baseline;
  const isPublished = draft.status === 'published';
  const attemptCount = quizId ? state.attempts.filter((a) => a.quizId === quizId).length : 0;
  const isNew = !stored;

  const topicOptions = useMemo(() => {
    const set = new Map();
    for (const t of SUGGESTED_TOPICS) set.set(t.toLowerCase(), t);
    for (const quiz of state.quizzes) for (const t of quizTopics(quiz)) if (!set.has(t.toLowerCase())) set.set(t.toLowerCase(), t);
    return [...set.values()];
  }, [state.quizzes]);

  useEffect(() => {
    if (!focusQuestion.current) return;
    const el = document.getElementById(fieldId(`q:${focusQuestion.current}:prompt`));
    focusQuestion.current = null;
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.focus({ preventScroll: true });
    }
  });

  /**
   * Save the quiz with the given status. Returns true on success.
   * stay: keep the builder open (a new quiz moves to its own /edit address).
   */
  const persist = (status, { stay = true } = {}) => {
    const timeLimit = parseTimeLimit(draft.timeLimit);
    if (timeLimit === undefined) {
      setShowErrors(true);
      toast(`Time limit must be a whole number of minutes from 1 to ${MAX_TIME_LIMIT}, or left empty.`, 'error');
      return false;
    }
    if (status === 'published' && !validation.valid) {
      setShowErrors(true);
      setFlash(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast(`Fix ${validation.list.length} problem${validation.list.length === 1 ? '' : 's'} before ${isPublished ? 'saving' : 'publishing'}.`, 'error');
      return false;
    }
    const next = {
      ...draft,
      title: draft.title.trim(),
      timeLimit,
      status,
      publishedAt: status === 'published' ? draft.publishedAt || nowIso() : draft.publishedAt,
    };
    actions.saveQuiz(next);
    setDraft(next);
    setBaseline(JSON.stringify(next));
    if (stay && isNew) {
      navigate(`/edit/${next.id}${status === 'published' ? '?notice=published' : ''}`, { force: true, keepScroll: status !== 'published' });
    }
    return true;
  };

  const saveDraft = () => {
    if (persist('draft')) {
      setFlash(null);
      toast(isPublished ? 'Moved to drafts. Students cannot take it until you publish again.' : 'Draft saved in this browser.');
    }
  };

  const publish = () => {
    const wasPublished = isPublished;
    if (persist('published')) {
      setShowErrors(false);
      if (wasPublished) {
        toast('Changes saved. The quiz is still published.');
      } else {
        setFlash('published');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        toast('Quiz published. Students can now take it.');
      }
    }
  };

  useLeaveGuard(dirty, {
    title: 'Leave without saving?',
    message: isPublished
      ? 'You have changed this published quiz but not saved the changes.'
      : 'This quiz has changes that are not saved yet.',
    saveLabel: isPublished ? 'Save changes and leave' : 'Save draft and leave',
    onSave: () => persist(isPublished ? 'published' : 'draft', { stay: false }),
  });

  if (quizId && !stored) {
    return (
      <div className="page">
        <EmptyState
          icon={FileQuestion}
          title="Quiz not found"
          actions={
            <Link to="/quizzes" className="btn btn-primary">
              Go to My Quizzes
            </Link>
          }
        >
          This quiz may have been deleted, or the link is from another browser. Quizzes are saved only in the browser where they were created.
        </EmptyState>
      </div>
    );
  }

  const update = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const updateQuestion = (qid, fn) => setDraft((d) => ({ ...d, questions: d.questions.map((q) => (q.id === qid ? fn(q) : q)) }));
  const addQuestion = () => {
    const last = draft.questions[draft.questions.length - 1];
    const q = createQuestion(last?.topic || '');
    focusQuestion.current = q.id;
    setDraft((d) => ({ ...d, questions: [...d.questions, q] }));
  };
  const moveQuestion = (index, dir) =>
    setDraft((d) => {
      const questions = [...d.questions];
      const target = index + dir;
      if (target < 0 || target >= questions.length) return d;
      [questions[index], questions[target]] = [questions[target], questions[index]];
      return { ...d, questions };
    });
  const duplicateQuestion = (index) => {
    const copy = cloneQuestion(draft.questions[index]);
    focusQuestion.current = copy.id;
    setDraft((d) => {
      const questions = [...d.questions];
      questions.splice(index + 1, 0, copy);
      return { ...d, questions };
    });
  };
  const deleteQuestion = async (index) => {
    const q = draft.questions[index];
    if (!isQuestionEmpty(q)) {
      const ok = await confirm({
        title: `Delete question ${index + 1}?`,
        message: 'The question, its options and explanation will be removed from this quiz. Past attempts keep their own copy of the question.',
        confirmLabel: 'Delete question',
        tone: 'danger',
      });
      if (!ok) return;
    }
    setDraft((d) => ({ ...d, questions: d.questions.filter((x) => x.id !== q.id) }));
  };

  const revert = async () => {
    const ok = await confirm({
      title: 'Discard unsaved changes?',
      message: 'The quiz goes back to how it was when you last saved it.',
      confirmLabel: 'Discard changes',
      tone: 'danger',
    });
    if (ok) {
      setDraft(JSON.parse(baseline));
      setShowErrors(false);
    }
  };

  const jumpTo = (item) => {
    let id = fieldId(item.key);
    if (item.key.endsWith(':options')) id = fieldId(`q:${item.questionId}:correct`);
    const el = document.getElementById(id) || (item.questionId && document.getElementById(`question-${item.questionId}`));
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      if (typeof el.focus === 'function') el.focus({ preventScroll: true });
    }
  };

  const err = (key) => (showErrors ? validation.errors[key] : undefined);
  const grades = draft.grade && !GRADES.includes(draft.grade) ? [draft.grade, ...GRADES] : GRADES;
  const statusLabel = isPublished ? 'Published' : 'Draft';

  return (
    <div className="page page-builder">
      <PageHeader
        eyebrow={isNew ? 'Create quiz' : 'Edit quiz'}
        title={draft.title.trim() || (isNew ? 'New quiz' : 'Untitled quiz')}
        subtitle={
          <span className="builder-status">
            <Badge tone={isPublished ? 'good' : 'neutral'}>{statusLabel}</Badge>
            {draft.isSample && <SampleBadge />}
            <span>
              {draft.questions.length} question{draft.questions.length === 1 ? '' : 's'}
            </span>
            <span className={dirty ? 'unsaved' : 'muted'}>{dirty ? 'Unsaved changes' : isNew ? 'Not saved yet' : 'All changes saved'}</span>
          </span>
        }
      />

      {flash === 'published' && (
        <div className="banner banner-good" role="status">
          <div className="banner-text">
            <strong>
              <CheckCircle2 size={16} aria-hidden="true" /> Quiz published
            </strong>
            <span>Students can now take it on this computer. Each submission is graded and added to the Learning Gaps analysis.</span>
          </div>
          <div className="banner-actions">
            <Link to={`/take/${draft.id}`} className="btn btn-primary btn-sm">
              <PlayCircle size={15} aria-hidden="true" /> Take quiz now
            </Link>
            <Link to="/quizzes" className="btn btn-secondary btn-sm">
              My Quizzes
            </Link>
          </div>
        </div>
      )}
      {flash === 'followup' && (
        <div className="banner banner-info" role="status">
          <div className="banner-text">
            <strong>
              <Info size={16} aria-hidden="true" /> Follow-up quiz created as a draft
            </strong>
            <span>
              ClassLens copied existing questions from your quizzes on {draft.origin?.topics?.join(', ') || 'the selected topics'}. No new questions were written. Review them, add your own if you like, then publish.
            </span>
          </div>
          <button type="button" className="icon-btn" onClick={() => setFlash(null)} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}
      {attemptCount > 0 && (
        <div className="banner banner-warn">
          <div className="banner-text">
            <strong>
              <AlertTriangle size={16} aria-hidden="true" /> {attemptCount} attempt{attemptCount === 1 ? ' has' : 's have'} already been recorded on this quiz
            </strong>
            <span>
              Past attempts keep the questions exactly as students saw them, so their scores will not change. New attempts use your edited version. For a substantially different quiz, use Duplicate instead.
            </span>
          </div>
        </div>
      )}

      {showErrors && !validation.valid && (
        <section className="validation" aria-labelledby="validation-title" tabIndex={-1}>
          <h2 id="validation-title">
            <AlertTriangle size={17} aria-hidden="true" /> {validation.list.length} thing{validation.list.length === 1 ? '' : 's'} to fix before {isPublished ? 'saving' : 'publishing'}
          </h2>
          <ul>
            {validation.list.slice(0, 12).map((item) => (
              <li key={item.key}>
                <button type="button" className="link-btn" onClick={() => jumpTo(item)}>
                  {item.message}
                </button>
              </li>
            ))}
            {validation.list.length > 12 && <li className="muted">…and {validation.list.length - 12} more, highlighted below.</li>}
          </ul>
        </section>
      )}

      <section className="card" aria-labelledby="details-title">
        <h2 className="card-title" id="details-title">
          Quiz details
        </h2>
        <div className="form-grid">
          <div className="field span-2">
            <label htmlFor={fieldId('title')}>Title</label>
            <input
              id={fieldId('title')}
              type="text"
              value={draft.title}
              onChange={(e) => update({ title: e.target.value })}
              placeholder="e.g. Loops — Unit Test 2"
              aria-invalid={Boolean(err('title'))}
              maxLength={140}
            />
            <FieldError message={err('title')} />
          </div>
          <div className="field span-2">
            <label htmlFor={fieldId('description')}>
              Instructions for students <span className="muted">(optional)</span>
            </label>
            <textarea
              id={fieldId('description')}
              rows={2}
              value={draft.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="e.g. Answer every question. You can go back and change answers before submitting."
            />
          </div>
          <div className="field">
            <label htmlFor={fieldId('grade')}>Class / grade</label>
            <select id={fieldId('grade')} value={draft.grade} onChange={(e) => update({ grade: e.target.value })} aria-invalid={Boolean(err('grade'))}>
              <option value="">Choose…</option>
              {grades.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <FieldError message={err('grade')} />
          </div>
          <div className="field">
            <label htmlFor={fieldId('subject')}>Subject</label>
            <input id={fieldId('subject')} type="text" value={draft.subject} onChange={(e) => update({ subject: e.target.value })} aria-invalid={Boolean(err('subject'))} />
            <FieldError message={err('subject')} />
          </div>
          <div className="field">
            <label htmlFor={fieldId('chapter')}>Topic / chapter</label>
            <input
              id={fieldId('chapter')}
              type="text"
              value={draft.chapter}
              onChange={(e) => update({ chapter: e.target.value })}
              placeholder="e.g. Chapter 5: Loops in Python"
              aria-invalid={Boolean(err('chapter'))}
            />
            <FieldError message={err('chapter')} />
          </div>
          <div className="field">
            <label htmlFor={fieldId('timeLimit')}>
              Time limit in minutes <span className="muted">(optional)</span>
            </label>
            <input
              id={fieldId('timeLimit')}
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_TIME_LIMIT}
              step={1}
              value={draft.timeLimit ?? ''}
              onChange={(e) => update({ timeLimit: e.target.value === '' ? null : e.target.value })}
              placeholder="No limit"
              aria-invalid={Boolean(err('timeLimit'))}
            />
            <FieldError message={err('timeLimit')} />
          </div>
        </div>
      </section>

      <section aria-labelledby="questions-title">
        <div className="section-head">
          <h2 id="questions-title">
            Questions <span className="count-pill">{draft.questions.length}</span>
          </h2>
          <p className="muted small">Each question needs the question text, at least {MIN_OPTIONS} options, one correct answer and a topic tag.</p>
        </div>
        {showErrors && validation.errors.questions && <FieldError message={validation.errors.questions} />}
        <datalist id="topic-suggestions">
          {topicOptions.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <ol className="q-editor-list">
          {draft.questions.map((q, i) => (
            <QuestionEditor
              key={q.id}
              question={q}
              index={i}
              count={draft.questions.length}
              errors={validation.errors}
              showErrors={showErrors}
              onChange={(fn) => updateQuestion(q.id, fn)}
              onMove={(dir) => moveQuestion(i, dir)}
              onDuplicate={() => duplicateQuestion(i)}
              onDelete={() => deleteQuestion(i)}
            />
          ))}
        </ol>
        {draft.questions.length === 0 && (
          <EmptyState icon={FileQuestion} title="No questions yet">
            Add a question to get started.
          </EmptyState>
        )}
        <button type="button" className="btn btn-secondary add-question" onClick={addQuestion}>
          <Plus size={17} aria-hidden="true" /> Add question
        </button>
      </section>

      <div className="action-bar" role="region" aria-label="Save and publish">
        <span className="action-bar-status">
          <Badge tone={isPublished ? 'good' : 'neutral'}>{statusLabel}</Badge>
          <span>
            {draft.questions.length} question{draft.questions.length === 1 ? '' : 's'}
          </span>
          {dirty && <span className="unsaved">Unsaved changes</span>}
          {!validation.valid && !showErrors && <span className="muted small hide-sm">{validation.list.length} item{validation.list.length === 1 ? '' : 's'} to complete before publishing</span>}
        </span>
        <span className="action-bar-buttons">
          {dirty && !isNew && (
            <button type="button" className="btn btn-ghost" onClick={revert}>
              <Undo2 size={16} aria-hidden="true" /> <span className="hide-sm">Discard</span>
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={() => setPreview(true)} disabled={!draft.questions.length}>
            <Eye size={16} aria-hidden="true" /> Preview
          </button>
          <button type="button" className="btn btn-secondary" onClick={saveDraft}>
            <Save size={16} aria-hidden="true" /> {isPublished ? 'Move to drafts' : 'Save draft'}
          </button>
          <button type="button" className="btn btn-primary" onClick={publish}>
            <Send size={16} aria-hidden="true" /> {isPublished ? 'Save changes' : 'Publish'}
          </button>
        </span>
      </div>

      {preview && <QuizPreview quiz={draft} onClose={() => setPreview(false)} />}
    </div>
  );
}
