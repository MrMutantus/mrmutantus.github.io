import { describe, expect, it } from 'vitest';
import type { ImportContext } from './weapons';
import { applyImportToScenarioData, computeWeapons } from './weapons';
import type { CartridgeCase, ParsedReport, ScenarioData, StoredWeapon } from './types';

function ctx(uuidPrefix = 'uuid'): ImportContext {
  let i = 0;
  return {
    now: () => '2026-05-29T00:00:00.000Z',
    uuid: () => `${uuidPrefix}-${++i}`,
  };
}

const emptyData: ScenarioData = { cases: [], reports: [], weapons: [] };

function parsed(over: Partial<ParsedReport>): ParsedReport {
  return {
    caseId1: '#aaaaaaa',
    caseId2: '#bbbbbbb',
    weaponType1: '9x19mm',
    weaponType2: '9x19mm',
    result: 'MATCH',
    ...over,
  };
}

describe('applyImportToScenarioData', () => {
  it('MATCH on two new cases creates one shared weapon', () => {
    const out = applyImportToScenarioData(emptyData, parsed({}), 'raw', undefined, ctx());

    expect(out.cases.map(c => c.id)).toEqual(['#aaaaaaa', '#bbbbbbb']);
    expect(out.weapons).toHaveLength(1);
    expect(out.cases.every(c => c.weaponId === out.weapons[0]?.id)).toBe(true);
    expect(out.reports[0]?.result).toBe('MATCH');
  });

  it('NO_MATCH on two new cases creates two separate weapons', () => {
    const out = applyImportToScenarioData(emptyData, parsed({ result: 'NO_MATCH' }), 'raw', undefined, ctx());

    expect(out.weapons).toHaveLength(2);
    const wId1 = out.cases.find(c => c.id === '#aaaaaaa')?.weaponId;
    const wId2 = out.cases.find(c => c.id === '#bbbbbbb')?.weaponId;
    expect(wId1).toBeTruthy();
    expect(wId2).toBeTruthy();
    expect(wId1).not.toBe(wId2);
  });

  it('DIFFERENT_WEAPON behaves like NO_MATCH for weapon assignment', () => {
    const out = applyImportToScenarioData(emptyData, parsed({ result: 'DIFFERENT_WEAPON' }), 'raw', undefined, ctx());
    expect(out.weapons).toHaveLength(2);
    expect(out.reports[0]?.result).toBe('DIFFERENT_WEAPON');
  });

  it('MATCH merges two pre-existing weapons into one (w2 weapons removed)', () => {
    const existing: ScenarioData = {
      cases: [
        { id: '#aaaaaaa', weaponId: 'w1', weaponType: '9x19mm', serialNumber: '', notes: '', createdAt: 't' },
        { id: '#bbbbbbb', weaponId: 'w2', weaponType: '9x19mm', serialNumber: '', notes: '', createdAt: 't' },
      ],
      reports: [],
      weapons: [
        { id: 'w1', weaponType: '9x19mm', serialNumber: '', notes: '' },
        { id: 'w2', weaponType: '9x19mm', serialNumber: '', notes: '' },
      ],
    };
    const out = applyImportToScenarioData(existing, parsed({}), 'raw', undefined, ctx());
    expect(out.weapons.map(w => w.id)).toEqual(['w1']);
    expect(out.cases.every(c => c.weaponId === 'w1')).toBe(true);
  });

  it('MATCH adopts the existing weapon when one case is unlinked', () => {
    const existing: ScenarioData = {
      cases: [
        { id: '#aaaaaaa', weaponId: 'w1', weaponType: '9x19mm', serialNumber: '', notes: '', createdAt: 't' },
      ],
      reports: [],
      weapons: [{ id: 'w1', weaponType: '9x19mm', serialNumber: '', notes: '' }],
    };
    const out = applyImportToScenarioData(existing, parsed({}), 'raw', undefined, ctx());
    expect(out.weapons.map(w => w.id)).toEqual(['w1']);
    expect(out.cases.every(c => c.weaponId === 'w1')).toBe(true);
  });

  it('upserts: keeps existing weaponType when import provides empty string', () => {
    const existing: ScenarioData = {
      cases: [
        { id: '#aaaaaaa', weaponType: '9x19mm', serialNumber: 'X', notes: 'old', createdAt: 't' },
      ],
      reports: [],
      weapons: [],
    };
    const out = applyImportToScenarioData(existing, parsed({ weaponType1: '' }), 'raw', undefined, ctx());
    const c = out.cases.find(c => c.id === '#aaaaaaa');
    expect(c?.weaponType).toBe('9x19mm');
    expect(c?.serialNumber).toBe('X');
    expect(c?.notes).toBe('old');
  });

  it('appends the report and tags it with the provided reportId', () => {
    const out = applyImportToScenarioData(emptyData, parsed({}), 'raw text here', '#abc1234', ctx());
    expect(out.reports).toHaveLength(1);
    expect(out.reports[0]?.reportId).toBe('#abc1234');
    expect(out.reports[0]?.rawText).toBe('raw text here');
  });
});

describe('computeWeapons', () => {
  it('attaches cases and reports to each stored weapon', () => {
    const cases: CartridgeCase[] = [
      { id: '#aaaaaaa', weaponId: 'w1', weaponType: '9x19mm', serialNumber: '', notes: '', createdAt: 't' },
      { id: '#bbbbbbb', weaponId: 'w1', weaponType: '9x19mm', serialNumber: '', notes: '', createdAt: 't' },
      { id: '#ccccccc', weaponType: '9x19mm', serialNumber: '', notes: '', createdAt: 't' },
    ];
    const weapons: StoredWeapon[] = [{ id: 'w1', weaponType: '9x19mm', serialNumber: '', notes: '' }];
    const reports = [
      { id: 'r1', caseId1: '#aaaaaaa', caseId2: '#bbbbbbb', weaponType1: '', weaponType2: '', result: 'MATCH' as const, importedAt: 't', rawText: '' },
      { id: 'r2', caseId1: '#ccccccc', caseId2: '#zzzzzzz', weaponType1: '', weaponType2: '', result: 'NO_MATCH' as const, importedAt: 't', rawText: '' },
    ];
    const out = computeWeapons(weapons, cases, reports);
    expect(out).toHaveLength(1);
    expect(out[0]?.cases.map(c => c.id)).toEqual(['#aaaaaaa', '#bbbbbbb']);
    expect(out[0]?.reports.map(r => r.id)).toEqual(['r1']);
  });
});
