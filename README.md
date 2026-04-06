# SCMHRD Placement OS

Full-stack local placement preparation platform: student profiles, aptitude tests, psychological assessment, interview prep (500+ questions), mock interviews, dashboard, leaderboard, and admin panel.

## Stack

- **Frontend:** React (Vite), Tailwind CSS, Context API, Recharts
- **Backend:** Node.js, Express, SQLite (better-sqlite3)
- **Auth:** JWT + bcrypt (local accounts only)

## Project layout

- `frontend/` — React SPA
- `backend/` — REST API
- `database/` — SQLite file (`placement.db`) created on first run

## Quick start

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

API: `http://localhost:4000`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:5173` (proxies `/api` to backend in dev)

### Default admin (seeded)

- Email: `admin@scmhrd.local`
- Password: `admin123`

Change the password after first login in production.

## Deploy (free) — Render

This repo includes a `render.yaml` that deploys **one web service**:
- Builds the frontend (`frontend/dist`) and serves it from the backend Express app
- Runs the backend on `PORT` (Render sets it automatically)
- Persists SQLite to a small attached disk via `DB_PATH=/var/data/placement.db`

### Steps

1. Push this repo to GitHub.
2. In Render, choose **New → Blueprint**, and select your repo.
3. Render will detect `render.yaml` and create the service.
4. When the deploy finishes, open the Render-provided URL.

### Notes / limitations (important)

- Render’s free tier may **sleep** after inactivity; the first hit after sleep can be slower.
- This is still a **SQLite** DB. It’s fine for demos and small cohorts; for higher concurrency, migrate to a managed Postgres service.

## Scripts

| Location | Command | Description |
|----------|---------|-------------|
| backend | `npm run dev` | Start API with nodemon |
| backend | `npm run seed` | Re-run DB seed (destructive) |
| frontend | `npm run dev` | Vite dev server |
| frontend | `npm run build` | Production build |

## Scoring

- **Placement readiness:** `0.4 × Aptitude% + 0.3 × Interview% + 0.3 × Psych%`
- Aptitude: average of best percentage per category (Quant, Logical, Verbal)
- Interview: from saved confidence ratings (1–5) mapped to 0–100
- Psych: fit score from trait balance vs ideal mid-profile
