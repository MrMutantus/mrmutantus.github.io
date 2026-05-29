import { useState } from 'react';
import type { CartridgeCase } from '../types';
import { HEX_ID_PATTERN, SERIAL_PATTERN } from '../patterns';
import knownWeaponTypes from '../weaponTypes.json';

interface Props {
  cases: CartridgeCase[];
  initialWeaponId?: string;
  initialWeaponType?: string;
  initialSerialNumber?: string;
  onAdd: (newCase: CartridgeCase) => void;
  onClose: () => void;
}

export function AddEvidenceModal({ cases, initialWeaponId, initialWeaponType, initialSerialNumber, onAdd, onClose }: Props) {
  const [id, setId] = useState('');
  const [weaponType, setWeaponType] = useState(initialWeaponType ?? '');
  const [serialNumber, setSerialNumber] = useState(initialSerialNumber ?? '');
  const [notes, setNotes] = useState('');
  const [idError, setIdError] = useState('');
  const [serialError, setSerialError] = useState('');

  const handleIdChange = (val: string) => {
    setId(val);
    if (!val) {
      setIdError('');
    } else if (!HEX_ID_PATTERN.test(val)) {
      setIdError('Format: #xxxxxxx (7 hex chars)');
    } else if (cases.find(c => c.id.toLowerCase() === val.toLowerCase())) {
      setIdError('ID already exists');
    } else {
      setIdError('');
    }
  };

  const handleSerialChange = (val: string) => {
    if (!SERIAL_PATTERN.test(val)) return;
    setSerialNumber(val);
    setSerialError(val.length > 0 && val.length < 16 ? `${val.length}/16 digits` : '');
  };

  const isValid = id && !idError && !serialError && !(serialNumber.length > 0 && serialNumber.length !== 16);

  const handleConfirm = () => {
    if (!isValid) return;
    onAdd({
      id: id.toLowerCase(),
      weaponId: initialWeaponId,
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
          <h2>Add Hull</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <label>
            Hull ID
            <input
              value={id}
              onChange={e => handleIdChange(e.target.value)}
              placeholder="#a4f2871"
              className={idError ? 'input-error' : ''}
              autoFocus
            />
            {idError && <span className="field-error">{idError}</span>}
          </label>

          {initialWeaponId ? (
            <>
              <div className="weapon-field-readonly">
                <span className="weapon-field-label">Weapon Type</span>
                <span>{weaponType || <span className="unknown">—</span>}</span>
              </div>
              <div className="weapon-field-readonly">
                <span className="weapon-field-label">Serial Number</span>
                <span>{serialNumber || <span className="unknown">—</span>}</span>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}

          <label>
            Notes <span className="optional">(optional)</span>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </label>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleConfirm} disabled={!isValid}>
            Add Hull
          </button>
        </div>
      </div>
    </div>
  );
}
