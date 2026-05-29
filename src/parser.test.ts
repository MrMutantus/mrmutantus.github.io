import { describe, expect, it } from 'vitest';
import { parseLabReport } from './parser';

const SAME_PROFILE = `Laborbericht abgeschlossen (Patronenhülsen):

Probennummer: #7ffbea0 und #c55f765
Hülse 1: 9x19mm VF 226 Hülse
Hülse 2: 9x19mm VF 226 Hülse
Ergebnis: Die Hülsen weisen das selbe Profil auf`;

const NO_MATCH = `Laborbericht abgeschlossen (Patronenhülsen):

Probennummer: #a4f2871 und #c276d1a
Hülse 1: 9x19mm 92fs Hülse
Hülse 2: 9x19mm 92fs Hülse
Ergebnis: Die Hülsen weisen nicht das selbe Profil auf`;

const DIFFERENT_WEAPONS = `Laborbericht abgeschlossen (Patronenhülsen):

Probennummer: #4f955aa und #99eafce
Hülse 1: 9x19mm Shrewsbury PSP Hülse
Hülse 2: .45 ACP Vom Feuer 45.Custom Hülse
Ergebnis: Die Hülsen weisen eine unterschiedliche Waffe auf`;

describe('parseLabReport', () => {
  it('parses a MATCH report (same profile)', () => {
    expect(parseLabReport(SAME_PROFILE)).toEqual({
      caseId1: '#7ffbea0',
      caseId2: '#c55f765',
      weaponType1: '9x19mm VF 226',
      weaponType2: '9x19mm VF 226',
      result: 'MATCH',
    });
  });

  it('parses a NO_MATCH report (nicht selbe profil)', () => {
    expect(parseLabReport(NO_MATCH)).toEqual({
      caseId1: '#a4f2871',
      caseId2: '#c276d1a',
      weaponType1: '9x19mm 92fs',
      weaponType2: '9x19mm 92fs',
      result: 'NO_MATCH',
    });
  });

  it('parses a DIFFERENT_WEAPON report (unterschiedliche Waffe)', () => {
    expect(parseLabReport(DIFFERENT_WEAPONS)).toEqual({
      caseId1: '#4f955aa',
      caseId2: '#99eafce',
      weaponType1: '9x19mm Shrewsbury PSP',
      weaponType2: '.45 ACP Vom Feuer 45.Custom',
      result: 'DIFFERENT_WEAPON',
    });
  });

  it('returns null when no case IDs are present', () => {
    expect(parseLabReport('')).toBeNull();
    expect(parseLabReport('Laborbericht abgeschlossen ohne Probennummer')).toBeNull();
  });

  it('lowercases uppercase hex case IDs', () => {
    const text = [
      'Probennummer: #A4F2871 und #C276D1A',
      'Hülse 1: 9x19mm 92fs Hülse',
      'Hülse 2: 9x19mm 92fs Hülse',
      'Ergebnis: Die Hülsen weisen das selbe Profil auf',
    ].join('\n');
    const parsed = parseLabReport(text);
    expect(parsed?.caseId1).toBe('#a4f2871');
    expect(parsed?.caseId2).toBe('#c276d1a');
  });
});
