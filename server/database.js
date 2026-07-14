const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

// On Render, mount a persistent disk at /var/data and set DATA_DIR=/var/data.
// Without a disk, SQLite lives on ephemeral storage and resets on each deploy.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'azimuth.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    display_name  TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'member',
    color         TEXT NOT NULL DEFAULT '#c8963e',
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS boards (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL,
    owner_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- One row per drawn object. Realtime clients append; deletes are soft so that
  -- late-joining clients replaying history don't resurrect erased shapes.
  CREATE TABLE IF NOT EXISTS shapes (
    id         TEXT PRIMARY KEY,
    board_id   TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    author_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    kind       TEXT NOT NULL,
    data       TEXT NOT NULL,
    seq        INTEGER NOT NULL,
    deleted    INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_shapes_board ON shapes(board_id, seq);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
`);

// ---------- seed ----------
function seed() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (count > 0) return;

  const password = process.env.SUPERADMIN_PASSWORD || 'azimuth';
  db.prepare(
    `INSERT INTO users (username, display_name, password_hash, role, color)
     VALUES (?, ?, ?, 'superadmin', ?)`
  ).run('Rodney', 'Rodney', bcrypt.hashSync(password, 10), '#c8963e');

  console.log('[seed] created superadmin "Rodney"');
  if (!process.env.SUPERADMIN_PASSWORD) {
    console.log('[seed] no SUPERADMIN_PASSWORD set — default password is "azimuth". Change it.');
  }
}
seed();

// ---------- users ----------
const PALETTE = ['#c8963e', '#4c8fb0', '#b0544c', '#6f9e6a', '#8d6fa8', '#c07a3e'];

const users = {
  byUsername: (username) => db.prepare('SELECT * FROM users WHERE username = ?').get(username),
  byId: (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id),
  all: () =>
    db.prepare('SELECT id, username, display_name, role, color, created_at FROM users ORDER BY id').all(),
  create: ({ username, displayName, password, role = 'member' }) => {
    const n = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
    const info = db
      .prepare(
        `INSERT INTO users (username, display_name, password_hash, role, color)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(username, displayName || username, bcrypt.hashSync(password, 10), role, PALETTE[n % PALETTE.length]);
    return users.byId(info.lastInsertRowid);
  },
  setRole: (id, role) => db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id),
  remove: (id) => db.prepare('DELETE FROM users WHERE id = ?').run(id),
  verify: (user, password) => bcrypt.compareSync(password, user.password_hash),
};

// ---------- sessions ----------
const sessions = {
  create: (token, userId, days = 30) =>
    db
      .prepare(
        `INSERT INTO sessions (token, user_id, expires_at)
         VALUES (?, ?, datetime('now', ?))`
      )
      .run(token, userId, `+${days} days`),
  get: (token) =>
    db
      .prepare(
        `SELECT u.* FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token = ? AND s.expires_at > datetime('now')`
      )
      .get(token),
  destroy: (token) => db.prepare('DELETE FROM sessions WHERE token = ?').run(token),
  prune: () => db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run(),
};

// ---------- boards ----------
const boards = {
  list: () =>
    db
      .prepare(
        `SELECT b.*, u.display_name AS owner_name,
                (SELECT COUNT(*) FROM shapes s WHERE s.board_id = b.id AND s.deleted = 0) AS shape_count
         FROM boards b
         JOIN users u ON u.id = b.owner_id
         ORDER BY b.updated_at DESC`
      )
      .all(),
  get: (id) => db.prepare('SELECT * FROM boards WHERE id = ?').get(id),
  create: ({ id, title, ownerId }) => {
    db.prepare('INSERT INTO boards (id, title, owner_id) VALUES (?, ?, ?)').run(id, title, ownerId);
    return boards.get(id);
  },
  rename: (id, title) =>
    db.prepare("UPDATE boards SET title = ?, updated_at = datetime('now') WHERE id = ?").run(title, id),
  remove: (id) => db.prepare('DELETE FROM boards WHERE id = ?').run(id),
  touch: (id) => db.prepare("UPDATE boards SET updated_at = datetime('now') WHERE id = ?").run(id),
};

// ---------- shapes ----------
const shapes = {
  forBoard: (boardId) =>
    db
      .prepare('SELECT id, kind, data, author_id, seq FROM shapes WHERE board_id = ? AND deleted = 0 ORDER BY seq')
      .all(boardId)
      .map((r) => ({ id: r.id, kind: r.kind, authorId: r.author_id, seq: r.seq, ...JSON.parse(r.data) })),

  nextSeq: (boardId) =>
    (db.prepare('SELECT MAX(seq) AS m FROM shapes WHERE board_id = ?').get(boardId).m || 0) + 1,

  add: ({ id, boardId, authorId, kind, data, seq }) => {
    db.prepare(
      `INSERT OR REPLACE INTO shapes (id, board_id, author_id, kind, data, seq)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, boardId, authorId, kind, JSON.stringify(data), seq);
    boards.touch(boardId);
  },

  softDelete: (boardId, ids) => {
    const stmt = db.prepare('UPDATE shapes SET deleted = 1 WHERE board_id = ? AND id = ?');
    const tx = db.transaction((list) => list.forEach((sid) => stmt.run(boardId, sid)));
    tx(ids);
    boards.touch(boardId);
  },

  clear: (boardId) => {
    db.prepare('UPDATE shapes SET deleted = 1 WHERE board_id = ?').run(boardId);
    boards.touch(boardId);
  },
};

module.exports = { db, users, sessions, boards, shapes };
