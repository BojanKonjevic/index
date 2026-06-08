-- Migration number: 0014
-- Adds name and file_type columns to material_assets, populates existing assets.

ALTER TABLE material_assets ADD COLUMN name TEXT NOT NULL DEFAULT '';
ALTER TABLE material_assets ADD COLUMN file_type TEXT NOT NULL DEFAULT 'image';

UPDATE material_assets SET name = 'Rešenje 1', file_type = 'image' WHERE id = 'asset-ispit-resenja-01';
UPDATE material_assets SET name = 'Rešenje 2', file_type = 'image' WHERE id = 'asset-ispit-resenja-02';
UPDATE material_assets SET name = 'Rešenje 3', file_type = 'image' WHERE id = 'asset-ispit-resenja-03';
UPDATE material_assets SET name = 'Zadatak 1', file_type = 'image' WHERE id = 'asset-container-01';
UPDATE material_assets SET name = 'Zadatak 2', file_type = 'image' WHERE id = 'asset-container-02';
UPDATE material_assets SET name = 'Zadatak 3', file_type = 'image' WHERE id = 'asset-container-03';
UPDATE material_assets SET name = 'Zadatak 4', file_type = 'image' WHERE id = 'asset-container-04';
