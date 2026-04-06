import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card } from '../components/Card';

const MODES = [
  { id: 'HR', label: 'HR round', hint: 'Behavior & fit' },
  { id: 'Technical', label: 'Technical round', hint: 'Domain depth' },
  { id: 'Case', label: 'Case round', hint: 'Structured problem solving' },
];

export default function MockInterview() {
  const [mode, setMode] = useState('HR');
  const [count, setCount] = useState(6);
  const [secondsPerQ, setSecondsPerQ] = useState(90);

  const [session, setSession] = useState(null);
  const [idx, setIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90);
  const [conf, setConf] = useState({});
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const loadHistory = useCallback(() => {
    api.get('/api/mock-interview/sessions').then((d) => setHistory(d.sessions));
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!session || result) return;
    const sec = session.seconds_per_question;
    setTimeLeft(sec);
    const id = setInterval(() => {
      setTimeLeft((t) => (t <= 1 ? 0 : t - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [session?.session_id, idx, session?.seconds_per_question, result]);

  const start = async () => {
    setResult(null);
    setIdx(0);
    setAnswers([]);
    setConf({});
    const data = await api.post('/api/mock-interview/start', {
      mode,
      count,
      seconds_per_question: secondsPerQ,
    });
    setSession(data);
    const init = {};
    data.questions.forEach((q) => {
      init[q.id] = 3;
    });
    setConf(init);
  };

  const submitAll = async (rows) => {
    if (!session) return;
    const data = await api.post('/api/mock-interview/submit', {
      session_id: session.session_id,
      responses: rows,
    });
    setResult(data);
    loadHistory();
  };

  const handleNext = () => {
    if (!session) return;
    const q = session.questions[idx];
    const cap = session.seconds_per_question;
    const used = Math.max(1, Math.min(cap, cap - timeLeft));
    const row = {
      question_id: q.id,
      confidence: Number(conf[q.id] ?? 3),
      seconds_used: used,
    };

    if (idx >= session.questions.length - 1) {
      submitAll([...answers, row]);
      return;
    }

    setAnswers((a) => [...a, row]);
    setIdx((i) => i + 1);
  };

  const reset = () => {
    setSession(null);
    setResult(null);
    setIdx(0);
    setAnswers([]);
  };

  const q = session?.questions?.[idx];

  return (
    <div className="space-y-8 max-w-2xl">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Mock interview</h1>
        <p className="text-sm text-ink-muted mt-1">
          HR, Technical, or Case · per-question timer (60–120s) · self-rate 1–5 · consistency score ·
          improvement vs last session
        </p>
      </header>

      {!session && (
        <Card className="!p-5">
          <div className="space-y-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted mb-2">
                Interview mode
              </p>
              <div className="grid gap-2">
                {MODES.map((m) => (
                  <label
                    key={m.id}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 cursor-pointer transition ${
                      mode === m.id ? 'border-ink bg-black/[0.03]' : 'border-black/10'
                    }`}
                  >
                    <div>
                      <span className="text-sm font-medium">{m.label}</span>
                      <span className="text-xs text-ink-muted block">{m.hint}</span>
                    </div>
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === m.id}
                      onChange={() => setMode(m.id)}
                    />
                  </label>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              <div>
                <label className="text-xs text-ink-muted block mb-1">Questions</label>
                <select
                  className="rounded-xl border border-black/10 px-3 py-2 text-sm bg-white"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                >
                  {[3, 4, 5, 6, 8, 10].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-ink-muted block mb-1">Timer per question</label>
                <select
                  className="rounded-xl border border-black/10 px-3 py-2 text-sm bg-white"
                  value={secondsPerQ}
                  onChange={(e) => setSecondsPerQ(Number(e.target.value))}
                >
                  {[60, 75, 90, 105, 120].map((s) => (
                    <option key={s} value={s}>
                      {s}s
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="button"
              onClick={start}
              className="rounded-full bg-ink text-white px-6 py-2.5 text-sm font-medium"
            >
              Start session
            </button>
          </div>
        </Card>
      )}

      {session && !result && q && (
        <Card className="!p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-xs text-ink-muted">
                {session.mode} · Question {idx + 1} / {session.questions.length}
              </p>
              <p
                className={`text-3xl font-semibold tabular-nums mt-1 ${
                  timeLeft <= 10 ? 'text-orange-600' : 'text-ink'
                }`}
              >
                {timeLeft}s
              </p>
            </div>
            <span className="text-xs text-ink-muted shrink-0">
              {session.seconds_per_question}s cap
            </span>
          </div>
          <p className="text-sm leading-relaxed mb-6">{q.question}</p>
          <label className="text-xs text-ink-muted block mb-1">Self-rate your answer (1–5)</label>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={conf[q.id] ?? 3}
            onChange={(e) =>
              setConf({
                ...conf,
                [q.id]: Number(e.target.value),
              })
            }
            className="w-full accent-ink"
          />
          <div className="text-xs text-ink-muted mt-1 mb-6">{conf[q.id] ?? 3} / 5</div>
          <button
            type="button"
            onClick={handleNext}
            className="rounded-full bg-ink text-white px-6 py-2.5 text-sm font-medium"
          >
            {idx >= session.questions.length - 1 ? 'Finish & score' : 'Next question'}
          </button>
        </Card>
      )}

      {result && (
        <Card className="!p-5">
          <p className="text-sm text-ink-muted mb-1">Confidence consistency</p>
          <p className="text-3xl font-semibold tabular-nums">{result.consistency_score}</p>
          <p className="text-sm text-ink-muted mt-2">
            {result.responses_recorded} ratings · lower spread in 1–5 scores typically raises
            consistency.
          </p>
          {result.improvement_vs_previous != null && (
            <p className="text-sm mt-3">
              vs previous session:{' '}
              <span
                className={
                  result.improvement_vs_previous >= 0 ? 'text-green-700' : 'text-orange-700'
                }
              >
                {result.improvement_vs_previous >= 0 ? '+' : ''}
                {result.improvement_vs_previous}
              </span>
              {result.previous_consistency != null && (
                <span className="text-ink-muted"> (last: {result.previous_consistency})</span>
              )}
            </p>
          )}
          <button type="button" onClick={reset} className="mt-5 text-sm text-accent hover:underline">
            New session
          </button>
        </Card>
      )}

      <Card title="Session history" className="!p-5">
        {history.length === 0 ? (
          <p className="text-sm text-ink-muted">Complete a session to see history and Δ vs prior.</p>
        ) : (
          <ul className="text-sm space-y-3">
            {history.map((h) => (
              <li
                key={h.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-black/5 pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <span className="font-medium">{h.mode || '—'}</span>
                  <span className="text-ink-muted text-xs block">
                    {new Date(h.created_at).toLocaleString()} · {h.question_count} Q ·{' '}
                    {h.seconds_per_question ?? '—'}s / Q
                  </span>
                </div>
                <div className="text-right tabular-nums">
                  <span className="font-medium">{h.consistency_score}</span>
                  {h.delta_consistency != null && (
                    <span
                      className={`text-xs ml-2 ${
                        h.delta_consistency >= 0 ? 'text-green-700' : 'text-orange-700'
                      }`}
                    >
                      {h.delta_consistency >= 0 ? '+' : ''}
                      {h.delta_consistency}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-ink-muted mt-4">
          Δ = change vs your immediately previous completed session.
        </p>
      </Card>
    </div>
  );
}
