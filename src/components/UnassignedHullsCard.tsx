import { memo } from 'react';
import type { CartridgeCase } from '../types';

interface Props {
  cases: CartridgeCase[];
}

export const UnassignedHullsCard = memo(function UnassignedHullsCard({ cases }: Props) {
  if (cases.length === 0) return null;
  return (
    <div className="weapon-card weapon-card-unassigned">
      <div className="weapon-card-header weapon-card-header-unassigned">
        <span className="weapon-type">
          <span className="unknown">Unassigned Hulls</span>
        </span>
        <span className="unlinked-badge" title="These hulls are not assigned to any weapon">⚠</span>
      </div>
      <table className="weapon-inner-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Type</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {cases.map(c => (
            <tr key={c.id}>
              <td><code>{c.id}</code></td>
              <td>{c.weaponType || <span className="unknown">—</span>}</td>
              <td>{c.notes || <span className="unknown">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
