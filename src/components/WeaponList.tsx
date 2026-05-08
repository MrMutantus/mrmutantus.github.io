import { useState } from 'react';
import type { Weapon } from '../types';

interface Props {
  weapons: Weapon[];
  onSaveWeaponNotes: (weaponId: string, notes: string) => void;
  onSaveWeaponSerial: (weaponId: string, serialNumber: string) => void;
}

const SERIAL_RE = /^\d{0,16}$/;

export function WeaponList({ weapons, onSaveWeaponNotes, onSaveWeaponSerial }: Props) {
  const [expandedWeapons, setExpandedWeapons] = useState<Set<string>>(new Set());
  const [expandedEvidence, setExpandedEvidence] = useState<Set<string>>(new Set());
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  const [expandedUnlinked, setExpandedUnlinked] = useState<Set<string>>(new Set());

  const [editingSerialId, setEditingSerialId] = useState<string | null>(null);
  const [serialDraft, setSerialDraft] = useState('');
  const [serialError, setSerialError] = useState('');

  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  const startEditSerial = (e: React.MouseEvent, w: Weapon) => {
    e.stopPropagation();
    setEditingSerialId(w.id);
    setSerialDraft(w.serialNumber);
    setSerialError('');
  };

  const handleSerialChange = (val: string) => {
    if (!SERIAL_RE.test(val)) return;
    setSerialDraft(val);
    setSerialError(val.length > 0 && val.length < 16 ? `${val.length}/16 digits` : '');
  };

  const handleSerialSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (serialDraft.length > 0 && serialDraft.length !== 16) {
      setSerialError('Serial number must be exactly 16 digits');
      return;
    }
    onSaveWeaponSerial(editingSerialId!, serialDraft);
    setEditingSerialId(null);
  };

  const handleSerialCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSerialId(null);
  };

  const getNoteDraft = (w: Weapon) =>
    noteDrafts[w.id] !== undefined ? noteDrafts[w.id] : w.notes;

  const handleNoteChange = (weaponId: string, val: string) => {
    setNoteDrafts(prev => ({ ...prev, [weaponId]: val }));
  };

  const handleNoteSave = (w: Weapon) => {
    const draft = getNoteDraft(w);
    onSaveWeaponNotes(w.id, draft);
    setNoteDrafts(prev => {
      const next = { ...prev };
      delete next[w.id];
      return next;
    });
  };

  if (weapons.length === 0) {
    return <p className="empty">No weapons identified yet. Import a lab report to get started.</p>;
  }

  return (
    <div className="weapon-list">
      {weapons.map(w => {
        const noteDraft = getNoteDraft(w);
        const noteDirty = noteDraft !== w.notes;

        return (
          <div key={w.id} className="weapon-card">
            <button
              className="weapon-card-header"
              onClick={() => toggle(expandedWeapons, setExpandedWeapons, w.id)}
            >
              <span className="weapon-serial">
                {editingSerialId === w.id ? (
                  <span className="weapon-serial-edit" onClick={e => e.stopPropagation()}>
                    <input
                      value={serialDraft}
                      onChange={e => handleSerialChange(e.target.value)}
                      placeholder="0000000000000000"
                      inputMode="numeric"
                      maxLength={16}
                      className={serialError ? 'input-error' : ''}
                      autoFocus
                    />
                    {serialError && <span className="field-error">{serialError}</span>}
                    <span className="weapon-serial-actions">
                      <button className="btn-primary btn-sm" onClick={handleSerialSave}>Save</button>
                      <button className="btn-secondary btn-sm" onClick={handleSerialCancel}>Cancel</button>
                    </span>
                  </span>
                ) : (
                  <>
                    {w.serialNumber
                      ? <code className="serial">{w.serialNumber}</code>
                      : <em className="unknown">No serial number</em>}
                    <button
                      className="btn-icon"
                      title="Edit serial number"
                      onClick={e => startEditSerial(e, w)}
                    >
                      ✎
                    </button>
                  </>
                )}
              </span>
              <span className="weapon-type">{w.weaponType || <span className="unknown">Unknown type</span>}</span>
              {w.unlinkedEvidence.length > 0 && (
                <span className="unlinked-badge" title={`${w.unlinkedEvidence.length} unlinked evidence group(s)`}>⚠</span>
              )}
              <span className="report-card-toggle">{expandedWeapons.has(w.id) ? '▲' : '▼'}</span>
            </button>

            {expandedWeapons.has(w.id) && (
              <>
                <div className="weapon-notes-section">
                  <label className="weapon-notes-label">Notes</label>
                  <textarea
                    className="weapon-notes-textarea"
                    value={noteDraft}
                    onChange={e => handleNoteChange(w.id, e.target.value)}
                    rows={3}
                    placeholder="Add notes or further information about this weapon…"
                  />
                  {noteDirty && (
                    <div className="weapon-notes-footer">
                      <button className="btn-primary btn-sm" onClick={() => handleNoteSave(w)}>
                        Save Notes
                      </button>
                    </div>
                  )}
                </div>

                <div className="weapon-section">
                  <button
                    className="weapon-section-toggle"
                    onClick={() => toggle(expandedEvidence, setExpandedEvidence, w.id)}
                  >
                    <span>Evidence ({w.cases.length})</span>
                    <span className="report-card-toggle">{expandedEvidence.has(w.id) ? '▲' : '▼'}</span>
                  </button>
                  {expandedEvidence.has(w.id) && (
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

                <div className="weapon-section weapon-section-unlinked">
                  <button
                    className="weapon-section-toggle"
                    onClick={() => toggle(expandedUnlinked, setExpandedUnlinked, w.id)}
                  >
                    <span>Unlinked Evidence ({w.unlinkedEvidence.length})</span>
                    <span className="report-card-toggle">{expandedUnlinked.has(w.id) ? '▲' : '▼'}</span>
                  </button>
                  {expandedUnlinked.has(w.id) && (
                    w.unlinkedEvidence.length === 0
                      ? <p className="weapon-empty-section">All evidence connected.</p>
                      : (
                        <table className="weapon-inner-table">
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {w.unlinkedEvidence.map(c => (
                              <tr key={c.id}>
                                <td><code>{c.id}</code></td>
                                <td>{c.notes || <span className="unknown">—</span>}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
