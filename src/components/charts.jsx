import { AlertTriangle, CheckCircle2, CircleDashed, XCircle } from 'lucide-react';
import { DEVELOPING_AT, MASTERY, SECURE_AT } from '../lib/analysis.js';

const ICON = { secure: CheckCircle2, developing: AlertTriangle, attention: XCircle, none: CircleDashed };

/**
 * Horizontal bar chart of topic accuracy. Bar colour shows the mastery band;
 * every bar also carries an icon and the band appears in the legend, so colour
 * is never the only cue.
 */
export function TopicBars({ topics, emptyText = 'No topics to show yet.' }) {
  if (!topics.length) return <p className="muted small">{emptyText}</p>;
  return (
    <div className="topic-bars">
      <div className="tb-axis" aria-hidden="true">
        <span />
        <div className="tb-axis-scale">
          <span style={{ left: '0%' }}>0%</span>
          <span style={{ left: `${DEVELOPING_AT}%` }}>{DEVELOPING_AT}%</span>
          <span style={{ left: `${SECURE_AT}%` }}>{SECURE_AT}%</span>
          <span style={{ left: '100%' }}>100%</span>
        </div>
        <span />
      </div>
      <ul className="tb-list">
        {topics.map((t) => {
          const Icon = ICON[t.mastery];
          const m = MASTERY[t.mastery];
          const summary =
            t.accuracy === null
              ? `${t.name}: no answers yet`
              : `${t.name}: ${Math.round(t.accuracy)}% correct, ${t.correct} of ${t.total} answers, ${m.label}${t.limitedEvidence ? ', limited evidence' : ''}`;
          return (
            <li key={t.key} className="tb-row" tabIndex={0} aria-label={summary}>
              <div className="tb-label">
                <span className="tb-name">{t.name}</span>
                {t.limitedEvidence && <span className="tb-flag">limited evidence</span>}
              </div>
              <div className="tb-track" aria-hidden="true">
                <span className="tb-threshold" style={{ left: `${DEVELOPING_AT}%` }} />
                <span className="tb-threshold" style={{ left: `${SECURE_AT}%` }} />
                {t.accuracy !== null && (
                  <span className={`tb-fill tone-${m.tone}`} style={{ width: `${Math.max(t.accuracy, 1.5)}%` }} />
                )}
              </div>
              <div className="tb-value" aria-hidden="true">
                <Icon size={14} className={`ico-${m.tone}`} />
                {t.accuracy === null ? (
                  <span className="muted">No answers yet</span>
                ) : (
                  <>
                    <strong>{Math.round(t.accuracy)}%</strong>
                    <span className="muted tabular">
                      {t.correct}/{t.total}
                    </span>
                  </>
                )}
              </div>
              <div className="tb-tip" role="tooltip">
                <strong>{t.name}</strong>
                {t.accuracy === null ? (
                  <span>No student answers yet.</span>
                ) : (
                  <>
                    <span>
                      {t.correct} of {t.total} answers correct ({Math.round(t.accuracy)}%)
                    </span>
                    <span>
                      {m.label} · {t.questionCount} question{t.questionCount === 1 ? '' : 's'}
                    </span>
                    {t.unanswered > 0 && <span>{t.unanswered} left unanswered</span>}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <MasteryLegend />
    </div>
  );
}

export function MasteryLegend() {
  return (
    <div className="legend" aria-label="Mastery bands">
      {['attention', 'developing', 'secure'].map((k) => {
        const Icon = ICON[k];
        return (
          <span key={k} className="legend-item">
            <span className={`legend-swatch tone-${MASTERY[k].tone}`} aria-hidden="true" />
            <Icon size={13} className={`ico-${MASTERY[k].tone}`} aria-hidden="true" />
            <span>
              {MASTERY[k].label} <span className="muted">({MASTERY[k].rule.toLowerCase()})</span>
            </span>
          </span>
        );
      })}
    </div>
  );
}

/** How the answers to one question were spread across its options. */
export function OptionBars({ options, total }) {
  return (
    <ul className="option-bars">
      {options.map((o, i) => {
        const share = total ? (o.count / total) * 100 : 0;
        return (
          <li key={o.id} className={o.isCorrect ? 'is-correct' : ''}>
            <span className="ob-letter">{String.fromCharCode(65 + i)}</span>
            <span className="ob-text">
              {o.text}
              {o.isCorrect && <span className="ob-correct"> (correct)</span>}
            </span>
            <span className="ob-track" aria-hidden="true">
              <span className={`ob-fill ${o.isCorrect ? 'tone-good' : 'tone-neutral'}`} style={{ width: `${share}%` }} />
            </span>
            <span className="ob-count tabular">
              {o.count} <span className="muted">({Math.round(share)}%)</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
