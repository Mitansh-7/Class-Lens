// Teaching library: classroom suggestions matched to topic tags by keyword.
// These are fixed, teacher-written templates — not generated text. When no entry
// matches, a general template that names the topic is used instead.

const LIBRARY = [
  {
    id: 'loops',
    name: 'Loops',
    match: /loop|\bwhile\b|\bfor\b|iteration|repeat|\brange\b/i,
    explain:
      'Trace a loop on the board with a trace table (columns: repetition number, variable value, condition true/false, output). Step through a while loop slowly to show that the condition is checked again after every repetition — unlike an if statement, which is checked only once.',
    task: 'Predict the output of three short loop programs (a while loop, a for loop with range, and one that changes a counter), filling in a trace table for each before running them.',
    followUp: 'A short quiz focused on loop tracing: how many times a loop runs, the last value printed, and spotting a loop that never stops.',
  },
  {
    id: 'conditionals',
    name: 'Conditional Statements',
    match: /condition|\bif\b|\belse\b|\belif\b|switch|decision|branch|selection/i,
    explain:
      'Draw a flowchart with one decision diamond and walk two inputs through it — one that makes the condition True and one that makes it False. Emphasise that only one branch runs. Contrast = (store a value) with == (compare two values).',
    task: 'Give four different marks values and ask students to predict the output of an if–else program for each, including the boundary value exactly at the pass mark.',
    followUp: 'A short "predict the output" quiz on if, if–else and elif chains that includes boundary values.',
  },
  {
    id: 'variables',
    name: 'Variables & Data Types',
    match: /variable|data ?type|datatype|identifier|constant|type casting|typecast/i,
    explain:
      'Use the "labelled box" model: draw a box for each variable, write its name on the label, and update the value inside as you run a short program line by line. Contrast 25 with "25" to show how quotes change the data type.',
    task: 'Students trace a five-line program, writing each variable\'s value after every line, then label each value as int, float, str or bool.',
    followUp: 'A five-question check on tracing variable values and identifying data types, including a variable that is reassigned.',
  },
  {
    id: 'arrays',
    name: 'Arrays & Lists',
    match: /array|\blists?\b|index|element|tuple/i,
    explain:
      'Seat four or five students in a row as "array elements" with index cards 0, 1, 2, 3 on their desks. Call out marks[0], marks[2] and len(marks) and have the matching student stand. Stress that the first index is 0 and the last index is length − 1.',
    task: 'Given a list of six values, students write the value at five different indexes, the length of the list, and the index of the last element.',
    followUp: 'A five-question check on indexing (including index 0 and the last index), len(), and changing one element.',
  },
  {
    id: 'functions',
    name: 'Functions',
    match: /function|procedure|method|parameter|argument|\breturn|\bdef\b|module/i,
    explain:
      'Use the "machine" analogy: a function takes input through parameters, does one job, and hands back a result with return. Define one function on the board and call it with three different arguments, tracing what each call returns.',
    task: 'Students write a function area(l, b) that returns the area of a rectangle, then predict the result of three calls with different arguments.',
    followUp: 'A short quiz on parameters versus arguments, predicting return values, and the difference between print and return.',
  },
  {
    id: 'operators',
    name: 'Operators & Expressions',
    match: /operator|expression|arithmetic|precedence|modulus|modulo|relational/i,
    explain:
      'Evaluate expressions step by step on the board using operator precedence, and show what /, // and % each produce for the same pair of numbers.',
    task: 'Students evaluate eight expressions by hand, then check their answers by running them.',
    followUp: 'A quiz of expression-evaluation questions mixing arithmetic, relational and logical operators.',
  },
  {
    id: 'strings',
    name: 'Strings',
    match: /string|\btext\b|character|slic/i,
    explain:
      'Write a word in boxes with its index under each letter (positive and negative). Demonstrate indexing, slicing and joining strings using the boxes.',
    task: 'Students find characters and slices of their own name using indexes and record the results.',
    followUp: 'A quiz on string indexing, slicing, len() and joining strings.',
  },
  {
    id: 'io',
    name: 'Input & Output',
    match: /input|output|print/i,
    explain:
      'Show that input() always gives text (a string). Run a program that adds two inputs with and without int() so students see "2" + "3" become "23" instead of 5.',
    task: 'Students correct three short programs that use input values without converting them.',
    followUp: 'A quiz on converting input and predicting printed output.',
  },
  {
    id: 'algorithms',
    name: 'Algorithms & Flowcharts',
    match: /algorithm|flow ?chart|pseudo ?code|problem solving/i,
    explain:
      'Turn a familiar routine (for example, working out a grade from marks) into numbered algorithm steps and then a flowchart, naming each symbol as you draw it.',
    task: 'Students draw a flowchart to find the larger of two numbers, then swap with a partner and trace each other\'s flowchart with test values.',
    followUp: 'A quiz on identifying flowchart symbols and putting algorithm steps in the correct order.',
  },
  {
    id: 'boolean',
    name: 'Boolean Logic',
    match: /boolean|logic gate|truth table|logical/i,
    explain: 'Build truth tables for AND, OR and NOT together, using two light switches as an analogy.',
    task: 'Students complete truth tables for three short Boolean expressions.',
    followUp: 'A quiz on evaluating Boolean expressions and logic-gate outputs.',
  },
  {
    id: 'hardware',
    name: 'Computer Fundamentals',
    match: /hardware|software|memory|\bcpu\b|processor|storage|device|fundamental|operating system|\bram\b|\brom\b/i,
    explain:
      'Use a real or pictured computer to sort components into input, processing, storage and output. Build a class chart that students add examples to.',
    task: 'Students classify twelve devices or components into the correct category with a one-line reason for each.',
    followUp: 'A short quiz on classifying components and describing what each one does.',
  },
  {
    id: 'html',
    name: 'HTML & Web Pages',
    match: /html|\bcss\b|web ?page|\btags?\b|website/i,
    explain: 'Build a small web page live, adding one tag at a time and refreshing the browser to show its effect.',
    task: 'Students write the HTML for a short page with a heading, a paragraph, a list and an image.',
    followUp: 'A quiz on matching tags to their effect and finding mistakes in HTML code.',
  },
  {
    id: 'network',
    name: 'Networking & Internet',
    match: /network|internet|protocol|ip address|\blan\b|\bwan\b|router|\bweb\b/i,
    explain:
      'Model a network in class: students pass "packets" (paper slips with addresses) through other students acting as routers, then relate it to LAN, WAN and the Internet.',
    task: 'Students label a diagram of a small school network and give one example each of a LAN and a WAN.',
    followUp: 'A quiz on network types, devices and basic protocols.',
  },
  {
    id: 'cyber',
    name: 'Cyber Safety',
    match: /cyber|safety|security|password|phishing|privacy|malware|virus/i,
    explain:
      'Show three realistic messages — one phishing, two genuine — and have students identify the warning signs together.',
    task: 'Students write a checklist of five safe-online habits and rate four sample passwords from weak to strong.',
    followUp: 'A scenario-based quiz on spotting phishing, choosing strong passwords and protecting privacy.',
  },
  {
    id: 'database',
    name: 'Databases & SQL',
    match: /database|\bsql\b|dbms|query|record|primary key/i,
    explain:
      'Use a printed class register as a table: identify rows (records), columns (fields) and a primary key, then write simple SELECT queries against it together.',
    task: 'Students write three SELECT queries for a given student table and predict their results.',
    followUp: 'A quiz on table terminology and predicting the result of simple queries.',
  },
];

/**
 * Teaching suggestions for a topic name.
 * Returns { source: 'library' | 'general', libraryName, explain, task, followUp }.
 */
export function suggestionsFor(topicName) {
  const name = String(topicName || '').trim() || 'this topic';
  const entry = LIBRARY.find((e) => e.match.test(name));
  if (entry) {
    return { source: 'library', libraryName: entry.name, explain: entry.explain, task: entry.task, followUp: entry.followUp };
  }
  return {
    source: 'general',
    libraryName: null,
    explain: `Re-teach ${name} with one fully worked example, thinking aloud at each step, then work through a second example together with the class before students try one alone.`,
    task: `Give students three or four short practice questions on ${name}, similar to the ones most often answered incorrectly, and discuss the answers as a class.`,
    followUp: `Re-assess ${name} with a short quiz (four to six questions) after the revision lesson.`,
  };
}
