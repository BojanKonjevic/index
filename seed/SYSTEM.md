# Seed system

Goal: say "add this drive to index" and have an agent carry it from raw dump to verified content with minimal human input. Accuracy first, speed second. Nothing lands in index without either strong analysis evidence or explicit human approval.

This file holds intent only: goal, principles, pipeline. Reusable learnings live in RULES.md. Nothing about any current round lives here: no disk paths, no source inventories, no per subject status, no open questions for this batch. All of that stays in thread context.

## Principles

1. Accuracy is the top value. Token efficiency and speed matter but never trade against correctness.
2. CLI driven. Every stage runs as a command with repeatable output, so runs are resumable and reviewable.
3. Human gates at convenient points only. The agent asks where judgment is truly needed, not for routine steps.
4. No writes to index on low certainty. New content, expansions, refits, and removals each need either conclusive analysis or a human yes.
5. Existing content is refit, not grandfathered. If the arch changes, already seeded subjects get migrated to the new shape.
6. Everything reproducible. Same dump plus same manifests produce the same migration plus the same R2 keys.
7. The system writes itself. Whenever an agent doing seed work learns something reusable, it writes it down as a rule in seed/ immediately, in the same turn, in the appropriate place (RULES.md for pipeline rules, SYSTEM.md for arch and intent changes). A session that learned nothing new is fine. A session that learned something and did not write it down is a failure.
8. Durable only. What gets written to seed/ is rules, guides, and scripts for future rounds. Never round state: no disk paths, no source inventories, no per subject status, no open questions for the current batch. All of that stays in thread context and dies with the thread.

## Pipeline

1. Intake. Point at a local copy of the drive dump. Produce a full inventory: tree, file counts by type, sizes, encoding issues, junk estimate (build output, caches, IDE folders, OS files).
2. Arch check. Compare the dump against the current index data model and R2 layout. Report mismatches before touching any content. Fix arch first, seed second.
3. Per subject staging. Split each subject into a staging dir under seed/subjects. Exclude junk by rule, keep everything else for review.
4. Categorize, dedupe, rename. Map every kept file to index categories with one consistent naming scheme across subjects. Flag duplicates (same content, different name or folder) for human call.
5. Content review. Read or visually check each item according to type. Text heavy PDFs get read. Photos and scans get visual check. Massive books get sampled, not fully read, with the sampling rule written down.
6. Seed. New subject: generate migration SQL plus R2 uploads from the manifest. Existing subject: diff against what is already seeded, propose add, change, or remove per item.
7. Verify. Every URL resolves, every PDF is indexed into FTS with a real page count, counts match the manifest. Failed items block the seed, they do not ship partial.
