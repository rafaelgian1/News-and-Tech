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

## Ingestion Paths
The app supports 4 sources (in priority order):
1. Manual/posted content (`POST /api/ingest` with `newsText`/`techText`/`sportsText`)
2. External automation feed (`AUTOMATION_FEED_URL`)
3. Public RSS auto-feed (`AUTO_PUBLIC_FEED=true`)  
   No OpenAI billing required.
4. OpenAI fallback generation (`AUTO_GENERATE_DAILY_BRIEF=true`)  
   Requires API billing.

Run one local day:
```bash
npm run ingest -- 2026-02-18
```

## No-Extra-OpenAI-Cost Mode (Recommended)
Set:
- `AUTO_PUBLIC_FEED=true`
- `AUTO_GENERATE_DAILY_BRIEF=false`

This gives automatic daily ingestion from public RSS sources + optional sports API for accurate fixtures/results.

## Environment Variables
- `DATABASE_URL` (recommended in production; Postgres connection string)
- `OPENAI_API_KEY` (optional; needed only for LLM parsing/translation/OpenAI fallback)
- `OPENAI_MODEL` (optional, default `gpt-4.1-mini`)
- `OPENAI_URL` (optional)
- `AUTOMATION_FEED_URL` + `AUTOMATION_FEED_TOKEN` (optional external feed source)
- `AUTO_PUBLIC_FEED` (optional, default `true`; enable public RSS generation)
- `AUTO_GENERATE_DAILY_BRIEF` (optional, default `true`; OpenAI generation fallback)
- `PUBLIC_FEED_TIMEOUT_MS` (optional, default `12000`)
- `PUBLIC_FEED_ITEMS_PER_QUERY` (optional, default `12`)
- `PUBLIC_FEED_HL` (optional, default `en-US`)
- `PUBLIC_FEED_GL` (optional, default `US`)
- `PUBLIC_FEED_CEID` (optional, default `US:en`)
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

If no automation feed is available, ingestion can still proceed with:
- Public RSS content for News/Tech/Sports
- Sports API live fixtures/results for Match Center

## Free Global Deployment (Vercel + Free Subdomain)
1. Push this repo to GitHub.
2. Import repo into Vercel.
3. During setup, set project name to `news-and-tech`.
4. Add environment variables in Vercel project settings:
   - `DATABASE_URL` (from free Neon/Supabase Postgres)
   - `SPORTS_API_KEY` (recommended)
   - `AUTO_PUBLIC_FEED=true`
   - `AUTO_GENERATE_DAILY_BRIEF=false` (if you want no OpenAI API cost)
   - `CRON_SECRET`
5. Deploy.

`vercel.json` includes daily cron calls to `/api/ingest`; route logic enforces only the 09:00 Europe/Athens execution window.

## API
- `GET /api/issues?date=YYYY-MM-DD`
- `GET /api/issues?window=7`
- `GET /api/archive?limit=90`
- `GET /api/ingest` (cron/manual trigger)
- `POST /api/ingest` (manual ingest)
- `POST /api/translate` (article translation)
