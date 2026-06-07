-- Migration number: 0012
-- Creates material_assets table for multi-page image sets and supplementary images.

CREATE TABLE IF NOT EXISTS material_assets (
  id TEXT PRIMARY KEY,
  material_id TEXT NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_material_assets_material_id ON material_assets(material_id);
