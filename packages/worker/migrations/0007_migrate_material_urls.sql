UPDATE materials
SET url = '/api/file/' || substr(url, 10) || '.' || file_type
WHERE url LIKE '/api/pdf/%';
