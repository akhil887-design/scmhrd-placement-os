import bcrypt from 'bcryptjs';
import { initSchema, db } from './db.js';

function clamp5(x) {
  const n = Math.round(Number(x));
  if (Number.isNaN(n)) return 1;
  return Math.max(1, Math.min(5, n));
}

/** Each option: four traits scored 1–5 (deterministic engine). */
function optWeights(...perOption) {
  const o = {};
  perOption.forEach((traits, idx) => {
    o[String(idx)] = {
      analytical: clamp5(traits[0]),
      leadership: clamp5(traits[1]),
      risk_taking: clamp5(traits[2]),
      emotional_stability: clamp5(traits[3]),
    };
  });
  return JSON.stringify(o);
}

function aptitudeRow(cat, q, opts, correct, solution) {
  return {
    category: cat,
    question: q,
    options: JSON.stringify(opts),
    correct_index: correct,
    solution,
  };
}

const aptitudeBank = [
  aptitudeRow(
    'Quant',
    'If a train travels 180 km in 2.5 hours, what is its average speed in km/h?',
    ['62', '72', '81', '90'],
    1,
    'Speed = distance/time = 180/2.5 = 72 km/h.'
  ),
  aptitudeRow(
    'Quant',
    'A shop offers 20% off, then 10% off the reduced price. Net discount on original is closest to:',
    ['26%', '28%', '30%', '32%'],
    1,
    'Multiply: 0.8 × 0.9 = 0.72 → 28% off.'
  ),
  aptitudeRow(
    'Quant',
    'If x² − 5x + 6 = 0, what is the sum of roots?',
    ['3', '4', '5', '6'],
    2,
    'Sum of roots = 5 (from −b/a for ax²+bx+c).'
  ),
  aptitudeRow(
    'Quant',
    'Compound interest on ₹10,000 at 10% for 2 years (annual) is:',
    ['₹2,000', '₹2,100', '₹2,200', '₹2,300'],
    1,
    '10000((1.1)² − 1) = 2100.'
  ),
  aptitudeRow(
    'Quant',
    'A pipe fills a tank in 6 hours, another empties in 12 hours. Both open—time to fill?',
    ['8 h', '10 h', '12 h', '18 h'],
    2,
    'Net rate 1/6 − 1/12 = 1/12 → 12 hours.'
  ),
  aptitudeRow(
    'Quant',
    'Mean of 5 numbers is 20. If one number 30 is removed, mean of remaining is:',
    ['16.25', '17.5', '18.75', '19'],
    2,
    'Sum was 100; remove 30 → 70/4 = 17.5.'
  ),
  aptitudeRow(
    'Quant',
    'Probability of drawing a king from a standard deck is:',
    ['1/52', '1/26', '1/13', '4/13'],
    2,
    '4 kings / 52 = 1/13.'
  ),
  aptitudeRow(
    'Quant',
    'If log₁₀(x) = 2, then x equals:',
    ['10', '100', '1000', '2'],
    1,
    '10² = 100.'
  ),
  aptitudeRow(
    'Logical',
    'Find the next term: 2, 6, 12, 20, 30, ?',
    ['40', '42', '44', '46'],
    1,
    'Differences 4,6,8,10 → next +12 → 42.'
  ),
  aptitudeRow(
    'Logical',
    'If all Bloops are Razzies and all Razzies are Lazzies, then:',
    [
      'All Bloops are Lazzies',
      'All Lazzies are Bloops',
      'No Bloops are Lazzies',
      'Cannot conclude',
    ],
    0,
    'Transitive subset inclusion.'
  ),
  aptitudeRow(
    'Logical',
    'In a row, A is left of B but right of C. D is right of B. Who is leftmost?',
    ['A', 'B', 'C', 'D'],
    2,
    'Order: C, A, B, D.'
  ),
  aptitudeRow(
    'Logical',
    'Code: CAT → DBU. How is DOG encoded?',
    ['EPH', 'FQI', 'EPJ', 'FOH'],
    0,
    'Each letter +1.'
  ),
  aptitudeRow(
    'Logical',
    'Which number does not belong: 16, 25, 36, 49, 64, 72?',
    ['16', '49', '64', '72'],
    3,
    'Others are perfect squares.'
  ),
  aptitudeRow(
    'Logical',
    'If Monday is 3 days after yesterday, what day is today?',
    ['Thursday', 'Friday', 'Saturday', 'Sunday'],
    1,
    'Yesterday was Friday → today Saturday.'
  ),
  aptitudeRow(
    'Logical',
    'Odd one out:',
    ['Circle', 'Ellipse', 'Cube', 'Sphere'],
    2,
    'Cube is not a conic/solid of revolution in same family—only non-round face solid listed.'
  ),
  aptitudeRow(
    'Logical',
    'If * means multiply and # means add, value of 3 # 4 * 2?',
    ['14', '11', '10', '9'],
    1,
    '3+4=7; 7*2=14 — if left-to-right without precedence: (3#4)*2 = 7*2=14. If # then *: same.'
  ),
  aptitudeRow(
    'Verbal',
    'Choose the word most opposite in meaning to EPHEMERAL:',
    ['Transient', 'Permanent', 'Fragile', 'Vivid'],
    1,
    'Ephemeral = short-lived; opposite ≈ permanent.'
  ),
  aptitudeRow(
    'Verbal',
    'Fill in: The committee reached a ______ decision after hours of debate.',
    ['unanimous', 'ambivalent', 'tentative', 'spurious'],
    0,
    'Unanimous fits a clear joint outcome.'
  ),
  aptitudeRow(
    'Verbal',
    'Choose the correctly spelled word:',
    ['Accomodate', 'Acommodate', 'Accommodate', 'Acomodate'],
    2,
    'Correct spelling is "accommodate" (two c\'s, two m\'s).'
  ),
  aptitudeRow(
    'Verbal',
    'OBFUSCATE most nearly means:',
    ['Clarify', 'Confuse', 'Brighten', 'Simplify'],
    1,
    'Obfuscate = obscure.'
  ),
  aptitudeRow(
    'Verbal',
    'Arrange sentences: (P) She finalized the deck. (Q) The client approved. (R) She presented.',
    ['PQR', 'RQP', 'QRP', 'PRQ'],
    3,
    'Present → finalize → approve is plausible; PRQ.'
  ),
  aptitudeRow(
    'Verbal',
    'Choose the best synonym for PRAGMATIC:',
    ['Idealistic', 'Practical', 'Theoretical', 'Dogmatic'],
    1,
    'Pragmatic ≈ practical.'
  ),
  aptitudeRow(
    'Verbal',
    'In context, MITIGATE means:',
    ['Worsen', 'Lessen', 'Ignore', 'Measure'],
    1,
    'Mitigate = reduce severity.'
  ),
  aptitudeRow(
    'Verbal',
    'Which is a correctly spelled word?',
    ['Occurence', 'Occurrence', 'Occurencee', 'Ocurrence'],
    1,
    'Double r in occurrence.'
  ),
];

function psychPrompts() {
  const items = [];
  const weightPatterns = [
    optWeights([5, 2, 2, 3], [2, 5, 3, 2], [3, 3, 5, 1], [2, 2, 2, 5]),
    optWeights([4, 3, 2, 4], [3, 4, 4, 2], [2, 2, 5, 3], [5, 3, 1, 4]),
    optWeights([5, 1, 3, 4], [1, 5, 2, 4], [3, 2, 5, 2], [4, 4, 3, 3]),
    optWeights([3, 4, 3, 3], [4, 3, 2, 5], [2, 5, 4, 2], [5, 2, 3, 4]),
  ];
  const stems = [
    'Under tight deadlines, I prefer to:',
    'When solving an ambiguous problem, I:',
    'In group conflict, I typically:',
    'When outcomes are uncertain, I:',
    'Feedback that helps me most is:',
    'I recharge best by:',
    'When learning something new, I:',
    'In presentations, I focus on:',
    'When priorities shift suddenly, I:',
    'I evaluate risk primarily through:',
    'When stakes are high, my stress shows as:',
    'I build trust with peers by:',
    'When data conflicts with intuition, I:',
    'I define success in a project as:',
    'When I disagree with my manager, I:',
    'I handle repetitive work by:',
    'When mentoring juniors, I:',
    'In negotiations, I lean toward:',
    'When I fail, I first:',
    'I prefer environments that are:',
    'When coordinating across teams, I:',
    'I make decisions with incomplete info by:',
    'When budgets are cut, I:',
    'I respond to criticism by:',
    'When leading without authority, I:',
    'I prioritize tasks using:',
    'When customer needs conflict with policy, I:',
    'I stay motivated when:',
    'When learning from mistakes, I:',
    'In brainstorming, I tend to:',
    'When timelines slip, I:',
    'I interpret rules as:',
    'When competing internally, I:',
    'I influence others through:',
    'When workload spikes, I:',
    'I prefer recognition that is:',
    'When ethics are gray, I:',
    'I align stakeholders by:',
    'When innovating, I:',
    'When consensus is slow, I:',
  ];
  const optionsTemplate = [
    ['Structure tasks and sequence work', 'Drive alignment quickly', 'Explore bold alternatives', 'Stay calm and steady'],
    ['Break it into parts', 'Rally the team', 'Try unconventional angles', 'Seek stable routines'],
    ['Facilitate dialogue', 'Take charge', 'Push for a quick bet', 'De-escalate emotions'],
    ['Model scenarios', 'Inspire action', 'Bet big', 'Maintain even keel'],
    ['Specific metrics', 'Vision and story', 'Challenging stretch', 'Supportive tone'],
    ['Quiet focus time', 'Team wins', 'New challenges', 'Predictable rhythm'],
    ['Frameworks first', 'Discussion first', 'Trial and error', 'Step-by-step practice'],
    ['Logic and evidence', 'Energy and presence', 'Bold claims', 'Composure'],
    ['Re-plan calmly', 'Communicate crisply', 'Pivot fast', 'Protect core priorities'],
    ['Numbers and cases', 'People signals', 'Upside potential', 'Downside control'],
    ['Focused intensity', 'Visible drive', 'Risk appetite spikes', 'Contained reaction'],
    ['Keeping promises', 'Setting direction', 'Taking calculated risks', 'Being reliable'],
    ['Trust the model', 'Read the room', 'Experiment', 'Seek stability'],
    ['Delivering quality', 'Mobilizing people', 'Capturing opportunity', 'Sustaining trust'],
    ['Raise concerns clearly', 'Push for change', 'Challenge assumptions', 'Preserve harmony'],
    ['Automate or simplify', 'Delegate and coach', 'Change scope', 'Maintain discipline'],
    ['Give frameworks', 'Give ownership', 'Encourage bold tries', 'Provide safety'],
    ['Creating value', 'Winning fast', 'Exploring trades', 'Preserving relationships'],
    ['Analyze root cause', 'Reset goals', 'Double down', 'Regulate emotions'],
    ['Structured and clear', 'Fast-paced', 'Experimental', 'Predictable'],
    ['Clarify interfaces', 'Drive decisions', 'Challenge constraints', 'Reduce noise'],
    ['Set a hypothesis', 'Align stakeholders', 'Prototype quickly', 'Minimize regret'],
    ['Cut scope smartly', 'Motivate the team', 'Seek new funding', 'Protect morale'],
    ['Reflect and adjust', 'Push back', 'Reframe boldly', 'Stay composed'],
    ['Build coalitions', 'Escalate selectively', 'Propose pilots', 'Keep steady cadence'],
    ['Impact vs effort', 'Team energy', 'Upside', 'Risk balance'],
    ['Find creative compliance', 'Escalate ethically', 'Test boundaries', 'Follow policy'],
    ['Seeing progress', 'Leading change', 'Winning bets', 'Stable progress'],
    ['Document learnings', 'Share openly', 'Iterate fast', 'Move on calmly'],
    ['Offer structured ideas', 'Energize the room', 'Suggest wild cards', 'Keep discussion safe'],
    ['Re-baseline plan', 'Over-communicate', 'Propose bold tradeoffs', 'Stabilize team mood'],
    ['Guides to optimize', 'Tools to align', 'Barriers to break', 'Guards to keep'],
    ['Collaborate openly', 'Compete to win', 'Take smart risks', 'Keep fairness'],
    ['Logic and proof', 'Charisma', 'Bold vision', 'Consistency'],
    ['Delegate', 'Prioritize ruthlessly', 'Take strategic risk', 'Protect wellbeing'],
    ['Public praise', 'Private thanks', 'Big opportunities', 'Steady trust'],
    ['Seek principles', 'Seek outcomes', 'Seek edge', 'Seek consensus'],
    ['Framing tradeoffs', 'Driving urgency', 'Proposing experiments', 'Ensuring safety'],
    ['Challenge assumptions', 'Mobilize people', 'Explore edge cases', 'Reduce variance'],
    ['Build alignment', 'Decide and move', 'Pilot quickly', 'Wait for clarity'],
  ];
  for (let i = 0; i < 40; i++) {
    const opts = optionsTemplate[i] || optionsTemplate[i % optionsTemplate.length];
    items.push({
      prompt: stems[i] || `Scenario ${i + 1}: choose the response that fits you best.`,
      options: JSON.stringify(opts),
      trait_weights: weightPatterns[i % weightPatterns.length],
    });
  }
  return items;
}

function buildInterview500() {
  const list = [];
  const hrTopics = [
    'Tell me about yourself',
    'Why MBA',
    'Why SCMHRD',
    'Strengths and weaknesses',
    'Conflict with teammate',
    'Leadership example',
    'Failure story',
    'Time you delivered under pressure',
    'Ethical dilemma',
    'Career goals 5 years',
    'Why this role',
    'Work-life balance view',
    'Handling feedback',
    'Diversity and inclusion',
    'Remote collaboration',
  ];
  const techDomains = [
    'SQL joins',
    'normalization',
    'time complexity',
    'REST vs SOAP',
    'microservices tradeoffs',
    'caching',
    'CAP theorem',
    'A/B testing',
    'p-values',
    'regression assumptions',
    'supply chain bullwhip',
    'EOQ',
    'forecasting methods',
    'working capital',
    'NPV vs IRR',
  ];
  const caseFrames = [
    'market entry',
    'profitability decline',
    'pricing strategy',
    'capacity expansion',
    'M&A synergy',
    'turnaround plan',
    'digital transformation',
    'customer churn',
    'cost reduction',
    'new product launch',
  ];
  let id = 0;
  for (let i = 0; i < 200; i++) {
    const t = hrTopics[i % hrTopics.length];
    list.push({
      category: 'HR',
      question: `${t} (variant ${i + 1}): Give a structured answer with situation, action, result.`,
      answer: `Use STAR: set context briefly, state your action with ownership, quantify outcome and learning. For "${t}", connect to values: clarity, collaboration, growth mindset.`,
    });
    id++;
  }
  for (let i = 0; i < 200; i++) {
    const d = techDomains[i % techDomains.length];
    list.push({
      category: 'Technical',
      question: `Explain ${d} in a business analytics context (prompt ${i + 1}).`,
      answer: `Provide definition, 1 example, and 1 pitfall. For ${d}, tie to decision quality and data limitations; mention how you would validate assumptions.`,
    });
    id++;
  }
  for (let i = 0; i < 100; i++) {
    const c = caseFrames[i % caseFrames.length];
    list.push({
      category: 'Case',
      question: `Case ${i + 1}: A client faces ${c}. What clarifying questions would you ask first?`,
      answer: `Open with goal and scope: market definition, revenue/cost drivers, constraints, timeline. Outline a hypothesis tree for ${c}, then metrics to test.`,
    });
    id++;
  }
  return list;
}

export function runSeed() {
  initSchema();
  const insA = db.prepare(
    `INSERT INTO aptitude_questions (category, question, options, correct_index, solution) VALUES (@category,@question,@options,@correct_index,@solution)`
  );
  const insP = db.prepare(
    `INSERT INTO psych_questions (prompt, options, trait_weights) VALUES (@prompt,@options,@trait_weights)`
  );
  const insI = db.prepare(
    `INSERT INTO interview_questions (category, question, answer) VALUES (@category,@question,@answer)`
  );

  const emptyBank =
    db.prepare(`SELECT COUNT(*) AS c FROM interview_questions`).get().c === 0;

  const tx = db.transaction(() => {
    if (emptyBank) {
      for (const row of aptitudeBank) insA.run(row);
      for (const row of psychPrompts()) insP.run(row);
      for (const row of buildInterview500()) insI.run(row);
    }

    const admin = db.prepare(`SELECT id FROM users WHERE email = ?`).get('admin@scmhrd.local');
    if (!admin) {
      const hash = bcrypt.hashSync('admin123', 10);
      db.prepare(
        `INSERT INTO users (email, password_hash, name, role) VALUES (?,?,?,?)`
      ).run('admin@scmhrd.local', hash, 'Placement Admin', 'admin');
    }

    const director = db.prepare(`SELECT id FROM users WHERE email = ?`).get('director@scmhrd.local');
    if (!director) {
      const hash = bcrypt.hashSync('director123', 10);
      db.prepare(`INSERT INTO users (email, password_hash, name, role) VALUES (?,?,?,?)`).run(
        'director@scmhrd.local',
        hash,
        'Placement Director',
        'director'
      );
    }
  });

  tx();
  console.log(
    emptyBank
      ? 'Seed complete: question banks + admin (if missing).'
      : 'Question banks already present; ensured admin user.'
  );
}

if (process.argv[1]?.includes('seed.js')) {
  runSeed();
}
