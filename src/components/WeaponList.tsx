import { useState } from 'react';
import type { CartridgeCase, StoredWeapon, Weapon } from '../types';
import knownWeaponTypes from '../weaponTypes.json';

interface Props {
  weapons: Weapon[];
  unassignedCases: CartridgeCase[];
  onSaveWeapon: (updated: StoredWeapon) => void;
  onAddHull: (weapon: Weapon) => void;
  onDeleteWeapon: (weaponId: string) => void;
}

const SERIAL_RE = /^\d{0,16}$/;

export function WeaponList({ weapons, unassignedCases, onSaveWeapon, onAddHull, onDeleteWeapon }: Props) {
  const [expandedWeapons, setExpandedWeapons] = useState<Set<string>>(new Set());
  const [expandedEvidence, setExpandedEvidence] = useState<Set<string>>(new Set());
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<StoredWeapon | null>(null);
  const [serialError, setSerialError] = useState('');

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  const startEdit = (e: React.MouseEvent, w: Weapon) => {
    e.stopPropagation();
    setEditingId(w.id);
    setDraft({ id: w.id, weaponType: w.weaponType, serialNumber: w.serialNumber, notes: w.notes, suspect: w.suspect ?? '' });
    setSerialError('');
  };

  const handleSerialChange = (val: string) => {
    if (!SERIAL_RE.test(val)) return;
    setDraft(d => d ? { ...d, serialNumber: val } : d);
    setSerialError(val.length > 0 && val.length < 16 ? `${val.length}/16 digits` : '');
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!draft) return;
    if (draft.serialNumber.length > 0 && draft.serialNumber.length !== 16) {
      setSerialError('Serial number must be exactly 16 digits');
      return;
    }
    onSaveWeapon(draft);
    setEditingId(null);
    setDraft(null);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setDraft(null);
    setSerialError('');
  };

  if (weapons.length === 0 && unassignedCases.length === 0) {
    return <p className="empty">No weapons identified yet. Import a lab report or add a weapon to get started.</p>;
  }

  return (
    <div className="weapon-list">
      {weapons.map(w => (
        <div key={w.id} className="weapon-card">
          <button
            className="weapon-card-header"
            onClick={() => toggle(expandedWeapons, setExpandedWeapons, w.id)}
          >
            <span className="weapon-serial">
              {w.serialNumber
                ? <code className="serial">{w.serialNumber}</code>
                : <em className="unknown">No serial number</em>}
            </span>
            <span className="weapon-type">
              {w.weaponType || <span className="unknown">Unknown type</span>}
              {w.suspect && <em className="weapon-suspect-inline"> — {w.suspect}</em>}
            </span>
            <div className="weapon-card-header-actions">
              <button
                className="btn-icon"
                title="Edit weapon"
                onClick={e => startEdit(e, w)}
              >
                ✎
              </button>
              <button
                className="btn-icon"
                title="Delete weapon"
                onClick={e => { e.stopPropagation(); onDeleteWeapon(w.id); }}
              >
                🗑
              </button>
              <span className="report-card-toggle">{expandedWeapons.has(w.id) ? '▲' : '▼'}</span>
            </div>
          </button>

          {editingId === w.id && draft && (
            <div className="weapon-edit-panel" onClick={e => e.stopPropagation()}>
              <datalist id="weapon-types">
                {knownWeaponTypes.map(t => <option key={t} value={t} />)}
              </datalist>
              <label>
                Weapon Type
                <input
                  list="weapon-types"
                  value={draft.weaponType}
                  onChange={e => setDraft(d => d ? { ...d, weaponType: e.target.value } : d)}
                  placeholder="e.g. 9x19mm 92fs"
                  autoFocus
                />
              </label>
              <label>
                Serial Number
                <input
                  value={draft.serialNumber}
                  onChange={e => handleSerialChange(e.target.value)}
                  placeholder="0000000000000000"
                  inputMode="numeric"
                  maxLength={16}
                  className={serialError ? 'input-error' : ''}
                />
                {serialError && <span className="field-error">{serialError}</span>}
              </label>
              <label>
                Notes
                <textarea
                  value={draft.notes}
                  onChange={e => setDraft(d => d ? { ...d, notes: e.target.value } : d)}
                  rows={3}
                />
              </label>
              <label>
                Suspect
                <input
                  value={draft.suspect ?? ''}
                  onChange={e => setDraft(d => d ? { ...d, suspect: e.target.value } : d)}
                  placeholder="Name of suspect"
                />
              </label>
              <div className="weapon-edit-actions">
                <button className="btn-primary btn-sm" onClick={handleSave}>Save</button>
                <button className="btn-secondary btn-sm" onClick={handleCancel}>Cancel</button>
              </div>
            </div>
          )}

          {expandedWeapons.has(w.id) && editingId !== w.id && (
            <>
              {w.notes && (
                <div className="weapon-notes-section">
                  <label className="weapon-notes-label">Notes</label>
                  <p className="weapon-notes-text">{w.notes}</p>
                </div>
              )}

              <div className="weapon-section">
                <button
                  className="weapon-section-toggle"
                  onClick={() => toggle(expandedEvidence, setExpandedEvidence, w.id)}
                >
                  <span>Hulls ({w.cases.length})</span>
                  <span className="report-card-toggle">{expandedEvidence.has(w.id) ? '▲' : '▼'}</span>
                </button>
                {expandedEvidence.has(w.id) && (
                  <>
                    {w.cases.length === 0
                      ? <p className="weapon-empty-section">No hulls assigned yet.</p>
                      : (
                        <table className="weapon-inner-table">
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {w.cases.map(c => (
                              <tr key={c.id}>
                                <td><code>{c.id}</code></td>
                                <td>{c.notes || <span className="unknown">—</span>}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )
                    }
                    <div className="weapon-add-hull-action">
                      <button className="btn-secondary btn-sm" onClick={() => onAddHull(w)}>Add Hull</button>
                    </div>
                  </>
                )}
              </div>

              <div className="weapon-section">
                <button
                  className="weapon-section-toggle"
                  onClick={() => toggle(expandedReports, setExpandedReports, w.id)}
                >
                  <span>Reports ({w.reports.length})</span>
                  <span className="report-card-toggle">{expandedReports.has(w.id) ? '▲' : '▼'}</span>
                </button>
                {expandedReports.has(w.id) && (
                  <div className="weapon-report-rows">
                    {w.reports.length === 0
                      ? <p className="weapon-empty-section">No reports for this weapon.</p>
                      : w.reports.map(r => (
                        <div key={r.id} className="linked-report-row">
                          <span className="weapon-report-id">
                            {r.reportId ? <code>{r.reportId}</code> : <em className="unknown">— No ID —</em>}
                          </span>
                          <code>{r.caseId1}</code>
                          <span className="match-arrow">↔</span>
                          <code>{r.caseId2}</code>
                          <span className={`match-badge ${r.result === 'MATCH' ? 'match' : 'no-match'}`}>
                            {r.result === 'MATCH' ? 'MATCH ✓' : r.result === 'DIFFERENT_WEAPON' ? 'DIFFERENT WEAPON ✗' : 'NO MATCH ✗'}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ))}

      {unassignedCases.length > 0 && (
        <div className="weapon-card weapon-card-unassigned">
          <div className="weapon-card-header weapon-card-header-unassigned">
            <span className="weapon-type">
              <span className="unknown">Unassigned Hulls</span>
            </span>
            <span className="unlinked-badge" title="These hulls are not assigned to any weapon">⚠</span>
          </div>
          <table className="weapon-inner-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {unassignedCases.map(c => (
                <tr key={c.id}>
                  <td><code>{c.id}</code></td>
                  <td>{c.weaponType || <span className="unknown">—</span>}</td>
                  <td>{c.notes || <span className="unknown">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
