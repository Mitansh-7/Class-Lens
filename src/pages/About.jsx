import { useRef } from 'react';
import { Download, Eraser, FlaskConical, HardDrive, RotateCcw, Trash2, Upload } from 'lucide-react';
import { useApp } from '../store.jsx';
import { HowItWorks } from '../components/HowItWorks.jsx';
import { Card, PageHeader, SampleBadge, Switch, useConfirm } from '../components/ui.jsx';
import { AnalysisRules } from './LearningGaps.jsx';

const OVERVIEW = [
  {
    title: 'The problem',
    text: 'A Computer Science teacher can see that a class scored 55% on a quiz, but not which topics caused it, which wrong ideas students share, or what to re-teach on Monday. Marking by hand and working this out for 40 students takes hours.',
  },
  {
    title: 'The solution',
    text: 'ClassLens tags every question with a topic, grades each submission against the answer key, and groups all answers by topic. It shows topic accuracy, the questions most often missed, and wrong options many students chose, then turns weak topics into a revision plan and a follow-up quiz.',
  },
  {
    title: 'How it differs from a basic quiz app',
    text: 'A basic quiz app stops at a score. ClassLens is built around the teaching cycle: assess → identify gaps → plan revision → assess again. Results are reported per topic and per wrong option, with the evidence for each conclusion, and before/after accuracy once a topic has been re-taught.',
  },
  {
    title: 'Technology',
    text: 'React and Vite, plain CSS and lucide icons. Everything runs in the browser and is saved in localStorage. There is no server, database, login or paid API, so it can be hosted free as a static site (for example on Vercel).',
  },
  {
    title: 'Limitations',
    text: 'Data is stored only in this browser on this device — it is not synchronised between computers or teachers, and clearing browser data deletes it (use Export to keep a copy). Students take quizzes on the teacher’s device or a shared classroom computer; there are no student accounts. Only multiple-choice questions are supported. The analysis is a fixed set of rules, not artificial intelligence, and it has not been evaluated in a classroom study.',
  },
  {
    title: 'Future scope',
    text: 'Optional cloud sync and student links for multi-device classrooms; Punjabi and Hindi interface text; more question types (code output, fill in the blank); class and section tracking over a term; a larger, teacher-reviewed library of re-teaching activities.',
  },
];

function download(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function About() {
  const { state, actions, toast } = useApp();
  const confirm = useConfirm();
  const fileRef = useRef(null);
  const sampleQuizzes = state.quizzes.filter((q) => q.isSample).length;
  const sampleAttempts = state.attempts.filter((a) => a.isSample).length;
  const ownQuizzes = state.quizzes.length - sampleQuizzes;
  const ownAttempts = state.attempts.length - sampleAttempts;
  const hasSample = sampleQuizzes + sampleAttempts > 0;
  const sampleQuizIds = new Set(state.quizzes.filter((q) => q.isSample).map((q) => q.id));
  const ownOnSample = state.attempts.filter((a) => !a.isSample && sampleQuizIds.has(a.quizId)).length;

  const exportData = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    download(`classlens-backup-${stamp}.json`, JSON.stringify(state, null, 2));
    toast('Backup file downloaded.');
  };

  const importData = async (file) => {
    if (!file) return;
    let raw;
    try {
      raw = JSON.parse(await file.text());
    } catch {
      toast('That file is not valid JSON. Choose a ClassLens backup file.', 'error');
      return;
    }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || (!Array.isArray(raw.quizzes) && !Array.isArray(raw.attempts))) {
      toast('That file does not look like a ClassLens backup (no quizzes or attempts found).', 'error');
      return;
    }
    const ok = await confirm({
      title: 'Replace all data with this backup?',
      message: `The backup contains ${Array.isArray(raw.quizzes) ? raw.quizzes.length : 0} quizzes and ${Array.isArray(raw.attempts) ? raw.attempts.length : 0} attempts. Everything currently saved in this browser will be replaced. Export first if you want to keep the current data.`,
      confirmLabel: 'Replace data',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      actions.importAll(raw);
      toast('Backup imported. Any entries that could not be read were skipped.');
    } catch {
      toast('The backup could not be imported.', 'error');
    }
  };

  const removeSample = async () => {
    const ok = await confirm({
      title: 'Remove sample data?',
      message: `This removes the sample quiz and its ${sampleAttempts} fictional attempts${
        ownOnSample ? `, plus ${ownOnSample} attempt${ownOnSample === 1 ? '' : 's'} you recorded on the sample quiz` : ''
      }. Your own quizzes and their attempts are not affected. You can restore the sample at any time.`,
      confirmLabel: 'Remove sample data',
      tone: 'danger',
    });
    if (ok) {
      actions.removeSample();
      toast('Sample data removed.');
    }
  };

  const restoreSample = async () => {
    const ok = await confirm({
      title: hasSample ? 'Reset sample data?' : 'Restore sample data?',
      message: hasSample
        ? 'The sample quiz and its 12 fictional attempts will be reset to their original state. Any edits you made to the sample quiz are lost. Your own quizzes and attempts are not affected.'
        : 'Adds a sample Python quiz with 12 fictional attempts so you can explore the dashboard, Learning Gaps and Revision Planner. It is clearly labelled “Sample” and can be removed again.',
      confirmLabel: hasSample ? 'Reset sample data' : 'Restore sample data',
    });
    if (ok) {
      actions.restoreSample();
      toast(hasSample ? 'Sample data reset.' : 'Sample data restored.');
    }
  };

  const clearAll = async () => {
    const ok = await confirm({
      title: 'Delete all ClassLens data?',
      message: `This permanently deletes all ${state.quizzes.length} quizzes, ${state.attempts.length} attempts and revision progress in this browser, including your own work. This cannot be undone. Export a backup first if you might need it.`,
      confirmLabel: 'Delete everything',
      tone: 'danger',
    });
    if (ok) {
      actions.clearAll();
      toast('All data deleted. ClassLens is now empty.');
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="How ClassLens works"
        subtitle="What ClassLens does, the rules behind its analysis, and where your data is kept."
      />

      <HowItWorks />

      <section className="card" aria-labelledby="overview-title">
        <h2 className="card-title" id="overview-title">
          Project overview
        </h2>
        <div className="overview-grid">
          {OVERVIEW.map((item) => (
            <div key={item.title} className="overview-item">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <AnalysisRules />

      <Card
        title={
          <>
            <HardDrive size={17} aria-hidden="true" /> Your data
          </>
        }
        subtitle="Everything is saved in this browser’s local storage on this device. Nothing is uploaded or shared. Another browser, another computer or a private window will not see these quizzes."
      >
        <dl className="data-facts">
          <div>
            <dt>Your quizzes</dt>
            <dd className="tabular">{ownQuizzes}</dd>
          </div>
          <div>
            <dt>Your attempts</dt>
            <dd className="tabular">{ownAttempts}</dd>
          </div>
          <div>
            <dt>
              Sample <SampleBadge />
            </dt>
            <dd className="tabular">
              {sampleQuizzes} quiz{sampleQuizzes === 1 ? '' : 'zes'}, {sampleAttempts} attempts
            </dd>
          </div>
        </dl>

        <div className="data-actions">
          <div className="data-action">
            <div>
              <strong>Back up or move your data</strong>
              <p className="small muted">Download a JSON file, then import it later or on another computer. Importing replaces what is saved here.</p>
            </div>
            <div className="data-buttons">
              <button type="button" className="btn btn-secondary" onClick={exportData}>
                <Download size={16} aria-hidden="true" /> Export backup
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
                <Upload size={16} aria-hidden="true" /> Import backup
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => {
                  importData(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </div>
          </div>

          <div className="data-action">
            <div>
              <strong>
                <FlaskConical size={15} aria-hidden="true" /> Sample data
              </strong>
              <p className="small muted">
                A Python quiz on variables, conditionals, loops, arrays (lists) and functions, with 12 fictional attempts by “Sample Student” 01–12. It is for demonstration only and is never mixed up with real results — use the switch to leave it out of the analysis.
              </p>
              {hasSample && (
                <Switch
                  checked={state.settings.includeSample}
                  onChange={(v) => actions.setSettings({ includeSample: v })}
                  label="Include sample data in dashboard and analysis"
                />
              )}
            </div>
            <div className="data-buttons">
              <button type="button" className="btn btn-secondary" onClick={restoreSample}>
                <RotateCcw size={16} aria-hidden="true" /> {hasSample ? 'Reset sample data' : 'Restore sample data'}
              </button>
              {hasSample && (
                <button type="button" className="btn btn-danger-ghost" onClick={removeSample}>
                  <Eraser size={16} aria-hidden="true" /> Remove sample data
                </button>
              )}
            </div>
          </div>

          <div className="data-action">
            <div>
              <strong>Dashboard guide</strong>
              <p className="small muted">Show the five-step “How ClassLens works” panel on the dashboard.</p>
              <Switch checked={state.settings.showGuide} onChange={(v) => actions.setSettings({ showGuide: v })} label="Show guide on dashboard" />
            </div>
          </div>

          <div className="data-action data-danger">
            <div>
              <strong>Delete all data</strong>
              <p className="small muted">Removes every quiz, attempt and revision status from this browser.</p>
            </div>
            <div className="data-buttons">
              <button type="button" className="btn btn-danger" onClick={clearAll}>
                <Trash2 size={16} aria-hidden="true" /> Delete all data
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
