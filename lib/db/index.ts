import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { MultiStageResults, ConfigState } from '../types';

export interface SessionRecord {
  id: string;
  title: string;
  prompt: string;
  memory: string;
  evaluation_criteria: string;
  config: string; // JSON string of ConfigState
  enable_cross_review: number; // 1 or 0
  results: string; // JSON string of MultiStageResults
  created_at: string;
  updated_at: string;
}

export interface SessionListItem {
  id: string;
  title: string;
  prompt: string;
  created_at: string;
  updated_at: string;
}

export interface SessionFull {
  id: string;
  title: string;
  prompt: string;
  memory: string;
  evaluationCriteria: string;
  config: ConfigState;
  enableCrossReview: boolean;
  results: MultiStageResults | null;
  createdAt: string;
  updatedAt: string;
}

let dbInstance: Database.Database | null = null;

function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'consensus.db');
  dbInstance = new Database(dbPath, { timeout: 10000 });

  // Enable WAL mode for better concurrency performance
  dbInstance.pragma('journal_mode = WAL');

  // Initialize schema
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      prompt TEXT NOT NULL,
      memory TEXT DEFAULT '',
      evaluation_criteria TEXT DEFAULT '',
      config TEXT NOT NULL,
      enable_cross_review INTEGER DEFAULT 1,
      results TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
  `);

  return dbInstance;
}

export function getAllSessions(): SessionListItem[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT id, title, prompt, created_at, updated_at
    FROM sessions
    ORDER BY created_at DESC
  `);
  return stmt.all() as SessionListItem[];
}

export function getSessionById(id: string): SessionFull | null {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM sessions WHERE id = ?
  `);
  const row = stmt.get(id) as SessionRecord | undefined;
  if (!row) return null;

  let parsedConfig: ConfigState;
  try {
    parsedConfig = JSON.parse(row.config);
  } catch {
    parsedConfig = {} as ConfigState;
  }

  let parsedResults: MultiStageResults | null = null;
  try {
    if (row.results) {
      parsedResults = JSON.parse(row.results);
    }
  } catch {
    parsedResults = null;
  }

  return {
    id: row.id,
    title: row.title,
    prompt: row.prompt,
    memory: row.memory || '',
    evaluationCriteria: row.evaluation_criteria || '',
    config: parsedConfig,
    enableCrossReview: Boolean(row.enable_cross_review),
    results: parsedResults,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function saveSession(session: {
  id: string;
  title?: string;
  prompt: string;
  memory?: string;
  evaluationCriteria?: string;
  config: ConfigState;
  enableCrossReview?: boolean;
  results: MultiStageResults;
}): SessionFull {
  const db = getDb();
  const now = new Date().toISOString();
  const title = session.title || session.prompt.slice(0, 60).trim() || 'Yeni Oturum';

  const stmt = db.prepare(`
    INSERT INTO sessions (
      id, title, prompt, memory, evaluation_criteria, config, enable_cross_review, results, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      prompt = excluded.prompt,
      memory = excluded.memory,
      evaluation_criteria = excluded.evaluation_criteria,
      config = excluded.config,
      enable_cross_review = excluded.enable_cross_review,
      results = excluded.results,
      updated_at = excluded.updated_at
  `);

  stmt.run(
    session.id,
    title,
    session.prompt,
    session.memory || '',
    session.evaluationCriteria || '',
    JSON.stringify(session.config),
    session.enableCrossReview === false ? 0 : 1,
    JSON.stringify(session.results),
    now,
    now
  );

  return getSessionById(session.id)!;
}

export function deleteSessionById(id: string): boolean {
  const db = getDb();
  const stmt = db.prepare(`
    DELETE FROM sessions WHERE id = ?
  `);
  const result = stmt.run(id);
  return result.changes > 0;
}
