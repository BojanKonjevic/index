# Units and exam parts: field audit guide

How `unit` and `exam_part` are supposed to work, and every mistake found
in the October 2026 audit, with the reason each one happened. Read this
before tagging a new subject, and run the coverage queries at the end
before calling a seed done.

## The model

- Vezbe carry `unit` (V0, V1, ...). Kolokvijum preps carry `exam_part`
  (K1, K2, final, ...) and, when they belong to a numbered vezba, a
  `unit` too (NANS V7 prep: problems + unit V7 + part K1).
- Every exam-category material carries an `exam_part`, even in single-exam
  subjects (Prevodioci precedent: exam + final).
- A skripta about one sitting may carry that sitting's part so it joins
  the sitting shelf (NANS K1 skripta). Misc without a part stays in Skripte.
- Solved state (solved true/false/null) is independent of both fields.

## Mistakes found, with reasons

### 1. LIKE patterns that miss bare IDs (Metode, 17 materials)

Migration 0021 set `unit = 'V3' WHERE id LIKE 'mo-v3-%'`. That matches
companions (`mo-v3-zadatak`) but never the bare main PDF (`mo-v3`),
and V1/V2/V6+ were never covered at all. Result: 18 unit-less problems
whose titles all start with V-numbers.

Reason: pattern written from the companions outward, never checked
against the full title list. Fix with exact IDs, then run query Q1.

Example: `mo-v3` (V3 Metod smene...) untagged while `mo-v3-zadatak`
tagged; `mo-v1`, `mo-v2`, `mo-v6` through `mo-v17` never in any statement.

### 2. Forgotten item in an explicit ID list (ORI, 1 material)

0021 tagged V5/V7/V8/V9 by explicit IDs and skipped V6, although the
source has a `Vezbe 6` folder. `ori-vezbe-v6-neuronske-mreze` sat in
Ostalo next to its tagged siblings.

Reason: hand-built lists with no coverage check. Run query Q1.

### 3. Preps without sittings (Metode V9/V17)

`V9 Priprema za kolokvijum1` and `V17 Priprema za kolokvijum2` are
solved vezba collections (content-checked: tasks plus solutions), so
they stay problems, but they carried no part while the NANS V7 prep
carries K1. Fixed to V9+K1 and V17+K2.

Reason: preps seeded as plain vezbe, nobody applied the NANS precedent.
Content check first: a past paper would be exam, not problems.

### 4. Single-exam subjects without final (WEB, 4 materials)

`Pitanja i odgovori`, `Teorija WEB`, `Test iz WEB programiranja`,
`Web ispitna pitanja` were exam with no part, against the Prevodioci
decision to keep exam + final even when redundant. Fixed to final.

Reason: the rule lived in DECISIONS.md but no query enforced it.
Run query Q2.

### 5. Exam Q&A filed as theory (WEB webIspit.txt)

`Web ispit` is a numbered exam question list, seeded as theory.
Real exam content always lands in exam. Fixed to exam + final.

Reason: .txt defaulted to theory without reading. Read text files;
rule 3 of RULES.md already demands judgment here.

### 6. Student script filed as theory (WEB webUsmeni.pdf)

`Web usmeni` is a student-authored theory summary. Per the Prevodioci
scripts precedent it is reference material, not lecture content.
Fixed to misc (joins the Skripte shelf).

Reason: same as 5, filename-driven instead of content-driven call.
Content check: "enkapsulacija zanimljivih delova sa predavanja" =
script by definition.

### 7. Sitting-specific skripta without its part (BP1 ER zbirka)

`ER zbirka` sat in Skripte while all ER vezbe sit in the K2 shelf,
although its source is the `2. Kolokvijum/ER model` folder. Fixed to
misc + K2, mirroring the NANS K1 skripta.

Reason: parts were only considered for exam rows during that seed.

### 8. Deliberately left alone (do not "fix" these)

- `Gradijentne višedimenzione metode, zadaci` (Metode): a vezba task
  sheet with solutions that maps to no numbered V. Tagging it V2 (or
  anything) without reading it risks double-covering a unit. It lives
  in Ostalo honestly until someone places it by content.
- BP1 `Uvod u C`, `Serijska/Sekvencijalna datoteka` + zadaci: source
  folder says `3. i 4. Kolokvijumi` combined, numbering is semester
  sequence not sittings, and no K3/K4 papers exist to anchor against.
  Owner call (Oct 2026): leave part empty rather than guess.
- `Ispitna pitanja` (Metode, theory): an official exam topic list.
  Not solvable under time pressure, not a lecture; theory stands as
  exam information, same shelf as the Prevodioci exam-lecture precedent.
- NANS `Skripta NANS K1` (misc + K1): intentional, joins the K1 shelf.

## Coverage queries (run before done)

Q1, unit-less V-titled problems (expect Gradijentne-class exceptions only):
`SELECT id, title FROM materials WHERE category = 'problems'
AND unit IS NULL AND title GLOB 'V[0-9]*';`

Q2, exams without sittings (expect zero rows):
`SELECT id, title FROM materials WHERE category = 'exam'
AND (exam_part IS NULL OR exam_part = '');`

Q3, misc carrying parts (review each, usually fine):
`SELECT id, title, exam_part FROM materials
WHERE category = 'misc' AND exam_part IS NOT NULL;`
