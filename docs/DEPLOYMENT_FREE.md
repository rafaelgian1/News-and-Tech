# Free Global Deployment (Vercel)

## Goal
Deploy publicly with a free subdomain. Preferred name: `news-and-tech`.

## 1. Create free managed Postgres
Use one free option:
- Neon
- Supabase

Copy the Postgres connection string as `DATABASE_URL`.

## 2. Push repo to GitHub
```bash
git add .
git commit -m "cloud deployment migration"
git push
```

## 3. Import on Vercel
- Open Vercel -> Add New Project -> Import GitHub repo.
- Set project name to `news-and-tech`.
- If available, subdomain will be:
  - `https://news-and-tech.vercel.app`
- If taken, pick suggested variant.

## 4. Configure Environment Variables in Vercel
Required:
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `CRON_SECRET` (long random secret)

Optional (if used):
- `AUTOMATION_FEED_URL`
- `AUTOMATION_FEED_TOKEN`
- `IMAGE_GEN_ENDPOINT`
- `IMAGE_GEN_API_KEY`
- `OPENAI_MODEL`

## 5. Deploy
Click Deploy.

## 6. Daily ingestion schedule
`vercel.json` already defines a cron at `07:05` daily calling `/api/ingest`.

Security:
- `/api/ingest` checks `CRON_SECRET` (Bearer token/header/query token).

## 7. Access from anywhere
Open the Vercel URL on:
- phone
- laptop
- tablet
- any location globally

## Optional: install as app on phone
- iPhone Safari: Share -> Add to Home Screen
- Android Chrome: Install App / Add to Home Screen
