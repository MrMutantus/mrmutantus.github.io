import { memo } from 'react';
import type { CartridgeCase, LabReport, StoredWeapon, Weapon } from '../types';
import { WeaponCard } from './WeaponCard';
import { UnassignedHullsCard } from './UnassignedHullsCard';

interface Props {
  weapons: Weapon[];
  unassignedCases: CartridgeCase[];
  reports: LabReport[];
  onSaveWeapon: (updated: StoredWeapon) => void;
  onAddHull: (weapon: Weapon) => void;
  onDeleteWeapon: (weaponId: string) => void;
}

export const WeaponList = memo(function WeaponList({ weapons, unassignedCases, reports, onSaveWeapon, onAddHull, onDeleteWeapon }: Props) {
  if (weapons.length === 0 && unassignedCases.length === 0) {
    return <p className="empty">No weapons identified yet. Import a lab report or add a weapon to get started.</p>;
  }

  const caseToWeaponId = new Map<string, string>();
  for (const weapon of weapons) {
    for (const hull of weapon.cases) {
      caseToWeaponId.set(hull.id, weapon.id);
    }
  }

  const comparedWeaponPairs = new Set<string>();
  for (const report of reports) {
    const firstWeaponId = caseToWeaponId.get(report.caseId1);
    const secondWeaponId = caseToWeaponId.get(report.caseId2);
    if (!firstWeaponId || !secondWeaponId || firstWeaponId === secondWeaponId) continue;
    comparedWeaponPairs.add([firstWeaponId, secondWeaponId].sort().join('|'));
  }

  const crossWeaponSuggestions: Array<{ weaponA: Weapon; weaponB: Weapon; caseA: string; caseB: string }> = [];
  for (let i = 0; i < weapons.length; i += 1) {
    for (let j = i + 1; j < weapons.length; j += 1) {
      const weaponA = weapons[i];
      const weaponB = weapons[j];
      if (!weaponA || !weaponB) continue;

      const typeA = weaponA.weaponType.trim().toLowerCase();
      const typeB = weaponB.weaponType.trim().toLowerCase();
      if (!typeA || !typeB || typeA !== typeB) continue;

      const pairKey = [weaponA.id, weaponB.id].sort().join('|');
      if (comparedWeaponPairs.has(pairKey)) continue;

      const firstCase = weaponA.cases[0]?.id;
      const secondCase = weaponB.cases[0]?.id;
      if (!firstCase || !secondCase) continue;

      crossWeaponSuggestions.push({ weaponA, weaponB, caseA: firstCase, caseB: secondCase });
    }
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

      {crossWeaponSuggestions.length > 0 && (
        <div className="weapon-card">
          <div className="weapon-card-header weapon-card-header-unassigned">
            <span className="weapon-type">Suggested cross-weapon checks (same type)</span>
            <span className="unlinked-badge" title="No report exists yet between these weapon groups">⚠</span>
          </div>
          <div className="weapon-report-rows">
            {crossWeaponSuggestions.map(({ weaponA, weaponB, caseA, caseB }) => {
              const key = `${weaponA.id}|${weaponB.id}`;
              return (
                <div key={key} className="linked-report-row">
                  <span className="weapon-report-id"><em className="unknown">pending</em></span>
                  <code>{caseA}</code>
                  <span className="match-arrow">↔</span>
                  <code>{caseB}</code>
                  <span className="match-badge no-match">NOT ANALYZED</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <UnassignedHullsCard cases={unassignedCases} />
    </div>
  );
});
