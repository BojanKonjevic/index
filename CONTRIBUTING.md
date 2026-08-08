# Contributing

Thanks for helping grow Indeks! The project is aimed at covering the whole faculty — every subject added gets you (and your classmates) closer to having everything in one place.

## Local setup

Follow the [Getting Started](./README.md#getting-started) section in the README:

```bash
pnpm install
cp packages/worker/.dev.vars.example packages/worker/.dev.vars # then set a real SESSION_SECRET
pnpm db:migrate:local
pnpm seed:r2
pnpm dev
```

## Checks

Run `pnpm check` before committing (prettier, ESLint, and typechecking across both packages). `pnpm test` runs the worker and app test suites. Husky pre-commit hooks run prettier and lint automatically on staged files.

## Adding a subject

1. Add the subject row and its materials to a new migration in `packages/worker/migrations/` (see `0001_initial.sql` for the schema and `0002_seed_data.sql` for the format), then apply it with `pnpm db:migrate:local`.
2. Upload the files to the R2 bucket (dev: `pnpm seed:r2` syncs a local directory; see `packages/worker/scripts/seed-local-r2.mjs`).
3. Index PDF text for full-text search:

```bash
pnpm index:local    # dev — reads local D1 + local R2
pnpm index:remote   # prod — reads remote D1 + remote R2
pnpm index:local --force   # full rebuild, ignoring the incremental done-file
```

`packages/worker/scripts/index-pdfs.mjs` extracts text from each PDF with pdfjs, stores it in the `material_pages_fts` FTS5 table, and updates `page_count` — per material, atomically, so an interrupted run can be safely re-run.

## Submitting changes

Open a PR against `main`. Keep changes in small, focused commits (conventional commit style, e.g. `feat:`, `fix:`, `chore:`) and make sure the CI workflow (test, typecheck, lint, app build, prettier) is green.
