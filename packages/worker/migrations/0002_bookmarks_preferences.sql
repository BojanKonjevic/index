CREATE TABLE bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  material_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_material_id ON bookmarks(material_id);

CREATE TABLE preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  group_number TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
