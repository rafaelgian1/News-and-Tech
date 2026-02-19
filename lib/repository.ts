import { getPg, getSqliteDb, usingPostgres } from "@/lib/db";
import { createCoverAsset } from "@/lib/image";
import { CoverBlock, DailyIssue } from "@/lib/types";

function nowIso() {
  return new Date().toISOString();
}

function parseIssue(json: string): DailyIssue {
  return JSON.parse(json) as DailyIssue;
}

function dayDiff(from: string, to: string) {
  const fromDate = new Date(`${from}T00:00:00Z`).getTime();
  const toDate = new Date(`${to}T00:00:00Z`).getTime();
  return Math.floor((toDate - fromDate) / (24 * 60 * 60 * 1000));
}

function extractTopKeywords(issue: DailyIssue, block: CoverBlock): string[] {
  const items =
    block === "news"
      ? [
          ...issue.sections.news.cyprus.items,
          ...issue.sections.news.greece.items,
          ...issue.sections.news.world.items
        ]
      : [
          ...issue.sections.tech.cs.items,
          ...issue.sections.tech.programming.items,
          ...issue.sections.tech.ai_llm.items,
          ...issue.sections.tech.other.items
        ];

  const tokens = items
    .slice(0, 6)
    .flatMap((item) => [item.headline, ...item.keyFacts])
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 4);

  const stopWords = new Set(["about", "after", "their", "there", "which", "while", "under", "would", "could"]);
  const counts = new Map<string, number>();

  tokens.forEach((token) => {
    if (stopWords.has(token)) {
      return;
    }
    counts.set(token, (counts.get(token) ?? 0) + 1);
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word);
}

export async function getOrCreateCover(issue: DailyIssue, block: CoverBlock) {
  if (usingPostgres()) {
    const sql = await getPg();
    const rows = await sql<
      Array<{
        image_url: string;
        prompt: string;
        keywords_json: string;
      }>
    >`SELECT image_url, prompt, keywords_json FROM issue_covers WHERE issue_date = ${issue.date} AND block_name = ${block} LIMIT 1`;

    const existing = rows[0];
    if (existing) {
      return {
        block,
        imageUrl: existing.image_url,
        prompt: existing.prompt,
        keywords: JSON.parse(existing.keywords_json) as string[]
      };
    }

    const keywords = extractTopKeywords(issue, block);
    const generated = await createCoverAsset({
      date: issue.date,
      block,
      topKeywords: keywords
    });

    await sql`
      INSERT INTO issue_covers (issue_date, block_name, image_url, prompt, keywords_json, created_at)
      VALUES (${issue.date}, ${block}, ${generated.imageUrl}, ${generated.prompt}, ${JSON.stringify(keywords)}, ${nowIso()})
      ON CONFLICT (issue_date, block_name)
      DO UPDATE SET
        image_url = EXCLUDED.image_url,
        prompt = EXCLUDED.prompt,
        keywords_json = EXCLUDED.keywords_json,
        created_at = EXCLUDED.created_at
    `;

    return {
      block,
      imageUrl: generated.imageUrl,
      prompt: generated.prompt,
      keywords
    };
  }

  const db = getSqliteDb();
  const existing = db
    .prepare("SELECT image_url, prompt, keywords_json FROM issue_covers WHERE issue_date = ? AND block_name = ?")
    .get(issue.date, block) as
    | {
        image_url: string;
        prompt: string;
        keywords_json: string;
      }
    | undefined;

  if (existing) {
    return {
      block,
      imageUrl: existing.image_url,
      prompt: existing.prompt,
      keywords: JSON.parse(existing.keywords_json) as string[]
    };
  }

  const keywords = extractTopKeywords(issue, block);
  const generated = await createCoverAsset({
    date: issue.date,
    block,
    topKeywords: keywords
  });

  db.prepare(
    `INSERT OR REPLACE INTO issue_covers
      (issue_date, block_name, image_url, prompt, keywords_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)`
  ).run(issue.date, block, generated.imageUrl, generated.prompt, JSON.stringify(keywords), nowIso());

  return {
    block,
    imageUrl: generated.imageUrl,
    prompt: generated.prompt,
    keywords
  };
}

export async function saveIssue(issue: DailyIssue, rawInput: { newsText: string; techText: string }) {
  const now = nowIso();

  if (usingPostgres()) {
    const sql = await getPg();
    await sql`
      INSERT INTO daily_issues (issue_date, issue_json, ingest_status, raw_input_news, raw_input_tech, created_at, updated_at)
      VALUES (${issue.date}, ${JSON.stringify(issue)}, ${issue.status}, ${rawInput.newsText}, ${rawInput.techText}, ${now}, ${now})
      ON CONFLICT (issue_date)
      DO UPDATE SET
        issue_json = EXCLUDED.issue_json,
        ingest_status = EXCLUDED.ingest_status,
        raw_input_news = EXCLUDED.raw_input_news,
        raw_input_tech = EXCLUDED.raw_input_tech,
        updated_at = EXCLUDED.updated_at
    `;
    return;
  }

  const db = getSqliteDb();
  db.prepare(
    `INSERT INTO daily_issues (issue_date, issue_json, ingest_status, raw_input_news, raw_input_tech, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(issue_date)
     DO UPDATE SET
      issue_json = excluded.issue_json,
      ingest_status = excluded.ingest_status,
      raw_input_news = excluded.raw_input_news,
      raw_input_tech = excluded.raw_input_tech,
      updated_at = excluded.updated_at`
  ).run(issue.date, JSON.stringify(issue), issue.status, rawInput.newsText, rawInput.techText, now, now);
}

export async function logIngest(issueDate: string, status: "success" | "error", errorMessage?: string) {
  if (usingPostgres()) {
    const sql = await getPg();
    await sql`
      INSERT INTO ingest_runs (issue_date, status, error_message, created_at)
      VALUES (${issueDate}, ${status}, ${errorMessage ?? null}, ${nowIso()})
    `;
    return;
  }

  const db = getSqliteDb();
  db.prepare("INSERT INTO ingest_runs (issue_date, status, error_message, created_at) VALUES (?, ?, ?, ?)").run(
    issueDate,
    status,
    errorMessage ?? null,
    nowIso()
  );
}

export async function getIssueByDate(date: string): Promise<DailyIssue | null> {
  if (usingPostgres()) {
    const sql = await getPg();
    const activeRows = await sql<Array<{ issue_json: string }>>`SELECT issue_json FROM daily_issues WHERE issue_date = ${date} LIMIT 1`;
    if (activeRows[0]) {
      return parseIssue(activeRows[0].issue_json);
    }

    const archivedRows = await sql<Array<{ issue_json: string }>>`SELECT issue_json FROM archived_issues WHERE issue_date = ${date} LIMIT 1`;
    return archivedRows[0] ? parseIssue(archivedRows[0].issue_json) : null;
  }

  const db = getSqliteDb();
  const row = db.prepare("SELECT issue_json FROM daily_issues WHERE issue_date = ?").get(date) as
    | {
        issue_json: string;
      }
    | undefined;

  if (row) {
    return parseIssue(row.issue_json);
  }

  const archived = db.prepare("SELECT issue_json FROM archived_issues WHERE issue_date = ?").get(date) as
    | {
        issue_json: string;
      }
    | undefined;

  return archived ? parseIssue(archived.issue_json) : null;
}

export async function getLatestIssue(): Promise<DailyIssue | null> {
  if (usingPostgres()) {
    const sql = await getPg();
    const currentRows = await sql<Array<{ issue_json: string }>>`SELECT issue_json FROM daily_issues ORDER BY issue_date DESC LIMIT 1`;
    if (currentRows[0]) {
      return parseIssue(currentRows[0].issue_json);
    }

    const archivedRows = await sql<Array<{ issue_json: string }>>`SELECT issue_json FROM archived_issues ORDER BY issue_date DESC LIMIT 1`;
    return archivedRows[0] ? parseIssue(archivedRows[0].issue_json) : null;
  }

  const db = getSqliteDb();
  const current = db.prepare("SELECT issue_json FROM daily_issues ORDER BY issue_date DESC LIMIT 1").get() as
    | {
        issue_json: string;
      }
    | undefined;

  if (current) {
    return parseIssue(current.issue_json);
  }

  const archived = db.prepare("SELECT issue_json FROM archived_issues ORDER BY issue_date DESC LIMIT 1").get() as
    | {
        issue_json: string;
      }
    | undefined;

  return archived ? parseIssue(archived.issue_json) : null;
}

export async function listRecentIssues(limit = 7): Promise<DailyIssue[]> {
  if (usingPostgres()) {
    const sql = await getPg();
    const rows = await sql<Array<{ issue_json: string }>>`
      SELECT issue_json FROM daily_issues ORDER BY issue_date DESC LIMIT ${limit}
    `;
    return rows.map((row) => parseIssue(row.issue_json));
  }

  const db = getSqliteDb();
  const rows = db
    .prepare("SELECT issue_json FROM daily_issues ORDER BY issue_date DESC LIMIT ?")
    .all(limit) as Array<{ issue_json: string }>;

  return rows.map((row) => parseIssue(row.issue_json));
}

export async function listArchivedIssues(limit = 60): Promise<DailyIssue[]> {
  if (usingPostgres()) {
    const sql = await getPg();
    const rows = await sql<Array<{ issue_json: string }>>`
      SELECT issue_json FROM archived_issues ORDER BY issue_date DESC LIMIT ${limit}
    `;
    return rows.map((row) => parseIssue(row.issue_json));
  }

  const db = getSqliteDb();
  const rows = db
    .prepare("SELECT issue_json FROM archived_issues ORDER BY issue_date DESC LIMIT ?")
    .all(limit) as Array<{ issue_json: string }>;

  return rows.map((row) => parseIssue(row.issue_json));
}

export async function rotateIntoArchive(today = new Date().toISOString().slice(0, 10)) {
  if (usingPostgres()) {
    const sql = await getPg();
    const rows = await sql<
      Array<{
        issue_date: string;
        issue_json: string;
        ingest_status: string;
        raw_input_news: string;
        raw_input_tech: string;
      }>
    >`SELECT issue_date, issue_json, ingest_status, raw_input_news, raw_input_tech FROM daily_issues`;

    const stale = rows.filter((row) => dayDiff(row.issue_date, today) > 6);
    if (stale.length === 0) {
      return;
    }

    for (const row of stale) {
      await sql`
        INSERT INTO archived_issues (issue_date, issue_json, ingest_status, raw_input_news, raw_input_tech, archived_at)
        VALUES (${row.issue_date}, ${row.issue_json}, ${row.ingest_status}, ${row.raw_input_news}, ${row.raw_input_tech}, ${nowIso()})
        ON CONFLICT (issue_date)
        DO UPDATE SET
          issue_json = EXCLUDED.issue_json,
          ingest_status = EXCLUDED.ingest_status,
          raw_input_news = EXCLUDED.raw_input_news,
          raw_input_tech = EXCLUDED.raw_input_tech,
          archived_at = EXCLUDED.archived_at
      `;

      await sql`DELETE FROM daily_issues WHERE issue_date = ${row.issue_date}`;
    }

    return;
  }

  const db = getSqliteDb();
  const rows = db
    .prepare("SELECT issue_date, issue_json, ingest_status, raw_input_news, raw_input_tech FROM daily_issues")
    .all() as Array<{
    issue_date: string;
    issue_json: string;
    ingest_status: string;
    raw_input_news: string;
    raw_input_tech: string;
  }>;

  const stale = rows.filter((row) => dayDiff(row.issue_date, today) > 6);
  if (stale.length === 0) {
    return;
  }

  const insert = db.prepare(
    `INSERT OR REPLACE INTO archived_issues
    (issue_date, issue_json, ingest_status, raw_input_news, raw_input_tech, archived_at)
    VALUES (?, ?, ?, ?, ?, ?)`
  );
  const remove = db.prepare("DELETE FROM daily_issues WHERE issue_date = ?");

  const tx = db.transaction(() => {
    stale.forEach((row) => {
      insert.run(row.issue_date, row.issue_json, row.ingest_status, row.raw_input_news, row.raw_input_tech, nowIso());
      remove.run(row.issue_date);
    });
  });

  tx();
}
