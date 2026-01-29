# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bilingual crossword puzzle generator (English ↔ Arabic) with React frontend and Vercel serverless API. Users select grid size (7-13), difficulty level (CEFR bands), and language direction to generate interactive puzzles.

## Development Commands

```bash
npm run dev       # Start Vite dev server with HMR
npm run build     # TypeScript compile + Vite bundle
npm run lint      # ESLint on all TS/TSX files
npm run preview   # Preview production build
```

## Architecture

### Frontend (`src/`)

Single-page React app with all state in `App.tsx`:
- **State**: `size`, `band`, `mode`, `cw` (crossword object), `fill` (user input map), `selectedEntryId`
- **Grid rendering**: CSS grid with dynamic columns, RTL support via `dir="rtl"` on inputs when `mode === 'en_to_ar'`
- **Cell references**: Composite key format `"${r},${c}"`

### Crossword Generation Pipeline

**Flow**: `/api/generate` → `generateCrossword()` → `constructCrossword()` → render

1. **API endpoint** (`api/generate.ts`): Picks words from local dictionary by CEFR level, returns `{ entries: [{ clue, answer }] }`
2. **generateCrossword** (`src/lib/generateCrossword.ts`): Runs 10 attempts with different shuffles, scores by placement count and direction balance, enforces minimum words (10-22 based on size) and 35% down direction
3. **constructCrossword** (`src/lib/construct.ts`): Places words by finding intersections with existing letters, scores candidates by overlaps/area/center distance, enforces no-adjacent-letters rule

### Local Dictionary (`api/_dict_cefr_en_ar.ts`)

Curated EN→AR word pairs organized by CEFR level:
- `WORDS_A1_A2`: Beginner (90+ words)
- `WORDS_B1_B2`: Intermediate (70+ words)
- `WORDS_C1_C2`: Advanced (50+ words)

Optional Hugging Face fallback translation if `HF_TOKEN` env var is set.

### Type Definitions (`src/lib/crossword.ts`)

```typescript
Cell = { r, c, isBlock, solution?, entryId?, number? }
Entry = { id, direction, row, col, answer, clue, number }
Crossword = { size, grid[][], entries[] }
```

## Key Conventions

- **String normalization**: Answers uppercased; Arabic diacritics/tatweel stripped
- **Direction literals**: `'across' | 'down'`
- **API runtime**: Node.js (not Edge) - see `api/generate.ts` runtime config

## Adding Words

Edit `api/_dict_cefr_en_ar.ts` and add to appropriate `WORDS_*` array. Each entry is `{ en: "word", ar: "كلمة" }`.

## Deployment

Push to `main` branch triggers Vercel auto-deploy. Frontend bundles to `/dist`, API functions from `/api/*.ts`.
