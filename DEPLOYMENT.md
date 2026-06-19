# Deploy U.S. Open Golf Picks Live

This package mirrors the Vercel + Supabase deployment pattern used by the other U.S. Open leaderboard. Vercel serves the static site and `/api/scores`; Supabase stores timestamped score snapshots.

## 1. Download and extract

Extract the zip. The extracted repository root must directly contain:

- `public/`
- `api/`
- `supabase/`
- `tests/`
- `vercel.json`
- `package.json`

Do not upload a parent folder that places these files one level too deep.

## 2. Create a GitHub repository

1. Create an empty GitHub repository such as `us-open-golf-picks-2026`.
2. Upload all extracted contents to the repository root.
3. Commit the files to the `main` branch.

Command-line alternative:

```bash
git init
git add .
git commit -m "Deploy U.S. Open golf picks leaderboard"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/us-open-golf-picks-2026.git
git push -u origin main
```

Never commit a Supabase secret key or an `.env` file.

## 3. Configure Supabase

1. Create a project at `https://supabase.com/dashboard`.
2. Wait for provisioning to finish.
3. Open **SQL Editor → New query**.
4. Paste the full contents of `supabase/migrations/001_initial.sql`.
5. Click **Run**.
6. Open **Connect** and copy the Project URL.
7. Open **Settings → API Keys** and create a server-side Secret key beginning with `sb_secret_`.

The migration creates:

- `score_snapshots`: one saved live-score payload per event/minute.
- `latest_score_snapshot`: a view returning the latest event snapshot.
- A read-only public policy for snapshots.

The secret key bypasses Row Level Security. Keep it only in Vercel's encrypted server-side environment variables. Never place it in `public/`, GitHub, or browser code.

## 4. Import into Vercel

1. Open `https://vercel.com`.
2. Choose **Add New → Project**.
3. Import the GitHub repository.
4. Leave **Root Directory** as `./`.
5. The included `vercel.json` automatically selects the **Other** framework and the `public` output directory.
6. Add these environment variables:

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=sb_secret_your_key
```

Apply both variables to **Production**, **Preview**, and **Development**.

Optional override:

```text
ESPN_EVENT_ID=401811952
```

The U.S. Open event ID is already built in, so the override is normally unnecessary.

Environment-variable changes require a new deployment.

## 5. Deploy

1. Click **Deploy**.
2. Vercel will provide a public `*.vercel.app` address.
3. Future pushes to the GitHub `main` branch will deploy automatically.

## 6. Verify

1. Open the public website in an incognito window.
2. Confirm Sean and Zach each have four starters.
3. Confirm the alternate and Best Ball sections show the correct picks.
4. Confirm the source/status pill changes from **Connecting** to the tournament status.
5. Visit `https://YOUR-SITE.vercel.app/api/scores` and confirm JSON loads with `event`, `players`, and `updatedAt`.
6. Confirm the JSON field `snapshotSaved` is `true`.
7. In Supabase, open **Table Editor → score_snapshots** and confirm a saved row appears.
8. Ensure Vercel **Deployment Protection** is disabled for Production if everyone should have access.

## Troubleshooting

- **Scores delayed:** Open `/api/scores` directly, then inspect **Vercel → Project → Logs**.
- **No Supabase row:** Recheck both environment-variable names and values, then redeploy.
- **Home page returns 404:** Confirm `public/index.html`, `api`, and `vercel.json` are at the repository root and Root Directory is `./`.
- **A golfer says Not found:** Check the full spelling in `public/scoring.js` against the `/api/scores` JSON.
- **Changes are missing:** Confirm the commit reached `main` and the latest production deployment completed.

The public leaderboard can still display live scores without Supabase. Supabase is used for score history and deployment verification.
