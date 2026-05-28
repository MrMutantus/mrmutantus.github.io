import { useEffect, useMemo, useRef, useState } from 'react';
import type { CartridgeCase, LabReport, ParsedReport, Scenario, ScenarioData, StoredWeapon, Weapon } from './types';
import { loadState, saveState } from './storage';
import { EvidenceTable } from './components/EvidenceTable';
import { EvidenceDetailModal } from './components/EvidenceDetailModal';
import { ImportReportModal } from './components/ImportReportModal';
import { SummaryReportModal } from './components/SummaryReportModal';
import { ReportList } from './components/ReportList';
import { WeaponList } from './components/WeaponList';
import { AddEvidenceModal } from './components/AddEvidenceModal';
import { AddWeaponModal } from './components/AddWeaponModal';
import { ConfirmModal } from './components/ConfirmModal';
import { computeWeapons } from './weapons';
import './App.css';

type Tab = 'weapons' | 'reports' | 'evidence';

const initial = loadState();

export default function App() {
  const [scenarios, setScenarios] = useState<Scenario[]>(initial.scenarios);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(initial.activeScenarioId);
  const [nextCounter, setNextCounter] = useState<number>(initial.nextCounter);

  const [tab, setTab] = useState<Tab>('weapons');
  const [showImport, setShowImport] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showAddEvidence, setShowAddEvidence] = useState(false);
  const [showAddWeapon, setShowAddWeapon] = useState(false);
  const [addHullForWeapon, setAddHullForWeapon] = useState<Weapon | null>(null);
  const [confirmDeleteWeaponId, setConfirmDeleteWeaponId] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
    const unassigned = c.filter(c => !c.weaponId);
    return { cases: c, reports: r, storedWeapons: sw, weapons: w, unassignedCases: unassigned };
  }, [activeScenario]);

  const selectedCase = selectedCaseId ? (cases.find(c => c.id === selectedCaseId) ?? null) : null;

  const persist = (
    newScenarios: Scenario[],
    newActiveId: string | null = activeScenarioId,
    newCounter: number = nextCounter,
  ) => {
    setScenarios(newScenarios);
    setActiveScenarioId(newActiveId);
    setNextCounter(newCounter);
    saveState({ scenarios: newScenarios, activeScenarioId: newActiveId, nextCounter: newCounter });
  };

  const persistActiveData = (data: ScenarioData) => {
    if (!activeScenarioId) return;
    persist(scenarios.map(s => s.id === activeScenarioId ? { ...s, data } : s));
  };

  // Scenario management
  const handleAddScenario = () => {
    const year = new Date().getFullYear();
    const name = `AZ${year}/${String(nextCounter).padStart(3, '0')}`;
    const scenario: Scenario = {
      id: crypto.randomUUID(),
      name,
      data: { cases: [], reports: [], weapons: [] },
      createdAt: new Date().toISOString(),
    };
    persist([...scenarios, scenario], scenario.id, nextCounter + 1);
    setTab('weapons');
  };

  useEffect(() => {
    if (tabScrollRef.current) {
      tabScrollRef.current.scrollTo({ left: tabScrollRef.current.scrollWidth, behavior: 'smooth' });
    }
  }, [scenarios.length]);

  const handleSelectScenario = (id: string) => {
    if (id === activeScenarioId) return;
    setActiveScenarioId(id);
    setSelectedCaseId(null);
    setTab('weapons');
    saveState({ scenarios, activeScenarioId: id, nextCounter });
  };

  const handleStartRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameDraft(currentName);
  };

  const handleRenameCommit = () => {
    if (!renamingId) return;
    const trimmed = renameDraft.trim();
    if (trimmed) {
      persist(scenarios.map(s => s.id === renamingId ? { ...s, name: trimmed } : s));
    }
    setRenamingId(null);
    setRenameDraft('');
  };

  const handleRenameCancel = () => {
    setRenamingId(null);
    setRenameDraft('');
  };

  const handleDeleteRequest = (id: string) => setConfirmDeleteId(id);

  const handleDeleteConfirm = () => {
    if (!confirmDeleteId) return;
    const remaining = scenarios.filter(s => s.id !== confirmDeleteId);
    const newActive = confirmDeleteId === activeScenarioId
      ? (remaining.at(-1)?.id ?? null)
      : activeScenarioId;
    persist(remaining, newActive);
    setConfirmDeleteId(null);
    if (newActive !== activeScenarioId) setTab('weapons');
  };

  // Data handlers
  const handleImport = (reportId: string | undefined, parsed: ParsedReport, rawText: string) => {
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
  };

  const handleAddCase = (newCase: CartridgeCase) => {
    persistActiveData({ cases: [...cases, newCase], reports, weapons: storedWeapons });
  };

  const handleSaveCase = (updated: CartridgeCase) => {
    persistActiveData({ cases: cases.map(c => c.id === updated.id ? updated : c), reports, weapons: storedWeapons });
  };

  const handleDeleteCase = (caseId: string) => {
    persistActiveData({
      cases: cases.filter(c => c.id !== caseId),
      reports: reports.filter(r => r.caseId1 !== caseId && r.caseId2 !== caseId),
      weapons: storedWeapons,
    });
    setSelectedCaseId(null);
  };

  const handleUpdateCaseId = (oldId: string, updated: CartridgeCase) => {
    persistActiveData({
      cases: cases.map(c => c.id === oldId ? updated : c),
      reports: reports.map(r => ({
        ...r,
        caseId1: r.caseId1 === oldId ? updated.id : r.caseId1,
        caseId2: r.caseId2 === oldId ? updated.id : r.caseId2,
      })),
      weapons: storedWeapons,
    });
  };

  const handleAddWeapon = (sw: StoredWeapon) => {
    persistActiveData({ cases, reports, weapons: [...storedWeapons, sw] });
    setShowAddWeapon(false);
  };

  const handleSaveWeapon = (updated: StoredWeapon) => {
    persistActiveData({ cases, reports, weapons: storedWeapons.map(w => w.id === updated.id ? updated : w) });
  };

  const handleDeleteWeapon = (weaponId: string) => {
    const weaponCaseIds = new Set(cases.filter(c => c.weaponId === weaponId).map(c => c.id));
    persistActiveData({
      cases: cases.filter(c => c.weaponId !== weaponId),
      reports: reports.filter(r => !weaponCaseIds.has(r.caseId1) && !weaponCaseIds.has(r.caseId2)),
      weapons: storedWeapons.filter(w => w.id !== weaponId),
    });
    setConfirmDeleteWeaponId(null);
  };

  const handleSaveReportId = (reportInternalId: string, reportId: string | undefined) => {
    persistActiveData({ cases, reports: reports.map(r => r.id === reportInternalId ? { ...r, reportId } : r), weapons: storedWeapons });
  };

  const confirmScenarioName = scenarios.find(s => s.id === confirmDeleteId)?.name ?? '';
  const hasUnassigned = unassignedCases.length > 0;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-title">
          <span className="header-heading">Forensics Tracker <span className="header-version">v{__APP_VERSION__}</span></span>
          <span className="header-sub">Cartridge Case Hulls</span>
        </div>
      </header>

      <div className="scenario-bar">
        <div className="scenario-tabs-scroll" ref={tabScrollRef}>
          {scenarios.map(s => (
            <div
              key={s.id}
              role="tab"
              tabIndex={0}
              className={`scenario-tab${s.id === activeScenarioId ? ' scenario-tab-active' : ''}`}
              onClick={() => handleSelectScenario(s.id)}
              onDoubleClick={() => handleStartRename(s.id, s.name)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleSelectScenario(s.id); }}
            >
              {renamingId === s.id ? (
                <input
                  className="scenario-tab-input"
                  value={renameDraft}
                  autoFocus
                  onChange={e => setRenameDraft(e.target.value)}
                  onKeyDown={e => {
                    e.stopPropagation();
                    if (e.key === 'Enter') handleRenameCommit();
                    if (e.key === 'Escape') handleRenameCancel();
                  }}
                  onBlur={handleRenameCommit}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span className="scenario-tab-name">{s.name}</span>
              )}
              <button
                className="scenario-tab-close"
                title="Delete scenario"
                onClick={e => { e.stopPropagation(); handleDeleteRequest(s.id); }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button className="scenario-add-btn" onClick={handleAddScenario} title="Add scenario">+</button>
        <div className="scenario-bar-actions">
          <button className="btn-secondary" onClick={() => { if (!activeScenario) handleAddScenario(); setShowAddWeapon(true); }}>
            Add Weapon
          </button>
          <button className="btn-secondary" onClick={() => { if (!activeScenario) handleAddScenario(); setShowAddEvidence(true); }}>
            Add Hull
          </button>
          <button className="btn-secondary" onClick={() => { if (!activeScenario) handleAddScenario(); setShowImport(true); }}>
            Add Report
          </button>
          <button className="btn-primary" disabled={!activeScenario} onClick={() => setShowSummary(true)}>
            Generate Report
          </button>
        </div>
      </div>

      {activeScenario ? (
        <div className="app-body">
          <nav className="sidenav">
            <button
              className={`sidenav-item${tab === 'weapons' ? ' sidenav-active' : ''}`}
              onClick={() => setTab('weapons')}
            >
              Weapons ({weapons.length}){hasUnassigned && <span className="sidenav-unlinked-dot" title="Some hulls are unassigned">⚠</span>}
            </button>
            <button
              className={`sidenav-item${tab === 'reports' ? ' sidenav-active' : ''}`}
              onClick={() => setTab('reports')}
            >
              Reports ({reports.length})
            </button>
            <button
              className={`sidenav-item${tab === 'evidence' ? ' sidenav-active' : ''}`}
              onClick={() => setTab('evidence')}
            >
              Hulls ({cases.length})
            </button>
          </nav>
          <main className="app-main">
            {tab === 'weapons' && (
              <>
                <WeaponList
                  weapons={weapons}
                  unassignedCases={unassignedCases}
                  onSaveWeapon={handleSaveWeapon}
                  onAddHull={setAddHullForWeapon}
                  onDeleteWeapon={id => setConfirmDeleteWeaponId(id)}
                />
              </>
            )}
            {tab === 'reports' && <ReportList reports={reports} onSaveReportId={handleSaveReportId} />}
            {tab === 'evidence' && (
              <EvidenceTable cases={cases} reports={reports} weapons={storedWeapons} onSelect={setSelectedCaseId} />
            )}
          </main>
        </div>
      ) : (
        <div className="no-scenario">
          <p className="no-scenario-title">No scenarios yet</p>
          <p className="no-scenario-sub">Create a scenario to get started</p>
          <div className="no-scenario-actions">
            <button className="btn-secondary" onClick={() => { handleAddScenario(); setShowAddWeapon(true); }}>
              Add Weapon
            </button>
            <button className="btn-secondary" onClick={() => { handleAddScenario(); setShowAddEvidence(true); }}>
              Add Hull
            </button>
            <button className="btn-secondary" onClick={() => { handleAddScenario(); setShowImport(true); }}>
              Add Report
            </button>
            <button className="btn-primary" onClick={handleAddScenario}>
              New Scenario
            </button>
          </div>
        </div>
      )}

      {showAddEvidence && (
        <AddEvidenceModal
          cases={cases}
          onAdd={c => { handleAddCase(c); setShowAddEvidence(false); }}
          onClose={() => setShowAddEvidence(false)}
        />
      )}

      {showAddWeapon && (
        <AddWeaponModal
          onAdd={handleAddWeapon}
          onClose={() => setShowAddWeapon(false)}
        />
      )}

      {addHullForWeapon && (
        <AddEvidenceModal
          cases={cases}
          initialWeaponId={addHullForWeapon.id}
          initialWeaponType={addHullForWeapon.weaponType}
          initialSerialNumber={addHullForWeapon.serialNumber}
          onAdd={c => { handleAddCase(c); setAddHullForWeapon(null); }}
          onClose={() => setAddHullForWeapon(null)}
        />
      )}

      {showImport && (
        <ImportReportModal onImport={handleImport} onClose={() => setShowImport(false)} />
      )}

      {showSummary && (
        <SummaryReportModal weapons={weapons} onClose={() => setShowSummary(false)} />
      )}

      {selectedCase && (
        <EvidenceDetailModal
          caseItem={selectedCase}
          cases={cases}
          reports={reports}
          weapons={storedWeapons}
          onSave={handleSaveCase}
          onDelete={() => handleDeleteCase(selectedCase.id)}
          onUpdateId={handleUpdateCaseId}
          onClose={() => setSelectedCaseId(null)}
        />
      )}

      {confirmDeleteId && (
        <ConfirmModal
          message={`Delete scenario "${confirmScenarioName}"? All hulls and reports in this scenario will be permanently lost.`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}

      {confirmDeleteWeaponId && (
        <ConfirmModal
          message="Delete this weapon and all its hulls? Their reports will also be removed. This cannot be undone."
          onConfirm={() => handleDeleteWeapon(confirmDeleteWeaponId)}
          onCancel={() => setConfirmDeleteWeaponId(null)}
        />
      )}

    </div>
  );
}
