export type MatchResult = 'MATCH' | 'NO_MATCH' | 'DIFFERENT_WEAPON';

export interface CartridgeCase {
  id: string;
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
  weaponNotes: Record<string, string>;
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
  cases: CartridgeCase[];
  reports: LabReport[];
  unlinkedEvidence: CartridgeCase[];
}

export interface ParsedReport {
  caseId1: string;
  caseId2: string;
  weaponType1: string;
  weaponType2: string;
  result: MatchResult;
}
