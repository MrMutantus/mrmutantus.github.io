import { memo, useMemo } from 'react';
import type { CartridgeCase, LabReport, StoredWeapon } from '../types';

interface Props {
  cases: CartridgeCase[];
  reports: LabReport[];
  weapons: StoredWeapon[];
  onSelect: (id: string) => void;
}

export const EvidenceTable = memo(function EvidenceTable({ cases, reports, weapons, onSelect }: Props) {
  const weaponMap = useMemo(() => new Map(weapons.map(w => [w.id, w])), [weapons]);

  const reportCountMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of reports) {
      m.set(r.caseId1, (m.get(r.caseId1) ?? 0) + 1);
      m.set(r.caseId2, (m.get(r.caseId2) ?? 0) + 1);
    }
    return m;
  }, [reports]);

  if (cases.length === 0) {
    return <p className="empty">No hulls tracked yet. Import a lab report to get started.</p>;
  }

  return (
    <table className="evidence-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Weapon</th>
          <th>Type</th>
          <th>Serial Number</th>
          <th>Reports</th>
        </tr>
      </thead>
      <tbody>
        {cases.map(c => {
          const weapon = c.weaponId ? weaponMap.get(c.weaponId) : undefined;
          return (
            <tr key={c.id} onClick={() => onSelect(c.id)} className="evidence-row">
              <td><code>{c.id}</code></td>
              <td>
                {weapon
                  ? <span>{weapon.weaponType || weapon.serialNumber || <em className="unknown">unnamed</em>}</span>
                  : <span className="unknown">—</span>}
              </td>
              <td>{c.weaponType || <span className="unknown">—</span>}</td>
              <td>
                {c.serialNumber
                  ? <code className="serial">{c.serialNumber}</code>
                  : <span className="unknown">—</span>}
              </td>
              <td>{reportCountMap.get(c.id) ?? 0}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
});
