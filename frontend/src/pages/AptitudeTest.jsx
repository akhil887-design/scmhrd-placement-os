import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Card } from '../components/Card';

export default function AptitudeTest() {
  const { category } = useParams();
  const nav = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [attemptId, setAttemptId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.post('/api/aptitude/start', { category });
        if (cancelled) return;
        setAttemptId(data.attempt_id);
        setQuestions(data.questions);
        setSeconds(0);
      } catch (e) {
        alert(e.message);
        nav('/aptitude');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [category, nav]);

  useEffect(() => {
    if (result || loading) return;
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [result, loading]);

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const submit = async () => {
    clearInterval(timerRef.current);
    const payload = {
      attempt_id: attemptId,
      duration_seconds: seconds,
      answers: questions.map((q) => ({
        question_id: q.id,
        selected_index: answers[q.id] ?? 0,
      })),
    };
    const data = await api.post('/api/aptitude/submit', payload);
    setResult(data);
  };

  if (loading) return <p className="text-ink-muted">Preparing test…</p>;

  if (result) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Results · {category}</h1>
            <p className="text-ink-muted mt-1">
              Score {result.score}/{result.total} ({result.percentage}%)
            </p>
          </div>
          <Link to="/aptitude" className="text-sm text-accent hover:underline">
            Back
          </Link>
        </div>
        <div className="space-y-4">
          {result.details.map((d) => (
            <Card key={d.question_id}>
              <p className="font-medium mb-2">{d.question}</p>
              <ul className="text-sm space-y-1 mb-3">
                {d.options.map((o, i) => (
                  <li
                    key={i}
                    className={
                      i === d.correct_index
                        ? 'text-green-700'
                        : i === d.selected_index
                          ? 'text-red-700'
                          : 'text-ink-muted'
                    }
                  >
                    {String.fromCharCode(65 + i)}. {o}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-ink-muted">
                <span className="font-medium text-ink">Solution:</span> {d.solution}
              </p>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">{category} test</h1>
          <p className="text-ink-muted mt-1">Timer running · {fmt(seconds)}</p>
        </div>
        <button
          type="button"
          onClick={submit}
          className="rounded-full bg-ink text-white px-5 py-2 text-sm font-medium"
        >
          Submit
        </button>
      </div>

      <div className="space-y-4">
        {questions.map((q, idx) => (
          <Card key={q.id} title={`Q${idx + 1}`}>
            <p className="mb-3">{q.question}</p>
            <div className="space-y-2">
              {q.options.map((o, i) => (
                <label
                  key={i}
                  className="flex items-start gap-2 text-sm cursor-pointer rounded-xl border border-black/5 px-3 py-2 hover:bg-black/[0.02]"
                >
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    checked={answers[q.id] === i}
                    onChange={() => setAnswers({ ...answers, [q.id]: i })}
                  />
                  <span>
                    {String.fromCharCode(65 + i)}. {o}
                  </span>
                </label>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
