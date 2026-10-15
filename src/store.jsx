import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { STORAGE_KEY, emptyState, loadState, sanitizeState, saveState, seededState } from './lib/storage.js';
import { SAMPLE_QUIZ_ID } from './lib/sampleData.js';
import { nowIso } from './lib/model.js';

const AppContext = createContext(null);

function reducer(state, action) {
  switch (action.type) {
    case 'saveQuiz': {
      const exists = state.quizzes.some((q) => q.id === action.quiz.id);
      const quizzes = exists
        ? state.quizzes.map((q) => (q.id === action.quiz.id ? action.quiz : q))
        : [action.quiz, ...state.quizzes];
      return { ...state, quizzes };
    }
    case 'deleteQuiz':
      return {
        ...state,
        quizzes: state.quizzes.filter((q) => q.id !== action.id),
        attempts: state.attempts.filter((a) => a.quizId !== action.id),
      };
    case 'addAttempt':
      if (state.attempts.some((a) => a.id === action.attempt.id)) return state; // never record twice
      return { ...state, attempts: [...state.attempts, action.attempt] };
    case 'deleteAttempt':
      return { ...state, attempts: state.attempts.filter((a) => a.id !== action.id) };
    case 'setRevision': {
      const revision = { ...state.revision };
      if (action.value === null) delete revision[action.key];
      else revision[action.key] = action.value;
      return { ...state, revision };
    }
    case 'setSettings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'removeSample': {
      const sampleIds = new Set(state.quizzes.filter((q) => q.isSample).map((q) => q.id));
      sampleIds.add(SAMPLE_QUIZ_ID);
      return {
        ...state,
        quizzes: state.quizzes.filter((q) => !q.isSample),
        attempts: state.attempts.filter((a) => !a.isSample && !sampleIds.has(a.quizId)),
      };
    }
    case 'restoreSample': {
      // Teacher-recorded attempts on the sample quiz are kept: each attempt stores its own copy of the questions.
      const fresh = action.sample;
      return {
        ...state,
        quizzes: [...fresh.quizzes, ...state.quizzes.filter((q) => !q.isSample && q.id !== SAMPLE_QUIZ_ID)],
        attempts: [...fresh.attempts, ...state.attempts.filter((a) => !a.isSample)],
        settings: { ...state.settings, includeSample: true },
      };
    }
    case 'replaceAll':
      return action.state;
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const initial = useMemo(() => loadState(), []);
  const [state, dispatch] = useReducer(reducer, initial.state);
  const [notice, setNotice] = useState(initial.notice);
  const [toasts, setToasts] = useState([]);
  const skipSave = useRef(false);
  const firstSave = useRef(true);

  const toast = useCallback((message, tone = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  // Persist every change.
  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    const ok = saveState(state);
    if (!ok && !firstSave.current) toast('Could not save to this browser. Storage may be full or blocked.', 'error');
    firstSave.current = false;
  }, [state, toast]);

  // Keep other open tabs in sync.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY || e.newValue === null) return;
      try {
        skipSave.current = true;
        dispatch({ type: 'replaceAll', state: sanitizeState(JSON.parse(e.newValue)) });
      } catch {
        skipSave.current = false;
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const actions = useMemo(
    () => ({
      saveQuiz: (quiz) => dispatch({ type: 'saveQuiz', quiz: { ...quiz, updatedAt: nowIso() } }),
      deleteQuiz: (id) => dispatch({ type: 'deleteQuiz', id }),
      addAttempt: (attempt) => dispatch({ type: 'addAttempt', attempt }),
      deleteAttempt: (id) => dispatch({ type: 'deleteAttempt', id }),
      setRevision: (key, value) => dispatch({ type: 'setRevision', key, value }),
      setSettings: (patch) => dispatch({ type: 'setSettings', patch }),
      removeSample: () => dispatch({ type: 'removeSample' }),
      restoreSample: () => {
        const s = seededState();
        dispatch({ type: 'restoreSample', sample: { quizzes: s.quizzes, attempts: s.attempts } });
      },
      clearAll: () => dispatch({ type: 'replaceAll', state: emptyState() }),
      importAll: (raw) => dispatch({ type: 'replaceAll', state: sanitizeState(raw) }),
    }),
    [],
  );

  const value = useMemo(
    () => ({ state, actions, toast, toasts, notice, dismissNotice: () => setNotice(null) }),
    [state, actions, toast, toasts, notice],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
