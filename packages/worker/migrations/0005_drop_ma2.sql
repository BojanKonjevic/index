-- Drops the Matematicka analiza 2 pilot subject (2nd year, out of scope for
-- the 3rd year seeding batch). Forward-only removal: applied migrations stay
-- untouched, this migration deletes every row the 0002 seed inserted.
DELETE FROM material_pages_fts WHERE material_id IN (SELECT id FROM materials WHERE subject_id = 'matematicka-analiza-2');
DELETE FROM bookmarks WHERE material_id IN (SELECT id FROM materials WHERE subject_id = 'matematicka-analiza-2');
DELETE FROM visit_history WHERE material_id IN (SELECT id FROM materials WHERE subject_id = 'matematicka-analiza-2');
DELETE FROM material_assets WHERE material_id IN (SELECT id FROM materials WHERE subject_id = 'matematicka-analiza-2');
DELETE FROM materials WHERE subject_id = 'matematicka-analiza-2';
DELETE FROM subjects WHERE id = 'matematicka-analiza-2';
