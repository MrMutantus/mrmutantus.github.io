import type { CartridgeCase, LabReport } from '../types';

interface Props {
  cases: CartridgeCase[];
  reports: LabReport[];
  onSelect: (id: string) => void;
}

export function EvidenceTable({ cases, reports, onSelect }: Props) {
  const reportCountFor = (caseId: string) =>
    reports.filter(r => r.caseId1 === caseId || r.caseId2 === caseId).length;

  if (cases.length === 0) {
    return <p className="empty">No evidence tracked yet. Import a lab report to get started.</p>;
  }

  return (
    <table className="evidence-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Weapon Type</th>
          <th>Serial Number</th>
          <th>Reports</th>
        </tr>
      </thead>
      <tbody>
        {cases.map(c => (
          <tr key={c.id} onClick={() => onSelect(c.id)} className="evidence-row">
            <td><code>{c.id}</code></td>
            <td>{c.weaponType || <span className="unknown">—</span>}</td>
            <td>
              {c.serialNumber
                ? <code className="serial">{c.serialNumber}</code>
                : <span className="unknown">—</span>}
            </td>
            <td>{reportCountFor(c.id)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
