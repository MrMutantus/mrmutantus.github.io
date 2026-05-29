import type {
  CartridgeCase,
  LabReport,
  MatchResult,
  RootState,
  Scenario,
  ScenarioData,
  StoredWeapon,
} from './types';

const STORAGE_KEY = 'forensics-tracker';

// Legacy shape from the very first release: `matched: boolean` instead of
// `result: MatchResult`. Migrated on read so users from v1 don't lose data.
type LegacyReport = LabReport & { matched?: boolean };

const EMPTY: RootState = { scenarios: [], activeScenarioId: null, nextCounter: 1 };

const MATCH_RESULTS: ReadonlySet<MatchResult> = new Set(['MATCH', 'NO_MATCH', 'DIFFERENT_WEAPON']);

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function isString(v: unknown): v is string {
  return typeof v === 'string';
}
function isOptionalString(v: unknown): v is string | undefined {
  return v === undefined || typeof v === 'string';
}

function isStoredWeapon(v: unknown): v is StoredWeapon {
  if (!isObject(v)) return false;
  return isString(v.id) && isString(v.weaponType) && isString(v.serialNumber) && isString(v.notes)
    && isOptionalString(v.suspect);
}

function isCartridgeCase(v: unknown): v is CartridgeCase {
  if (!isObject(v)) return false;
  return isString(v.id) && isString(v.weaponType) && isString(v.serialNumber) && isString(v.notes)
    && isString(v.createdAt) && isOptionalString(v.weaponId);
}

function isLabReport(v: unknown): v is LabReport {
  if (!isObject(v)) return false;
  const hasResult = isString(v.result) && MATCH_RESULTS.has(v.result as MatchResult);
  const hasLegacyMatched = typeof v.matched === 'boolean';
  if (!hasResult && !hasLegacyMatched) return false;
  return isString(v.id) && isString(v.caseId1) && isString(v.caseId2)
    && isString(v.weaponType1) && isString(v.weaponType2)
    && isString(v.importedAt) && isString(v.rawText)
    && isOptionalString(v.reportId);
}

function migrateReport(r: LegacyReport): LabReport {
  const { matched, ...rest } = r;
  if (rest.result) return rest;
  return { ...rest, result: matched ? 'MATCH' : 'NO_MATCH' };
}

function isScenarioData(v: unknown): v is ScenarioData {
  if (!isObject(v)) return false;
  return Array.isArray(v.cases) && v.cases.every(isCartridgeCase)
    && Array.isArray(v.reports) && v.reports.every(isLabReport)
    && Array.isArray(v.weapons) && v.weapons.every(isStoredWeapon);
}

function isScenario(v: unknown): v is Scenario {
  if (!isObject(v)) return false;
  return isString(v.id) && isString(v.name) && isString(v.createdAt) && isScenarioData(v.data);
}

function isRootState(v: unknown): v is RootState {
  if (!isObject(v)) return false;
  if (!Array.isArray(v.scenarios) || !v.scenarios.every(isScenario)) return false;
  if (v.activeScenarioId !== null && !isString(v.activeScenarioId)) return false;
  if (typeof v.nextCounter !== 'number') return false;
  return true;
}

export interface LoadResult {
  state: RootState;
  corrupted: boolean;
}

export function loadState(): LoadResult {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { state: { ...EMPTY }, corrupted: false };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRootState(parsed)) {
      console.warn('[forensics] loadState rejected malformed payload');
      return { state: { ...EMPTY }, corrupted: true };
    }
    const scenarios: Scenario[] = parsed.scenarios.map(s => ({
      ...s,
      data: {
        ...s.data,
        reports: s.data.reports.map(r => migrateReport(r as LegacyReport)),
      },
    }));
    return {
      state: { scenarios, activeScenarioId: parsed.activeScenarioId, nextCounter: parsed.nextCounter },
      corrupted: false,
    };
  } catch (err) {
    console.warn('[forensics] loadState failed', err);
    return { state: { ...EMPTY }, corrupted: true };
  }
}

export function saveState(state: RootState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('[forensics] saveState failed', err);
  }
}
