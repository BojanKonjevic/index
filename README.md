<p align="center">
  <a href="https://app.ftn-index.workers.dev/">
    <img src="https://img.shields.io/badge/Live-DEPLOYED-4f46e5?style=for-the-badge" alt="Live">
    <br>
    <strong>Indeks</strong>
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=fff" alt="TypeScript">
  <img src="https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=000" alt="React">
  <img src="https://img.shields.io/badge/Cloudflare%20Workers-F38020?style=flat-square&logo=cloudflare&logoColor=fff" alt="Cloudflare Workers">
  <img src="https://img.shields.io/badge/License-MIT-3da639?style=flat-square" alt="MIT">
  <img src="https://github.com/BojanKonjevic/index/actions/workflows/test.yml/badge.svg" alt="CI">
</p>

<p align="center">
  <strong>Study materials, exams, and schedules for Applied Computer Science at FTN Novi Sad, all in one place.</strong>
</p>

All our FTN study materials are scattered across a dozen Google Drive folders, exam dates live on the faculty site (if you can find them), and every subject has its own system. Indeks wraps it all into a single searchable interface that gets you to the right document in seconds.

---

## Features

- **Subject browser**: list of all 3rd-year subjects, filterable by semester and elective group
- **Material viewer**: PDFs rendered in-app with a virtualized page viewer, keyboard navigation, zoom, fit-width, and dark-mode inversion
- **Exam schedule**: upcoming exams with urgency indicators
- **Global search**: fuzzy search across subjects, materials, and exams with Serbian diacritic normalization
- **Bookmarks**: save materials for quick access, synced to your account (or stored locally as a guest)
- **Guest mode**: browse everything immediately, no account required
- **Accounts**: optional registration with password-based auth, syncs bookmarks and preferences across devices
- **Dark mode**: light/dark theme toggle
- **Bilingual UI**: Serbian by default, English available via toggle

---

## Getting Started

```bash
pnpm install
cp packages/worker/.dev.vars.example packages/worker/.dev.vars # then set a real SESSION_SECRET
pnpm db:migrate:local
pnpm seed:r2
pnpm dev
```

- `SESSION_SECRET` is required: the API throws a 500 without it (the worker ships with a startup guard against missing or placeholder secrets).
- `pnpm seed:r2` syncs the seeded files into your local R2 dev bucket; `pnpm index:local` / `pnpm index:remote` rebuild the full-text search index via `packages/worker/scripts/index-pdfs.mjs`.
- Run `pnpm check` before committing; it runs prettier, ESLint, and typechecking across both packages (also enforced locally by husky pre-commit hooks).
- `pnpm test` runs the worker and app test suites.

---

## Stack

|              |                                                                  |
| ------------ | ---------------------------------------------------------------- |
| **Frontend** | React 19, TanStack Router, Tailwind CSS v4, shadcn/ui, react-pdf |
| **Backend**  | Cloudflare Workers (Hono), D1 (SQLite), R2 (object storage)      |
| **Search**   | Client-side Fuse.js with Serbian diacritic normalization         |
| **Monorepo** | pnpm workspaces: `app/`, `worker/`, `shared/`                    |

Cloudflare is the unified infrastructure layer: Workers serve the SPA + handle the API, D1 stores structured data, and R2 holds all PDFs and files.

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌───────────┐
│  React SPA  │────▶│  Worker API  │────▶│    D1     │
│  (Worker)   │     │  (Hono)      │     │  (SQLite) │
└─────────────┘     └──────┬───────┘     └───────────┘
                           │
                    ┌──────▼───────┐
                    │     R2       │
                    │  (PDFs/etc)  │
                    └──────────────┘
```

All API routes are prefixed with `/api/`. The Worker also serves the SPA as a static asset, so every non-API request falls back to `index.html` for client-side routing.

---

## Current status

In active development. The dataset currently covers a single subject (Matematička analiza 2) for testing; full 3rd-year coverage is the next milestone. The architecture is designed to scale to the entire faculty.

**Live at [app.ftn-index.workers.dev](https://app.ftn-index.workers.dev/).**

---

## License

[MIT](LICENSE)
