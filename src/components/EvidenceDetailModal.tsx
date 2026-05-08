import { useState } from 'react';
import type { CartridgeCase, LabReport } from '../types';

interface Props {
  caseItem: CartridgeCase;
  reports: LabReport[];
  onSave: (updated: CartridgeCase) => void;
  onClose: () => void;
}

const SERIAL_RE = /^\d{0,16}$/;

export function EvidenceDetailModal({ caseItem, reports, onSave, onClose }: Props) {
  const [weaponType, setWeaponType] = useState(caseItem.weaponType);
  const [serialNumber, setSerialNumber] = useState(caseItem.serialNumber);
  const [notes, setNotes] = useState(caseItem.notes);
  const [serialError, setSerialError] = useState('');

  const linked = reports.filter(r => r.caseId1 === caseItem.id || r.caseId2 === caseItem.id);

  const handleSerialChange = (val: string) => {
    if (!SERIAL_RE.test(val)) return;
    setSerialNumber(val);
    setSerialError(val.length > 0 && val.length < 16 ? `${val.length}/16 digits` : '');
  };

  const handleSave = () => {
    if (serialNumber.length > 0 && serialNumber.length !== 16) {
      setSerialError('Serial number must be exactly 16 digits');
      return;
    }
    onSave({ ...caseItem, weaponType, serialNumber, notes });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2><code>{caseItem.id}</code></h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <label>
            Weapon Type
            <input
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
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
