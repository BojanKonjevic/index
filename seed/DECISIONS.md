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

## Empty popups and "???" freetext (highlight cleanup round)

Case: bp1-skripta carried 3 Highlight annots with empty child popups, plus a red "???" FreeText with empty contents.
Call: all six annots plus the FreeText removed (6 and 1 removals respectively); Links kept.
Why: highlights are pure emphasis with nothing behind them, and their boxes fight the reader. The "???" mark is the same category, an empty-authored mark with no note to show.

## RL slide Picture mapping (HTML companion recovery)

Case: ori-kurs-rl index.html referenced Picture3-8.jpg but no image files shipped; the source pptx holds ~36 media files with PowerPoint shape names repeating per slide (Picture 5-8 on every episode slide).
Call: map by shape name in document order, disambiguated by byte-identical duplicates (image1=image8, image2=image6, image3=image5, image4=image7), verified visually (Mario, Bowser, Toad, mushroom match the alt texts). Uploaded under the exact referenced .jpg keys even for PNG bytes, browsers sniff the magic fine, because renaming would mean rewriting and recaching the shipped HTML.
Why: the mapping has to be faithful to what the slides show, not to filenames. Guessing by number order would have swapped the characters.

## HTML companion recovery batch (parity round)

Case: 15 of 36 HTML materials referenced companions missing from R2 (slide folders, notebook .py/.csv, RL images).
Call: recover from the drive dump by normalized full-path matching (not bare basenames: vezba variants and space/dash dir names collide), preferring resenja-variant .py for resenje materials after proving stub/solution contents differ, and upload under the exact referenced keys. PNG bytes keep their referenced .jpg keys (browsers sniff the magic; renaming would force an HTML rewrite plus recache). webm/ogg alternates with no source stay absent deliberately, browsers use the shipped mp4/mp3. tomcat.gif has no source anywhere and stays broken, the single exception.
Why: the goal is zero experience loss versus source. Guessing by number order or basename would have swapped characters and solutions.

## Space-named R2 keys become slugs (HTML companion round)

Case: ori-vezbe-v5 notebook images lived under keys with literal spaces, which resolve on remote R2 but can never resolve on the local toolchain (rule 7), breaking local verification.
Call: renamed to slugs (spam-filter.gif etc.), rewrote the four refs in the notebook HTML, deleted the exact old keys on both envs, reuploaded, bumped FILES_CACHE, reindexed the material.
Why: rule 7 exists precisely because the local toolchain mangles such keys. Keeping pretty parity with the dump loses to verifiability; the dump keeps the originals either way.

## Demo-stub and fallback refs stay missing (HTML companion round)

Case: default.asp and primer11.html (W3Schools-style placeholder hrefs, absent in source), chrome_japan.webm and rushus-modal_blues.ogg (unused fallbacks for shipped mp4/mp3), tomcat.gif (no source anywhere).
Call: left 404ing, recorded in seed/html-refs-exceptions.json which audit-html-refs.mjs honors, so the guarantee stays green without pretending.
Why: fabricating files the source never had would be inventing content. The audit failing forever on purpose is worse than a documented exception list.

## RL slides back to PDF (pptx policy round)

Case: ori-kurs-rl was a hand-linearized HTML converted from a pptx (pipe-text tables, floating images, 6 companions to seed and map), the only pptx-derived material in the corpus.
Call: converted the dump pptx with headless LibreOffice and swapped the material to PDF (new slug key, old HTML plus companions deleted by exact key, D1 url/file_type updated directly like the indexer does, done files reset and rerun).
Why: the PDF keeps slide layout, real tables, and embedded images with zero companion machinery, and the reader already handles everything else. Custom HTML linearization is retired as a pattern per rule 3.

## Sticky notes with solutions are content (markup cleanup round)

Case: bp1-k1-grupa1/3-filmovi carry Text annotations whose contents are the solved SQL queries, with empty child popups.
Call: notes kept, empty popups removed; the FreeText "???" in bp1-skripta removed.
Why: stripping the notes would delete the solutions, the entire study value of those docs. The rule strips ink and empty shells, never note text. Judgment proxy for the future: if the annotation's removal deletes information a student would study, it stays.
