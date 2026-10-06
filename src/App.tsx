import { useCallback, useState } from 'react';
import type { StoredWeapon, Weapon } from './types';
import { useForensicsData } from './hooks/useForensicsData';
import { EvidenceTable } from './components/EvidenceTable';
import { EvidenceDetailModal } from './components/EvidenceDetailModal';
import { ImportReportModal } from './components/ImportReportModal';
import { SummaryReportModal } from './components/SummaryReportModal';
import { ReportList } from './components/ReportList';
import { WeaponList } from './components/WeaponList';
import { AddEvidenceModal } from './components/AddEvidenceModal';
import { AddWeaponModal } from './components/AddWeaponModal';
import { ConfirmModal } from './components/ConfirmModal';
import './App.css';

type Tab = 'weapons' | 'reports' | 'evidence';

export default function App() {
  const {
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
  } = useForensicsData();

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

  const selectedCase = selectedCaseId ? (cases.find(c => c.id === selectedCaseId) ?? null) : null;

  const handleAddScenario = useCallback(() => {
    addScenario();
    setTab('weapons');
  }, [addScenario]);

  const handleSelectScenario = useCallback((id: string) => {
    selectScenario(id);
    setSelectedCaseId(null);
    setTab('weapons');
  }, [selectScenario]);

  const handleStartRename = useCallback((id: string, currentName: string) => {
    setRenamingId(id);
    setRenameDraft(currentName);
  }, []);

  const handleRenameCommit = useCallback(() => {
    if (!renamingId) return;
    const trimmed = renameDraft.trim();
    if (trimmed) renameScenario(renamingId, trimmed);
    setRenamingId(null);
    setRenameDraft('');
  }, [renameDraft, renamingId, renameScenario]);

  const handleRenameCancel = useCallback(() => {
    setRenamingId(null);
    setRenameDraft('');
  }, []);

  const handleDeleteRequest = useCallback((id: string) => setConfirmDeleteId(id), []);

  const handleDeleteConfirm = useCallback(() => {
    if (!confirmDeleteId) return;
    const { newActiveId } = deleteScenario(confirmDeleteId);
    setConfirmDeleteId(null);
    if (newActiveId !== activeScenarioId) setTab('weapons');
  }, [activeScenarioId, confirmDeleteId, deleteScenario]);

  const handleDeleteCase = useCallback((id: string) => {
    deleteCase(id);
    setSelectedCaseId(null);
  }, [deleteCase]);

  const handleAddWeapon = useCallback((sw: StoredWeapon) => {
    addWeapon(sw);
    setShowAddWeapon(false);
  }, [addWeapon]);

  const handleRequestDeleteWeapon = useCallback((id: string) => setConfirmDeleteWeaponId(id), []);

  const handleConfirmDeleteWeapon = useCallback(() => {
    if (!confirmDeleteWeaponId) return;
    deleteWeapon(confirmDeleteWeaponId);
    setConfirmDeleteWeaponId(null);
  }, [confirmDeleteWeaponId, deleteWeapon]);

  const handleAddCaseAndClose = useCallback((newCase: Parameters<typeof addCase>[0]) => {
    addCase(newCase);
    setShowAddEvidence(false);
  }, [addCase]);

  const handleAddCaseForWeapon = useCallback((newCase: Parameters<typeof addCase>[0]) => {
    addCase(newCase);
    setAddHullForWeapon(null);
  }, [addCase]);

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
        <div role="tablist" aria-label="Scenarios" className="scenario-tabs-scroll" ref={tabScrollRef}>
          {scenarios.map(s => {
            const isActive = s.id === activeScenarioId;
            return (
              <div
                key={s.id}
                role="tab"
                tabIndex={isActive ? 0 : -1}
                aria-selected={isActive}
                className={`scenario-tab${isActive ? ' scenario-tab-active' : ''}`}
                onClick={() => handleSelectScenario(s.id)}
                onDoubleClick={() => handleStartRename(s.id, s.name)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleSelectScenario(s.id); }}
              >
                {renamingId === s.id ? (
                  <input
                    className="scenario-tab-input"
                    value={renameDraft}
                    autoFocus
                    aria-label="Rename scenario"
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
                  aria-label={`Delete scenario ${s.name}`}
                  title="Delete scenario"
                  onClick={e => { e.stopPropagation(); handleDeleteRequest(s.id); }}
                >
                  ×
                </button>
              </div>
            );
          })}
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
              <WeaponList
                weapons={weapons}
                unassignedCases={unassignedCases}
                reports={reports}
                onSaveWeapon={saveWeapon}
                onAddHull={setAddHullForWeapon}
                onDeleteWeapon={handleRequestDeleteWeapon}
              />
            )}
            {tab === 'reports' && <ReportList reports={reports} onSaveReportId={saveReportId} />}
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
          onAdd={handleAddCaseAndClose}
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
          onAdd={handleAddCaseForWeapon}
          onClose={() => setAddHullForWeapon(null)}
        />
      )}

      {showImport && (
        <ImportReportModal onImport={importReport} onClose={() => setShowImport(false)} />
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
          onSave={saveCase}
          onDelete={() => handleDeleteCase(selectedCase.id)}
          onUpdateId={updateCaseId}
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
          onConfirm={handleConfirmDeleteWeapon}
          onCancel={() => setConfirmDeleteWeaponId(null)}
        />
      )}

    </div>
  );
}
