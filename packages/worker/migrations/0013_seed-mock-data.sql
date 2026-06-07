-- Migration number: 0013
-- Seeds mock data exercising every file type and asset scenario.

INSERT OR IGNORE INTO subjects (id, name, semester, espb, elective, elective_group, description, professors, assistants)
VALUES ('matematicka-analiza-2', 'Matematička analiza 2', 4, 8, 0, NULL, 'Funkcije više promenljivih, višestruki integrali, linijski i površinski integrali, redovi, obične diferencijalne jednačine.', '[]', '[]');

-- 1. Normal PDF (theory)
INSERT OR IGNORE INTO materials (id, subject_id, title, category, exam_part, solved, file_type, url, page_count, tags)
VALUES ('mock-teorija', 'matematicka-analiza-2', 'Teorija - Redovi (mock)', 'theory', NULL, NULL, 'pdf', '/api/file/mock-teorija.pdf', 0, '[]');

-- 2. Standalone image (jpg)
INSERT OR IGNORE INTO materials (id, subject_id, title, category, exam_part, solved, file_type, url, page_count, tags)
VALUES ('mock-slika-jpg', 'matematicka-analiza-2', 'Slika - Grafikon (mock)', 'misc', NULL, NULL, 'image', '/api/file/mock-slika.jpg', 0, '[]');

-- 3. Standalone image (png)
INSERT OR IGNORE INTO materials (id, subject_id, title, category, exam_part, solved, file_type, url, page_count, tags)
VALUES ('mock-slika-png', 'matematicka-analiza-2', 'Slika - Dijagram (mock)', 'misc', NULL, NULL, 'image', '/api/file/mock-slika.png', 0, '[]');

-- 4. Video (R2-hosted)
INSERT OR IGNORE INTO materials (id, subject_id, title, category, exam_part, solved, file_type, url, page_count, tags)
VALUES ('mock-video-r2', 'matematicka-analiza-2', 'Video - Predavanje (mock)', 'misc', NULL, NULL, 'video', '/api/file/mock-video.mp4', 0, '[]');

-- 5. Video (YouTube)
INSERT OR IGNORE INTO materials (id, subject_id, title, category, exam_part, solved, file_type, url, page_count, tags)
VALUES ('mock-video-yt', 'matematicka-analiza-2', 'Video - YouTube (mock)', 'misc', NULL, NULL, 'video', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 0, '[]');

-- 6. Exam PDF (solved)
INSERT OR IGNORE INTO materials (id, subject_id, title, category, exam_part, solved, file_type, url, page_count, tags)
VALUES ('mock-ispit-reseni', 'matematicka-analiza-2', 'Ispit - Rešeni (mock)', 'exam', 'final', 1, 'pdf', '/api/file/mock-ispit-reseni.pdf', 0, '["mock"]');

-- 7. Exam PDF (unsolved, no paired solution)
INSERT OR IGNORE INTO materials (id, subject_id, title, category, exam_part, solved, file_type, url, page_count, tags)
VALUES ('mock-ispit-prazan', 'matematicka-analiza-2', 'Ispit - Prazan (mock)', 'exam', 'final', 0, 'pdf', '/api/file/mock-ispit-prazan.pdf', 0, '["mock"]');

-- 8. Material with primary PDF + image assets
INSERT OR IGNORE INTO materials (id, subject_id, title, category, exam_part, solved, file_type, url, page_count, tags)
VALUES ('mock-ispit-sa-resenjima', 'matematicka-analiza-2', 'Ispit - Sa rešenjima (mock)', 'exam', 'K1', 1, 'pdf', '/api/file/mock-ispit-sa-resenjima.pdf', 0, '["mock"]');

INSERT OR IGNORE INTO material_assets (id, material_id, page_number, url)
VALUES ('asset-ispit-resenja-01', 'mock-ispit-sa-resenjima', 1, '/api/file/mock-asset-01.jpg');
INSERT OR IGNORE INTO material_assets (id, material_id, page_number, url)
VALUES ('asset-ispit-resenja-02', 'mock-ispit-sa-resenjima', 2, '/api/file/mock-asset-02.jpg');
INSERT OR IGNORE INTO material_assets (id, material_id, page_number, url)
VALUES ('asset-ispit-resenja-03', 'mock-ispit-sa-resenjima', 3, '/api/file/mock-asset-03.jpg');

-- 9. Container material (no primary file, url = first asset)
INSERT OR IGNORE INTO materials (id, subject_id, title, category, exam_part, solved, file_type, url, page_count, tags)
VALUES ('mock-container', 'matematicka-analiza-2', 'Slike - Rešenja zadataka (mock)', 'problems', NULL, NULL, 'image', '/api/file/mock-container-01.jpg', 0, '["mock"]');

INSERT OR IGNORE INTO material_assets (id, material_id, page_number, url)
VALUES ('asset-container-01', 'mock-container', 1, '/api/file/mock-container-01.jpg');
INSERT OR IGNORE INTO material_assets (id, material_id, page_number, url)
VALUES ('asset-container-02', 'mock-container', 2, '/api/file/mock-container-02.jpg');
INSERT OR IGNORE INTO material_assets (id, material_id, page_number, url)
VALUES ('asset-container-03', 'mock-container', 3, '/api/file/mock-container-03.jpg');
INSERT OR IGNORE INTO material_assets (id, material_id, page_number, url)
VALUES ('asset-container-04', 'mock-container', 4, '/api/file/mock-container-04.jpg');
