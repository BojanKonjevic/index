-- Migration number: 0009 	 2026-06-07T09:22:20.879Z

INSERT OR IGNORE INTO materials (id, subject_id, title, category, exam_part, solved, file_type, url, page_count, tags) VALUES ('analiza-2-predavanje-01-snimak', 'matematicka-analiza-2', 'Predavanje 1 - Snimak', 'misc', NULL, NULL, 'video', '/api/file/analiza-2-predavanje-01-snimak.mp4', 0, '["predavanje", "snimak"]');
INSERT OR IGNORE INTO materials (id, subject_id, title, category, exam_part, solved, file_type, url, page_count, tags) VALUES ('analiza-2-formule', 'matematicka-analiza-2', 'Formule - Tablični prikaz', 'misc', NULL, NULL, 'image', '/api/file/analiza-2-formule.png', 0, '["formule", "tablice"]');
