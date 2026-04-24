// Applies the SQLite schema on first run (idempotent — uses CREATE IF NOT EXISTS).
// Runs at container startup instead of `prisma db push` so the runner image
// does not need the Prisma CLI or its TypeScript loader chain.
'use strict';
const Database = require('better-sqlite3');

const url = process.env.DATABASE_URL ?? 'file:./dev.db';
const dbPath = url.replace(/^file:/, '');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS Platform (
    id        TEXT PRIMARY KEY,
    vendor    TEXT NOT NULL,
    modelName TEXT NOT NULL,
    osVersion TEXT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ConfigSnapshot (
    id         TEXT PRIMARY KEY,
    platformId TEXT NOT NULL,
    filename   TEXT NOT NULL,
    content    TEXT NOT NULL,
    uploadedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (platformId) REFERENCES Platform(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS TestCase (
    id           TEXT PRIMARY KEY,
    category     TEXT NOT NULL,
    name         TEXT NOT NULL,
    description  TEXT NOT NULL,
    rfcReference TEXT,
    severity     TEXT NOT NULL DEFAULT 'MANDATORY',
    tags         TEXT NOT NULL DEFAULT '[]',
    UNIQUE (category, name)
  );

  CREATE TABLE IF NOT EXISTS TestResult (
    id            TEXT PRIMARY KEY,
    platformId    TEXT NOT NULL,
    testCaseId    TEXT NOT NULL,
    status        TEXT NOT NULL,
    detail        TEXT,
    testedAt      DATETIME,
    testedBy      TEXT,
    firmwareBuild TEXT,
    createdAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (platformId) REFERENCES Platform(id) ON DELETE CASCADE,
    FOREIGN KEY (testCaseId) REFERENCES TestCase(id) ON DELETE RESTRICT,
    UNIQUE (platformId, testCaseId)
  );

  CREATE INDEX IF NOT EXISTS idx_csnapshot_pid  ON ConfigSnapshot(platformId);
  CREATE INDEX IF NOT EXISTS idx_tc_category    ON TestCase(category);
  CREATE INDEX IF NOT EXISTS idx_tc_severity    ON TestCase(severity);
  CREATE INDEX IF NOT EXISTS idx_tr_platformid  ON TestResult(platformId);
  CREATE INDEX IF NOT EXISTS idx_tr_testcaseid  ON TestResult(testCaseId);
`);

db.close();
console.log('Schema ready:', dbPath);
