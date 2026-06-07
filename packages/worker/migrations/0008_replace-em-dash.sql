-- Migration number: 0008 	 2026-06-07T09:22:20.879Z

UPDATE materials SET title = REPLACE(title, '—', '-') WHERE title LIKE '%—%';
