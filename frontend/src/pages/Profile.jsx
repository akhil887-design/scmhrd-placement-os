import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card } from '../components/Card';

const emptyResume = {
  headline: '',
  education: '',
  experience: '',
  projects: '',
  skills_line: '',
};

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [scores, setScores] = useState([]);
  const [form, setForm] = useState({
    specialization: '',
    skills: '',
    cgpa: '',
    resume_template: 'classic',
    resume_data: { ...emptyResume },
  });
  const [newScore, setNewScore] = useState({ label: '', score: '', max_score: '100' });
  const [msg, setMsg] = useState('');

  const load = () => {
    api.get('/api/profile').then((d) => {
      setProfile(d);
      const rd = { ...emptyResume, ...(d.profile?.resume_data || {}) };
      setForm({
        specialization: d.profile?.specialization || '',
        skills: d.profile?.skills || '',
        cgpa: d.profile?.cgpa != null ? String(d.profile.cgpa) : '',
        resume_template: d.profile?.resume_template || 'classic',
        resume_data: rd,
      });
    });
    api.get('/api/profile/test-scores').then((d) => setScores(d.scores));
  };

  useEffect(() => {
    load();
  }, []);

  const saveProfile = async (e) => {
    e?.preventDefault?.();
    setMsg('');
    await api.put('/api/profile', {
      specialization: form.specialization,
      skills: form.skills,
      cgpa: form.cgpa === '' ? null : Number(form.cgpa),
      resume_template: form.resume_template,
      resume_data: form.resume_data,
    });
    setMsg('Saved');
    load();
  };

  const addScore = async (e) => {
    e.preventDefault();
    await api.post('/api/profile/test-scores', {
      label: newScore.label,
      score: Number(newScore.score),
      max_score: Number(newScore.max_score || 100),
    });
    setNewScore({ label: '', score: '', max_score: '100' });
    load();
  };

  const delScore = async (id) => {
    await api.delete(`/api/profile/test-scores/${id}`);
    load();
  };

  if (!profile) return <p className="text-ink-muted">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Student profile</h1>
        <p className="text-ink-muted mt-1">{profile.user.name} · {profile.user.email}</p>
      </div>

      <Card title="Profile & academics" subtitle="Name and email are tied to your login">
        <form onSubmit={saveProfile} className="space-y-4 max-w-xl">
          <div>
            <label className="block text-sm text-ink-muted mb-1">Specialization</label>
            <input
              className="w-full rounded-xl border border-black/10 px-3 py-2"
              value={form.specialization}
              onChange={(e) => setForm({ ...form, specialization: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-ink-muted mb-1">Skills (comma)</label>
            <input
              className="w-full rounded-xl border border-black/10 px-3 py-2"
              value={form.skills}
              onChange={(e) => setForm({ ...form, skills: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-ink-muted mb-1">CGPA</label>
            <input
              className="w-full rounded-xl border border-black/10 px-3 py-2"
              value={form.cgpa}
              onChange={(e) => setForm({ ...form, cgpa: e.target.value })}
            />
          </div>
          <button
            type="submit"
            className="rounded-full bg-ink text-white px-5 py-2 text-sm font-medium"
          >
            Save profile
          </button>
          {msg && <span className="text-sm text-green-700 ml-2">{msg}</span>}
        </form>
      </Card>

      <Card title="Resume builder" subtitle="Template: classic • sections export as plain text">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            {['headline', 'education', 'experience', 'projects', 'skills_line'].map((key) => (
              <div key={key}>
                <label className="block text-xs uppercase tracking-wide text-ink-muted mb-1">
                  {key.replace('_', ' ')}
                </label>
                <textarea
                  rows={key === 'headline' ? 2 : 4}
                  className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                  value={form.resume_data[key]}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      resume_data: { ...form.resume_data, [key]: e.target.value },
                    })
                  }
                />
              </div>
            ))}
            <button
              type="button"
              onClick={saveProfile}
              className="rounded-full border border-black/10 px-4 py-2 text-sm"
            >
              Save resume
            </button>
          </div>
          <div className="rounded-2xl border border-black/10 p-6 bg-white text-sm leading-relaxed whitespace-pre-wrap">
            <p className="font-semibold text-lg mb-2">{form.resume_data.headline || 'Your headline'}</p>
            <p className="text-ink-muted text-xs mb-4">{form.specialization}</p>
            <p className="font-medium mb-1">Education</p>
            <p className="mb-4">{form.resume_data.education}</p>
            <p className="font-medium mb-1">Experience</p>
            <p className="mb-4">{form.resume_data.experience}</p>
            <p className="font-medium mb-1">Projects</p>
            <p className="mb-4">{form.resume_data.projects}</p>
            <p className="font-medium mb-1">Skills</p>
            <p>{form.resume_data.skills_line || form.skills}</p>
          </div>
        </div>
      </Card>

      <Card title="External test scores" subtitle="Track CAT, mock tests, certifications">
        <form onSubmit={addScore} className="flex flex-wrap gap-2 items-end mb-4">
          <div>
            <label className="block text-xs text-ink-muted mb-1">Label</label>
            <input
              className="rounded-xl border border-black/10 px-3 py-2"
              value={newScore.label}
              onChange={(e) => setNewScore({ ...newScore, label: e.target.value })}
              placeholder="CAT Mock 1"
            />
          </div>
          <div>
            <label className="block text-xs text-ink-muted mb-1">Score</label>
            <input
              className="rounded-xl border border-black/10 px-3 py-2 w-24"
              value={newScore.score}
              onChange={(e) => setNewScore({ ...newScore, score: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-ink-muted mb-1">Max</label>
            <input
              className="rounded-xl border border-black/10 px-3 py-2 w-24"
              value={newScore.max_score}
              onChange={(e) => setNewScore({ ...newScore, max_score: e.target.value })}
            />
          </div>
          <button
            type="submit"
            className="rounded-full bg-ink text-white px-4 py-2 text-sm"
          >
            Add
          </button>
        </form>
        <ul className="divide-y divide-black/5">
          {scores.map((s) => (
            <li key={s.id} className="py-2 flex justify-between gap-4 text-sm">
              <span>
                {s.label} — {s.score}/{s.max_score}
              </span>
              <span className="text-ink-muted">
                {new Date(s.taken_at).toLocaleDateString()}
                <button
                  type="button"
                  className="ml-3 text-red-600"
                  onClick={() => delScore(s.id)}
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
