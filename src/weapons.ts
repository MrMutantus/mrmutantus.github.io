import type { CartridgeCase, LabReport, StoredWeapon, Weapon } from './types';

export function computeWeapons(
  storedWeapons: StoredWeapon[],
  cases: CartridgeCase[],
  reports: LabReport[],
): Weapon[] {
  return storedWeapons.map(sw => {
    const weaponCases = cases.filter(c => c.weaponId === sw.id);
    const caseIds = new Set(weaponCases.map(c => c.id));
    const weaponReports = reports.filter(r => caseIds.has(r.caseId1) || caseIds.has(r.caseId2));
    return {
      id: sw.id,
      weaponType: sw.weaponType,
      serialNumber: sw.serialNumber,
      notes: sw.notes,
      suspect: sw.suspect,
      cases: weaponCases,
      reports: weaponReports,
    };
  });
}
