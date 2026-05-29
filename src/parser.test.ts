import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parseLabReport } from './parser';

const fixtureDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'examples');
const fixture = (name: string) => readFileSync(resolve(fixtureDir, name), 'utf8');

describe('parseLabReport', () => {
  it('parses a MATCH report (same profile)', () => {
    expect(parseLabReport(fixture('same_profile.txt'))).toEqual({
      caseId1: '#7ffbea0',
      caseId2: '#c55f765',
      weaponType1: '9x19mm VF 226',
      weaponType2: '9x19mm VF 226',
      result: 'MATCH',
    });
  });

  it('parses a NO_MATCH report (nicht selbe profil)', () => {
    expect(parseLabReport(fixture('no_match.txt'))).toEqual({
      caseId1: '#a4f2871',
      caseId2: '#c276d1a',
      weaponType1: '9x19mm 92fs',
      weaponType2: '9x19mm 92fs',
      result: 'NO_MATCH',
    });
  });

  it('parses a DIFFERENT_WEAPON report (unterschiedliche Waffe)', () => {
    expect(parseLabReport(fixture('different_weapons.txt'))).toEqual({
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
