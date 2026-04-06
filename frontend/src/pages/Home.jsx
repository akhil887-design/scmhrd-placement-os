import { Link } from 'react-router-dom';
import { Card } from '../components/Card';

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight">SCMHRD Placement OS</h1>
        <p className="text-ink-muted mt-3 text-balance">
          A calm, local workspace for aptitude drills, psych mapping, interview reps, and readiness
          scoring—built for laptop-first daily practice.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/dashboard"
            className="rounded-full bg-ink text-white px-6 py-2.5 text-sm font-medium"
          >
            Open dashboard
          </Link>
          <Link
            to="/register"
            className="rounded-full border border-black/10 px-6 py-2.5 text-sm font-medium"
          >
            Create account
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card title="Student" subtitle="Profile, resume blocks, external scores" />
        <Card title="Aptitude" subtitle="Quant · Logical · Verbal with solutions" />
        <Card title="Psych" subtitle="Trait radar + narrative" />
        <Card title="Interview" subtitle="500+ local prompts with confidence" />
        <Card title="Mock" subtitle="Random round + consistency score" />
        <Card title="Rankings" subtitle="Weighted cohort leaderboard" />
      </div>
    </div>
  );
}
