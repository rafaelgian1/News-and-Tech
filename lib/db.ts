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
    const BetterSqlite3 = require("better-sqlite3") as new (filename: string) => SqliteDb;
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

function bootstrapSqlite(conn: SqliteDb) {
  conn.exec(`
    CREATE TABLE IF NOT EXISTS daily_issues (
      issue_date TEXT PRIMARY KEY,
      issue_json TEXT NOT NULL,
      ingest_status TEXT NOT NULL DEFAULT 'ready',
      raw_input_news TEXT,
      raw_input_tech TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS archived_issues (
      issue_date TEXT PRIMARY KEY,
      issue_json TEXT NOT NULL,
      ingest_status TEXT NOT NULL,
      raw_input_news TEXT,
      raw_input_tech TEXT,
      archived_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS issue_covers (
      issue_date TEXT NOT NULL,
      block_name TEXT NOT NULL CHECK (block_name IN ('news', 'tech')),
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
}

async function bootstrapPostgres(sql: postgres.Sql) {
  await sql`CREATE TABLE IF NOT EXISTS daily_issues (
    issue_date TEXT PRIMARY KEY,
    issue_json TEXT NOT NULL,
    ingest_status TEXT NOT NULL DEFAULT 'ready',
    raw_input_news TEXT,
    raw_input_tech TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`;

  await sql`CREATE TABLE IF NOT EXISTS archived_issues (
    issue_date TEXT PRIMARY KEY,
    issue_json TEXT NOT NULL,
    ingest_status TEXT NOT NULL,
    raw_input_news TEXT,
    raw_input_tech TEXT,
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
}
