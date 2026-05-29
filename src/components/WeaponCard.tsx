import { memo, useState } from 'react';
import type { StoredWeapon, Weapon } from '../types';
import { useWeaponEdit } from '../hooks/useWeaponEdit';
import { WeaponEditPanel } from './WeaponEditPanel';
import { WeaponHullsSection } from './WeaponHullsSection';
import { WeaponReportsSection } from './WeaponReportsSection';

interface Props {
  weapon: Weapon;
  onSaveWeapon: (updated: StoredWeapon) => void;
  onAddHull: (weapon: Weapon) => void;
  onDeleteWeapon: (weaponId: string) => void;
}

export const WeaponCard = memo(function WeaponCard({ weapon, onSaveWeapon, onAddHull, onDeleteWeapon }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { editingId, draft, setDraft, serialError, startEdit, handleSerialChange, handleSave, handleCancel } =
    useWeaponEdit(onSaveWeapon);
  const isEditing = editingId === weapon.id && draft;

  return (
    <div className="weapon-card">
      <button
        className="weapon-card-header"
        aria-expanded={expanded}
        onClick={() => setExpanded(v => !v)}
      >
        <span className="weapon-serial">
          {weapon.serialNumber
            ? <code className="serial">{weapon.serialNumber}</code>
            : <em className="unknown">No serial number</em>}
        </span>
        <span className="weapon-type">
          {weapon.weaponType || <span className="unknown">Unknown type</span>}
          {weapon.suspect && <em className="weapon-suspect-inline"> — {weapon.suspect}</em>}
        </span>
        <div className="weapon-card-header-actions">
          <button
            className="btn-icon"
            aria-label={`Edit weapon ${weapon.weaponType || weapon.serialNumber || 'unnamed'}`}
            title="Edit weapon"
            onClick={e => startEdit(e, weapon)}
          >
            ✎
          </button>
          <button
            className="btn-icon"
            aria-label={`Delete weapon ${weapon.weaponType || weapon.serialNumber || 'unnamed'}`}
            title="Delete weapon"
            onClick={e => { e.stopPropagation(); onDeleteWeapon(weapon.id); }}
          >
            🗑
          </button>
          <span className="report-card-toggle" aria-hidden="true">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {isEditing && draft && (
        <WeaponEditPanel
          draft={draft}
          serialError={serialError}
          setDraft={setDraft}
          onSerialChange={handleSerialChange}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      {expanded && !isEditing && (
        <>
          {weapon.notes && (
            <div className="weapon-notes-section">
              <label className="weapon-notes-label">Notes</label>
              <p className="weapon-notes-text">{weapon.notes}</p>
            </div>
          )}
          <WeaponHullsSection weapon={weapon} onAddHull={onAddHull} />
          <WeaponReportsSection weapon={weapon} />
        </>
      )}
    </div>
  );
});
