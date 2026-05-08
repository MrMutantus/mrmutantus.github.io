# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start Vite dev server with HMR
npm run build    # TypeScript type-check + Vite bundle → dist/
npm run lint     # ESLint on all .ts/.tsx files
npm run preview  # Serve the production build locally
```

No test framework is configured; validation is done manually via the dev server.

## Architecture

**Forensic Tracker** is a single-page app for ballistics evidence management. State lives entirely in `localStorage` (via `src/storage.ts`) — no backend.

### Data model (`src/types.ts`)
- `CartridgeCase` — one piece of physical evidence with weapon type, serial number, notes
- `LabReport` — result of comparing two cases: `MATCH | NO_MATCH | DIFFERENT_WEAPON`
- `Weapon` — logical group of cases that belong to the same firearm
- `Scenario` — investigation workspace holding its own cases and reports
- `RootState` — root state: list of scenarios + auto-incrementing case counter (`AZ{year}/{counter}`)

### Core algorithms
- **`src/parser.ts`** — parses German-language lab reports using regex. Extracts case IDs (`#[0-9a-f]{7}`), weapon types from `Hülse 1:` / `Hülse 2:` fields, and result keywords (`"unterschiedliche"` → DIFFERENT_WEAPON, `"nicht"` → NO_MATCH, else MATCH). See `examples/` for representative input formats.
- **`src/weapons.ts`** — Union-Find algorithm to group cases into weapons. MATCH reports and matching serial numbers trigger union; NO_MATCH/DIFFERENT_WEAPON reports add graph edges without merging.
- **`src/report.ts`** — generates a text forensic report: identified weapons vs. anonymous groups, pairwise analysis table with ✓/✗/⚠ markers.

### UI (`src/App.tsx` + `src/components/`)
React 19 with local `useState`/`useMemo`. All modals are in `src/components/`. The main `App.tsx` owns root state and passes handlers down as props — no context or external state library.

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) builds on push to `main` and deploys `dist/` to GitHub Pages at `https://mrmutantus.github.io/`.
