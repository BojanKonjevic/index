CREATE TABLE sessions_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO sessions_new (id, user_id, expires_at, created_at)
  SELECT id, user_id, expires_at, created_at FROM sessions;

DROP TABLE sessions;
ALTER TABLE sessions_new RENAME TO sessions;
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE bookmarks_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  material_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO bookmarks_new (id, user_id, material_id, created_at)
  SELECT id, user_id, material_id, created_at FROM bookmarks;

DROP TABLE bookmarks;
ALTER TABLE bookmarks_new RENAME TO bookmarks;
CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_material_id ON bookmarks(material_id);

CREATE TABLE preferences_new (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  group_number TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO preferences_new (user_id, group_number, updated_at)
  SELECT user_id, group_number, updated_at FROM preferences;

DROP TABLE preferences;
ALTER TABLE preferences_new RENAME TO preferences;

CREATE TABLE visit_history_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  material_id TEXT NOT NULL,
  visited_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO visit_history_new (id, user_id, material_id, visited_at)
  SELECT id, user_id, material_id, visited_at FROM visit_history;

DROP TABLE visit_history;
ALTER TABLE visit_history_new RENAME TO visit_history;
CREATE UNIQUE INDEX idx_visit_history_user_material ON visit_history(user_id, material_id);
CREATE INDEX idx_visit_history_user_visited ON visit_history(user_id, visited_at DESC);