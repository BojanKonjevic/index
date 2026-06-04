# Index v0 — Implementation Plan

## Overview

A study material browser for **Matematička Analiza 2** (1 subject), deployed on Cloudflare. No auth — open access in v0. Serbian-only UI (English toggle deferred to v1). Frontend on Pages, Worker API with Hono, PDFs served from Google Drive direct links, subject metadata in bundled JSON.

---

## Phase 0: Environment & Project Scaffold

### 0.1 Install Node.js + pnpm

On NixOS: add `nodejs` to your Nix config. pnpm available via `pnpm` (already installed).
On other systems: `pnpm env use --global lts`.

### 0.2 Create Cloudflare account

Do this manually at https://dash.cloudflare.com/sign-up. Free tier is sufficient for v0.

### 0.3 Authenticate wrangler

```
pnpm exec wrangler login
```

Opens a browser to authorize with your Cloudflare account.

### 0.4 Create project structure

```
index/
├── packages/
│   ├── app/                        # React + Vite frontend
│   │   ├── src/
│   │   │   ├── routes/             # TanStack Router file-based routes
│   │   │   ├── components/         # shadcn/ui primitives in ui/ + page-specific components
│   │   │   │   ├── ui/             # Button, Card, Input, Select, Badge, etc.
│   │   │   ├── hooks/              # useT, useAuth, useBookmarks, useRecentlyOpened
│   │   │   ├── lib/                # API client, utils, auth helpers
│   │   │   ├── translations/       # sr.ts, en.ts, types.ts
│   │   │   └── types/              # Shared TS types
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── wrangler.toml
│   └── worker/                     # Cloudflare Worker API
│       ├── src/
│       │   ├── index.ts            # Hono app entry
│       │   ├── routes/             # subjects
│       │   └── data/               # Bundled subject JSON
│       ├── package.json
│       ├── tsconfig.json
│       └── wrangler.toml
├── pnpm-workspace.yaml
├── package.json
└── .gitignore
```

### 0.6 Scaffold React + Vite app + TanStack Router

```
pnpm --filter app create vite . --template react-ts
pnpm --filter app add @tanstack/react-router
pnpm --filter app add -D @tanstack/router-plugin
```

Configure Vite with TanStack Router plugin for file-based routing. Create `src/routes/__root.tsx` (root layout with `<Outlet />`) and `src/routes/index.tsx` (home page stub). `main.tsx` uses `createRouter` + `RouterProvider` from the generated `routeTree.gen.ts`.

### 0.7 Install Tailwind + shadcn/ui

```
pnpm add tailwindcss @tailwindcss/vite
pnpm add tailwind-merge clsx class-variance-authority lucide-react
npx shadcn init
npx shadcn add button card badge input select separator sheet scroll-area switch
```

Tailwind powers all styling via utility classes. shadcn components live in `src/components/ui/` as authored code — no runtime overhead. Add more shadcn components as needed during development.

### 0.8 Scaffold Cloudflare Worker

```
cd packages/worker
pnpm add hono
pnpm add -D wrangler @cloudflare/workers-types
```

Basic Hono app returning `{ status: "ok" }`.

### 0.9 Git init

```
git init && git add -A && git commit -m "initial scaffold"
```

---

## Phase 1: Worker Setup

### 1.1 Worker — Data endpoints

```
GET  /api/subjects              — List all subjects (v0: Matematička Analiza 2 only)
GET  /api/subject/:id           — Subject with materials and exams
```

- No auth, no JWT, no sessions. Open access.
- Subject data loaded from bundled JSON (`src/data/matematicka-analiza-2.json`). No database reads in v0.
- PDFs not proxied through Worker — frontend loads them directly from a URL field in the material data.

---

## Phase 2: Data Model

### 2.1 Shared TypeScript types

File: `packages/app/src/types/subject.ts` + mirror in `worker/src/types.ts`

```typescript
interface Subject {
  id: string
  name: string
  semester: number
  espb: number
  elective: boolean
  electiveGroup: string | null
  description: string
  professors: string[]
  assistants: string[]
}

interface Material {
  id: string
  subjectId: string
  title: string
  type: "lecture" | "exercise" | "exam" | "script" | "misc"
  category: "theory" | "problems" | "exam" | "misc"
  examPart: string | null // "K1" | "K2" | "final" | null
  solved: boolean | null // true=solved, false=unsolved, null=N/A
  fileType: "pdf" | "video"
  url: string
  pageCount: number
  tags: string[]
}

interface ExamEvent {
  id: string
  subjectId: string
  title: string
  date: string // ISO
  time: string // "HH:MM–HH:MM"
  location: string
}

interface User {
  id: string
  email: string
  name: string
  picture: string | null
  groupNumber: number
  language: string
}
```

### 2.2 Create v0 data JSON

`packages/worker/src/data/matematicka-analiza-2.json`:

- Subject metadata (name, semester 4, ESPB, professors — placeholders you fill later)
- Materials array (titles known, url/pageCount as placeholders)
- Exam events array

You will fill actual data in Phase 5.

---

## Phase 3: UI Strings

### 3.1 Hardcode Serbian strings

All UI strings are hardcoded in Serbian. No translation system in v0. Each component just uses the Serbian text directly instead of a `t("nav.home")` indirection.

Keep the translation as a mental model — group strings by page/component — but don't extract into a map until English toggle is actually being built (v1).

---

## Phase 4: Frontend — Pages & Routing

All UI components are shadcn primitives (`Button`, `Card`, `Badge`, `Input`, `Select`, `Sheet`, `Separator`, `ScrollArea`) composed per page — see `src/components/ui/`. Mockups are first drafts; final UI will differ as shadcn patterns take priority during implementation.

### 4.1 Route tree

```
/                          -> Home page (greeting, search, exams, recently opened)
/subjects                  -> All subjects (card grid)
/subjects/:subjectId       -> Single subject page
/subjects/:subjectId/materials/:materialId -> PDF viewer
/bookmarks                 -> Bookmarked materials list
/search                    -> Global search results
/search?q=...              -> Search with query
/settings                  -> Settings (language, group)
```

### 4.2 Layout shell

- **Sidebar** (fixed left, 224px): Logo, nav links with active state, user info at bottom (shows "Gost" with guest icon). Group selector in footer.
- **Top bar** (used on home page): Logo, nav link, group badge, language toggle icon.
- Consistent with mockups.

### 4.3 Home page

- Greeting: "Dobar dan."
- Stats line: "4. semestar · 1 predmet · Grupa 7"
- Search bar (searches material titles only, hint shows "/" shortcut)
- Upcoming exams section with exam cards (color-coded by urgency)
- Recently opened section (from localStorage, max 20)

### 4.4 All Subjects page

- Title + count, toolbar with search + filter chips + view toggle
- Single card for Matematička Analiza 2 in its semester section
- Bookmark star on card

### 4.5 Single Subject page

- Breadcrumb, header (title + meta + bookmark button)
- Exam countdown banner (conditional)
- Filter bar: file type, category, exam status chips + search input
- Material list grouped by category sections
- Each material row: icon, title, badges, bookmark star

### 4.6 PDF Viewer page

- Top bar: back, breadcrumb, title, page input + total, zoom controls, invert, fullscreen, bookmark
- Main area: PDF.js canvas on dark background (#1a1a1a)
- Right sidebar: header with toggle between **"Current category"** (default, matches mockup) and **"All materials"**. Scrollable material list. Keyboard shortcuts hint at bottom.
  - "Current category" mode: shows only materials from the same category (e.g., Predavanja), grouped by exam part
  - "All materials" mode: shows every material for the subject, grouped by category sections, with the current one highlighted
- User can navigate to other documents from the sidebar without going back.

### 4.7 Settings page

- Group selector (`Select` 1–14)
- Bookmark management (list all bookmarked with `Card`, remove individual)

### 4.8 Bookmarks page

- Lists all bookmarked materials with subject context
- Remove bookmark inline
- Empty state if no bookmarks

### 4.9 Search page

- Search input at top (pre-filled if `?q=` param present)
- Results list: material title, subject name, type badge
- No results state
- Search is material titles only (Fuse.js fuzzy match)

### 4.10 Wire frontend to Worker

- API client module in `lib/api.ts`, all calls go through `fetch` to the Worker URL
- TanStack Router loaders fetch data before rendering

---

## Phase 5: Client-Side Features

### 5.1 PDF.js rendering

- `pnpm add pdfjs-dist`
- Load PDF directly from the material's `url` field (Google Drive direct download link)
- Render to canvas, page navigation, zoom, invert (CSS filter), fullscreen

### 5.2 Bookmarking

- `useBookmarks()` hook: material IDs in localStorage
- Star toggle everywhere (subject card, material row, viewer top bar)

### 5.3 Recently opened

- `useRecentlyOpened()` hook: `{ materialId, subjectId, timestamp }[]` in localStorage (max 20)
- Triggered on PDF open
- Displayed on Home page, full list on "... →" click

### 5.4 Search (Fuse.js)

- `pnpm add fuse.js`
- Index built from material titles across all subjects
- Searched on Home page search bar and dedicated Search page
- Debounced 200ms

### 5.5 Exam countdown

- Calculate days until, color-code (red ≤14d, amber ≤30d, green >30d)
- "za X dana" (or "today"/"tomorrow")
- Displayed on Home and Single Subject page

---

## Phase 6: Data Population (Your Step)

### 6.1 Collect PDFs

Gather all Matematička Analiza 2 materials from your sources.

### 6.2 Normalize filenames

```
Predavanje-01-Naziv.pdf
Vezbe-01-Naziv.pdf
Kolokvijum-I-2023-24-resenja.pdf
Zavrsni-ispit-2024-25-rok1.pdf
```

### 6.3 Upload to Google Drive

Upload PDFs to Google Drive, share with "Anyone with the link" (view-only), and extract the file ID from the share URL. Use `https://drive.google.com/uc?export=download&id=FILE_ID` as the `url` value.

### 6.4 Fill metadata JSON

Update `packages/worker/src/data/matematicka-analiza-2.json` with actual data.

### 6.5 Validate

Click every material, verify PDFs, bookmarks, search, all pages render correctly.

---

## Phase 7: Deployment

### 7.1 Deploy Worker

```
cd packages/worker
pnpm run deploy
```

No environment variables needed in v0 (no OAuth).

### 7.2 Build and deploy Frontend

```
cd packages/app
pnpm run build
pnpm run deploy
```

### 7.3 Set Pages environment

In Cloudflare dashboard: set `API_URL` on Pages project to Worker URL.

### 7.4 Final test

Full E2E test on live `.pages.dev` URL:

- Open the site, browse subjects, search, view PDF, bookmark
- All pages render correctly (home, subjects, viewer, settings, bookmarks, search)

---

## Key Design Decisions

| Decision         | Choice                           | Rationale                                                                         |
| ---------------- | -------------------------------- | --------------------------------------------------------------------------------- |
| Worker framework | Hono                             | Lightweight, Cloudflare-native                                                    |
| Build tool       | Vite                             | Standard for React + Cloudflare Pages                                             |
| Routing          | TanStack Router                  | File-based, matches plan.md                                                       |
| PDF rendering    | PDF.js                           | Industry standard, self-hosted                                                    |
| Search           | Fuse.js                          | Client-side fuzzy search, titles only for v0                                      |
| Data source      | JSON bundled in Worker           | No database reads, easy to edit                                                   |
| Auth             | None (open access)               | v0 is read-only; add OAuth in v1 if needed                                        |
| Storage          | Google Drive direct links        | No R2 credit card requirement; switch to R2 for real 3rd year subjects in v1      |
| Language         | Hardcoded Serbian                | Defer translation system until English toggle is actually built                   |
| Bookmarks        | localStorage                     | Works immediately, sync comes in v1                                               |
| UI framework     | Tailwind CSS + shadcn/ui         | Standard 2026 React stack, zero runtime overhead, pre-built accessible primitives |
| UI language      | Serbian default + English toggle | Hardcoded strings, no auto-detection                                              |

## What v0 will NOT have

- Any form of auth / user accounts (no Google OAuth, no guest JWTs, no login screen)
- D1 database (no D1 at all until v1)
- English language toggle (Serbian-only UI)
- Synced bookmarks (localStorage only)
- Multi-subject browsing (full year coverage)
- Per-subject group overrides
- Annotations or notes
- Dark mode (site-wide — PDF viewer invert only)
- R2 storage (Google Drive direct links instead)
- Cloudflare Web Analytics
