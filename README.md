# Daily Brief Newspaper

A mobile-first premium daily brief app for:
- News (Cyprus, Greece, Worldwide)
- Tech (Computer Science, Programming, AI/LLMs, Engineering)
- Sports verticals:
  - Cyprus Football
  - Greek Super League
  - EuroLeague
  - European Football
  - National Football
  - Match Center (fixtures/results by selected day)

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
- `AUTOMATION_FEED_URL` + `AUTOMATION_FEED_TOKEN` (optional external feed source)
- `AUTO_GENERATE_DAILY_BRIEF` (optional, default `true`; when enabled and feed is missing, generate daily raw feed via OpenAI)
- `IMAGE_GEN_ENDPOINT` + `IMAGE_GEN_API_KEY` (optional external image generation)
- `SPORTS_API_KEY` (API-SPORTS direct key; recommended for accurate fixtures/results)
- `RAPIDAPI_KEY` (optional alternative to `SPORTS_API_KEY`)
- `SPORTS_FOOTBALL_ENDPOINT` (optional, default `https://v3.football.api-sports.io/fixtures`)
- `SPORTS_BASKETBALL_ENDPOINT` (optional, default `https://v1.basketball.api-sports.io/games`)
- `SPORTS_TIMEZONE` (optional, default `Europe/Athens`)
- `SPORTS_API_TIMEOUT_MS` (optional, default `12000`)
- `CRON_SECRET` (recommended in production; secures `/api/ingest`)
- `DAILY_BRIEF_DB_PATH` (optional SQLite path for local use)

## Sports API Behavior
When a sports API key is configured, ingestion enriches `Match Center` with real fixtures/results for the selected date:
- Upcoming matches: kickoff time in Athens timezone
- Completed matches: final score/result
- Organized by competition buckets in UI

If automation feed is missing for a date but sports API key is present, ingestion still works and populates real match-center data.

## Free Global Deployment (Vercel + Free Subdomain)
1. Push this repo to GitHub.
2. Import repo into Vercel.
3. During setup, set project name to `news-and-tech`.
   - If available, you get: `https://news-and-tech.vercel.app`
   - If taken, Vercel will suggest a variant.
4. Add environment variables in Vercel project settings:
   - `DATABASE_URL` (from free Neon/Supabase Postgres)
   - `OPENAI_API_KEY`
   - `SPORTS_API_KEY` (for accurate fixtures/results)
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
