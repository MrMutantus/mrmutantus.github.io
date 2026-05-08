import type { CartridgeCase, LabReport, Weapon } from './types';

export function computeWeapons(cases: CartridgeCase[], reports: LabReport[], weaponNotes: Record<string, string> = {}): Weapon[] {
  const parent = new Map<string, string>();

  const find = (id: string): string => {
    if (!parent.has(id)) parent.set(id, id);
    const p = parent.get(id)!;
    if (p !== id) parent.set(id, find(p));
    return parent.get(id)!;
  };

  const union = (a: string, b: string) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (const c of cases) parent.set(c.id, c.id);

  // Group by shared serial number
  const serialToFirst = new Map<string, string>();
  for (const c of cases) {
    if (c.serialNumber) {
      const existing = serialToFirst.get(c.serialNumber);
      if (existing) union(c.id, existing);
      else serialToFirst.set(c.serialNumber, c.id);
    }
  }

  // Merge on MATCH reports
  for (const r of reports) {
    if (r.result === 'MATCH') union(r.caseId1, r.caseId2);
  }

  // Group cases by root
  const groups = new Map<string, CartridgeCase[]>();
  for (const c of cases) {
    const root = find(c.id);
    const group = groups.get(root);
    if (group) group.push(c);
    else groups.set(root, [c]);
  }

  // Build connected weapon group pairs from NO MATCH reports (direct connections only)
  const connectedPairs = new Map<string, Set<string>>();
  const allRoots = Array.from(groups.keys());
  for (const r of reports) {
    if (r.result !== 'MATCH') {
      const root1 = find(r.caseId1);
      const root2 = find(r.caseId2);
      if (root1 !== root2 && groups.has(root1) && groups.has(root2)) {
        if (!connectedPairs.has(root1)) connectedPairs.set(root1, new Set());
        if (!connectedPairs.has(root2)) connectedPairs.set(root2, new Set());
        connectedPairs.get(root1)!.add(root2);
        connectedPairs.get(root2)!.add(root1);
      }
    }
  }

  return Array.from(groups.entries()).map(([root, groupCases]) => {
    const serialNumber = groupCases.find(c => c.serialNumber)?.serialNumber ?? '';
    const weaponType = groupCases.find(c => c.weaponType)?.weaponType ?? '';
    const caseIds = new Set(groupCases.map(c => c.id));
    const groupReports = reports.filter(r => caseIds.has(r.caseId1) || caseIds.has(r.caseId2));
    const connected = connectedPairs.get(root) ?? new Set<string>();
    const unlinkedEvidence = allRoots
      .filter(r => {
        if (r === root || connected.has(r)) return false;
        const otherType = groups.get(r)!.find(c => c.weaponType)?.weaponType ?? '';
        return !(weaponType && otherType && weaponType !== otherType);
      })
      .map(r => groups.get(r)![0]);
    return { id: root, serialNumber, weaponType, notes: weaponNotes[root] ?? '', cases: groupCases, reports: groupReports, unlinkedEvidence };
  });
}
