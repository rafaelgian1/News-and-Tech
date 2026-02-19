# Daily Brief Newspaper

A mobile-first premium daily brief app for:
- News (Cyprus, Greece, Worldwide)
- Tech (Computer Science, Programming, AI/LLMs, Engineering)

## Stack
- Next.js 14 + React 18
- Storage:
  - Hosted Postgres when `DATABASE_URL` is set (recommended for public deployment)
  - Local SQLite fallback (`better-sqlite3`) for local dev
- API routes + daily ingestion

## Local Development
```bash
npm install
npm run dev
```

## Ingestion
Add feed content via:
- Local file: `automation/YYYY-MM-DD.json`
- Or remote source: `AUTOMATION_FEED_URL`

Run one day:
```bash
npm run ingest -- 2026-02-18
```

## Environment Variables
- `DATABASE_URL` (recommended in production; Postgres connection string)
- `OPENAI_API_KEY` (LLM parsing/narrative + article translation)
- `OPENAI_MODEL` (optional, default `gpt-4.1-mini`)
- `OPENAI_URL` (optional)
- `AUTOMATION_FEED_URL` + `AUTOMATION_FEED_TOKEN` (optional feed source)
- `IMAGE_GEN_ENDPOINT` + `IMAGE_GEN_API_KEY` (optional external image generation)
- `CRON_SECRET` (recommended in production; secures `/api/ingest`)
- `DAILY_BRIEF_DB_PATH` (optional SQLite path for local use)

## Free Global Deployment (Vercel + Free Subdomain)
1. Push this repo to GitHub.
2. Import repo into Vercel.
3. During setup, set project name to `news-and-tech`.
   - If available, you get: `https://news-and-tech.vercel.app`
   - If taken, Vercel will suggest a variant.
4. Add environment variables in Vercel project settings:
   - `DATABASE_URL` (from free Neon/Supabase Postgres)
   - `OPENAI_API_KEY`
   - `CRON_SECRET` (random long value)
   - Any optional feed/image vars you use
5. Deploy.

`vercel.json` includes a daily cron to call `/api/ingest` at `07:00 UTC` (09:00 in Greece/Cyprus during winter).

## API
- `GET /api/issues?date=YYYY-MM-DD`
- `GET /api/issues?window=7`
- `GET /api/archive?limit=90`
- `GET /api/ingest` (cron/manual trigger)
- `POST /api/ingest` (manual ingest)
- `POST /api/translate` (article translation)
