export type MatchResult = 'MATCH' | 'NO_MATCH' | 'DIFFERENT_WEAPON';

export interface StoredWeapon {
  id: string;
  weaponType: string;
  serialNumber: string;
  notes: string;
  suspect?: string;
}

// id is a 7-hex-digit string prefixed with `#` (e.g. "#a4f2871"). The 28-bit
// space gives ~16K cases before a 50% birthday collision; collisions are
// silently treated as the same hull, so duplicates inside a scenario are
// considered a user data-entry error rather than something the app guards
// against.
export interface CartridgeCase {
  id: string;
  weaponId?: string;
  weaponType: string;
  serialNumber: string;
  notes: string;
  createdAt: string;
}

export interface LabReport {
  id: string;
  reportId?: string;
  caseId1: string;
  caseId2: string;
  weaponType1: string;
  weaponType2: string;
  result: MatchResult;
  importedAt: string;
  rawText: string;
}

export interface ScenarioData {
  cases: CartridgeCase[];
  reports: LabReport[];
  weapons: StoredWeapon[];
}

export interface Scenario {
  id: string;
  name: string;
  data: ScenarioData;
  createdAt: string;
}

export interface RootState {
  scenarios: Scenario[];
  activeScenarioId: string | null;
  nextCounter: number;
}

export interface Weapon {
  id: string;
  serialNumber: string;
  weaponType: string;
  notes: string;
  suspect?: string;
  cases: CartridgeCase[];
  reports: LabReport[];
}

export interface ParsedReport {
  caseId1: string;
  caseId2: string;
  weaponType1: string;
  weaponType2: string;
  result: MatchResult;
}
