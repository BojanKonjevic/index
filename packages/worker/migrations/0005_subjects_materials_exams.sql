CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  semester INTEGER NOT NULL,
  espb INTEGER NOT NULL,
  elective INTEGER NOT NULL DEFAULT 0,
  elective_group TEXT,
  description TEXT NOT NULL DEFAULT '',
  professors TEXT NOT NULL DEFAULT '[]',
  assistants TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  exam_part TEXT,
  solved INTEGER,
  file_type TEXT NOT NULL,
  url TEXT NOT NULL,
  page_count INTEGER NOT NULL DEFAULT 0,
  tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_materials_subject_id ON materials(subject_id);

CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_exams_subject_id ON exams(subject_id);
