-- Refit round: units and exam parts missed or misfiled in earlier seeds.
-- Every statement below was verified item by item against the source dump
-- and, where the dump was silent, against document content (see
-- seed/UNITS_AND_PARTS.md). Exact IDs only, no LIKE patterns.

-- Metode: auditorne V1-V17 PDFs never got units (0021 matched only
-- suffixed companion IDs like mo-v3-%, never the bare mo-v3 main PDFs).
UPDATE materials SET unit = 'V1' WHERE id = 'mo-v1';
UPDATE materials SET unit = 'V2' WHERE id = 'mo-v2';
UPDATE materials SET unit = 'V3' WHERE id = 'mo-v3';
UPDATE materials SET unit = 'V4' WHERE id = 'mo-v4';
UPDATE materials SET unit = 'V5' WHERE id = 'mo-v5';
UPDATE materials SET unit = 'V6' WHERE id = 'mo-v6';
UPDATE materials SET unit = 'V7' WHERE id = 'mo-v7';
UPDATE materials SET unit = 'V8' WHERE id = 'mo-v8';
UPDATE materials SET unit = 'V10' WHERE id = 'mo-v10';
UPDATE materials SET unit = 'V11' WHERE id = 'mo-v11';
UPDATE materials SET unit = 'V12' WHERE id = 'mo-v12';
UPDATE materials SET unit = 'V13' WHERE id = 'mo-v13';
UPDATE materials SET unit = 'V14' WHERE id = 'mo-v14';
UPDATE materials SET unit = 'V15' WHERE id = 'mo-v15';
UPDATE materials SET unit = 'V16' WHERE id = 'mo-v16';

-- Metode: kolokvijum preps are solved vezba collections, mirroring the NANS
-- V7 prep precedent (problems + unit + sitting part).
UPDATE materials SET unit = 'V9', exam_part = 'K1' WHERE id = 'mo-v9';
UPDATE materials SET unit = 'V17', exam_part = 'K2' WHERE id = 'mo-v17';

-- ORI: V6 source folder exists, the tag was simply forgotten in 0021.
UPDATE materials SET unit = 'V6' WHERE id = 'ori-vezbe-v6-neuronske-mreze';

-- BP1: ER zbirka covers the 2nd kolokvijum topic; it joins the K2 shelf
-- the same way the NANS K1 skripta joins its K1 shelf.
UPDATE materials SET exam_part = 'K2' WHERE id = 'bp1-er-zbirka';

-- WEB: single exam type, so every exam carries final (Prevodioci precedent).
UPDATE materials SET exam_part = 'final' WHERE id IN ('web-pitanja-odgovori', 'web-teorija', 'web-test', 'web-ispitna-pitanja');

-- WEB: webIspit.txt enumerates exam questions with answers -> exam.
UPDATE materials SET category = 'exam', exam_part = 'final' WHERE id = 'web-ispit';

-- WEB: webUsmeni.pdf is a student-authored theory script -> misc,
-- same call as Prevodioci scripts and Metode Pitanja 2, 4 i 6.
UPDATE materials SET category = 'misc' WHERE id = 'web-usmeni';
