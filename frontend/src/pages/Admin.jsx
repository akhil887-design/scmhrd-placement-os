import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card } from '../components/Card';

export default function Admin() {
  const [tab, setTab] = useState('students');
  const [students, setStudents] = useState([]);
  const [aptitude, setAptitude] = useState([]);
  const [psych, setPsych] = useState([]);
  const [interview, setInterview] = useState([]);
  const [msg, setMsg] = useState('');

  const refresh = () => {
    if (tab === 'students') api.get('/api/admin/students').then((d) => setStudents(d.students));
    if (tab === 'aptitude') api.get('/api/admin/aptitude').then((d) => setAptitude(d.questions));
    if (tab === 'psych') api.get('/api/admin/psych').then((d) => setPsych(d.questions));
    if (tab === 'interview') api.get('/api/admin/interview').then((d) => setInterview(d.questions));
  };

  useEffect(() => {
    refresh();
  }, [tab]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-ink-muted mt-1">Manage banks and view cohort performance.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ['students', 'Students'],
          ['aptitude', 'Aptitude Q'],
          ['psych', 'Psych Q'],
          ['interview', 'Interview Q'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-1.5 text-sm border ${
              tab === id ? 'bg-ink text-white border-ink' : 'border-black/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {msg && <p className="text-sm text-green-700">{msg}</p>}

      {tab === 'students' && (
        <Card title="Student performance">
          <div className="overflow-x-auto text-sm">
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-ink-muted border-b border-black/5">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Readiness</th>
                  <th className="py-2 pr-3">Apt</th>
                  <th className="py-2 pr-3">Int</th>
                  <th className="py-2 pr-3">Psych</th>
                  <th className="py-2">Attempts</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b border-black/5">
                    <td className="py-2 pr-3">{s.name}</td>
                    <td className="py-2 pr-3 text-ink-muted">{s.email}</td>
                    <td className="py-2 pr-3 font-medium">{s.placement_readiness}</td>
                    <td className="py-2 pr-3">{s.aptitude_percent}</td>
                    <td className="py-2 pr-3">{s.interview_percent}</td>
                    <td className="py-2 pr-3">{s.psych_fit_percent}</td>
                    <td className="py-2">
                      apt {s.aptitude_attempts} / psych {s.psych_attempts}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'aptitude' && (
        <AptitudeAdmin
          items={aptitude}
          onRefresh={() => {
            refresh();
            setMsg('Updated');
            setTimeout(() => setMsg(''), 2000);
          }}
        />
      )}

      {tab === 'psych' && (
        <PsychAdmin
          items={psych}
          onRefresh={() => {
            refresh();
            setMsg('Updated');
            setTimeout(() => setMsg(''), 2000);
          }}
        />
      )}

      {tab === 'interview' && (
        <InterviewAdmin
          items={interview}
          onRefresh={() => {
            refresh();
            setMsg('Updated');
            setTimeout(() => setMsg(''), 2000);
          }}
        />
      )}
    </div>
  );
}

function AptitudeAdmin({ items, onRefresh }) {
  const [form, setForm] = useState({
    category: 'Quant',
    question: '',
    options: '["","","",""]',
    correct_index: 0,
    solution: '',
  });

  const add = async (e) => {
    e.preventDefault();
    let opts;
    try {
      opts = JSON.parse(form.options);
    } catch {
      alert('Options must be JSON array');
      return;
    }
    await api.post('/api/admin/aptitude', {
      category: form.category,
      question: form.question,
      options: opts,
      correct_index: Number(form.correct_index),
      solution: form.solution,
    });
    onRefresh();
  };

  const del = async (id) => {
    if (!confirm('Delete?')) return;
    await api.delete(`/api/admin/aptitude/${id}`);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <Card title="Add aptitude question">
        <form onSubmit={add} className="space-y-3 max-w-xl">
          <select
            className="rounded-xl border border-black/10 px-3 py-2"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option>Quant</option>
            <option>Logical</option>
            <option>Verbal</option>
          </select>
          <textarea
            className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
            rows={2}
            placeholder="Question"
            value={form.question}
            onChange={(e) => setForm({ ...form, question: e.target.value })}
          />
          <textarea
            className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-mono"
            rows={2}
            placeholder='Options JSON e.g. ["A","B","C","D"]'
            value={form.options}
            onChange={(e) => setForm({ ...form, options: e.target.value })}
          />
          <input
            type="number"
            className="w-24 rounded-xl border border-black/10 px-3 py-2"
            min={0}
            max={3}
            value={form.correct_index}
            onChange={(e) => setForm({ ...form, correct_index: e.target.value })}
          />
          <textarea
            className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
            rows={2}
            placeholder="Solution"
            value={form.solution}
            onChange={(e) => setForm({ ...form, solution: e.target.value })}
          />
          <button type="submit" className="rounded-full bg-ink text-white px-4 py-2 text-sm">
            Add
          </button>
        </form>
      </Card>
      <Card title={`Existing (${items.length})`}>
        <ul className="space-y-2 text-sm max-h-96 overflow-y-auto">
          {items.map((q) => (
            <li key={q.id} className="flex justify-between gap-2 border-b border-black/5 pb-2">
              <span className="line-clamp-2">
                [{q.category}] {q.question}
              </span>
              <button type="button" className="text-red-600 shrink-0" onClick={() => del(q.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function PsychAdmin({ items, onRefresh }) {
  const sampleWeights = `{
  "0":{"analytical":3,"leadership":2,"risk_taking":2,"emotional_stability":3},
  "1":{"analytical":2,"leadership":5,"risk_taking":3,"emotional_stability":2},
  "2":{"analytical":2,"leadership":2,"risk_taking":5,"emotional_stability":1},
  "3":{"analytical":3,"leadership":3,"risk_taking":2,"emotional_stability":4}
}`;
  const [form, setForm] = useState({
    prompt: '',
    options: '["A","B","C","D"]',
    trait_weights: sampleWeights,
  });

  const add = async (e) => {
    e.preventDefault();
    let opts;
    let tw;
    try {
      opts = JSON.parse(form.options);
      tw = JSON.parse(form.trait_weights);
    } catch {
      alert('Invalid JSON');
      return;
    }
    await api.post('/api/admin/psych', { prompt: form.prompt, options: opts, trait_weights: tw });
    setForm({ ...form, prompt: '' });
    onRefresh();
  };

  const del = async (id) => {
    if (!confirm('Delete?')) return;
    await api.delete(`/api/admin/psych/${id}`);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <Card title="Add psych question">
        <form onSubmit={add} className="space-y-3 max-w-2xl">
          <textarea
            className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
            rows={2}
            placeholder="Prompt"
            value={form.prompt}
            onChange={(e) => setForm({ ...form, prompt: e.target.value })}
          />
          <textarea
            className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-mono text-xs"
            rows={2}
            value={form.options}
            onChange={(e) => setForm({ ...form, options: e.target.value })}
          />
          <textarea
            className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-mono text-xs"
            rows={8}
            value={form.trait_weights}
            onChange={(e) => setForm({ ...form, trait_weights: e.target.value })}
          />
          <button type="submit" className="rounded-full bg-ink text-white px-4 py-2 text-sm">
            Add
          </button>
        </form>
      </Card>
      <Card title={`Existing (${items.length})`}>
        <ul className="space-y-2 text-sm max-h-96 overflow-y-auto">
          {items.map((q) => (
            <li key={q.id} className="flex justify-between gap-2 border-b border-black/5 pb-2">
              <span className="line-clamp-2">{q.prompt}</span>
              <button type="button" className="text-red-600 shrink-0" onClick={() => del(q.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function InterviewAdmin({ items, onRefresh }) {
  const [form, setForm] = useState({
    category: 'HR',
    question: '',
    answer: '',
  });

  const add = async (e) => {
    e.preventDefault();
    await api.post('/api/admin/interview', form);
    setForm({ ...form, question: '', answer: '' });
    onRefresh();
  };

  const del = async (id) => {
    if (!confirm('Delete?')) return;
    await api.delete(`/api/admin/interview/${id}`);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <Card title="Add interview question">
        <form onSubmit={add} className="space-y-3 max-w-xl">
          <select
            className="rounded-xl border border-black/10 px-3 py-2"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option>HR</option>
            <option>Technical</option>
            <option>Case</option>
          </select>
          <textarea
            className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
            rows={3}
            placeholder="Question"
            value={form.question}
            onChange={(e) => setForm({ ...form, question: e.target.value })}
          />
          <textarea
            className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
            rows={4}
            placeholder="Answer"
            value={form.answer}
            onChange={(e) => setForm({ ...form, answer: e.target.value })}
          />
          <button type="submit" className="rounded-full bg-ink text-white px-4 py-2 text-sm">
            Add
          </button>
        </form>
      </Card>
      <Card title={`Existing (${items.length})`}>
        <ul className="space-y-2 text-sm max-h-96 overflow-y-auto">
          {items.slice(0, 80).map((q) => (
            <li key={q.id} className="flex justify-between gap-2 border-b border-black/5 pb-2">
              <span className="line-clamp-2">
                [{q.category}] {q.question}
              </span>
              <button type="button" className="text-red-600 shrink-0" onClick={() => del(q.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
        {items.length > 80 && (
          <p className="text-xs text-ink-muted mt-2">Showing first 80 — full list via API.</p>
        )}
      </Card>
    </div>
  );
}
