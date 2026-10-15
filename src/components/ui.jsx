import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleDashed, HelpCircle, X, XCircle } from 'lucide-react';
import { useRouter } from '../router.jsx';
import { MASTERY } from '../lib/analysis.js';

export function Link({ to, children, className = '', ...rest }) {
  const { navigate } = useRouter();
  return (
    <a
      href={`#${to}`}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function Badge({ tone = 'neutral', children, icon: Icon, title }) {
  return (
    <span className={`badge badge-${tone}`} title={title}>
      {Icon && <Icon size={13} aria-hidden="true" />}
      {children}
    </span>
  );
}

export function SampleBadge() {
  return (
    <Badge tone="sample" title="Demonstration data — not real student results">
      Sample
    </Badge>
  );
}

const MASTERY_ICON = { secure: CheckCircle2, developing: AlertTriangle, attention: XCircle, none: CircleDashed };

export function MasteryBadge({ mastery }) {
  const m = MASTERY[mastery] || MASTERY.none;
  return (
    <Badge tone={m.tone} icon={MASTERY_ICON[mastery]} title={m.rule}>
      {m.label}
    </Badge>
  );
}

export function HelpTip({ text, label = 'More information' }) {
  return (
    <span className="helptip" tabIndex={0} aria-label={`${label}: ${text}`}>
      <HelpCircle size={15} aria-hidden="true" />
      <span className="helptip-bubble" role="tooltip">
        {text}
      </span>
    </span>
  );
}

export function EmptyState({ icon: Icon, title, children, actions }) {
  return (
    <div className="empty-state">
      {Icon && (
        <div className="empty-icon">
          <Icon size={22} aria-hidden="true" />
        </div>
      )}
      <h3>{title}</h3>
      {children && <div className="empty-body">{children}</div>}
      {actions && <div className="empty-actions">{actions}</div>}
    </div>
  );
}

export function Card({ title, subtitle, actions, children, className = '', help }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-head">
          <div>
            {title && (
              <h2 className="card-title">
                {title}
                {help && <HelpTip text={help} />}
              </h2>
            )}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Switch({ checked, onChange, label, description }) {
  return (
    <label className="switch">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch-track" aria-hidden="true">
        <span className="switch-thumb" />
      </span>
      <span className="switch-text">
        <span className="switch-label">{label}</span>
        {description && <span className="switch-desc">{description}</span>}
      </span>
    </label>
  );
}

/** Renders text with ```code``` blocks as monospaced boxes. */
export function RichText({ text, className = '' }) {
  const parts = String(text || '').split(/```[a-zA-Z]*\n?/);
  return (
    <div className={`richtext ${className}`}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <pre key={i} className="code-block">
            <code>{part.replace(/\n$/, '')}</code>
          </pre>
        ) : (
          part.trim() && (
            <p key={i} className="richtext-p">
              {part.trim()}
            </p>
          )
        ),
      )}
    </div>
  );
}

/** Plain one-line version of a prompt for lists. */
export function plainText(text, max = 110) {
  const clean = String(text || '').replace(/```[a-zA-Z]*\n?/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return 'Untitled question';
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export function Modal({ title, children, footer, onClose, size = 'md', labelledBy }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    const node = ref.current;
    const focusable = node?.querySelector('[data-autofocus]') || node?.querySelector('button, [href], input, select, textarea');
    focusable?.focus();
    const onKey = (e) => {
      // Only the top-most dialog reacts (a confirmation can open above a preview).
      const all = document.querySelectorAll('.modal');
      if (node && all[all.length - 1] !== node) return;
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'Tab' && node) {
        const items = [...node.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((el) => !el.disabled);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', onKey);
      if (!document.querySelector('.modal')) document.body.classList.remove('modal-open');
      prev?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const titleId = labelledBy || 'modal-title';
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref}>
        <div className="modal-head">
          <h2 id={titleId}>{title}</h2>
          {onClose && (
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          )}
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        setDialog({ ...opts, resolve });
      }),
    [],
  );
  const close = (result) => {
    dialog?.resolve(result);
    setDialog(null);
  };
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <Modal
          title={dialog.title}
          onClose={() => close(false)}
          size="sm"
          labelledBy="confirm-title"
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => close(false)} data-autofocus>
                {dialog.cancelLabel || 'Cancel'}
              </button>
              <button type="button" className={`btn ${dialog.tone === 'danger' ? 'btn-danger' : 'btn-primary'}`} onClick={() => close(true)}>
                {dialog.confirmLabel || 'Confirm'}
              </button>
            </>
          }
        >
          <div className="confirm-message">{dialog.message}</div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ProgressBar({ value, label }) {
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)} aria-label={label}>
      <div className="progress-fill" style={{ width: `${v}%` }} />
    </div>
  );
}

export function formatDate(isoString, withTime = true) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, withTime ? { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDuration(seconds) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m} min ${s ? `${s} s` : ''}`.trim() : `${s} s`;
}
