// Demonstration content. Everything here is marked isSample: true so it can be
// labelled in the interface, excluded from analysis, removed, or restored.
// The sample students are fictional ("Sample Student 01"…) — not real results.

import { gradeAttempt } from './scoring.js';

export const SAMPLE_QUIZ_ID = 'sample-quiz-programming-basics';

const CODE = '```';

// [prompt, topic, options[], correctIndex, explanation, { optionIndex: note }]
const QUESTIONS = [
  [
    `What value does this program print?\n${CODE}\nx = 7\nx = x + 3\nprint(x)\n${CODE}`,
    'Variables & Data Types',
    ['7', '10', '73', 'An error'],
    1,
    'x starts as 7. The line x = x + 3 takes the current value (7), adds 3 and stores 10 back in x, so print(x) shows 10.',
    { 0: 'a variable keeps its first value and cannot be updated.', 2: 'the + operator joins numbers like text.' },
  ],
  [
    'What is the data type of the value "25" (written with quotation marks) in Python?',
    'Variables & Data Types',
    ['int (integer)', 'float (decimal number)', 'str (string)', 'bool (Boolean)'],
    2,
    'Anything inside quotation marks is a string (text), even if it looks like a number. 25 without quotes would be an int.',
    { 0: 'students read the digits and ignore the quotation marks.' },
  ],
  [
    `What does this program print?\n${CODE}\nmarks = 45\nif marks >= 50:\n    print("Pass")\nelse:\n    print("Try again")\n${CODE}`,
    'Conditional Statements',
    ['Pass', 'Pass and then Try again', 'Nothing', 'Try again'],
    3,
    '45 >= 50 is False, so the if block is skipped and only the else block runs, printing "Try again". Exactly one branch of an if–else runs.',
    { 0: 'the condition is being misread — 45 >= 50 is False.', 1: 'students think both branches of an if–else run.' },
  ],
  [
    'Which symbol checks whether two values are equal inside an if condition?',
    'Conditional Statements',
    ['==', '=', '!=', '=>'],
    0,
    '== compares two values and gives True or False. A single = stores a value in a variable (assignment).',
    { 1: 'students confuse assignment (=) with comparison (==).', 2: 'students mix up "equal to" and "not equal to".' },
  ],
  [
    `How many times is "Hi" printed?\n${CODE}\ncount = 0\nwhile count < 3:\n    print("Hi")\n    count = count + 1\n${CODE}`,
    'Loops',
    ['1 time', '4 times', '3 times', 'It never stops'],
    2,
    'The condition is checked before every repetition: count is 0, 1 and 2 (prints three times). When count becomes 3, 3 < 3 is False and the loop stops.',
    {
      0: 'students treat a while loop like an if statement — they think the condition is checked only once.',
      1: 'an off-by-one error: students count the final check (count = 3) as an extra repetition.',
      3: 'students did not notice that count increases on every repetition.',
    },
  ],
  [
    `What is the last number printed?\n${CODE}\nfor i in range(1, 5):\n    print(i)\n${CODE}`,
    'Loops',
    ['5', '4', '1', '6'],
    1,
    'range(1, 5) produces 1, 2, 3, 4. The end value 5 is not included, so the last number printed is 4.',
    { 0: 'students think range(1, 5) includes the end value 5.', 2: 'students think the loop body runs only once.' },
  ],
  [
    `What is the value of marks[1]?\n${CODE}\nmarks = [56, 72, 89, 40]\n${CODE}`,
    'Arrays & Lists',
    ['56', '89', '72', 'An error'],
    2,
    'List positions (indexes) start at 0. marks[0] is 56, so marks[1] is the second item, 72.',
    { 0: 'students think list positions start at 1 instead of 0.' },
  ],
  [
    'What does len([3, 6, 9]) return?',
    'Arrays & Lists',
    ['3', '2', '9', '18'],
    0,
    'len() counts how many items are in the list. There are three items, so it returns 3. (The last index is 2.)',
    { 1: 'students confuse the length of a list with its last index.', 2: 'students think len() returns the last item.', 3: 'students think len() adds up the values.' },
  ],
  [
    `What is stored in result?\n${CODE}\ndef square(n):\n    return n * n\n\nresult = square(4)\n${CODE}`,
    'Functions',
    ['8', '4', 'None', '16'],
    3,
    'square(4) runs the function with n = 4. It returns 4 * 4 = 16, and that value is stored in result.',
    { 0: 'students read n * n as n + n (or n × 2).', 2: 'students do not understand that return sends a value back to the caller.' },
  ],
  [
    'In the line def greet(name): what is name?',
    'Functions',
    [
      'The value the function returns',
      'A parameter — it receives the value passed in when the function is called',
      'A loop inside the function',
      'A built-in Python keyword',
    ],
    1,
    'name is a parameter: a placeholder that receives the argument given in a call such as greet("Simran"). Return values come back out of a function.',
    { 0: 'students confuse parameters (inputs) with return values (outputs).' },
  ],
];

// One row per fictional student; one letter per question (A–D), "-" = left unanswered.
const SAMPLE_RESPONSES = [
  'BCDACBCADB',
  'BCDACBCADB',
  'CCDACBAADB',
  'BCDAABCBDB',
  'BCDACACADB',
  'BCDBAACACA',
  'BCDAABAAAB',
  'BCBAAAABDB',
  'BADBBAAADA',
  'BCBBAAABAA',
  'BAAC-AAAAA',
  'CABBACDCD-',
];

export function buildSampleQuiz(now = new Date()) {
  const stamp = new Date(now.getTime() - 4 * 24 * 3600 * 1000).toISOString();
  return {
    id: SAMPLE_QUIZ_ID,
    title: 'Programming Basics Check',
    description:
      'Ten short questions on the basics of Python programming. Read each question carefully and choose one answer. Program code is shown in grey boxes.',
    grade: 'Class 9',
    subject: 'Computer Science',
    chapter: 'Introduction to Python Programming',
    timeLimit: 15,
    status: 'published',
    isSample: true,
    createdAt: stamp,
    updatedAt: stamp,
    publishedAt: stamp,
    origin: null,
    questions: QUESTIONS.map(([prompt, topic, options, correctIndex, explanation, notes], qi) => {
      const qid = `sample-q${qi + 1}`;
      const opts = options.map((text, oi) => ({ id: `${qid}-${'abcdef'[oi]}`, text }));
      const optionNotes = {};
      for (const [oi, note] of Object.entries(notes)) optionNotes[opts[Number(oi)].id] = note;
      return { id: qid, prompt, topic, options: opts, correctOptionId: opts[correctIndex].id, explanation, optionNotes };
    }),
  };
}

export function buildSampleAttempts(quiz, now = new Date()) {
  return SAMPLE_RESPONSES.map((row, si) => {
    const answers = {};
    quiz.questions.forEach((q, qi) => {
      const letter = row[qi];
      const index = 'ABCDEF'.indexOf(letter);
      if (index >= 0 && q.options[index]) answers[q.id] = q.options[index].id;
    });
    const submitted = new Date(now.getTime() - (SAMPLE_RESPONSES.length - si) * 2.5 * 3600 * 1000 - 3 * 24 * 3600 * 1000);
    const started = new Date(submitted.getTime() - (7 + (si % 5) * 1.5) * 60 * 1000);
    return gradeAttempt(quiz, answers, {
      id: `sample-attempt-${String(si + 1).padStart(2, '0')}`,
      studentName: `Sample Student ${String(si + 1).padStart(2, '0')}`,
      isSample: true,
      startedAt: started.toISOString(),
      submittedAt: submitted.toISOString(),
    });
  });
}
