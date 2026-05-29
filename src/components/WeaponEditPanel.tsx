import type { StoredWeapon } from '../types';
import knownWeaponTypes from '../weaponTypes.json';

interface Props {
  draft: StoredWeapon;
  serialError: string;
  setDraft: (updater: (d: StoredWeapon | null) => StoredWeapon | null) => void;
  onSerialChange: (val: string) => void;
  onSave: (e: React.MouseEvent) => void;
  onCancel: (e: React.MouseEvent) => void;
}

export function WeaponEditPanel({ draft, serialError, setDraft, onSerialChange, onSave, onCancel }: Props) {
  return (
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
          onChange={e => onSerialChange(e.target.value)}
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
        <button className="btn-primary btn-sm" onClick={onSave}>Save</button>
        <button className="btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
