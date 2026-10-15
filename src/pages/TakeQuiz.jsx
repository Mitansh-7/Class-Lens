import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Circle, Clock, FileQuestion, ListChecks, Pencil, PlayCircle, Send } from 'lucide-react';
import { useApp } from '../store.jsx';
import { useLeaveGuard, useRouter } from '../router.jsx';
import { OPTION_LETTERS, quizTopics, uid, nowIso } from '../lib/model.js';
import { gradeAttempt } from '../lib/scoring.js';
import { Badge, EmptyState, Link, Modal, ProgressBar, RichText, SampleBadge, plainText, useConfirm } from '../components/ui.jsx';
import { AttemptDetails } from './AttemptResult.jsx';

function clock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Runs a quiz: intro → questions → review → submit.
 * mode 'live' records an attempt through onSubmit; mode 'preview' grades locally and saves nothing.
 */
export function QuizPlayer({ quiz, mode = 'live', onSubmit, onStart, onExit }) {
  const preview = mode === 'preview';
  const confirm = useConfirm();
  const [phase, setPhase] = useState('intro'); // intro | question | review | result
  const [name, setName] = useState('');
  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [previewResult, setPreviewResult] = useState(null);
  const submitted = useRef(false);
  const attemptId = useRef(uid('att'));
  const cardRef = useRef(null);

  const questions = quiz.questions;
  const total = questions.length;
  const answeredCount = questions.filter((q) => answers[q.id]).length;
  const unanswered = questions.map((q, i) => ({ q, i })).filter(({ q }) => !answers[q.id]);
  const timeLimitSeconds = !preview && quiz.timeLimit ? quiz.timeLimit * 60 : null;
  const remaining = timeLimitSeconds && startedAt ? timeLimitSeconds - (now - Date.parse(startedAt)) / 1000 : null;

  const finish = (timedOut = false) => {
    if (submitted.current) return; // never submit twice
    submitted.current = true;
    const meta = { id: attemptId.current, studentName: name, startedAt, submittedAt: nowIso(), timedOut };
    if (preview) {
      setPreviewResult(gradeAttempt(quiz, answers, { ...meta, studentName: 'Preview' }));
      setPhase('result');
      return;
    }
    onSubmit(answers, meta);
  };

  useEffect(() => {
    if (!timeLimitSeconds || !startedAt || phase === 'result') return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [timeLimitSeconds, startedAt, phase]);

  useEffect(() => {
    if (remaining !== null && remaining <= 0) finish(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  useEffect(() => {
    if (phase === 'question') cardRef.current?.focus({ preventScroll: true });
  }, [index, phase]);

  const start = () => {
    setStartedAt(nowIso());
    setNow(Date.now());
    setPhase('question');
    onStart?.();
  };

  const goTo = (i) => {
    setIndex(i);
    setPhase('question');
  };

  const choose = (qid, optId) => setAnswers((a) => ({ ...a, [qid]: optId }));
  const clear = (qid) =>
    setAnswers((a) => {
      const next = { ...a };
      delete next[qid];
      return next;
    });

  const submit = async () => {
    const n = unanswered.length;
    const ok = await confirm({
      title: preview ? 'Submit preview?' : 'Submit the quiz?',
      message: n
        ? `${n} question${n === 1 ? ' is' : 's are'} still unanswered and will be marked incorrect. After submitting, answers cannot be changed.`
        : 'All questions are answered. After submitting, answers cannot be changed.',
      confirmLabel: n ? `Submit with ${n} unanswered` : 'Submit answers',
      cancelLabel: 'Keep working',
    });
    if (ok) finish(false);
  };

  if (!total) {
    return (
      <EmptyState icon={FileQuestion} title="This quiz has no questions yet">
        Add at least one question in the quiz builder.
      </EmptyState>
    );
  }

  if (phase === 'result' && previewResult) {
    return (
      <div className="player">
        <div className="banner banner-info">
          <span>This was a preview. Nothing was saved and it does not count in the analysis.</span>
        </div>
        <AttemptDetails attempt={previewResult} />
        <div className="player-nav">
          <button type="button" className="btn btn-secondary" onClick={onExit}>
            Close preview
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'intro') {
    const topics = quizTopics(quiz);
    return (
      <div className="player player-intro">
        <div className="eyebrow">{preview ? 'Preview — answers are not saved' : 'Quiz'}</div>
        <h1 className="player-title">
          {quiz.title || 'Untitled quiz'} {quiz.isSample && <SampleBadge />}
        </h1>
        <p className="muted">{[quiz.grade, quiz.subject, quiz.chapter].filter(Boolean).join(' · ')}</p>
        <ul className="intro-facts">
          <li>
            <ListChecks size={16} aria-hidden="true" /> {total} question{total === 1 ? '' : 's'}
          </li>
          <li>
            <Clock size={16} aria-hidden="true" />{' '}
            {quiz.timeLimit ? `${quiz.timeLimit} minute time limit${preview ? ' (not enforced in preview)' : ''}` : 'No time limit'}
          </li>
        </ul>
        {quiz.description?.trim() && (
          <div className="intro-note">
            <strong>From your teacher</strong>
            <p>{quiz.description}</p>
          </div>
        )}
        <div className="intro-instructions">
          <strong>Instructions</strong>
          <ul>
            <li>Choose one answer for each question.</li>
            <li>Use Previous and Next, or the question numbers, to move around. You can change answers before submitting.</li>
            <li>Questions left unanswered are marked incorrect.</li>
            {timeLimitSeconds ? <li>When the time runs out, the quiz is submitted automatically.</li> : null}
            <li>After submitting you will see your score and an explanation for each question.</li>
          </ul>
        </div>
        {topics.length > 0 && (
          <p className="small muted">
            Topics: {topics.join(', ')}
          </p>
        )}
        {!preview && (
          <div className="field intro-name">
            <label htmlFor="student-name">
              Student name or roll number <span className="muted">(optional)</span>
            </label>
            <input id="student-name" type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="e.g. Roll No. 14" autoComplete="off" />
          </div>
        )}
        <div className="player-nav">
          {onExit && (
            <button type="button" className="btn btn-secondary" onClick={onExit}>
              {preview ? 'Close preview' : 'Back'}
            </button>
          )}
          <button type="button" className="btn btn-primary btn-lg" onClick={start}>
            <PlayCircle size={18} aria-hidden="true" /> Start quiz
          </button>
        </div>
      </div>
    );
  }

  const timer = remaining !== null && (
    <span className={`timer ${remaining < 60 ? 'is-low' : ''}`} role="timer" aria-live={remaining < 60 ? 'polite' : 'off'}>
      <Clock size={15} aria-hidden="true" /> {clock(remaining)} left
    </span>
  );

  const navigator = (
    <nav className="q-nav" aria-label="Questions">
      {questions.map((q, i) => {
        const answered = Boolean(answers[q.id]);
        const current = phase === 'question' && i === index;
        return (
          <button
            key={q.id}
            type="button"
            className={`q-nav-btn ${answered ? 'is-answered' : ''} ${current ? 'is-current' : ''}`}
            onClick={() => goTo(i)}
            aria-label={`Question ${i + 1}, ${answered ? 'answered' : 'not answered'}`}
            aria-current={current ? 'step' : undefined}
          >
            {i + 1}
          </button>
        );
      })}
      <button type="button" className={`q-nav-btn q-nav-review ${phase === 'review' ? 'is-current' : ''}`} onClick={() => setPhase('review')}>
        Review
      </button>
    </nav>
  );

  const header = (
    <div className="player-head">
      <div className="player-head-row">
        <strong className="player-head-title">
          {quiz.title || 'Untitled quiz'}
          {preview && <Badge tone="accent">Preview</Badge>}
        </strong>
        {timer}
      </div>
      <div className="player-progress">
        <ProgressBar value={(answeredCount / total) * 100} label="Questions answered" />
        <span className="small muted tabular">
          {answeredCount} of {total} answered
        </span>
      </div>
      {navigator}
    </div>
  );

  if (phase === 'review') {
    return (
      <div className="player">
        {header}
        <section className="player-card" aria-labelledby="review-title">
          <h2 id="review-title">Review your answers</h2>
          {unanswered.length > 0 ? (
            <div className="banner banner-warn">
              <AlertTriangle size={16} aria-hidden="true" />
              <span>
                {unanswered.length} question{unanswered.length === 1 ? ' is' : 's are'} unanswered: {unanswered.map(({ i }) => `Q${i + 1}`).join(', ')}. Unanswered questions are marked incorrect.
              </span>
            </div>
          ) : (
            <p className="good-text">
              <CheckCircle2 size={16} aria-hidden="true" /> All {total} questions are answered.
            </p>
          )}
          <ol className="review-list">
            {questions.map((q, i) => {
              const optId = answers[q.id];
              const oi = q.options.findIndex((o) => o.id === optId);
              return (
                <li key={q.id}>
                  <button type="button" className={`review-item ${optId ? '' : 'is-missing'}`} onClick={() => goTo(i)}>
                    <span className="review-num">Q{i + 1}</span>
                    <span className="review-text">
                      <span className="review-prompt">{plainText(q.prompt, 90)}</span>
                      <span className="review-answer">
                        {optId ? (
                          <>
                            <CheckCircle2 size={14} aria-hidden="true" /> {OPTION_LETTERS[oi]}. {q.options[oi]?.text}
                          </>
                        ) : (
                          <>
                            <Circle size={14} aria-hidden="true" /> Not answered
                          </>
                        )}
                      </span>
                    </span>
                    <Pencil size={15} aria-hidden="true" className="review-edit" />
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
        <div className="player-nav">
          <button type="button" className="btn btn-secondary" onClick={() => goTo(total - 1)}>
            <ArrowLeft size={16} aria-hidden="true" /> Back to questions
          </button>
          <button type="button" className="btn btn-primary btn-lg" onClick={submit}>
            <Send size={17} aria-hidden="true" /> Submit quiz
          </button>
        </div>
      </div>
    );
  }

  const q = questions[index];
  const selected = answers[q.id];
  return (
    <div className="player">
      {header}
      <section className="player-card" aria-labelledby={`qtitle-${q.id}`} tabIndex={-1} ref={cardRef}>
        <div className="player-q-meta">
          <span id={`qtitle-${q.id}`} className="player-q-num">
            Question {index + 1} of {total}
          </span>
          {q.topic?.trim() && <span className="chip">{q.topic.trim()}</span>}
        </div>
        <RichText text={q.prompt || '(No question text yet)'} className="player-prompt" />
        <div className="answer-list" role="radiogroup" aria-labelledby={`qtitle-${q.id}`}>
          {q.options.map((o, oi) => (
            <label key={o.id} className={`answer ${selected === o.id ? 'is-selected' : ''}`}>
              <input type="radio" name={`answer-${q.id}`} value={o.id} checked={selected === o.id} onChange={() => choose(q.id, o.id)} />
              <span className="answer-letter" aria-hidden="true">
                {OPTION_LETTERS[oi]}
              </span>
              <span className="answer-text">{o.text || <span className="muted">(empty option)</span>}</span>
            </label>
          ))}
        </div>
        {selected && (
          <button type="button" className="link-btn small" onClick={() => clear(q.id)}>
            Clear my answer
          </button>
        )}
      </section>
      <div className="player-nav">
        <button type="button" className="btn btn-secondary" onClick={() => setIndex((i) => i - 1)} disabled={index === 0}>
          <ArrowLeft size={16} aria-hidden="true" /> Previous
        </button>
        {index < total - 1 ? (
          <button type="button" className="btn btn-primary" onClick={() => setIndex((i) => i + 1)}>
            Next <ArrowRight size={16} aria-hidden="true" />
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => setPhase('review')}>
            Review answers <ArrowRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

/** Teacher preview of a quiz (saved or not) in a dialog. Nothing is recorded. */
export function QuizPreview({ quiz, onClose }) {
  return (
    <Modal title="Preview" onClose={onClose} size="lg" labelledBy="preview-title">
      <QuizPlayer quiz={quiz} mode="preview" onExit={onClose} />
    </Modal>
  );
}

export default function TakeQuiz({ quizId }) {
  const { state, actions } = useApp();
  const { navigate } = useRouter();
  const live = state.quizzes.find((q) => q.id === quizId);
  // Students answer the version of the quiz that was open when they started.
  const [snapshot, setSnapshot] = useState(live || null);
  const [inProgress, setInProgress] = useState(false);
  const quiz = useMemo(() => (inProgress ? snapshot : live), [inProgress, snapshot, live]);

  useLeaveGuard(inProgress, {
    title: 'Leave this quiz?',
    message: 'The answers on this quiz have not been submitted. If you leave now they will be lost.',
    leaveLabel: 'Leave and discard answers',
  });

  if (!quiz) {
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
          This quiz may have been deleted. Quizzes are saved only in the browser where they were created.
        </EmptyState>
      </div>
    );
  }

  if (quiz.status !== 'published') {
    return (
      <div className="page">
        <EmptyState
          icon={FileQuestion}
          title="This quiz is still a draft"
          actions={
            <Link to={`/edit/${quiz.id}`} className="btn btn-primary">
              <Pencil size={16} aria-hidden="true" /> Open in the builder
            </Link>
          }
        >
          Publish the quiz before students take it. You can use Preview in the builder to try it without saving answers.
        </EmptyState>
      </div>
    );
  }

  const onSubmit = (answers, meta) => {
    const attempt = gradeAttempt(snapshot || quiz, answers, meta);
    actions.addAttempt(attempt);
    setInProgress(false);
    navigate(`/attempt/${attempt.id}?fresh=1`, { force: true });
  };

  return (
    <div className="page page-take">
      <QuizPlayer
        quiz={quiz}
        mode="live"
        onStart={() => {
          setSnapshot(live);
          setInProgress(true);
        }}
        onSubmit={onSubmit}
        onExit={() => navigate('/quizzes')}
      />
    </div>
  );
}
