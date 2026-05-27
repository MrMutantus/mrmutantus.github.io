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

## Terminology

- **Hull** — the UI term for a fired cartridge case (`CartridgeCase` in code). Use "hull" in all user-facing labels and copy.
- **Weapon** — a logical firearm record that groups one or more hulls firing from the same gun.
- **Report** — a lab comparison result (`LabReport`) linking two hulls with a `MATCH | NO_MATCH | DIFFERENT_WEAPON` verdict.
- **Scenario** — an investigation workspace (case file) that holds its own weapons, hulls, and reports in isolation.

## Architecture

**Forensic Tracker** is a single-page app for ballistic hull evidence management. State lives entirely in `localStorage` (via `src/storage.ts`) — no backend.

### Data model (`src/types.ts`)

- `CartridgeCase` — one hull: weapon type string, serial number (0 or 16 digits), notes, optional `weaponId` linking it to a `StoredWeapon`. Hull IDs follow the format `#[0-9a-f]{7}`.
- `StoredWeapon` — manually created weapon record: weapon type, serial number, notes, optional suspect name. No `createdAt` field.
- `Weapon` — read-only view type: a `StoredWeapon` enriched with its linked `cases[]` and `reports[]`. Computed by `src/weapons.ts`; never persisted.
- `LabReport` — comparison result for two hulls. `reportId` is an optional external identifier (the paper lab report number) that can be set after import via inline edit in the Reports tab. `rawText` holds the full original import text.
- `Scenario` — investigation workspace: `id`, `name`, `createdAt`, plus a `ScenarioData` bag (`cases[]`, `reports[]`, `weapons[]`).
- `RootState` — root storage: `scenarios[]`, `activeScenarioId`, and `nextCounter` (auto-incrementing integer used to generate new scenario names as `AZ{year}/{counter padded to 3 digits}`).

### Core algorithms

- **`src/parser.ts`** — parses German-language lab reports using regex. Extracts hull IDs (`#[0-9a-f]{7}`), weapon types from `Hülse 1:` / `Hülse 2:` fields, and result keywords (`"unterschiedliche"` → DIFFERENT_WEAPON, `"nicht"` → NO_MATCH, else MATCH). See `examples/` for representative input formats.
- **`src/weapons.ts`** — enriches `StoredWeapon[]` with associated hulls and reports. Pure function; no union-find — grouping is done by `weaponId` on each hull.
- **`src/report.ts`** — generates a text forensic report: identified weapons vs. anonymous groups, pairwise analysis table with ✓/✗/⚠ markers.

### UI (`src/App.tsx` + `src/components/`)

React 19 with local `useState`/`useMemo`. All modals are in `src/components/`. `App.tsx` owns root state and passes handlers down as props — no context or external state library.

Key design decisions:
- A hull's ID is locked from editing once any report references it — the report is the authoritative source of truth for hull IDs.
- Deleting a weapon cascades: all its hulls and their reports are also deleted.
- Two `AddEvidenceModal` instances appear in `App.tsx`: one for standalone hull creation and one pre-filled with a weapon context (triggered from `WeaponList`). They are never shown simultaneously.

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) builds on push to `main` and deploys `dist/` to GitHub Pages at `https://mrmutantus.github.io/`.
