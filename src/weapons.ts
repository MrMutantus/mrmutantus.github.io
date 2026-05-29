import type {
  CartridgeCase,
  LabReport,
  ParsedReport,
  ScenarioData,
  StoredWeapon,
  Weapon,
} from './types';

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

function upsertCase(cases: CartridgeCase[], id: string, weaponType: string, now: string): CartridgeCase[] {
  const existing = cases.find(c => c.id === id);
  if (!existing) {
    return [...cases, { id, weaponType, serialNumber: '', notes: '', createdAt: now }];
  }
  if (weaponType && existing.weaponType !== weaponType) {
    return cases.map(c => c.id === id ? { ...c, weaponType } : c);
  }
  return cases;
}

function mergeMatch(
  cases: CartridgeCase[],
  weapons: StoredWeapon[],
  parsed: ParsedReport,
  newWeaponId: string,
): { cases: CartridgeCase[]; weapons: StoredWeapon[] } {
  const c1 = cases.find(c => c.id === parsed.caseId1);
  const c2 = cases.find(c => c.id === parsed.caseId2);
  if (!c1 || !c2) {
    throw new Error('mergeMatch invariant: both cases must exist after upsert');
  }

  const w1 = c1.weaponId;
  const w2 = c2.weaponId;

  if (w1 && w2 && w1 === w2) {
    return { cases, weapons };
  }
  if (w1 && !w2) {
    return { cases: cases.map(c => c.id === c2.id ? { ...c, weaponId: w1 } : c), weapons };
  }
  if (!w1 && w2) {
    return { cases: cases.map(c => c.id === c1.id ? { ...c, weaponId: w2 } : c), weapons };
  }
  if (w1 && w2 && w1 !== w2) {
    return {
      cases: cases.map(c => c.weaponId === w2 ? { ...c, weaponId: w1 } : c),
      weapons: weapons.filter(w => w.id !== w2),
    };
  }
  // Neither case is linked yet: create a single new weapon shared by both.
  const newWeapon: StoredWeapon = {
    id: newWeaponId,
    weaponType: parsed.weaponType1 || parsed.weaponType2,
    serialNumber: '',
    notes: '',
  };
  return {
    cases: cases.map(c => (c.id === c1.id || c.id === c2.id) ? { ...c, weaponId: newWeapon.id } : c),
    weapons: [...weapons, newWeapon],
  };
}

function assignFallbackWeapons(
  cases: CartridgeCase[],
  weapons: StoredWeapon[],
  parsed: ParsedReport,
  uuid: () => string,
): { cases: CartridgeCase[]; weapons: StoredWeapon[] } {
  let nextCases = cases;
  let nextWeapons = weapons;
  for (const [caseId, weaponType] of [
    [parsed.caseId1, parsed.weaponType1],
    [parsed.caseId2, parsed.weaponType2],
  ] as const) {
    const existing = nextCases.find(c => c.id === caseId);
    if (!existing || existing.weaponId) continue;
    const newWeapon: StoredWeapon = { id: uuid(), weaponType, serialNumber: '', notes: '' };
    nextWeapons = [...nextWeapons, newWeapon];
    nextCases = nextCases.map(c => c.id === caseId ? { ...c, weaponId: newWeapon.id } : c);
  }
  return { cases: nextCases, weapons: nextWeapons };
}

export interface ImportContext {
  now: () => string;
  uuid: () => string;
}

const defaultImportContext: ImportContext = {
  now: () => new Date().toISOString(),
  uuid: () => crypto.randomUUID(),
};

export function applyImportToScenarioData(
  data: ScenarioData,
  parsed: ParsedReport,
  rawText: string,
  reportId: string | undefined,
  ctx: ImportContext = defaultImportContext,
): ScenarioData {
  const now = ctx.now();

  let nextCases = upsertCase(data.cases, parsed.caseId1, parsed.weaponType1, now);
  nextCases = upsertCase(nextCases, parsed.caseId2, parsed.weaponType2, now);

  let nextWeapons = data.weapons;

  if (parsed.result === 'MATCH') {
    const merged = mergeMatch(nextCases, nextWeapons, parsed, ctx.uuid());
    nextCases = merged.cases;
    nextWeapons = merged.weapons;
  } else {
    // For NO_MATCH and DIFFERENT_WEAPON the hulls must end up in separate
    // weapons. Any case still without a weaponId gets its own.
    const fallback = assignFallbackWeapons(nextCases, nextWeapons, parsed, ctx.uuid);
    nextCases = fallback.cases;
    nextWeapons = fallback.weapons;
  }

  const newReport: LabReport = {
    id: ctx.uuid(),
    reportId,
    caseId1: parsed.caseId1,
    caseId2: parsed.caseId2,
    weaponType1: parsed.weaponType1,
    weaponType2: parsed.weaponType2,
    result: parsed.result,
    importedAt: now,
    rawText,
  };

  return {
    cases: nextCases,
    reports: [...data.reports, newReport],
    weapons: nextWeapons,
  };
}
