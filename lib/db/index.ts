import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type { MultiStageResults, ConfigState } from '../types.ts';

export interface SessionRecord {
  id: string;
  token_hash?: string;
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
  tokenHash?: string;
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
      `Veritabanı dosyası açılamadı (${dbPath}). 'data' dizininin okuma/yazma izinlerini ve sahipliğini kontrol edin (örn. chown -R 1001:1001 /app/data veya chmod 755 data).`,
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
        token_hash TEXT DEFAULT '',
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
    `);

    try {
      db.exec("ALTER TABLE sessions ADD COLUMN token_hash TEXT DEFAULT ''");
    } catch {
      // Column already exists
    }

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
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

export function getAllSessions(
  page: number = 1,
  limit: number = 50,
  tokenHash?: string
): { sessions: SessionListItem[]; total: number; page: number; limit: number } {
  try {
    const db = getDb();
    const safeLimit = Math.min(100, Math.max(1, limit));
    const safePage = Math.max(1, page);
    const offset = (safePage - 1) * safeLimit;

    let total = 0;
    let sessions: SessionListItem[] = [];

    if (tokenHash) {
      const countStmt = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE token_hash = ? OR token_hash = \'\' OR token_hash IS NULL');
      const totalRow = countStmt.get(tokenHash) as { count: number } | undefined;
      total = totalRow ? totalRow.count : 0;

      const stmt = db.prepare(`
        SELECT id, title, prompt, created_at, updated_at
        FROM sessions
        WHERE token_hash = ? OR token_hash = '' OR token_hash IS NULL
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `);
      sessions = stmt.all(tokenHash, safeLimit, offset) as SessionListItem[];
    } else {
      const countStmt = db.prepare('SELECT COUNT(*) as count FROM sessions');
      const totalRow = countStmt.get() as { count: number } | undefined;
      total = totalRow ? totalRow.count : 0;

      const stmt = db.prepare(`
        SELECT id, title, prompt, created_at, updated_at
        FROM sessions
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `);
      sessions = stmt.all(safeLimit, offset) as SessionListItem[];
    }

    return { sessions, total, page: safePage, limit: safeLimit };
  } catch (err) {
    console.error('Session listesi veritabanından alınamadı:', err);
    throw err;
  }
}

export function getSessionById(id: string, requesterTokenHash?: string): SessionFull | null {
  try {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT * FROM sessions WHERE id = ?
    `);
    const row = stmt.get(id) as SessionRecord | undefined;
    if (!row) return null;

    const existingHash = row.token_hash || '';
    if (requesterTokenHash !== undefined && existingHash && existingHash !== (requesterTokenHash || '')) {
      return null;
    }

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
      tokenHash: row.token_hash || '',
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
  tokenHash?: string;
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
    if (existing) {
      const existingHash = existing.tokenHash || '';
      const incomingHash = session.tokenHash || '';
      if (existingHash && existingHash !== incomingHash) {
        throw new Error('403 Forbidden: Bu oturum üzerinde işlem yapma yetkiniz yok.');
      }
      if (!session.allowOverwrite) {
        throw new Error(`Session ID '${session.id}' halihazırda mevcut. Üzerine yazmak için 'allowOverwrite' seçeneğini etkinleştirin.`);
      }
    }

    const now = new Date().toISOString();
    const title = session.title || session.prompt.slice(0, 60).trim() || 'Yeni Oturum';

    const stmt = db.prepare(`
      INSERT INTO sessions (
        id, token_hash, title, prompt, memory, evaluation_criteria, config, enable_cross_review, results, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        token_hash = excluded.token_hash,
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
      session.tokenHash || '',
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

export function deleteSessionById(id: string, requesterTokenHash?: string): boolean {
  try {
    const db = getDb();
    const existing = getSessionById(id);
    if (!existing) return false;

    const existingHash = existing.tokenHash || '';
    const incomingHash = requesterTokenHash || '';

    if (existingHash && existingHash !== incomingHash) {
      throw new Error('403 Forbidden: Bu oturumu silme yetkiniz yok.');
    }

    const stmt = db.prepare(`
      DELETE FROM sessions WHERE id = ?
    `);
    const result = stmt.run(id);
    return result.changes > 0;
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith('403')) {
      throw err;
    }
    console.warn(`Session ID '${id}' silinemedi (veritabanı hatası):`, err);
    return false;
  }
}
