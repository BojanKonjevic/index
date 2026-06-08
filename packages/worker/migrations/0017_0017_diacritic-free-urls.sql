-- Migration number: 0017
-- Strip diacritics from R2 URLs (analitičke → analiticke)

UPDATE materials
SET url = '/api/file/matematicka-analiza-2/Teorija/kompleksna-analiza/analiza-2-teorija-k2-analiticke-funkcije.pdf'
WHERE id = 'ma2-teorija-k2-analiti-ke-funkcije';
