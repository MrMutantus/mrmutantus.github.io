import { useState } from 'react';
import type { StoredWeapon } from '../types';
import knownWeaponTypes from '../weaponTypes.json';

const SERIAL_RE = /^\d{0,16}$/;

interface Props {
  onAdd: (w: StoredWeapon) => void;
  onClose: () => void;
}

export function AddWeaponModal({ onAdd, onClose }: Props) {
  const [weaponType, setWeaponType] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [suspect, setSuspect] = useState('');
  const [serialError, setSerialError] = useState('');

  const handleSerialChange = (val: string) => {
    if (!SERIAL_RE.test(val)) return;
    setSerialNumber(val);
    setSerialError(val.length > 0 && val.length < 16 ? `${val.length}/16 digits` : '');
  };

  const isValid = (weaponType.trim() || serialNumber) && !serialError && !(serialNumber.length > 0 && serialNumber.length !== 16);

  const handleConfirm = () => {
    if (!isValid) return;
    onAdd({
      id: crypto.randomUUID(),
      weaponType: weaponType.trim(),
      serialNumber,
      notes,
      suspect: suspect.trim() || undefined,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Weapon</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <datalist id="weapon-types">
            {knownWeaponTypes.map(t => <option key={t} value={t} />)}
          </datalist>
          <label>
            Weapon Type <span className="optional">(optional)</span>
            <input
              list="weapon-types"
              value={weaponType}
              onChange={e => setWeaponType(e.target.value)}
              placeholder="e.g. 9x19mm 92fs"
              autoFocus
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

          <label>
            Suspect <span className="optional">(optional)</span>
            <input
              value={suspect}
              onChange={e => setSuspect(e.target.value)}
              placeholder="Name of suspect"
            />
          </label>

          <p className="field-hint">At least one of Weapon Type or Serial Number is required.</p>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleConfirm} disabled={!isValid}>
            Add Weapon
          </button>
        </div>
      </div>
    </div>
  );
}
