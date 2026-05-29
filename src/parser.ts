import type { MatchResult, ParsedReport } from './types';
import { HEX_ID_GLOBAL_PATTERN } from './patterns';

function extractWeaponType(line: string, label: string): string {
  return line.replace(label, '').replace(/\s+Hülse\s*$/, '').trim();
}

export function parseLabReport(text: string): ParsedReport | null {
  const lines = text.split('\n');

  let caseId1 = '';
  let caseId2 = '';
  let weaponType1 = '';
  let weaponType2 = '';
  let huelse1Seen = false;
  let huelse2Seen = false;
  let result: MatchResult = 'MATCH';

  for (const line of lines) {
    if (line.includes('Probennummer:')) {
      const [first, second] = line.match(HEX_ID_GLOBAL_PATTERN) ?? [];
      if (first && second) {
        caseId1 = first.toLowerCase();
        caseId2 = second.toLowerCase();
      }
    } else if (line.includes('Hülse 1:')) {
      huelse1Seen = true;
      weaponType1 = extractWeaponType(line, 'Hülse 1:');
    } else if (line.includes('Hülse 2:')) {
      huelse2Seen = true;
      weaponType2 = extractWeaponType(line, 'Hülse 2:');
    } else if (line.includes('Ergebnis:')) {
      // Precedence: "unterschiedliche" (different weapon) wins over "nicht"
      // (no match) because the lab uses the phrase "eine unterschiedliche
      // Waffe" while a no-match line contains "nicht das selbe Profil". A
      // pathological line containing both keywords is treated as the stronger
      // signal (DIFFERENT_WEAPON).
      if (line.includes('unterschiedliche')) result = 'DIFFERENT_WEAPON';
      else if (line.includes('nicht')) result = 'NO_MATCH';
      else result = 'MATCH';
    }
  }

  if (!caseId1 || !caseId2) return null;
  if (huelse1Seen && !weaponType1) return null;
  if (huelse2Seen && !weaponType2) return null;

  return { caseId1, caseId2, weaponType1, weaponType2, result };
}
