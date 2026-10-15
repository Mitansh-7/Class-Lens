import { useEffect, useState } from 'react';
import { ClipboardCheck, FilePlus2, HardDrive, Info, LayoutDashboard, Library, Menu, ScanSearch, X } from 'lucide-react';
import { AppProvider, useApp } from './store.jsx';
import { RouterProvider, useRouter } from './router.jsx';
import { ConfirmProvider, EmptyState, Link, Modal } from './components/ui.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Quizzes from './pages/Quizzes.jsx';
import QuizBuilder from './pages/QuizBuilder.jsx';
import TakeQuiz from './pages/TakeQuiz.jsx';
import AttemptResult from './pages/AttemptResult.jsx';
import LearningGaps from './pages/LearningGaps.jsx';
import RevisionPlanner from './pages/RevisionPlanner.jsx';
import About from './pages/About.jsx';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, sections: ['dashboard'] },
  { to: '/quizzes', label: 'My Quizzes', icon: Library, sections: ['quizzes', 'edit', 'take', 'attempt'] },
  { to: '/create', label: 'Create Quiz', icon: FilePlus2, sections: ['create'] },
  { to: '/gaps', label: 'Learning Gaps', icon: ScanSearch, sections: ['gaps'] },
  { to: '/planner', label: 'Revision Planner', icon: ClipboardCheck, sections: ['planner'] },
];

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="30" height="30">
          <rect width="32" height="32" rx="8" fill="currentColor" />
          <circle cx="14" cy="14" r="7" fill="none" stroke="#fff" strokeWidth="2.5" />
          <path d="M19 19l6 6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M11 15.5l2 2 4-5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span>
        <span className="brand-name">ClassLens</span>
        <span className="brand-tag">Diagnose. Understand. Improve.</span>
      </span>
    </div>
  );
}

function Sidebar({ open, onClose }) {
  const { route } = useRouter();
  const section = route.segments[0] || 'dashboard';
  return (
    <>
      <div className={`sidebar-scrim ${open ? 'is-open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`sidebar ${open ? 'is-open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-top">
          <Brand />
          <button type="button" className="icon-btn sidebar-close" onClick={onClose} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        <nav>
          <ul className="nav-list">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = item.sections.includes(section);
              return (
                <li key={item.to}>
                  <Link to={item.to} className={`nav-link ${active ? 'is-active' : ''}`} aria-current={active ? 'page' : undefined}>
                    <Icon size={18} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <ul className="nav-list nav-secondary">
            <li>
              <Link to="/about" className={`nav-link ${section === 'about' ? 'is-active' : ''}`} aria-current={section === 'about' ? 'page' : undefined}>
                <Info size={18} aria-hidden="true" />
                <span>How it works &amp; data</span>
              </Link>
            </li>
          </ul>
        </nav>
        <div className="sidebar-foot">
          <HardDrive size={15} aria-hidden="true" />
          <span>Saved in this browser only. Not shared between devices.</span>
        </div>
      </aside>
    </>
  );
}

function LeaveDialog() {
  const { pending, resolvePending } = useRouter();
  if (!pending) return null;
  const g = pending.guard;
  return (
    <Modal
      title={g.title || 'Leave this page?'}
      onClose={() => resolvePending('stay')}
      size="sm"
      labelledBy="leave-title"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={() => resolvePending('stay')} data-autofocus>
            Stay here
          </button>
          {g.onSave && (
            <button type="button" className="btn btn-primary" onClick={() => resolvePending('save')}>
              {g.saveLabel || 'Save and leave'}
            </button>
          )}
          <button type="button" className="btn btn-danger-ghost" onClick={() => resolvePending('leave')}>
            {g.leaveLabel || 'Leave without saving'}
          </button>
        </>
      }
    >
      <p className="confirm-message">{g.message || 'Your changes on this page have not been saved.'}</p>
    </Modal>
  );
}

function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

function StorageNotice() {
  const { notice, dismissNotice } = useApp();
  if (!notice) return null;
  return (
    <div className="banner banner-warn" role="alert">
      <span>{notice}</span>
      <button type="button" className="btn btn-ghost btn-sm" onClick={dismissNotice}>
        Dismiss
      </button>
    </div>
  );
}

function Screen() {
  const { route } = useRouter();
  const [section, id] = route.segments;
  switch (section) {
    case undefined:
    case 'dashboard':
      return <Dashboard />;
    case 'quizzes':
      return <Quizzes />;
    case 'create':
      return <QuizBuilder key="new" quizId={null} />;
    case 'edit':
      return <QuizBuilder key={`edit-${id}`} quizId={id} notice={route.query.notice} />;
    case 'take':
      return <TakeQuiz key={`take-${id}-${route.query.run || ''}`} quizId={id} />;
    case 'attempt':
      return <AttemptResult key={id} attemptId={id} />;
    case 'gaps':
      return <LearningGaps quizFilter={route.query.quiz || 'all'} />;
    case 'planner':
      return <RevisionPlanner />;
    case 'about':
      return <About />;
    default:
      return (
        <EmptyState
          icon={Info}
          title="Page not found"
          actions={
            <Link to="/dashboard" className="btn btn-primary">
              Go to dashboard
            </Link>
          }
        >
          This address does not match a ClassLens page.
        </EmptyState>
      );
  }
}

function Shell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { route } = useRouter();
  const taking = route.segments[0] === 'take';

  useEffect(() => setMenuOpen(false), [route.hash]);

  return (
    <div className={`app ${taking ? 'is-taking' : ''}`}>
      <a href="#main" className="skip-link" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>
        Skip to content
      </a>
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="main-col">
        <header className="topbar">
          <button type="button" className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
          <Brand />
        </header>
        <main id="main" className="main" tabIndex={-1}>
          <StorageNotice />
          <Screen />
        </main>
      </div>
      <LeaveDialog />
      <Toasts />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <RouterProvider>
        <ConfirmProvider>
          <Shell />
        </ConfirmProvider>
      </RouterProvider>
    </AppProvider>
  );
}
