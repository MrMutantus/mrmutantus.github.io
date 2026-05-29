# Forensic Tracker — Senior-Dev Code Review

**Reviewer:** senior dev review of the codebase as of `main` @ `0609b2d` plus uncommitted working-tree changes (new `src/hooks/` directory + edits to `App.tsx`, `EvidenceTable.tsx`, `ReportList.tsx`, `SummaryReportModal.tsx`, `WeaponList.tsx`).
**Date:** 2026-05-29
**Scope:** security, maintainability, code quality, logic correctness. UI/a11y called out but largely deferred to a later stage.

---

## Executive summary

The app works and the modern stack choices are good (React 19, flat ESLint config, Vite 8, semantic-release, pinned action versions, no `dangerouslySetInnerHTML`). The previous developer also did several things right that less experienced developers usually miss — separating pure logic into `weapons.ts` and `parser.ts`, using `crypto.randomUUID()` for internal IDs, and keeping `examples/` fixtures committed.

But three classes of risk make the codebase fragile for a forensic-data tool:

1. **Silent data loss.** `loadState()` swallows every error and `isRootState()` only checks that `scenarios` is an array — a corrupted or attacker-controlled `localStorage` payload gets spread back into React state without per-record validation.
2. **No type-safety net.** `tsconfig.app.json` has no `strict`, ESLint runs without type-checked rules, and there are zero tests. Unguarded non-null assertions (`!`) in the new `useForensicsData` hook will crash at runtime instead of failing at compile time.
3. **Parser produces ghost weapons.** Lab reports with missing `Hülse N:` lines yield empty `weaponType` strings that flow unguarded into `StoredWeapon` creation, polluting scenarios with nameless weapons.

### Risk heat-map

| Area | Severity | Count |
|---|---|---|
| Data correctness | Critical | 3 |
| Robustness / error handling | Critical | 2 |
| Type safety / tests | Critical | 2 |
| Maintainability | Major | 5 |
| Accessibility | Major | 2 |
| CI / pipeline | Major | 1 |
| DRY / naming / hygiene | Minor | 6 |

Roadmap at the bottom proposes three staged PRs (tooling → data layer → UI). Stages 1 and 2 are scheduled; Stage 3 is parked.

---

## Critical findings

### C-1 — Unguarded non-null assertions in import flow

**Files:** `src/hooks/useForensicsData.ts:110-111`

```ts
const c1 = newCases.find(c => c.id === parsed.caseId1)!;
const c2 = newCases.find(c => c.id === parsed.caseId2)!;
```

The `!` is load-bearing — it asserts the `upsert()` call above always succeeded. The assumption holds *today*, but any future refactor of `upsert` (e.g. adding an early return for malformed IDs) silently turns these into runtime `TypeError: Cannot read properties of undefined`. With `strict: true` and `noUncheckedIndexedAccess`, TypeScript would force an explicit guard.

**Fix:** Replace `!` with an explicit `if (!c1 || !c2) throw new Error('invariant: cases just upserted')` — same runtime behaviour, but the contract is visible.

---

### C-2 — Parser emits empty `weaponType`, hook creates ghost weapons

**Files:** `src/parser.ts:21-24`, `src/hooks/useForensicsData.ts:134-148`

`parser.ts` initialises `weaponType1 = ''` and `weaponType2 = ''`. If a report is missing or has malformed `Hülse 1:` / `Hülse 2:` lines, the strings stay empty but `parseLabReport` still returns a populated object. `useForensicsData.ts:139-144` then unconditionally creates a `StoredWeapon` with `weaponType: ''`:

```ts
const newWeapon: StoredWeapon = {
  id: crypto.randomUUID(),
  weaponType,             // ← can be ''
  serialNumber: '',
  notes: '',
};
```

User sees an unnamed weapon appear in the sidebar; the report is silently associated with it. There's no UI affordance to identify or fix it.

**Fix:** Reject in the parser (return `null` if either Hülse line was present but unparseable) OR substitute a sentinel like `'Unknown'` and surface it in the import preview. Decide in the PR.

---

### C-3 — Non-global regex on duplicate `Hülse` tokens

**Files:** `src/parser.ts:22-23`

```ts
weaponType1 = line.replace('Hülse 1:', '').replace(/ Hülse$/, '').trim();
```

The trailing `Hülse` regex has no `g` flag — only strips the last occurrence if the line is well-formed. A malformed line like `Hülse 1: SIG P229 Hülse Hülse` survives partial cleanup. Combine with C-2 and the bad value flows into a `StoredWeapon`.

**Fix:** Either anchor more strictly (e.g. capture group on the canonical form) or trim only known suffixes.

---

### C-4 — Shallow validation in `loadState`

**Files:** `src/storage.ts:9-16, 24-37`

```ts
function isRootState(parsed: unknown): parsed is RootState {
  return (
    typeof parsed === 'object' &&
    parsed !== null &&
    'scenarios' in parsed &&
    Array.isArray((parsed as RootState).scenarios)
  );
}
```

Only the top-level `scenarios` array is checked. The subsequent `parsed.scenarios.map((s) => ({ ...s, data: { cases: (s.data?.cases ?? []).map(...) } }))` then spreads every element back into React state without validating that each scenario actually has `id`, `name`, `createdAt`, or that each `CartridgeCase` has the expected fields. A localStorage value like `{"scenarios":[{"data":{"cases":[{"weaponId":"<script>..."}]}}]}` passes the gate and lands in state.

**Risk surface:** prototype pollution via `__proto__` keys, downstream `.find()` returning `undefined` and crashing components, suspect XSS sinks if any user-supplied string is ever rendered via `dangerouslySetInnerHTML` (none today, but a regression away).

**Fix:** Replace `isRootState` with deep validators per type (hand-rolled type guards or a tiny `zod` schema — `zod` is ~12 KB gzipped, acceptable here).

---

### C-5 — `catch {}` swallows all storage errors

**Files:** `src/storage.ts:44`

```ts
} catch { /* ignore storage/parse errors */ }
```

A user opening the app after a corrupted localStorage payload, a Safari "Block all cookies" setting, or a quota-exceeded write sees an empty state with **zero indication their data is gone**. For a forensic tool, this is the worst possible failure mode.

**Fix:** `catch (err) { console.warn('[forensics] loadState failed', err); }`. Return a `{ state, corrupted: boolean }` shape so the App can render a one-time banner.

---

### C-6 — No TypeScript strict mode

**Files:** `tsconfig.app.json:1-25`

Only `noUnusedLocals`, `noUnusedParameters`, and `noFallthroughCasesInSwitch` are on. Missing: `strict`, `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. Every C-1-style bug above sits inside the blast radius of this single flag.

**Fix:** Enable `strict: true` and `noUncheckedIndexedAccess: true`. The resulting error wave is fixable in a single PR (~20-30 sites by my reading).

---

### C-7 — Zero tests

**Files:** `package.json:6-11`

No test framework. For a tool whose entire correctness story depends on a regex-driven parser and a stateful weapon-merging algorithm, this is a deploy-blocking gap.

**Fix:** Add Vitest + React Testing Library. First tests should cover `parser.ts` (real fixtures from `examples/`) and the weapon-merge logic once extracted from the hook.

---

## Major findings

### M-1 — `importReport` is unstructured and untestable

**Files:** `src/hooks/useForensicsData.ts:81-151`

70 lines, four levels of nesting, mixes three concerns (upsert cases, merge weapons on MATCH, fallback weapon-creation). Lines 134-148 run unconditionally — for the MATCH branch the guard `if (!… ?.weaponId)` makes the loop a no-op, but the intent is buried.

**Fix:** Extract a pure function `applyImportToScenarioData(data, parsed, rawText, reportId): ScenarioData` to `src/weapons.ts` (same module already hosts `computeWeapons`). Skip the fallback loop explicitly on `MATCH`. Hook becomes a thin wrapper. Add table-driven tests covering each branch.

### M-2 — `useForensicsData` returns 21 fields

**Files:** `src/hooks/useForensicsData.ts:202-225`

Single hook owns scenarios, cases, weapons, reports, the scroll ref, and all 14 mutators. Cannot be reused piecewise; every consumer pulls all 21 deps.

**Fix (Stage 3):** Split into `useScenarios`, `useCases`, `useWeapons`, `useReports`. Out of scope for the scheduled stages.

### M-3 — Regex constants drift across 6 files

**Files:**
- `src/parser.ts:3` — `/#[0-9a-f]{7}/gi` (global + case-insensitive)
- `src/components/AddEvidenceModal.tsx:5,6`
- `src/components/AddWeaponModal.tsx:5`
- `src/components/EvidenceDetailModal.tsx:16,17`
- `src/components/ReportList.tsx:9`
- `src/components/ImportReportModal.tsx:5` — all anchored `^…$` variants

Same hull-ID grammar, declared seven times, with **inconsistent flags** (parser is `gi`, modals are `i`). Future format change requires editing seven sites and getting the anchors right each time.

**Fix:** Export `CASE_ID_PATTERN`, `SERIAL_PATTERN` from `src/types.ts` (or a new `src/patterns.ts`). Modals import the anchored form; parser uses the global form. One source of truth.

### M-4 — ESLint not type-checked

**Files:** `eslint.config.js:14`

Uses `tseslint.configs.recommended` instead of `recommendedTypeChecked`. Rules like `@typescript-eslint/no-floating-promises`, `no-unsafe-assignment`, `no-misused-promises` are off — exactly the rules that catch `useEffect` async-handler bugs and `then()`-without-`catch` mistakes.

**Fix:** Switch to `recommendedTypeChecked` and add `parserOptions.project: './tsconfig.app.json'`. Expect a small wave of new lints to clean up; bundle with C-6.

### M-5 — Deploy pipeline skips lint

**Files:** `.github/workflows/deploy.yml:54`

Build job runs `npm run build` (which calls `tsc -b`) but never `npm run lint`. A PR with lint errors typechecks fine and deploys.

**Fix:** Insert `- run: npm run lint` before the build step. Also add `- run: npm run test` once tests exist.

### M-6 — `WeaponList` is a god component

**Files:** `src/components/WeaponList.tsx` (233 lines)

Manages three independent expansion states (`expandedWeapons`, `expandedEvidence`, `expandedReports`) and inlines two table renders. Hard to test, impossible to reuse pieces.

**Fix (Stage 3):** Decompose into `<WeaponCard>`, `<WeaponHullsSection>`, `<WeaponReportsSection>`.

### M-7 — Scenario tabs use `<div>` for an interactive control

**Files:** `src/App.tsx:140`

`<div role="tab" tabIndex={0} onClick={...} onKeyDown={...}>` — manual keyboard wiring re-implements semantics that `<button>` provides for free. Missing `aria-selected`, `aria-controls`.

**Fix (Stage 3):** Use `<button role="tab" aria-selected={…}>` and let the browser handle Enter/Space.

### M-8 — Modals have no `aria-modal`, no focus trap, no focus return

**Files:** all of `src/components/*Modal.tsx`

Escape-to-close is wired; focus management is not. Screen-reader users can tab out of the modal back into the underlying page.

**Fix (Stage 3):** Add `aria-modal="true"` to dialog containers. Either hand-roll a small focus trap or pull in `react-focus-lock` (~3 KB).

---

## Minor findings

| # | File | Issue |
|---|---|---|
| m-1 | `src/components/SummaryReportModal.tsx:14-18` | `useEffect` has a redundant `if (!copied) return` guard — the effect can be expressed without it. |
| m-2 | `src/components/ConfirmModal.tsx:24` | Inline `style={{ margin: 0 }}` mixed into an otherwise className-driven codebase. |
| m-3 | `src/components/ReportList.tsx:98` (and 3 other files) | Match-result badge JSX duplicated 4×. Extract `<MatchBadge result={…} />`. |
| m-4 | `src/parser.ts:14-30` | `Ergebnis:` parser silently picks `unterschiedliche` over `nicht` by line position. Worth a code comment explaining precedence. |
| m-5 | `src/storage.ts:5` | `StoredReport.matched` legacy migration shim — verify in `git log -S 'matched'` whether this is still reached by current data; drop if not. |
| m-6 | root | Missing `.nvmrc`, `.editorconfig`, `.prettierrc`, pre-commit hooks. Low priority. |
| m-7 | Hull-ID grammar (`#[0-9a-f]{7}`) | 28-bit space → birthday collision ~16K cases. Undocumented assumption. Note in `src/types.ts`. |
| m-8 | `package.json` | No explicit `.releaserc` — semantic-release runs on defaults. Add one for intent clarity. |

---

## Strengths (what the previous dev got right)

Worth calling out so the team doesn't regress these:

- **Pure logic separated from React.** `src/weapons.ts` and `src/parser.ts` are pure functions, no React imports. Easy to test once Vitest lands.
- **Modern stack, sensibly pinned.** React 19, Vite 8, flat ESLint config, semantic-release. Action versions in `deploy.yml` are pinned to majors (`@v4`, `@v3`).
- **No `dangerouslySetInnerHTML` anywhere.** Report output goes through `<textarea readOnly>` — XSS-resistant by construction.
- **Pure derived view types.** `Weapon` (read-only, never persisted) is a different type than `StoredWeapon` (persisted). Good discipline.
- **`crypto.randomUUID()`** used for internal IDs — no homegrown PRNG, no `uuid` dep needed.
- **Cascade delete is implemented.** `deleteWeapon` (`useForensicsData.ts:189-196`) correctly purges associated cases and reports.
- **CI/CD plumbing is real.** Separate release → build → deploy jobs, properly scoped permissions, GitHub Pages environment protection. Only missing piece is the lint step.

---

## Upgrade roadmap — 3 staged PRs

User-approved scope: Critical + Major only. Stage 3 parked.

### Stage 1 — Tooling & type safety (foundation)

Goal: turn the lights on so subsequent stages fail loudly on regressions.

- `tsconfig.app.json` — enable `strict` and `noUncheckedIndexedAccess`; fix the resulting error wave (C-6).
- `eslint.config.js` — switch to `recommendedTypeChecked`, wire `parserOptions.project`, add `eslint-plugin-jsx-a11y` (M-4).
- `.github/workflows/deploy.yml` — insert `npm run lint` step before build (M-5).
- `package.json` + `vite.config.ts` + new `vitest.setup.ts` — scaffold Vitest + RTL (C-7).
- New `src/parser.test.ts` — smoke tests using all four fixtures in `examples/`.

### Stage 2 — Data-layer hardening (correctness)

Goal: fix C-1 through C-5 and M-1.

- `src/parser.ts` — fix non-global `Hülse` replace (C-3), reject or sentinel-fill empty weapon types (C-2), comment `Ergebnis:` precedence (m-4).
- `src/types.ts` (or new `src/patterns.ts`) — export shared regex constants; update parser + 5 modal files (M-3).
- `src/storage.ts` — deep type guards, return `{ state, corrupted }`, log on catch (C-4, C-5).
- `src/weapons.ts` — extract `applyImportToScenarioData` from the hook (M-1).
- `src/hooks/useForensicsData.ts` — replace `!` with explicit guard (C-1), thin wrapper over `applyImportToScenarioData`.
- New `src/weapons.test.ts`, `src/storage.test.ts` — table-driven tests.

### Stage 3 — UI / a11y / DRY (parked)

Only if appetite remains after Stage 2 ships:

- Extract `<MatchBadge>` and shared form-validation helpers (m-3).
- Convert scenario tabs to `<button role="tab">` with `aria-selected` (M-7).
- Add `aria-modal="true"` + focus trap to modals (M-8).
- Decompose `WeaponList` into `<WeaponCard>` + sub-sections (M-6).
- Split `useForensicsData` into smaller hooks (M-2).

---

## Verification (per stage)

1. `npm run lint && npm run build && npm run test` clean locally.
2. `npm run dev` smoke: create scenario → add weapon → add hull → import each `examples/*.txt` → confirm weapon now lists the imported hulls → reload → confirm persistence.
3. DevTools → Application → Local Storage → corrupt `forensics-tracker` JSON → reload → confirm graceful empty state and a console warning (Stage 2+).
4. CI: open a draft PR, confirm lint and test jobs run and would block merge on failure.
