import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RootState } from './types';
import { loadState, saveState } from './storage';

const STORAGE_KEY = 'forensics-tracker';

const sampleState: RootState = {
  scenarios: [
    {
      id: 'scenario-1',
      name: 'AZ2026/001',
      createdAt: '2026-05-01T00:00:00.000Z',
      data: {
        cases: [
          {
            id: '#a1b2c3d',
            weaponType: '9x19mm',
            serialNumber: '',
            notes: '',
            createdAt: '2026-05-01T00:00:00.000Z',
          },
        ],
        reports: [
          {
            id: 'report-1',
            caseId1: '#a1b2c3d',
            caseId2: '#e4f5a6b',
            weaponType1: '9x19mm',
            weaponType2: '9x19mm',
            result: 'MATCH',
            importedAt: '2026-05-01T00:00:00.000Z',
            rawText: 'sample',
          },
        ],
        weapons: [
          { id: 'weapon-1', weaponType: '9x19mm', serialNumber: '', notes: '' },
        ],
      },
    },
  ],
  activeScenarioId: 'scenario-1',
  nextCounter: 2,
};

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty state when localStorage is empty', () => {
    const result = loadState();
    expect(result.corrupted).toBe(false);
    expect(result.state).toEqual({ scenarios: [], activeScenarioId: null, nextCounter: 1 });
  });

  it('round-trips a valid state', () => {
    saveState(sampleState);
    const result = loadState();
    expect(result.corrupted).toBe(false);
    expect(result.state).toEqual(sampleState);
  });

  it('rejects unparseable JSON and flags corrupted', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    localStorage.setItem(STORAGE_KEY, '{not json');
    const result = loadState();
    expect(result.corrupted).toBe(true);
    expect(result.state.scenarios).toEqual([]);
    expect(warn).toHaveBeenCalled();
  });

  it('rejects payloads that pass JSON.parse but have wrong shape', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ scenarios: 'not-an-array' }));
    const result = loadState();
    expect(result.corrupted).toBe(true);
    expect(warn).toHaveBeenCalled();
  });

  it('rejects payloads with malformed scenarios', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      scenarios: [{ id: 1, name: 'oops' }],
      activeScenarioId: null,
      nextCounter: 1,
    }));
    expect(loadState().corrupted).toBe(true);
  });

  it('migrates legacy reports that use `matched` instead of `result`', () => {
    const legacy = {
      ...sampleState,
      scenarios: [
        {
          ...sampleState.scenarios[0],
          data: {
            ...sampleState.scenarios[0]?.data,
            reports: [
              {
                id: 'report-1',
                caseId1: '#a1b2c3d',
                caseId2: '#e4f5a6b',
                weaponType1: '9x19mm',
                weaponType2: '9x19mm',
                matched: true,
                importedAt: '2026-05-01T00:00:00.000Z',
                rawText: 'sample',
              },
            ],
          },
        },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
    const result = loadState();
    expect(result.corrupted).toBe(false);
    expect(result.state.scenarios[0]?.data.reports[0]?.result).toBe('MATCH');
    expect(result.state.scenarios[0]?.data.reports[0]).not.toHaveProperty('matched');
  });
});
