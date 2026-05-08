import { useState } from 'react';
import type { CartridgeCase } from '../types';

const CASE_ID_RE = /^#[0-9a-f]{7}$/i;
const SERIAL_RE = /^\d{0,16}$/;

interface Props {
  cases: CartridgeCase[];
  onAdd: (newCase: CartridgeCase) => void;
  onClose: () => void;
}

export function AddEvidenceModal({ cases, onAdd, onClose }: Props) {
  const [id, setId] = useState('');
  const [weaponType, setWeaponType] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [idError, setIdError] = useState('');
  const [serialError, setSerialError] = useState('');

  const handleIdChange = (val: string) => {
    setId(val);
    if (!val) {
      setIdError('');
    } else if (!CASE_ID_RE.test(val)) {
      setIdError('Format: #xxxxxxx (7 hex chars)');
    } else if (cases.find(c => c.id.toLowerCase() === val.toLowerCase())) {
      setIdError('ID already exists');
    } else {
      setIdError('');
    }
  };

  const handleSerialChange = (val: string) => {
    if (!SERIAL_RE.test(val)) return;
    setSerialNumber(val);
    setSerialError(val.length > 0 && val.length < 16 ? `${val.length}/16 digits` : '');
  };

  const isValid = id && !idError && !serialError && !(serialNumber.length > 0 && serialNumber.length !== 16);

  const handleConfirm = () => {
    if (!isValid) return;
    onAdd({
      id: id.toLowerCase(),
      weaponType,
      serialNumber,
      notes,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Evidence</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <label>
            Evidence ID
            <input
              value={id}
              onChange={e => handleIdChange(e.target.value)}
              placeholder="#a4f2871"
              className={idError ? 'input-error' : ''}
              autoFocus
            />
            {idError && <span className="field-error">{idError}</span>}
          </label>

          <label>
            Weapon Type <span className="optional">(optional)</span>
            <input
              value={weaponType}
              onChange={e => setWeaponType(e.target.value)}
              placeholder="e.g. 9x19mm 92fs"
            />
          </label>

          <label>
            Serial Number <span className="optional">(optional)</span>
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
            Notes <span className="optional">(optional)</span>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </label>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleConfirm} disabled={!isValid}>
            Add Evidence
          </button>
        </div>
      </div>
    </div>
  );
}
