import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = process.env.DB_PATH || path.join(__dirname, '../../database/placement.db');
const dbDir = path.dirname(envPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

export const db = new Database(envPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('student','admin')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      specialization TEXT DEFAULT '',
      skills TEXT DEFAULT '',
      cgpa REAL,
      resume_template TEXT DEFAULT 'classic',
      resume_data TEXT DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS test_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      score REAL NOT NULL,
      max_score REAL NOT NULL DEFAULT 100,
      taken_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS aptitude_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL CHECK(category IN ('Quant','Logical','Verbal')),
      question TEXT NOT NULL,
      options TEXT NOT NULL,
      correct_index INTEGER NOT NULL,
      solution TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS aptitude_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      started_at TEXT NOT NULL,
      duration_seconds INTEGER,
      score INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress','submitted')),
      submitted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS aptitude_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attempt_id INTEGER NOT NULL REFERENCES aptitude_attempts(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL REFERENCES aptitude_questions(id),
      selected_index INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS psych_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt TEXT NOT NULL,
      options TEXT NOT NULL,
      trait_weights TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS psych_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      trait_totals TEXT NOT NULL,
      submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS psych_responses (
      attempt_id INTEGER NOT NULL REFERENCES psych_attempts(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL REFERENCES psych_questions(id),
      option_index INTEGER NOT NULL,
      PRIMARY KEY (attempt_id, question_id)
    );

    CREATE TABLE IF NOT EXISTS interview_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL CHECK(category IN ('HR','Technical','Case')),
      question TEXT NOT NULL,
      answer TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS interview_user_state (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL REFERENCES interview_questions(id) ON DELETE CASCADE,
      revealed INTEGER NOT NULL DEFAULT 0 CHECK(revealed IN (0,1)),
      confidence INTEGER CHECK(confidence IS NULL OR (confidence >= 1 AND confidence <= 5)),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, question_id)
    );

    CREATE TABLE IF NOT EXISTS mock_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      consistency_score REAL NOT NULL DEFAULT 0,
      question_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS mock_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES mock_sessions(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL REFERENCES interview_questions(id),
      confidence INTEGER NOT NULL CHECK(confidence >= 1 AND confidence <= 5)
    );

    CREATE INDEX IF NOT EXISTS idx_aptitude_q_cat ON aptitude_questions(category);
    CREATE INDEX IF NOT EXISTS idx_interview_q_cat ON interview_questions(category);
    CREATE INDEX IF NOT EXISTS idx_apt_attempts_user ON aptitude_attempts(user_id);
    CREATE INDEX IF NOT EXISTS idx_psych_attempts_user ON psych_attempts(user_id);
  `);
  migratePsychAttempts();
  migrateMockInterview();
  migrateProfilesTrack();
  migrateUsersRoleExpand();
}

function migrateProfilesTrack() {
  const cols = db.prepare(`PRAGMA table_info(profiles)`).all();
  const names = new Set(cols.map((c) => c.name));
  if (!names.has('track')) {
    db.exec(`ALTER TABLE profiles ADD COLUMN track TEXT`);
  }
}

/** Allow role `director` for analytics-only accounts (SQLite CHECK migration). */
function migrateUsersRoleExpand() {
  const info = db
    .prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='users'`)
    .get();
  if (info?.sql?.includes('director')) return;

  db.pragma('foreign_keys = OFF');
  db.exec(`
    CREATE TABLE users_role_exp (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('student','admin','director')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO users_role_exp SELECT * FROM users;
    DROP TABLE users;
    ALTER TABLE users_role_exp RENAME TO users;
  `);
  db.pragma('foreign_keys = ON');
}

function migrateMockInterview() {
  const ms = db.prepare(`PRAGMA table_info(mock_sessions)`).all();
  const msNames = new Set(ms.map((c) => c.name));
  if (!msNames.has('mode')) {
    db.exec(`ALTER TABLE mock_sessions ADD COLUMN mode TEXT`);
  }
  if (!msNames.has('seconds_per_question')) {
    db.exec(`ALTER TABLE mock_sessions ADD COLUMN seconds_per_question INTEGER DEFAULT 90`);
  }
  if (!msNames.has('completed_at')) {
    db.exec(`ALTER TABLE mock_sessions ADD COLUMN completed_at TEXT`);
  }

  const mr = db.prepare(`PRAGMA table_info(mock_responses)`).all();
  const mrNames = new Set(mr.map((c) => c.name));
  if (!mrNames.has('seconds_used')) {
    db.exec(`ALTER TABLE mock_responses ADD COLUMN seconds_used INTEGER`);
  }

  db.exec(`
    UPDATE mock_sessions SET completed_at = created_at
    WHERE completed_at IS NULL
    AND EXISTS (SELECT 1 FROM mock_responses mr WHERE mr.session_id = mock_sessions.id)
  `);
}

function migratePsychAttempts() {
  const cols = db.prepare(`PRAGMA table_info(psych_attempts)`).all();
  const names = new Set(cols.map((c) => c.name));
  if (!names.has('interpretation_summary')) {
    db.exec(`ALTER TABLE psych_attempts ADD COLUMN interpretation_summary TEXT`);
  }
  if (!names.has('trait_percentages')) {
    db.exec(`ALTER TABLE psych_attempts ADD COLUMN trait_percentages TEXT`);
  }
}

/** Run migrations before any route module calls `db.prepare` at import time. */
initSchema();
