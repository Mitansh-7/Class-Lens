# ClassLens

**Diagnose. Understand. Improve.**

ClassLens is a free, browser-based assessment tool for Computer Science teachers. It is built for a government-school teacher who wants to know more than "the class got 55%". A teacher writes a multiple-choice quiz, students take it, and ClassLens shows:

- which **topics** caused the low score;
- which **questions** were missed most;
- which **wrong answers** many students chose;
- a **revision plan** for each weak topic.

Built for Shiksha-Hack (Punjab, Edu-Tech).

> Create quiz → Assess → Identify gaps → Recommend revision → Assess again

---

## What it does

| Section | What the teacher can do |
|---|---|
| **Dashboard** | See every number calculated from saved attempts: <ul><li>total quizzes, attempts and average score;</li><li>the most challenging topic;</li><li>a topic mastery chart;</li><li>recent quizzes and attempts;</li><li>a recommended next teaching action.</li></ul> |
| **My Quizzes** | Search and filter (published / drafts / sample). <ul><li>Quiz actions: take, preview, edit, duplicate, delete (with confirmation).</li><li>Links to each quiz's gaps.</li></ul> |
| **Create Quiz** | Enter title, description, class, subject, chapter and an optional time limit. Then add multiple-choice questions, each with: <ul><li>4–6 options and a marked correct answer;</li><li>an explanation and a topic tag;</li><li>optional notes on what each wrong option suggests.</li></ul> Questions can be added, removed, edited, reordered and duplicated. You can save a draft, preview, or publish. Publishing is blocked until validation passes, and unsaved changes are protected when you leave the page. |
| **Take a quiz** | A student sees the instructions and an optional timer, then works through the quiz: <ul><li>one question at a time, with a progress bar, previous/next and a question map;</li><li>a review screen that highlights unanswered questions;</li><li>a submit confirmation, protected against double submission.</li></ul> The result shows: <ul><li>score and percentage, with correct, incorrect and unanswered counts;</li><li>each answer with its explanation;</li><li>a topic-by-topic summary.</li></ul> |
| **Learning Gaps** | A *response-based learning-gap analysis*, filtered by quiz, showing: <ul><li>topic accuracy with 50% and 75% thresholds;</li><li>priority gaps, each with evidence;</li><li>frequently missed questions and how answers were spread across options;</li><li>likely misconceptions, strengths, and topics not yet assessed.</li></ul> |
| **Revision Planner** | For each weak topic: <ul><li>why it needs attention;</li><li>a re-teaching activity, a revision task and a follow-up assessment;</li><li>a priority level and a status (To do / In progress / Done) that is saved.</li></ul> Once a topic is marked done, ClassLens compares accuracy on that topic before and after that date. It can also build a **follow-up quiz from existing questions**, and the plan can be printed. |
| **How it works & data** | <ul><li>The five-step guide and a project overview.</li><li>The exact analysis rules.</li><li>Export/import of a backup, and removing or restoring the sample data.</li><li>Deleting all data.</li></ul> |

### The analysis rules (not AI)

ClassLens applies fixed, documented rules to recorded answers. It does **not** use artificial intelligence.

- **Topic accuracy** = correct answers ÷ all answers on that topic. Unanswered counts as not correct.
- **Mastery bands:**

  | Band | Accuracy |
  |---|---|
  | Secure | 75% or more |
  | Developing | 50–74% |
  | Needs attention | below 50% |
  | No answers yet | no data — no value is shown |

- **Learning gaps** are topics below 75%: high priority below 50%, medium priority from 50% to 74%.
- **Likely misconception:** a wrong option chosen in at least 30% of the answers to a question.
- **Limited evidence:** a topic with fewer than 5 answers is labelled this way.
- **Teaching suggestions** come from a fixed library of classroom ideas, matched by topic name:
  - Library topics: loops, conditionals, variables, lists, functions, operators, strings, I/O, algorithms, Boolean logic, computer fundamentals, HTML, networking, cyber safety and databases.
  - Other topics get a general plan, and the planner labels which source was used.
- **Follow-up quizzes** reuse questions that already exist in your quizzes:
  - most-missed first, up to 10 questions, copied with new IDs;
  - saved as a draft for you to review;
  - ClassLens never writes new questions.

### Sample data

On first launch, ClassLens loads a **sample** Python quiz, "Programming Basics Check": 10 questions on variables, conditionals, loops, lists and functions. It comes with **12 fictional attempts** by "Sample Student 01–12" so every screen can be explored.

- All sample items carry a **Sample** badge.
- A switch excludes them from the analysis.
- **How it works & data → Remove sample data** deletes them; **Restore sample data** brings them back.
- Nothing depends on the sample. With it removed, every screen shows an empty state, never invented numbers.

### Where data is stored

Everything is saved in the browser's **localStorage**, under the key `classlens:v1`, on the device being used.

- There is no server, account, database or paid API, and nothing is uploaded.
- Another browser or computer will not see the same data.
- Clearing browser data deletes it. Use **Export backup** to keep a copy.
- If the saved data is ever unreadable, ClassLens keeps a copy under `classlens:v1:unreadable-backup:<time>`, starts again with the sample data, and shows a notice.

### Data integrity

- Every quiz, question, option and attempt has a stable ID.
- Each attempt stores a **snapshot** of the questions as the student saw them: wording, options, answer key, topic and explanation. Editing or duplicating a quiz later therefore never changes past scores.
- All analytics are recomputed from stored attempts every time; no totals are stored.
- Deleting anything asks for confirmation and states what will be removed.

---

## Run it locally

Requirements: **Node.js 18 or newer** (includes npm).

```bash
npm install
```

```bash
npm run dev
```

Open the address Vite prints (normally http://localhost:5173).

Production build and local preview of the build:

```bash
npm run build
```

```bash
npm run preview
```

Logic tests (grading, topic accuracy, the sample-data numbers, gap rules, follow-up quiz rules, malformed-data handling, persistence):

```bash
npm test
```

## Deploy to Vercel

The repository includes `vercel.json`:

- build command `npm run build`;
- output directory `dist`;
- framework Vite;
- a rewrite to `index.html`.

The app uses hash URLs such as `/#/quizzes`, so any static host works.

**Option A — from GitHub**

1. Push this folder to a GitHub repository.
2. Go to https://vercel.com/new, sign in, and **Import** the repository.
3. Vercel detects **Vite**. Leave the defaults:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

   If the project is in a sub-folder of the repository, set **Root Directory** to that folder.
4. Click **Deploy**. Vercel gives you a `https://<name>.vercel.app` address.

**Option B — from the command line**

```bash
npx vercel
```

Answer the prompts (link a new project, keep the detected Vite settings). Then publish to production:

```bash
npx vercel --prod
```

No environment variables are needed.

---

## Project structure

```
src/
  main.jsx, App.jsx        app shell, navigation, routes
  router.jsx               small hash router with "unsaved changes" guard
  store.jsx                state (React context + reducer), saved to localStorage
  styles.css               all styles (responsive, print styles for the planner)
  lib/
    model.js               data model, factories, validation, safe copying
    scoring.js             grading against the answer key, attempt summaries
    analysis.js            response-based learning-gap analysis (rules above)
    teachingLibrary.js     fixed re-teaching ideas matched by topic name
    followUp.js            follow-up quiz from existing questions
    storage.js             load/save with repair of malformed data
    sampleData.js          the labelled sample quiz and fictional attempts
  components/              shared UI, charts, "How ClassLens works"
  pages/                   Dashboard, Quizzes, QuizBuilder, TakeQuiz,
                           AttemptResult, LearningGaps, RevisionPlanner, About
scripts/test-logic.mjs     Node logic tests (npm test)
```

## Limitations

- **Single device.** Data lives in one browser. There is no sync between devices or teachers, and no student accounts. Students take quizzes on the teacher's device or a shared classroom computer, one after another.
- **Multiple choice only.** There are no code-writing, short-answer or fill-in-the-blank questions.
- **Rule-based analysis.** The suggestions are general classroom ideas, not personalised advice.
- **Small evidence.** With few answers, the results are indications. ClassLens flags limited evidence, but the teacher's judgement comes first.
- **Not evaluated.** ClassLens has not been evaluated in a classroom study. The before/after comparison in the planner is an indication, not proof of improvement.
- **English only.**

## Future scope

- Optional cloud sync and shareable student links for multi-device classrooms.
- Punjabi and Hindi interface text.
- More question types.
- Class/section tracking over a term.
- A larger, teacher-reviewed library of re-teaching activities.

## Demo script

See [DEMO_SCRIPT.md](DEMO_SCRIPT.md) for the two-minute presentation.

## Visual refinement
The dashboard uses a calmer, lower-contrast visual system with quieter status colours, reduced shadows, and more consistent spacing. Core quiz, analysis, and revision functionality is unchanged.
