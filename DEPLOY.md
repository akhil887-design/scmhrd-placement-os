# Deploy checklist (GitHub → Render)

## What went wrong before

If GitHub shows the **“Quick setup — empty repository”** page, your code is **not on GitHub yet**. Render reads GitHub, so it cannot find `render.yaml` until you push.

## Step 1 — Upload your code to GitHub (easiest: GitHub Desktop)

1. Install **GitHub Desktop**: [https://desktop.github.com](https://desktop.github.com)
2. Sign in with the same GitHub account as `akhil887-design`.
3. **File → Add Local Repository…** and choose your project folder  
   `scmhrd-placement-os` (the one that contains `backend/`, `frontend/`, and `render.yaml`).
4. If GitHub Desktop asks to publish:
   - Choose owner **`akhil887-design`**
   - Repository **`scmhrd-placement-os`**
   - Click **Publish repository**
5. Confirm in the browser that you see files (not the empty-repo page):  
   `https://github.com/akhil887-design/scmhrd-placement-os`

You should see `render.yaml` at the top level of the repo.

## Step 2 — Deploy on Render (Blueprint)

1. Open [Render Dashboard](https://dashboard.render.com/)
2. **New +** → **Blueprint**
3. Connect GitHub if asked, then select **`akhil887-design/scmhrd-placement-os`**
4. Apply / deploy using the detected `render.yaml`

## Step 3 — Your public link

When the deploy is **Live**, copy the service URL (looks like `https://scmhrd-placement-os.onrender.com`).

Sanity checks:

- `https://YOUR-URL/api/health` should return JSON with `"ok": true`
- `https://YOUR-URL/` loads the app

## Free tier notes

- The service may **sleep** when idle; the first visit after a while can be slow.
- SQLite on the free tier is **not guaranteed to persist** across redeploys/restarts. For a serious production database, use a managed DB and migrate later.
