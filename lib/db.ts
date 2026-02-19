import { createRequire } from "node:module";
import path from "node:path";
import postgres from "postgres";

type SqliteStatement = {
  run: (...params: unknown[]) => unknown;
  get: (...params: unknown[]) => unknown;
  all: (...params: unknown[]) => unknown[];
};

type SqliteDb = {
  pragma: (cmd: string) => unknown;
  exec: (sql: string) => unknown;
  prepare: (sql: string) => SqliteStatement;
  transaction: <T extends (...args: never[]) => unknown>(fn: T) => T;
};

const DB_PATH = process.env.DAILY_BRIEF_DB_PATH ?? path.join(process.cwd(), "daily_brief.db");

let sqliteDb: SqliteDb | undefined;
let pgClient: postgres.Sql | undefined;
let pgBootstrapped = false;

export function usingPostgres() {
  return Boolean(process.env.DATABASE_URL);
}

export function getSqliteDb() {
  if (!sqliteDb) {
    const require = createRequire(import.meta.url);
    const moduleName = ["better", "sqlite3"].join("-");
    const BetterSqlite3 = require(moduleName) as new (filename: string) => SqliteDb;
    sqliteDb = new BetterSqlite3(DB_PATH);
    sqliteDb.pragma("journal_mode = WAL");
    bootstrapSqlite(sqliteDb);
  }
  return sqliteDb;
}

export async function getPg() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing");

  if (!pgClient) {
    pgClient = postgres(process.env.DATABASE_URL, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false
    });
  }

  if (!pgBootstrapped) {
    await bootstrapPostgres(pgClient);
    pgBootstrapped = true;
  }

  return pgClient;
}

function sqliteTableSql(conn: SqliteDb, table: string) {
  return conn.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?").get(table) as
    | {
        sql?: string;
      }
    | undefined;
}

function sqliteHasColumn(conn: SqliteDb, table: string, column: string) {
  const rows = conn.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some((row) => row.name === column);
}

function ensureSqliteColumn(conn: SqliteDb, table: string, sqlType: string, column: string) {
  if (sqliteHasColumn(conn, table, column)) {
    return;
  }

  conn.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${sqlType}`);
}

function migrateSqliteIssueCovers(conn: SqliteDb) {
  const current = sqliteTableSql(conn, "issue_covers")?.sql ?? "";
  if (!/CHECK\s*\(\s*block_name\s+IN\s*\('news'\s*,\s*'tech'\)\s*\)/i.test(current)) {
    return;
  }

  conn.exec(`
    ALTER TABLE issue_covers RENAME TO issue_covers_old;
    CREATE TABLE issue_covers (
      issue_date TEXT NOT NULL,
      block_name TEXT NOT NULL,
      image_url TEXT NOT NULL,
      prompt TEXT NOT NULL,
      keywords_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (issue_date, block_name)
    );
    INSERT INTO issue_covers (issue_date, block_name, image_url, prompt, keywords_json, created_at)
    SELECT issue_date, block_name, image_url, prompt, keywords_json, created_at
    FROM issue_covers_old;
    DROP TABLE issue_covers_old;
  `);
}

function bootstrapSqlite(conn: SqliteDb) {
  conn.exec(`
    CREATE TABLE IF NOT EXISTS daily_issues (
      issue_date TEXT PRIMARY KEY,
      issue_json TEXT NOT NULL,
      ingest_status TEXT NOT NULL DEFAULT 'ready',
      raw_input_news TEXT,
      raw_input_tech TEXT,
      raw_input_sports TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS archived_issues (
      issue_date TEXT PRIMARY KEY,
      issue_json TEXT NOT NULL,
      ingest_status TEXT NOT NULL,
      raw_input_news TEXT,
      raw_input_tech TEXT,
      raw_input_sports TEXT,
      archived_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS issue_covers (
      issue_date TEXT NOT NULL,
      block_name TEXT NOT NULL,
      image_url TEXT NOT NULL,
      prompt TEXT NOT NULL,
      keywords_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (issue_date, block_name)
    );
    CREATE TABLE IF NOT EXISTS ingest_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_date TEXT NOT NULL,
      status TEXT NOT NULL,
      error_message TEXT,
      created_at TEXT NOT NULL
    );
  `);

  ensureSqliteColumn(conn, "daily_issues", "TEXT", "raw_input_sports");
  ensureSqliteColumn(conn, "archived_issues", "TEXT", "raw_input_sports");
  migrateSqliteIssueCovers(conn);
}

async function bootstrapPostgres(sql: postgres.Sql) {
  await sql`CREATE TABLE IF NOT EXISTS daily_issues (
    issue_date TEXT PRIMARY KEY,
    issue_json TEXT NOT NULL,
    ingest_status TEXT NOT NULL DEFAULT 'ready',
    raw_input_news TEXT,
    raw_input_tech TEXT,
    raw_input_sports TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`;

  await sql`CREATE TABLE IF NOT EXISTS archived_issues (
    issue_date TEXT PRIMARY KEY,
    issue_json TEXT NOT NULL,
    ingest_status TEXT NOT NULL,
    raw_input_news TEXT,
    raw_input_tech TEXT,
    raw_input_sports TEXT,
    archived_at TEXT NOT NULL
  )`;

  await sql`CREATE TABLE IF NOT EXISTS issue_covers (
    issue_date TEXT NOT NULL,
    block_name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    prompt TEXT NOT NULL,
    keywords_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (issue_date, block_name)
  )`;

  await sql`CREATE TABLE IF NOT EXISTS ingest_runs (
    id BIGSERIAL PRIMARY KEY,
    issue_date TEXT NOT NULL,
    status TEXT NOT NULL,
    error_message TEXT,
    created_at TEXT NOT NULL
  )`;

  await sql`ALTER TABLE daily_issues ADD COLUMN IF NOT EXISTS raw_input_sports TEXT`;
  await sql`ALTER TABLE archived_issues ADD COLUMN IF NOT EXISTS raw_input_sports TEXT`;
}
