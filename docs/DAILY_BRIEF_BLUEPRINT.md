# Daily Brief Newspaper Blueprint

## 1) Architecture Diagram
```text
[Daily Automation Feed (API or local JSON)]
                  |
                  v
      [Daily Ingestion Job /api/ingest or scripts/daily-ingest.ts]
                  |
                  v
     [LLM Prompt A: raw text -> structured DailyIssue JSON]
                  |
                  v
   [LLM Prompt B: structured JSON -> analytical narratives]
                  |
                  v
 [Cover Pipeline: keywords -> Prompt C -> image prompt -> image cache]
                  |
                  v
      [SQLite]
      - daily_issues (active 7-day window)
      - archived_issues (older than 7 days)
      - issue_covers (news/tech image cache)
      - ingest_runs (observability)
                  |
                  v
       [Next.js UI]
       - Home: date picker + last 7 days + two premium cards
       - Archive: retrievable older issues
       - API: /api/issues, /api/archive, /api/ingest
```

## Stack Choice (Brief Justification)
- Frontend/server: `Next.js + React`
  - Single codebase for UI + API routes, fast iteration, SSR-ready, simple deployment path.
- Storage: `SQLite` (`better-sqlite3`)
  - Perfect for local-first daily briefs, low ops overhead, fast reads, easy archive rotation.
- Background job: `node-cron` worker + direct script trigger
  - Supports unattended daily ingestion while keeping MVP simple.

## 2) Database Schema (SQLite)
- `daily_issues`
  - `issue_date TEXT PRIMARY KEY`
  - `issue_json TEXT NOT NULL` (full `DailyIssue` object)
  - `ingest_status TEXT NOT NULL` (`ready|partial|missing`)
  - `raw_input_news TEXT`, `raw_input_tech TEXT`
  - `created_at TEXT`, `updated_at TEXT`
- `archived_issues`
  - `issue_date TEXT PRIMARY KEY`
  - `issue_json TEXT NOT NULL`
  - `ingest_status TEXT NOT NULL`
  - `raw_input_news TEXT`, `raw_input_tech TEXT`
  - `archived_at TEXT NOT NULL`
- `issue_covers`
  - `issue_date TEXT NOT NULL`
  - `block_name TEXT NOT NULL` (`news|tech`)
  - `image_url TEXT NOT NULL`
  - `prompt TEXT NOT NULL`
  - `keywords_json TEXT NOT NULL`
  - `created_at TEXT NOT NULL`
  - `PRIMARY KEY(issue_date, block_name)`
- `ingest_runs`
  - `id INTEGER PRIMARY KEY AUTOINCREMENT`
  - `issue_date TEXT NOT NULL`
  - `status TEXT NOT NULL` (`success|error`)
  - `error_message TEXT`
  - `created_at TEXT NOT NULL`

## 3) API Contract
- `GET /api/issues?date=YYYY-MM-DD`
  - Returns one issue for day (checks active + archive)
- `GET /api/issues?window=7`
  - Returns recent active issues in descending date order
- `GET /api/archive?limit=90`
  - Returns archived issues
- `POST /api/ingest`
  - Body optional: `{ "date": "YYYY-MM-DD", "newsText": "...", "techText": "..." }`
  - If text omitted, endpoint tries automation feed (`AUTOMATION_FEED_URL` or `automation/<date>.json`)
  - Success: `201 { issue }`
  - Missing feed: `404 { error, status: "missing", retryable: true }`

## 4) UI Screens + Components
- Home (`/`)
  - Header: date picker, search, quick filters, dark/light toggle, archive entry
  - Last-7-days rolling date chips
  - Two main blocks: `News` and `Tech`
  - Each block has:
    - cached daily cover image
    - headline strip
    - subsection accordions
    - read time estimate
    - Save + Share actions
    - analysis-rich item rendering: key facts, analysis, implications, watch next, credibility note, citations
- Archive (`/archive`)
  - List of issues older than 7 days, retrievable by date
- Empty state
  - Graceful “missing feed” UI with retry ingestion action

Core components:
- `DailyBriefApp`
- `BlockCard`
- `SubsectionAccordion`
- `EmptyState`

## 5) Exact LLM Prompts

### Prompt A: automation text -> structured DailyIssue JSON
```text
You are an editor-engine for a premium daily brief app.

TASK
Transform raw automation text into STRICT JSON for one DailyIssue.

DATE
{{date}}

OUTPUT RULES
- Return ONLY valid JSON. No markdown, no commentary.
- Keep facts grounded in the input. Do not invent claims.
- If data is missing, leave fields empty arrays or use concise uncertainty notes.
- Preserve citations where possible.

TARGET JSON SCHEMA
{
  "date": "YYYY-MM-DD",
  "sections": {
    "news": {
      "cyprus": { "label": "Cyprus", "items": [BriefItem] },
      "greece": { "label": "Greece", "items": [BriefItem] },
      "world": { "label": "Worldwide", "items": [BriefItem] }
    },
    "tech": {
      "cs": { "label": "Computer Science", "items": [BriefItem] },
      "programming": { "label": "Programming", "items": [BriefItem] },
      "ai_llm": { "label": "AI/LLMs", "items": [BriefItem] },
      "other": { "label": "Engineering", "items": [BriefItem] }
    }
  },
  "status": "ready|partial|missing"
}

BriefItem schema:
{
  "headline": "string",
  "keyFacts": ["fact 1", "fact 2"],
  "analysis": "short analytical paragraph",
  "implications": ["practical implication 1", "practical implication 2"],
  "watchNext": ["near-term watchpoint 1", "near-term watchpoint 2"],
  "credibilityNotes": "string or empty",
  "sources": [{"title":"string","url":"https://...","publisher":"string"}]
}

SOURCE MATERIAL - NEWS
{{newsText}}

SOURCE MATERIAL - TECH
{{techText}}
```

### Prompt B: structured JSON -> final analytical narrative blocks
```text
You are writing a concise analytical daily newspaper.

TASK
Using the provided structured DailyIssue JSON, enrich each subsection with a "narrative" string that is more analytical than summary.

REQUIRED SHAPE
Return only JSON with this shape:
{
  "news": {
    "cyprus": { "narrative": "..." },
    "greece": { "narrative": "..." },
    "world": { "narrative": "..." }
  },
  "tech": {
    "cs": { "narrative": "..." },
    "programming": { "narrative": "..." },
    "ai_llm": { "narrative": "..." },
    "other": { "narrative": "..." }
  }
}

Narrative requirements per subsection:
- Start with what happened (facts only).
- Explain why it matters now.
- Include 2-4 practical implications.
- Include what to watch in the near term.
- Mention credibility gaps if sources disagree.
- Keep it concise, scannable, and editorially neutral.

INPUT JSON
{{dailyIssueJson}}
```

### Prompt C: story keywords -> image prompt (daily block cover)
```text
Create an image-generation prompt for a Daily Brief cover image.

Constraints:
- Date context: {{date}}
- Block: {{news|tech}}
- Top keywords: {{k1}}, {{k2}}, {{k3}}
- Visual style:
  - news: tasteful abstract editorial style, no photorealistic faces
  - tech: modern minimal tech illustration style
- Clean composition, high contrast, no text on image.
- Professional newspaper/Notion hybrid aesthetic.
- No logos, no watermarks.

Return one prompt sentence only.
```

## 6) Implementation Plan

### MVP (1 week)
- Build Next.js app shell + responsive two-block layout
- Add SQLite schema and ingestion pipeline (`/api/ingest` + script)
- Parse automation feed with Prompt A, enrich with Prompt B
- Cover generation prompt with Prompt C + per-day cache
- Home UX: date picker, last 7 days, archive view, citations, save/share, dark mode
- Graceful missing-feed state + retry button

### V1 (2-3 weeks)
- Add auth/user profiles and persistent saved items
- Improve search relevance and per-subsection quick summaries
- Add ingestion monitoring panel and re-run controls
- Add source-quality scoring and contradiction detector
- Add richer cover generation provider integration and background queue

### V2 (optional)
- Personalized ranking and briefing style presets
- Voice/audio brief mode with TTS
- Topic timeline and trend graphs across archived issues
- Multi-language briefs and translation-aware citations
