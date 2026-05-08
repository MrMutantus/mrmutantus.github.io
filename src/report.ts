import type { MatchResult, Weapon } from './types';

export function generateReport(weapons: Weapon[]): string {
  if (weapons.length === 0) return '=== FORENSICS REPORT ===\n\nNo evidence tracked yet.';

  const date = new Date().toISOString().slice(0, 10);
  const lines: string[] = ['=== FORENSICS REPORT ===', `Generated: ${date}`, ''];

  const identified = weapons.filter(w => w.serialNumber || w.weaponType);
  const anonymous = weapons.filter(w => !w.serialNumber && !w.weaponType);

  const renderWeapon = (label: string, w: Weapon) => {
    const reportByPair = new Map<string, MatchResult>();
    for (const r of w.reports) {
      const key = [r.caseId1, r.caseId2].sort().join('|');
      reportByPair.set(key, r.result);
    }

    const pairs: [string, string][] = [];
    for (let i = 0; i < w.cases.length; i++)
      for (let j = i + 1; j < w.cases.length; j++)
        pairs.push([w.cases[i].id, w.cases[j].id]);

    const unanalyzed = pairs.filter(([a, b]) => !reportByPair.has([a, b].sort().join('|')));
    const status =
      pairs.length === 0
        ? '[SINGLE CASING]'
        : unanalyzed.length === 0
          ? '[COMPLETE]'
          : `[INCOMPLETE - ${unanalyzed.length} pair${unanalyzed.length > 1 ? 's' : ''} unanalyzed]`;

    lines.push(label);
    lines.push(`  Serial:  ${w.serialNumber || '(none)'}`);
    lines.push(`  Type:    ${w.weaponType || '(none)'}`);
    lines.push(`  Casings: ${w.cases.map(c => c.id).join(', ')}`);
    lines.push(`  Status:  ${status}`);
    lines.push('');
    lines.push('  Pairings:');
    if (pairs.length === 0) {
      lines.push('    (none)');
    } else {
      for (const [a, b] of pairs) {
        const key = [a, b].sort().join('|');
        const r = reportByPair.get(key);
        const result = r === undefined
          ? 'NOT ANALYZED ⚠'
          : r === 'MATCH' ? 'MATCH ✓'
          : r === 'DIFFERENT_WEAPON' ? 'DIFF WEAPON ✗'
          : 'NO MATCH ✗';
        lines.push(`    ${a} ↔ ${b} : ${result}`);
      }
    }
    lines.push('');
  };

  if (identified.length > 0) {
    lines.push(`--- IDENTIFIED WEAPONS (${identified.length}) ---`, '');
    identified.forEach((w, i) => renderWeapon(`WEAPON ${i + 1}`, w));
  }

  if (anonymous.length > 0) {
    lines.push(`--- ANONYMOUS GROUPS (${anonymous.length}) ---`, '');
    anonymous.forEach((w, i) => renderWeapon(`GROUP ${String.fromCharCode(65 + i)}`, w));
  }

  return lines.join('\n').trimEnd();
}
