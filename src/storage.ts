import type { LabReport, RootState } from './types';

const STORAGE_KEY = 'forensics-tracker';

type StoredReport = LabReport & { matched?: boolean };

const EMPTY: RootState = { scenarios: [], activeScenarioId: null, nextCounter: 1 };

function isRootState(parsed: unknown): parsed is RootState {
  return (
    typeof parsed === 'object' &&
    parsed !== null &&
    'scenarios' in parsed &&
    Array.isArray((parsed as RootState).scenarios)
  );
}

export function loadState(): RootState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!isRootState(parsed)) return { ...EMPTY };
      const scenarios = (parsed.scenarios ?? []).map(s => ({
        ...s,
        data: {
          ...s.data,
          reports: ((s.data?.reports ?? []) as StoredReport[]).map(r => ({
            ...r,
            result: r.result ?? (r.matched ? 'MATCH' : 'NO_MATCH'),
          })),
        },
      }));
      return {
        scenarios,
        activeScenarioId: parsed.activeScenarioId ?? null,
        nextCounter: parsed.nextCounter ?? 1,
      };
    }
  } catch { /* ignore storage/parse errors */ }
  return { ...EMPTY };
}

export function saveState(state: RootState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
