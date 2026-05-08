import type { MatchResult, ParsedReport } from './types';

const CASE_ID_RE = /#[0-9a-f]{7}/gi;

export function parseLabReport(text: string): ParsedReport | null {
  const lines = text.split('\n');

  let caseId1 = '';
  let caseId2 = '';
  let weaponType1 = '';
  let weaponType2 = '';
  let result: MatchResult = 'MATCH';

  for (const line of lines) {
    if (line.includes('Probennummer:')) {
      const ids = line.match(CASE_ID_RE);
      if (ids && ids.length >= 2) {
        caseId1 = ids[0].toLowerCase();
        caseId2 = ids[1].toLowerCase();
      }
    } else if (line.includes('Hülse 1:')) {
      weaponType1 = line.replace('Hülse 1:', '').replace(/ Hülse$/, '').trim();
    } else if (line.includes('Hülse 2:')) {
      weaponType2 = line.replace('Hülse 2:', '').replace(/ Hülse$/, '').trim();
    } else if (line.includes('Ergebnis:')) {
      if (line.includes('unterschiedliche')) result = 'DIFFERENT_WEAPON';
      else if (line.includes('nicht')) result = 'NO_MATCH';
      else result = 'MATCH';
    }
  }

  if (!caseId1 || !caseId2) return null;

  return { caseId1, caseId2, weaponType1, weaponType2, result };
}
