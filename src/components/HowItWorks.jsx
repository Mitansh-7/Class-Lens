import { ClipboardCheck, FilePlus2, PlayCircle, RefreshCcw, ScanSearch, X } from 'lucide-react';

export const STEPS = [
  {
    icon: FilePlus2,
    title: 'Create a quiz',
    text: 'Write multiple-choice questions and tag each one with its topic, such as “Loops” or “Functions”.',
  },
  {
    icon: PlayCircle,
    title: 'Assess',
    text: 'Students take the quiz on a classroom computer. Each submission is graded against your answer key.',
  },
  {
    icon: ScanSearch,
    title: 'Identify gaps',
    text: 'ClassLens groups every answer by topic, shows accuracy, and points out wrong options many students chose.',
  },
  {
    icon: ClipboardCheck,
    title: 'Plan revision',
    text: 'For each weak topic you get a suggested explanation, a class activity and a short task to set.',
  },
  {
    icon: RefreshCcw,
    title: 'Assess again',
    text: 'Build a follow-up quiz from your existing questions on those topics and compare accuracy before and after.',
  },
];

export function HowItWorks({ onHide }) {
  return (
    <section className="how" aria-labelledby="how-title">
      <div className="how-head">
        <h2 id="how-title">How ClassLens works</h2>
        {onHide && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onHide}>
            <X size={15} aria-hidden="true" /> Hide guide
          </button>
        )}
      </div>
      <ol className="how-steps">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={s.title} className="how-step">
              <span className="how-num" aria-hidden="true">
                {i + 1}
              </span>
              <div>
                <strong>
                  <Icon size={16} aria-hidden="true" /> {s.title}
                </strong>
                <p>{s.text}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
