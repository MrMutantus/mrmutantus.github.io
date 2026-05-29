import { memo } from 'react';
import type { CartridgeCase, StoredWeapon, Weapon } from '../types';
import { WeaponCard } from './WeaponCard';
import { UnassignedHullsCard } from './UnassignedHullsCard';

interface Props {
  weapons: Weapon[];
  unassignedCases: CartridgeCase[];
  onSaveWeapon: (updated: StoredWeapon) => void;
  onAddHull: (weapon: Weapon) => void;
  onDeleteWeapon: (weaponId: string) => void;
}

export const WeaponList = memo(function WeaponList({ weapons, unassignedCases, onSaveWeapon, onAddHull, onDeleteWeapon }: Props) {
  if (weapons.length === 0 && unassignedCases.length === 0) {
    return <p className="empty">No weapons identified yet. Import a lab report or add a weapon to get started.</p>;
  }

  return (
    <div className="weapon-list">
      {weapons.map(w => (
        <WeaponCard
          key={w.id}
          weapon={w}
          onSaveWeapon={onSaveWeapon}
          onAddHull={onAddHull}
          onDeleteWeapon={onDeleteWeapon}
        />
      ))}
      <UnassignedHullsCard cases={unassignedCases} />
    </div>
  );
});
