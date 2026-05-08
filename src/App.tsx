import { useEffect, useMemo, useRef, useState } from 'react';
import type { CartridgeCase, LabReport, ParsedReport, Scenario, ScenarioData } from './types';
import { loadState, saveState } from './storage';
import { EvidenceTable } from './components/EvidenceTable';
import { EvidenceDetailModal } from './components/EvidenceDetailModal';
import { ImportReportModal } from './components/ImportReportModal';
import { SummaryReportModal } from './components/SummaryReportModal';
import { ReportList } from './components/ReportList';
import { WeaponList } from './components/WeaponList';
import { AddEvidenceModal } from './components/AddEvidenceModal';
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
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const tabScrollRef = useRef<HTMLDivElement>(null);

  const activeScenario = useMemo(
    () => scenarios.find(s => s.id === activeScenarioId) ?? null,
    [scenarios, activeScenarioId],
  );

  const { cases, reports, weaponNotes, weapons } = useMemo(() => {
    const c = activeScenario?.data.cases ?? [];
    const r = activeScenario?.data.reports ?? [];
    const wn = activeScenario?.data.weaponNotes ?? {};
    return { cases: c, reports: r, weaponNotes: wn, weapons: computeWeapons(c, r, wn) };
  }, [activeScenario]);
  const hasUnlinkedEvidence = weapons.some(w => w.unlinkedEvidence.length > 0);

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
      data: { cases: [], reports: [], weaponNotes: {} },
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

    persistActiveData({ cases: newCases, reports: [...reports, newReport], weaponNotes });
  };

  const handleAddCase = (newCase: CartridgeCase) => {
    persistActiveData({ cases: [...cases, newCase], reports, weaponNotes });
  };

  const handleSaveCase = (updated: CartridgeCase) => {
    persistActiveData({ cases: cases.map(c => c.id === updated.id ? updated : c), reports, weaponNotes });
  };

  const handleSaveWeaponNotes = (weaponId: string, notes: string) => {
    persistActiveData({ cases, reports, weaponNotes: { ...weaponNotes, [weaponId]: notes } });
  };

  const handleSaveWeaponSerial = (weaponId: string, serialNumber: string) => {
    const weapon = weapons.find(w => w.id === weaponId);
    if (!weapon) return;
    const caseIds = new Set(weapon.cases.map(c => c.id));
    persistActiveData({ cases: cases.map(c => caseIds.has(c.id) ? { ...c, serialNumber } : c), reports, weaponNotes });
  };

  const confirmScenarioName = scenarios.find(s => s.id === confirmDeleteId)?.name ?? '';

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-title">
          <span className="header-heading">Forensics Tracker</span>
          <span className="header-sub">Cartridge Case Evidence</span>
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
          <button className="btn-secondary" onClick={() => { if (!activeScenario) handleAddScenario(); setShowAddEvidence(true); }}>
            Add Evidence
          </button>
          <button className="btn-secondary" onClick={() => { if (!activeScenario) handleAddScenario(); setShowImport(true); }}>
            Import Report
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
              Weapons ({weapons.length}){hasUnlinkedEvidence && <span className="sidenav-unlinked-dot" title="Some weapons have unlinked evidence">⚠</span>}
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
              Evidence ({cases.length})
            </button>
          </nav>
          <main className="app-main">
            {tab === 'weapons' && (
              <WeaponList weapons={weapons} onSaveWeaponNotes={handleSaveWeaponNotes} onSaveWeaponSerial={handleSaveWeaponSerial} />
            )}
            {tab === 'reports' && <ReportList reports={reports} />}
            {tab === 'evidence' && (
              <EvidenceTable cases={cases} reports={reports} onSelect={setSelectedCaseId} />
            )}
          </main>
        </div>
      ) : (
        <div className="no-scenario">
          <p className="no-scenario-title">No scenarios yet</p>
          <p className="no-scenario-sub">Create a scenario to get started</p>
          <div className="no-scenario-actions">
            <button className="btn-secondary" onClick={() => { handleAddScenario(); setShowAddEvidence(true); }}>
              Add Evidence
            </button>
            <button className="btn-secondary" onClick={() => { handleAddScenario(); setShowImport(true); }}>
              Import Report
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

      {showImport && (
        <ImportReportModal onImport={handleImport} onClose={() => setShowImport(false)} />
      )}

      {showSummary && (
        <SummaryReportModal weapons={weapons} onClose={() => setShowSummary(false)} />
      )}

      {selectedCase && (
        <EvidenceDetailModal
          caseItem={selectedCase}
          reports={reports}
          onSave={handleSaveCase}
          onClose={() => setSelectedCaseId(null)}
        />
      )}

      {confirmDeleteId && (
        <ConfirmModal
          message={`Delete scenario "${confirmScenarioName}"? All evidence and reports in this scenario will be permanently lost.`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}
