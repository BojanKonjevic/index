CREATE TABLE visit_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  material_id TEXT NOT NULL,
  visited_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_visit_history_user_material ON visit_history(user_id, material_id);
CREATE INDEX idx_visit_history_user_visited ON visit_history(user_id, visited_at DESC);
