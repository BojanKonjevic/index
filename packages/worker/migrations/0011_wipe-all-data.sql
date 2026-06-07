-- Migration number: 0011
-- Wipes all data from all tables. Part of Phase 1 (multi-format file & asset support).

DELETE FROM bookmarks;
DELETE FROM sessions;
DELETE FROM preferences;
DELETE FROM materials;
DELETE FROM exams;
DELETE FROM subjects;
DELETE FROM users;
