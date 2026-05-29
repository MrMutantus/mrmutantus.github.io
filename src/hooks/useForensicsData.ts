import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CartridgeCase, ParsedReport, Scenario, ScenarioData, StoredWeapon } from '../types';
import { loadState, saveState } from '../storage';
import { applyImportToScenarioData, computeWeapons } from '../weapons';

const initial = loadState();

export function useForensicsData() {
  const [scenarios, setScenarios] = useState<Scenario[]>(initial.state.scenarios);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(initial.state.activeScenarioId);
  const [nextCounter, setNextCounter] = useState<number>(initial.state.nextCounter);

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
    const next = applyImportToScenarioData(
      { cases, reports, weapons: storedWeapons },
      parsed,
      rawText,
      reportId,
    );
    persistActiveData(next);
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
