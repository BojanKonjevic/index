-- Migration number: 0015
-- Wipes all mock seed data, keeping only schema.

DELETE FROM material_assets;
DELETE FROM materials;
DELETE FROM exams;
DELETE FROM subjects;
