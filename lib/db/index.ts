import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type { MultiStageResults, ConfigState } from '../types.ts';

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

  const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch (err) {
      console.warn(`Veritabanı dizini oluşturulamadı (${dataDir}):`, err);
    }
  }

  const dbPath = path.join(dataDir, 'consensus.db');
  let db: Database.Database;

  try {
    db = new Database(dbPath, { timeout: 10000 });
  } catch (err) {
    dbInstance = null;
    console.error(
      `Veritabanı dosyası açılamadı (${dbPath}). 'data' dizininin okuma/yazma izinlerini ve sahipliğini kontrol edin (örn. chown 1001:1001 data veya chmod 755 data).`,
      err
    );
    throw err;
  }

  try {
    // Enable WAL mode for better concurrency performance, fallback gracefully if filesystem doesn't support WAL
    try {
      db.pragma('journal_mode = WAL');
    } catch (walErr) {
      console.warn('WAL journal modu ayarlanamadı, varsayılan moda devam ediliyor:', walErr);
    }

    // Initialize schema
    db.exec(`
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

    dbInstance = db;
    return dbInstance;
  } catch (err) {
    try {
      db.close();
    } catch {}
    dbInstance = null;
    console.error('Veritabanı şeması ilklendirilirken hata oluştu:', err);
    throw err;
  }
}

export function getAllSessions(page: number = 1, limit: number = 50): { sessions: SessionListItem[]; total: number; page: number; limit: number } {
  try {
    const db = getDb();
    const offset = (Math.max(1, page) - 1) * Math.max(1, limit);
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM sessions');
    const totalRow = countStmt.get() as { count: number } | undefined;
    const total = totalRow ? totalRow.count : 0;

    const stmt = db.prepare(`
      SELECT id, title, prompt, created_at, updated_at
      FROM sessions
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    const sessions = stmt.all(limit, offset) as SessionListItem[];
    return { sessions, total, page, limit };
  } catch (err) {
    console.error('Session listesi veritabanından alınamadı:', err);
    throw err;
  }
}

export function getSessionById(id: string): SessionFull | null {
  try {
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
  } catch (err) {
    console.warn(`Session ID '${id}' veritabanından getirilemedi:`, err);
    return null;
  }
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
  allowOverwrite?: boolean;
}): SessionFull {
  const db = getDb();

  const saveTransaction = db.transaction(() => {
    const existing = getSessionById(session.id);
    if (existing && !session.allowOverwrite) {
      throw new Error(`Session ID '${session.id}' halihazırda mevcut. Üzerine yazmak için 'allowOverwrite' seçeneğini etkinleştirin.`);
    }

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
  });

  saveTransaction();

  return getSessionById(session.id)!;
}

export function deleteSessionById(id: string): boolean {
  try {
    const db = getDb();
    const stmt = db.prepare(`
      DELETE FROM sessions WHERE id = ?
    `);
    const result = stmt.run(id);
    return result.changes > 0;
  } catch (err) {
    console.warn(`Session ID '${id}' silinemedi (veritabanı hatası):`, err);
    return false;
  }
}
