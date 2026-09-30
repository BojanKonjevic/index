# Seeding decisions

Precedent log for tough categorical calls. Each entry: the case, the call, the why. Read this before asking about a new borderline file.

## Exam scripts versus theory (Prevodioci, first batch)

Case: two student scripts ("Andjela skripta", "Kucana skripta sa primerima"), full subject summaries with examples. Theory-like content, but authored as study scripts, not lectures.
Call: misc, following the MA2 precedent where skripte and knjige lived in misc.
Why: category separates what a thing is from what it teaches. Scripts are reference material students read cover to cover at exam time, not lecture content and not problem sets. Misc is that shelf.

## Timed exam task lists (Prevodioci, first batch)

Case: a txt of numbered tasks from a printed exam ("Zadaci s otiska", timed, negative points), no exam named on the file.
Call: exam plus final.
Why: real exam content always lands in exam, never theory, even when it looks like study material. The sitting was inferred from format (30-minute timed test matching the završni description) plus owner confirmation that otisak means the final here. When the sitting cannot be inferred, ask; never guess K1 versus K2 versus final from vibes.

## Exam prep lectures (Prevodioci, first batch)

Case: a lecture titled "Ispit" that teaches how the exam works (rules, format, sample topics) without being an exam paper.
Call: theory.
Why: it is a lecture about the exam, not an exam. The test is whether a student would sit down and solve it under time pressure. If yes, exam. If it teaches, theory.

## Category versus exam part (Prevodioci, first batch)

Case: a subject with only one exam type, making exam plus final look redundant.
Call: keep both. Category says what the thing is, exam part says which sitting it belongs to, and every exam-category material carries an exam part so sidebar grouping never falls into an unlabeled bucket.
Why: the redundancy is a property of the subject, not a modeling error. Dropping exam part for single-exam subjects would make grouping logic branch on subject shape.

## Exam parts extend per subject need (BP1, first batch)

Case: a subject with practical K1 through K4 plus separate theory sittings (PZ1, PZ2), where theory PZ1 collides with practical K1.
Call: keep every sitting as its own exam part (K1, K2, K3, K4, PZ1, PZ2). More groups is fine, missing precision is not.
Why: folding distinct sittings together destroys information the student uses to pick what to study. The UI renders unknown parts as their own labeled groups, so extension needs no code change.

## Misleading file extensions (BP1, first batch)

Case: .txt files whose content is SQL (schema plus solved tasks, reference patterns).
Call: store under .sql with syntax highlighting, not as plain text.
Why: the viewer and the indexer key off content type, and the user asked for code editor grade SQL everywhere. Extension follows content, never the other way around. Judge by reading the file, not the suffix.

## Natural R2 keys reverted (Metode, second batch)

Case: 85 objects seeded under cleaned natural keys with diacritics, live serving verified working.
Call: reverted everything to ascii slug keys, titles keep natural names.
Why: the local toolchain (wrangler/miniflare, versions 4.97 through 4.143) percent-encodes non-ASCII keys on write and reads them back raw, so every local fetch misses and local verification becomes impossible. Keys never surface in the app or search, only titles do, so slugs lose nothing user-visible. Evidence overrode the earlier approved decision; the rule now bans non-ASCII keys.

## Dependency manifests are not study content (NANS, second batch)

Case: requirements.txt files inside course exercise folders.
Call: dropped, never seeded.
Why: dependency lists tell pip what to install, nothing a student opens to study. Same shelf as build output and IDE folders, handled by the junk rule in spirit.

## Course engine code seeds as text (ORI, second batch)

Case: robot/chess/maze game engine .py files duplicated across five project trees, plus game sprites, board files, IDE folders.
Call: master copies of the .py files seed as text materials, everything else (sprites, boards, IDE, venv, exe) dropped.
Why: the oral exam asks about the engine TODOs, so the code is study context, not bare coursework. One canonical copy kills the duplication.

## Slides without a converter (ORI, second batch)

Case: a lone 17-slide pptx, no LibreOffice, no TeX, no browser for print rendering.
Call: markitdown to markdown, markdown lib to HTML, diagrams extracted per slide, seeded as an html material with images alongside.
Why: text plus diagrams in reading order beats text-only and beats dropping the only theory source for the unit. Record the exact tool chain; it will recur.

## Legacy office formats (WEB, second batch)

Case: .docx extracts cleanly via markitdown, legacy .doc needs olefile raw stream parsing with run-fragmentation cleanup.
Call: both land as searchable text materials, quality noted as-is for the legacy one.
Why: content over fidelity. A choppy but searchable text beats a perfect binary nobody can open in-app.

## Dropped desktop screenshots (Metode, second batch)

Case: a full-desktop Teams/YouTube screenshot with student names and index numbers, content duplicated by cleaner exam photos.
Call: dropped from the seed, recorded here so nobody re-adds it wondering where it went.
Why: PII stays per rule 9, but a desktop screenshot is not study material. Same content exists in readable form.

## Headers over filenames (review round, second batch)

Case: photo filenames claiming one sitting while the exam header inside says another (junsko-julski K2 file is kolokvijum 1).
Call: the header inside the document wins, always.
Why: filenames are assigned by whoever held the phone. The printed header is the document speaking for itself.

## robotZad.zip is a duplicate (ORI, second batch)

Case: robotZad.zip next to an identical robotZad/ tree.
Call: skipped, nothing new inside.
Why: the zip rule says unpack and merge; merging here yields zero new files, so there is nothing to seed.
