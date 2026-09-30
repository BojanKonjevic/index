# Seed rules

Reusable rules learned from real seed work. Highest number wins on conflict. Every rule records where it came from.

## 1. Junk goes first (from: Treca godina E2 surface analysis)

Right after inventory, before any categorization or review, strip junk from the content source by rule. Reasoning about content that will never ship wastes tokens and poisons counts.

Junk patterns (match by path segment or suffix):

1. Build output: obj, bin, Debug, Release, plus dll, exe, baml, cache, GeneratedMSBuildEditorConfig, AssemblyInfoInputs, buildwithskipanalyzers
2. VCS and IDE: .git, .idea, .vs, plus props, targets, sample, bin
3. Python noise: pycache, pyc
4. OS noise: DS*Store, Thumbs.db, \_\_MACOSX, AppleDouble .* files
5. Empty placeholder dirs (record them in the inventory, seed nothing from them)

Kept for human call, never auto dropped: full project trees that contain a mix of junk and real source (OISISI Projekat, SIMS BookingApp, ORI robot copies fall here). Junk inside them is still stripped by the patterns above, but the surviving source files go to a human gate (in or out of index) instead of straight to staging.

The exclude list lives in one place (a future inventory script config) so reruns apply the same filter.

## 2. Arch decisions are UX questions (from: type policy gate, first batch)

When a content type or structure needs a policy, the agent asks in chat with 2 or more sensible options framed purely as user experience: how it looks in the app, how the user opens and reads it. Never code or schema questions. One question per type, grouped when types behave the same (doc plus docx plus rtf go together). Each option needs three things: a concrete example from the actual content (real file or folder, not a hypothetical), a detailed sketch of what the user sees and does under that option, and honest pros plus cons. The agent marks a recommendation. Code lands only after the human picks.

## 3. Type policies (decided, first batch)

1. SQL: inline text view in the reader with code editor grade syntax highlighting. Exact placement inside the reader still open.
2. Office docs (doc, docx, rtf): convert to PDF at seed time, every converted file visually checked. The convert plus visual check rule extends to any comparable converted file in the future.
3. Text notes: inline in the reader and searchable as standalone materials. Messy files get editorial split or cleanup, human judgment is expected and cheap here (low volume, high value).
4. Zips: never ship in index. Every zip is unpacked at seed time and its inner content is treated exactly as if it had arrived loose.
5. Code plus data: full vezba view preserving the zadaci plus resenje pairing, shared datasets deduped to one copy and linked from both sides.
6. Photo-only image sets: related images fuse into one PDF at seed time (ordered, rotated). The gallery and container image pattern is retired, every material is a document. If the set belongs to a parent material it attaches as a sub-material of that parent, standalone sets become their own material.
7. HTML example sets: seed at group level, never file level. One material per example group opening a landing page in a new tab, examples opening raw with relative asset paths preserved. Search exclusion is a per-material flag set at seed time, never a per-type rule (usefulness for search varies file to file).
8. No code tab. Bare coursework with no study framing seeds as a single reference download (duplicates collapsed), not as a browsable surface. Reopen only when a future subject brings genuinely unstructured code with real study value.

## 4. System changes mid batch (from: git workflow call, first batch)

Applied migrations are immutable. A system change discovered while seeding subject N never edits an old migration, it ships as its own PR with three parts: the code change, a new refit migration for subjects 1 through N minus 1, and fresh verify output. Subject PRs stay pure data. Trivial discoveries fold into the system PR only while it is still unmerged, everything after that goes forward as follow-ups.

## 6. Done means green and clean (from: CI discipline call, first batch)

After every seeded subject, before reporting done: delete merged branches, leave the worktree clean, and check CI on the pushed main. Done is reported only while CI is green and git is clean. Failing CI blocks the next subject, it never rides along.

## 7. Naming (from: filename standardization, second batch)

Three different names serve three different readers. Material and asset IDs stay ascii slugs: routes, bookmarks, and offline keys touch them, and those must never contain spaces or diacritics. R2 keys are cleaned natural names: the original filename, NFC-normalized (the dumps arrive NFD off macOS), copy markers like " (1)" stripped, spaces and diacritics kept, nobody programs against them. Group dirs use the stable vocab: k1 through k4, pz1, pz2, final, teorija, vezbe, predavanja, ispit, knjige, skripte. Titles are display names and follow the file, not the key.

## 8. One professor per subject (from: BP1 professor list, second batch)

Seed exactly one professor per subject: the best available name, corrected at year start if the site was stale. Assistants stay plural, groups genuinely have several. The subject card and the subject page must agree, which falls out of singleness for free.

## 5. Record judgment calls (from: Prevodioci category refit, first batch)

When a categorization decision needs judgment, write it into seed/DECISIONS.md the same turn: a short description of the case (never the file itself), the decision, and the reasoning. Future agents facing a tough categorical call read that file first for precedent before asking.
