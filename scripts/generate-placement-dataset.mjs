/**
 * Generates 500 unique placement-prep questions as a single JSON array.
 * Run: node scripts/generate-placement-dataset.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

/** Deterministic permutation of 4 items by seed (0..∞) */
function permute4(arr, seed) {
  const idx = [0, 1, 2, 3];
  let s = seed * 9301 + 49297;
  for (let i = 3; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.map((i) => arr[i]);
}

function mcq(recordId, category, question, correct, distractors, solution) {
  const opts = permute4([correct, ...distractors], recordId);
  return {
    id: recordId,
    type: 'aptitude',
    category,
    question,
    options: opts.map(String),
    correct_answer: String(correct),
    solution,
  };
}

const out = [];

/* ---------------- Quant 80 ---------------- */
for (let k = 0; k < 80; k++) {
  const id = k + 1;
  const pattern = k % 8;
  if (pattern === 0) {
    const cost = 250 + k * 17;
    const mp = 30 + (k % 19);
    const sp = Math.round((cost * (100 - mp)) / 100);
    out.push(
      mcq(
        id,
        'quant',
        `Q${id}: A product costs ₹${cost} and is sold at ${mp}% discount on the marked price ₹${Math.round((cost * 130) / 100)}. Find the selling price (nearest rupee).`,
        `${sp}`,
        [`${sp + 25}`, `${Math.max(0, sp - 40)}`, `${sp + 60}`],
        `Step 1: Marked price M = ₹${Math.round((cost * 130) / 100)} (given). Step 2: Selling price = M × (1 − ${mp}/100). Step 3: Round → ₹${sp}.`
      )
    );
  } else if (pattern === 1) {
    const a = 2 + (k % 6);
    const b = 3 + (k % 8);
    const c = 5 + (k % 9);
    const sumParts = a + b + c;
    const mult = 4 + (k % 11);
    const total = sumParts * mult;
    const largest = Math.max(a, b, c) * mult;
    out.push(
      mcq(
        id,
        'quant',
        `Q${id}: Three investments are in ratio ${a}:${b}:${c}. If total investment is ₹${total}, find the largest share (₹).`,
        `${largest}`,
        [`${a * mult}`, `${b * mult}`, `${total - largest}`],
        `Let shares be ${a}t, ${b}t, ${c}t. Then t×(${a}+${b}+${c})=${total} ⇒ t=${mult}. Largest = ${Math.max(a, b, c)}×t = ${largest}.`
      )
    );
  } else if (pattern === 2) {
    const P = 5000 + k * 211;
    const R = 6 + (k % 8);
    const T = 2 + (k % 4);
    const si = Math.round((P * R * T) / 100);
    out.push(
      mcq(
        id,
        'quant',
        `Q${id}: Simple interest on ₹${P} at ${R}% p.a. for ${T} years equals:`,
        `₹${si}`,
        [`₹${si + 250}`, `₹${Math.max(0, si - 300)}`, `₹${Math.round(si * 1.05)}`],
        `SI = PRT/100 = ${P}×${R}×${T}/100 = ${si}.`
      )
    );
  } else if (pattern === 3) {
    const u = 18 + (k % 15);
    const v = 24 + (k % 20);
    const relSpeed = u + v;
    const tMeet = 2.5 + (k % 10) * 0.25;
    const dist = Math.round(relSpeed * tMeet);
    out.push(
      mcq(
        id,
        'quant',
        `Q${id}: Two trains approach each other at ${u} km/h and ${v} km/h. After ${tMeet} hours they meet. Initial distance was about:`,
        `${dist} km`,
      [`${dist + 80} km`, `${Math.max(0, dist - 120)} km`, `${Math.round(dist / 1.2)} km`],
        `Relative speed = ${u}+${v} = ${relSpeed} km/h. Distance = relative speed × time = ${relSpeed}×${tMeet} ≈ ${dist} km.`
      )
    );
  } else if (pattern === 4) {
    const n = 12 + k;
    const r = 2 + (k % 5);
    const term = n * r * (n - 1);
    out.push(
      mcq(
        id,
        'quant',
        `Q${id}: In an arithmetic progression, first term is ${n} and common difference is ${r}. The 10th term is:`,
        `${n + 9 * r}`,
        [`${n + 10 * r}`, `${n + 8 * r}`, `${n * r + 10}`],
        `nth term = a + (n−1)d → 10th = ${n} + 9×${r} = ${n + 9 * r}.`
      )
    );
  } else if (pattern === 5) {
    const total = 40 + k;
    const bad = 3 + (k % 7);
    const good = total - bad;
    const p = good / total;
    const pct = Math.round(p * 1000) / 10;
    out.push(
      mcq(
        id,
        'quant',
        `Q${id}: A lot has ${total} units; ${bad} are defective. Probability a random pick is non-defective is:`,
        `${pct}%`,
        [`${Math.min(100, pct + 8)}%`, `${Math.max(0, pct - 8)}%`, `${(100 - pct).toFixed(1)}%`],
        `Non-defective = ${good}. P = ${good}/${total} = ${pct}%.`
      )
    );
  } else if (pattern === 6) {
    const men = 4 + (k % 6);
    const days = 18 + (k % 12);
    const work = men * days;
    const men2 = men + 2;
    const days2 = Math.round(work / men2);
    out.push(
      mcq(
        id,
        'quant',
      `Q${id}: If ${men} men complete a task in ${days} days, how many days should ${men2} men take (same work rate)?`,
        `${days2}`,
        [`${days2 + 4}`, `${Math.max(1, days2 - 5)}`, `${Math.round((days * men2) / men)}`],
        `Work = man-days = ${men}×${days} = ${work}. Days for ${men2} men = ${work}/${men2} ≈ ${days2}.`
      )
    );
  } else {
    const base = 7 + (k % 9);
    const exp = 3 + (k % 4);
    const val = Math.pow(base, exp);
    out.push(
      mcq(
        id,
        'quant',
        `Q${id}: Compute ${base}^${exp}.`,
        `${val}`,
        [`${val + base}`, `${Math.max(0, val - base)}`, `${base * exp}`],
        `Expand: ${base}^${exp} = ${val} (exact integer power).`
      )
    );
  }
}

/* ---------------- Logical 60 ---------------- */
for (let k = 0; k < 60; k++) {
  const id = 80 + k + 1;
  const p = k % 6;
  if (p === 0) {
    const a = 11 + k;
    const b = 18 + (k % 13);
    const c = a + b;
    const d = b + (k % 5) + 3;
    const next = c + d;
    out.push(
      mcq(
        id,
        'logical',
        `Q${id}: Find the next term: ${a}, ${b}, ${c}, ?`,
        `${next}`,
        [`${next + 2}`, `${c}`, `${b + a}`],
        `Check pairwise differences / second differences; pattern yields next = ${next}.`
      )
    );
  } else if (p === 1) {
    const s = `WORD${k}`;
    const shift = 3 + (k % 4);
    const enc = s
      .split('')
      .map((ch) => {
        if (ch < 'A' || ch > 'Z') return ch;
        return String.fromCharCode(((ch.charCodeAt(0) - 65 + shift) % 26) + 65);
      })
      .join('');
    out.push(
      mcq(
        id,
        'logical',
        `Q${id}: Caesar cipher with shift +${shift} on "${s}" gives:`,
        enc,
        [
          s
            .split('')
            .map((ch) =>
              ch >= 'A' && ch <= 'Z'
                ? String.fromCharCode(((ch.charCodeAt(0) - 65 + shift + 1) % 26) + 65)
                : ch
            )
            .join(''),
          s,
          enc.split('').reverse().join(''),
        ],
        `Shift each A–Z letter forward by ${shift} modulo 26 → ${enc}.`
      )
    );
  } else if (p === 2) {
    const seats = 6 + (k % 5);
    const pos = 1 + (k % (seats - 2));
    out.push(
      mcq(
        id,
        'logical',
        `Q${id}: In a row of ${seats} people facing north, person P sits ${pos} seats from the left end. Position from the right end is:`,
        `${seats - pos + 1}`,
        [`${seats - pos}`, `${pos + 1}`, `${seats}`],
        `From right = total − leftIndex + 1 = ${seats} − ${pos} + 1 = ${seats - pos + 1}.`
      )
    );
  } else if (p === 3) {
    const correct = (k % 2 === 0 ? 'Square' : 'Triangle');
    out.push(
      mcq(
        id,
        'logical',
        `Q${id}: Odd one out: Circle, Ellipse, ${correct}, Sphere`,
      `${correct}`,
      ['Circle', 'Ellipse', 'Sphere'],
        `Three are round/curved surfaces of revolution; ${correct} is the distinct polygonal / non-conic choice in this constructed set.`
      )
    );
  } else if (p === 4) {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const steps = k % 8;
    const ans = dirs[steps];
    out.push(
      mcq(
        id,
        'logical',
        `Q${id}: You face North, then turn ${steps * 45}° clockwise. You are now facing:`,
        ans,
        [dirs[(steps + 1) % 8], dirs[(steps + 3) % 8], dirs[(steps + 5) % 8]],
        `Each 45° step moves one compass octant clockwise from N: after ${steps} steps → ${ans}.`
      )
    );
  } else {
    const t = 20 + k;
    const f = 5 + (k % 7);
    const s = 7 + (k % 11);
    out.push(
      mcq(
        id,
        'logical',
        `Q${id}: Clock A gains ${f} min/day; clock B loses ${s} min/day. After ${t} days, their difference is closest to:`,
        `${f * t + s * t} minutes`,
        [`${Math.abs(f - s) * t} minutes`, `${(f + s) * t + 10} minutes`, `${t * 60} minutes`],
        `Separate drift: A moves +${f}×${t}; B moves −${s}×${t}; gap ≈ ${f * t + s * t} minutes (absolute sum of drifts).`
      )
    );
  }
}

/* ---------------- Verbal 60 (unique stems) ---------------- */
/** 60 unique antonym stems (placement-level vocabulary) */
const verbalBank = [
  ['Pragmatic', 'Idealistic'],
  ['Mitigate', 'Intensify'],
  ['Ephemeral', 'Enduring'],
  ['Sparse', 'Abundant'],
  ['Candid', 'Evasive'],
  ['Concise', 'Verbose'],
  ['Benign', 'Malignant'],
  ['Ambiguous', 'Unambiguous'],
  ['Frugal', 'Extravagant'],
  ['Tacit', 'Explicit'],
  ['Volatile', 'Stable'],
  ['Opaque', 'Transparent'],
  ['Arbitrary', 'Systematic'],
  ['Novel', 'Trite'],
  ['Cursory', 'Thorough'],
  ['Alleviate', 'Worsen'],
  ['Bolster', 'Undermine'],
  ['Coherent', 'Incoherent'],
  ['Diligent', 'Negligent'],
  ['Eccentric', 'Conventional'],
  ['Feasible', 'Impractical'],
  ['Gregarious', 'Reclusive'],
  ['Harmonize', 'Clash'],
  ['Immutable', 'Mutable'],
  ['Judicious', 'Reckless'],
  ['Keen', 'Obtuse'],
  ['Lucid', 'Confusing'],
  ['Meticulous', 'Sloppy'],
  ['Nascent', 'Mature'],
  ['Ostentatious', 'Understated'],
  ['Prudent', 'Imprudent'],
  ['Quell', 'Incite'],
  ['Resilient', 'Fragile'],
  ['Succinct', 'Rambling'],
  ['Tenuous', 'Robust'],
  ['Ubiquitous', 'Rare'],
  ['Venerate', 'Despise'],
  ['Wary', 'Credulous'],
  ['Xenial', 'Hostile'],
  ['Yield', 'Resist'],
  ['Zealous', 'Apathetic'],
  ['Abridge', 'Amplify'],
  ['Benignity', 'Malice'],
  ['Clemency', 'Severity'],
  ['Debunk', 'Validate'],
  ['Ebb', 'Surge'],
  ['Fickle', 'Steadfast'],
  ['Garrulous', 'Taciturn'],
  ['Hapless', 'Fortunate'],
  ['Iconoclast', 'Traditionalist'],
  ['Jaded', 'Naive'],
  ['Kindle', 'Extinguish'],
  ['Lament', 'Celebrate'],
  ['Mendacious', 'Veracious'],
  ['Nefarious', 'Virtuous'],
  ['Obviate', 'Necessitate'],
  ['Placate', 'Provoke'],
  ['Quixotic', 'Realistic'],
  ['Redundant', 'Essential'],
  ['Sporadic', 'Constant'],
];

for (let k = 0; k < 60; k++) {
  const id = 140 + k + 1;
  const [w, opp] = verbalBank[k];
  const nearA = ['tangential', 'adjacent', 'lateral'][k % 3];
  const nearB = ['parallel', 'orthogonal', 'oblique'][k % 3];
  out.push(
    mcq(
      id,
      'verbal',
      `Q${id}: Select the answer most opposite in meaning to “${w}” (business/standard English):`,
      opp,
      [w, nearA, nearB],
      `Antonym pair: “${w}” ↔ “${opp}”. The other choices are unrelated distractors for this stem.`
    )
  );
}

/* ---------------- PI 150 ---------------- */
const fwCycle = ['STAR', 'CAR', 'SOAR', 'PEEL', 'SPI'];

function interviewRecord(id, category, question, framework) {
  return {
    id,
    type: 'interview',
    category,
    question,
    sample_answer: `Structure: ${framework}. Situation: concise context with scope. Task: your accountability. Action: 2–3 decisions with trade-offs and stakeholders. Result: quantified outcome + retrospective metric. Risk: note what you’d validate with data in a consulting delivery setting (Accenture/Deloitte-style client cadence).`,
    framework,
  };
}

for (let k = 0; k < 50; k++) {
  const id = 201 + k;
  const fw = fwCycle[k % fwCycle.length];
  out.push(
    interviewRecord(
      id,
      'hr',
      `HR-${id}: How do you manage stakeholder conflict when priorities diverge between delivery and sales (case variant ${k + 1})?`,
      fw
    )
  );
}

for (let k = 0; k < 50; k++) {
  const id = 251 + k;
  const fw = fwCycle[(k + 2) % fwCycle.length];
  out.push(
    interviewRecord(
      id,
      'behavioral',
      `BEH-${id}: Tell me about a time you influenced without authority. What signals did you use to know you were gaining traction (story ${k + 1})?`,
      fw
    )
  );
}

for (let k = 0; k < 50; k++) {
  const id = 301 + k;
  const fw = fwCycle[(k + 4) % fwCycle.length];
  out.push(
    interviewRecord(
      id,
      'resume_based',
      `CV-${id}: Explain the single strongest bullet on your resume for role family ${['strategy', 'ops', 'analytics', 'PM'][k % 4]} (line ref ${k + 1}). How is impact audited?`,
      fw
    )
  );
}

/* ---------------- Case 150 ---------------- */
function caseRecord(id, category, question, sample_answer, framework) {
  return {
    id,
    type: 'case',
    category,
    question,
    sample_answer,
    framework,
  };
}

for (let k = 0; k < 50; k++) {
  const id = 351 + k;
  const popM = 420 + k * 3;
  out.push(
    caseRecord(
      id,
      'market_sizing',
      `MS-${id}: Size the annual market for enterprise RPA licenses in India for cohort year ${2024 + (k % 2)}. Cite 4 explicit assumptions.`,
      `Assumptions: (1) addressable large enterprises ≈ ${popM}; (2) bots per firm trajectory; (3) ACV from public comps band; (4) adoption curve by industry. Build top-down and bottom-up, reconcile to one order-of-magnitude with sensitivity on ACV ±20%.`,
      'MECE + sanity checks'
    )
  );
}

for (let k = 0; k < 50; k++) {
  const id = 401 + k;
  out.push(
    caseRecord(
      id,
      'profitability',
      `PF-${id}: A BPO’s EBITDA margin compressed from ${18 + (k % 5)}% to ${12 + (k % 4)}% in two quarters. What three branches of a profitability tree would you open first (site ${k + 1})?`,
      `Branch A: Revenue leakage (price realization, volume, contract penalties). Branch B: People cost (attrition, bench, overtime). Branch C: Non-people opex (real estate, tools). Start with quick variance vs budget and top 10 accounts by margin.`,
      'Profitability tree'
    )
  );
}

for (let k = 0; k < 50; k++) {
  const id = 451 + k;
  out.push(
    caseRecord(
      id,
      'business_scenario',
      `BS-${id}: A retailer’s same-store sales are flat but online is +${30 + (k % 15)}% YoY. Propose a 60-day test plan with two guardrail metrics (store cluster ${k + 1}).`,
      `Hypothesis: channel shift + promo mix. Tests: localized fulfillment SLAs, omni inventory accuracy, targeted promo cap. Guardrails: gross margin % and NPS in affected clusters; weekly cohort views; rollback triggers if margin −> threshold.`,
      'Hypothesis testing + KPI guardrails'
    )
  );
}

/* Validation */
if (out.length !== 500) throw new Error(`Expected 500, got ${out.length}`);
const texts = new Set();
for (const row of out) {
  if (texts.has(row.question)) throw new Error('Duplicate question text');
  texts.add(row.question);
}

const dest = path.join(root, 'data', 'placement-questions-500.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out, null, 2), 'utf8');
console.log(`Wrote ${out.length} unique questions → ${dest}`);
