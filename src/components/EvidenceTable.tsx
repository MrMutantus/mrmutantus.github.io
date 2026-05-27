import type { CartridgeCase, LabReport, StoredWeapon } from '../types';

interface Props {
  cases: CartridgeCase[];
  reports: LabReport[];
  weapons: StoredWeapon[];
  onSelect: (id: string) => void;
}

export function EvidenceTable({ cases, reports, weapons, onSelect }: Props) {
  const reportCountFor = (caseId: string) =>
    reports.filter(r => r.caseId1 === caseId || r.caseId2 === caseId).length;

  const weaponFor = (c: CartridgeCase) =>
    c.weaponId ? weapons.find(w => w.id === c.weaponId) : undefined;

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
          const weapon = weaponFor(c);
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
              <td>{reportCountFor(c.id)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
