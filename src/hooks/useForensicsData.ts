import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CartridgeCase, LabReport, ParsedReport, Scenario, ScenarioData, StoredWeapon } from '../types';
import { loadState, saveState } from '../storage';
import { computeWeapons } from '../weapons';

export function useForensicsData() {
  const [scenarios, setScenarios] = useState<Scenario[]>(() => loadState().scenarios);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(() => loadState().activeScenarioId);
  const [nextCounter, setNextCounter] = useState<number>(() => loadState().nextCounter);

  const tabScrollRef = useRef<HTMLDivElement>(null);

  const activeScenario = useMemo(
    () => scenarios.find(s => s.id === activeScenarioId) ?? null,
    [scenarios, activeScenarioId],
  );

  const { cases, reports, storedWeapons, weapons, unassignedCases } = useMemo(() => {
    const c = activeScenario?.data.cases ?? [];
    const r = activeScenario?.data.reports ?? [];
    const sw = activeScenario?.data.weapons ?? [];
    const w = computeWeapons(sw, c, r);
    const unassigned = c.filter(hull => !hull.weaponId);
    return { cases: c, reports: r, storedWeapons: sw, weapons: w, unassignedCases: unassigned };
  }, [activeScenario]);

  useEffect(() => {
    if (tabScrollRef.current) {
      tabScrollRef.current.scrollTo({ left: tabScrollRef.current.scrollWidth, behavior: 'smooth' });
    }
  }, [scenarios.length]);

  const persist = useCallback((
    newScenarios: Scenario[],
    newActiveId: string | null = activeScenarioId,
    newCounter: number = nextCounter,
  ) => {
    setScenarios(newScenarios);
    setActiveScenarioId(newActiveId);
    setNextCounter(newCounter);
    saveState({ scenarios: newScenarios, activeScenarioId: newActiveId, nextCounter: newCounter });
  }, [activeScenarioId, nextCounter]);

  const persistActiveData = useCallback((data: ScenarioData) => {
    if (!activeScenarioId) return;
    persist(scenarios.map(s => s.id === activeScenarioId ? { ...s, data } : s));
  }, [activeScenarioId, persist, scenarios]);

  const addScenario = useCallback((): Scenario => {
    const year = new Date().getFullYear();
    const name = `AZ${year}/${String(nextCounter).padStart(3, '0')}`;
    const scenario: Scenario = {
      id: crypto.randomUUID(),
      name,
      data: { cases: [], reports: [], weapons: [] },
      createdAt: new Date().toISOString(),
    };
    persist([...scenarios, scenario], scenario.id, nextCounter + 1);
    return scenario;
  }, [nextCounter, persist, scenarios]);

  const selectScenario = useCallback((id: string) => {
    if (id === activeScenarioId) return;
    setActiveScenarioId(id);
    saveState({ scenarios, activeScenarioId: id, nextCounter });
  }, [activeScenarioId, nextCounter, scenarios]);

  const renameScenario = useCallback((id: string, name: string) => {
    persist(scenarios.map(s => s.id === id ? { ...s, name } : s));
  }, [persist, scenarios]);

  const deleteScenario = useCallback((id: string): { newActiveId: string | null } => {
    const remaining = scenarios.filter(s => s.id !== id);
    const newActiveId = id === activeScenarioId
      ? (remaining.at(-1)?.id ?? null)
      : activeScenarioId;
    persist(remaining, newActiveId);
    return { newActiveId };
  }, [activeScenarioId, persist, scenarios]);

  const importReport = useCallback((reportId: string | undefined, parsed: ParsedReport, rawText: string) => {
    let newCases = [...cases];
    let newWeapons = [...storedWeapons];

    const upsert = (id: string, weaponType: string) => {
      const existing = newCases.find(c => c.id === id);
      if (!existing) {
        newCases.push({ id, weaponType, serialNumber: '', notes: '', createdAt: new Date().toISOString() });
      } else if (weaponType && existing.weaponType !== weaponType) {
        newCases = newCases.map(c => c.id === id ? { ...c, weaponType } : c);
      }
    };

    upsert(parsed.caseId1, parsed.weaponType1);
    upsert(parsed.caseId2, parsed.weaponType2);

    const newReport: LabReport = {
      id: crypto.randomUUID(),
      reportId,
      caseId1: parsed.caseId1,
      caseId2: parsed.caseId2,
      weaponType1: parsed.weaponType1,
      weaponType2: parsed.weaponType2,
      result: parsed.result,
      importedAt: new Date().toISOString(),
      rawText,
    };

    if (parsed.result === 'MATCH') {
      const c1 = newCases.find(c => c.id === parsed.caseId1)!;
      const c2 = newCases.find(c => c.id === parsed.caseId2)!;
      const w1 = c1.weaponId, w2 = c2.weaponId;
      if (w1 && !w2) {
        newCases = newCases.map(c => c.id === c2.id ? { ...c, weaponId: w1 } : c);
      } else if (!w1 && w2) {
        newCases = newCases.map(c => c.id === c1.id ? { ...c, weaponId: w2 } : c);
      } else if (w1 && w2 && w1 !== w2) {
        newCases = newCases.map(c => c.weaponId === w2 ? { ...c, weaponId: w1 } : c);
        newWeapons = newWeapons.filter(w => w.id !== w2);
      } else if (!w1 && !w2) {
        const newWeapon: StoredWeapon = {
          id: crypto.randomUUID(),
          weaponType: parsed.weaponType1 || parsed.weaponType2,
          serialNumber: '',
          notes: '',
        };
        newWeapons = [...newWeapons, newWeapon];
        newCases = newCases.map(c =>
          c.id === c1.id || c.id === c2.id ? { ...c, weaponId: newWeapon.id } : c,
        );
      }
    }

    for (const [caseId, weaponType] of [
      [parsed.caseId1, parsed.weaponType1],
      [parsed.caseId2, parsed.weaponType2],
    ] as [string, string][]) {
      if (!newCases.find(c => c.id === caseId)?.weaponId) {
        const newWeapon: StoredWeapon = {
          id: crypto.randomUUID(),
          weaponType,
          serialNumber: '',
          notes: '',
        };
        newWeapons = [...newWeapons, newWeapon];
        newCases = newCases.map(c => c.id === caseId ? { ...c, weaponId: newWeapon.id } : c);
      }
    }

    persistActiveData({ cases: newCases, reports: [...reports, newReport], weapons: newWeapons });
  }, [cases, persistActiveData, reports, storedWeapons]);

  const addCase = useCallback((newCase: CartridgeCase) => {
    persistActiveData({ cases: [...cases, newCase], reports, weapons: storedWeapons });
  }, [cases, persistActiveData, reports, storedWeapons]);

  const saveCase = useCallback((updated: CartridgeCase) => {
    persistActiveData({ cases: cases.map(c => c.id === updated.id ? updated : c), reports, weapons: storedWeapons });
  }, [cases, persistActiveData, reports, storedWeapons]);

  const deleteCase = useCallback((caseId: string) => {
    persistActiveData({
      cases: cases.filter(c => c.id !== caseId),
      reports: reports.filter(r => r.caseId1 !== caseId && r.caseId2 !== caseId),
      weapons: storedWeapons,
    });
  }, [cases, persistActiveData, reports, storedWeapons]);

  const updateCaseId = useCallback((oldId: string, updated: CartridgeCase) => {
    persistActiveData({
      cases: cases.map(c => c.id === oldId ? updated : c),
      reports: reports.map(r => ({
        ...r,
        caseId1: r.caseId1 === oldId ? updated.id : r.caseId1,
        caseId2: r.caseId2 === oldId ? updated.id : r.caseId2,
      })),
      weapons: storedWeapons,
    });
  }, [cases, persistActiveData, reports, storedWeapons]);

  const addWeapon = useCallback((sw: StoredWeapon) => {
    persistActiveData({ cases, reports, weapons: [...storedWeapons, sw] });
  }, [cases, persistActiveData, reports, storedWeapons]);

  const saveWeapon = useCallback((updated: StoredWeapon) => {
    persistActiveData({ cases, reports, weapons: storedWeapons.map(w => w.id === updated.id ? updated : w) });
  }, [cases, persistActiveData, reports, storedWeapons]);

  const deleteWeapon = useCallback((weaponId: string) => {
    const weaponCaseIds = new Set(cases.filter(c => c.weaponId === weaponId).map(c => c.id));
    persistActiveData({
      cases: cases.filter(c => c.weaponId !== weaponId),
      reports: reports.filter(r => !weaponCaseIds.has(r.caseId1) && !weaponCaseIds.has(r.caseId2)),
      weapons: storedWeapons.filter(w => w.id !== weaponId),
    });
  }, [cases, persistActiveData, reports, storedWeapons]);

  const saveReportId = useCallback((reportInternalId: string, reportId: string | undefined) => {
    persistActiveData({ cases, reports: reports.map(r => r.id === reportInternalId ? { ...r, reportId } : r), weapons: storedWeapons });
  }, [cases, persistActiveData, reports, storedWeapons]);

  return {
    scenarios,
    activeScenarioId,
    activeScenario,
    tabScrollRef,
    cases,
    reports,
    storedWeapons,
    weapons,
    unassignedCases,
    addScenario,
    selectScenario,
    renameScenario,
    deleteScenario,
    importReport,
    addCase,
    saveCase,
    deleteCase,
    updateCaseId,
    addWeapon,
    saveWeapon,
    deleteWeapon,
    saveReportId,
  };
}
