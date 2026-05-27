import { useState } from 'react';
import type { CartridgeCase, LabReport, StoredWeapon } from '../types';
import knownWeaponTypes from '../weaponTypes.json';

interface Props {
  caseItem: CartridgeCase;
  cases: CartridgeCase[];
  reports: LabReport[];
  weapons: StoredWeapon[];
  onSave: (updated: CartridgeCase) => void;
  onDelete: () => void;
  onUpdateId: (oldId: string, updated: CartridgeCase) => void;
  onClose: () => void;
}

const SERIAL_RE = /^\d{0,16}$/;
const CASE_ID_RE = /^#[0-9a-f]{7}$/i;

export function EvidenceDetailModal({ caseItem, cases, reports, weapons, onSave, onDelete, onUpdateId, onClose }: Props) {
  const assignedWeapon = caseItem.weaponId ? weapons.find(w => w.id === caseItem.weaponId) : undefined;
  const [weaponType, setWeaponType] = useState(caseItem.weaponType);
  const [serialNumber, setSerialNumber] = useState(caseItem.serialNumber);
  const [notes, setNotes] = useState(caseItem.notes);
  const [serialError, setSerialError] = useState('');
  const [idDraft, setIdDraft] = useState(caseItem.id);
  const [idError, setIdError] = useState('');

  const linked = reports.filter(r => r.caseId1 === caseItem.id || r.caseId2 === caseItem.id);
  const canEditId = linked.length === 0;

  const handleSerialChange = (val: string) => {
    if (!SERIAL_RE.test(val)) return;
    setSerialNumber(val);
    setSerialError(val.length > 0 && val.length < 16 ? `${val.length}/16 digits` : '');
  };

  const handleIdChange = (val: string) => {
    setIdDraft(val);
    const trimmed = val.trim().toLowerCase();
    if (!CASE_ID_RE.test(trimmed)) {
      setIdError('Format: #xxxxxxx (7 hex chars)');
    } else if (trimmed !== caseItem.id && cases.some(c => c.id === trimmed)) {
      setIdError('ID already in use');
    } else {
      setIdError('');
    }
  };

  const handleSave = () => {
    if (serialNumber.length > 0 && serialNumber.length !== 16) {
      setSerialError('Serial number must be exactly 16 digits');
      return;
    }
    if (idError) return;
    const newId = idDraft.trim().toLowerCase();
    if (canEditId && newId !== caseItem.id) {
      onUpdateId(caseItem.id, { ...caseItem, id: newId, weaponType, serialNumber, notes });
      onClose();
      return;
    }
    onSave({ ...caseItem, weaponType, serialNumber, notes });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {canEditId ? (
              <input
                className={`id-edit-input${idError ? ' input-error' : ''}`}
                value={idDraft}
                onChange={e => handleIdChange(e.target.value)}
                spellCheck={false}
              />
            ) : (
              <code>{caseItem.id}</code>
            )}
          </h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {idError && <span className="field-error">{idError}</span>}

          {assignedWeapon && (
            <div className="detail-field">
              <span className="detail-label">Weapon</span>
              <span className="detail-value">
                {assignedWeapon.weaponType || assignedWeapon.serialNumber || <em className="unknown">unnamed</em>}
              </span>
            </div>
          )}

          <datalist id="weapon-types">
            {knownWeaponTypes.map(t => <option key={t} value={t} />)}
          </datalist>
          <label>
            Weapon Type
            <input
              list="weapon-types"
              value={weaponType}
              onChange={e => setWeaponType(e.target.value)}
              placeholder="e.g. 9x19mm 92fs"
            />
          </label>

          <label>
            Serial Number
            <input
              value={serialNumber}
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
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </label>

          {linked.length > 0 && (
            <div className="linked-reports">
              <h3>Linked Reports</h3>
              {linked.map(r => {
                const otherId = r.caseId1 === caseItem.id ? r.caseId2 : r.caseId1;
                return (
                  <div key={r.id} className="linked-report-row">
                    <code>{caseItem.id}</code>
                    <span className="match-arrow">↔</span>
                    <code>{otherId}</code>
                    <span className={`match-badge ${r.result === 'MATCH' ? 'match' : 'no-match'}`}>
                      {r.result === 'MATCH' ? 'MATCH ✓' : r.result === 'DIFFERENT_WEAPON' ? 'DIFFERENT WEAPON ✗' : 'NO MATCH ✗'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {canEditId && (
            <button className="btn-danger modal-footer-left" onClick={onDelete}>Delete</button>
          )}
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={!!idError}>Save</button>
        </div>
      </div>
    </div>
  );
}
