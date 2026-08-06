CREATE VIRTUAL TABLE material_pages_fts USING fts5(
  text,
  orig UNINDEXED,
  material_id UNINDEXED,
  page_number UNINDEXED,
  source UNINDEXED,
  tokenize = 'unicode61 remove_diacritics 2'
);