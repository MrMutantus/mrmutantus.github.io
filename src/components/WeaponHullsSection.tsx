import { useState } from 'react';
import type { Weapon } from '../types';

interface Props {
  weapon: Weapon;
  onAddHull: (weapon: Weapon) => void;
}

export function WeaponHullsSection({ weapon, onAddHull }: Props) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="weapon-section">
      <button
        className="weapon-section-toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded(v => !v)}
      >
        <span>Hulls ({weapon.cases.length})</span>
        <span className="report-card-toggle">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <>
          {weapon.cases.length === 0
            ? <p className="weapon-empty-section">No hulls assigned yet.</p>
            : (
              <table className="weapon-inner-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {weapon.cases.map(c => (
                    <tr key={c.id}>
                      <td><code>{c.id}</code></td>
                      <td>{c.notes || <span className="unknown">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          <div className="weapon-add-hull-action">
            <button className="btn-secondary btn-sm" onClick={() => onAddHull(weapon)}>Add Hull</button>
          </div>
        </>
      )}
    </div>
  );
}
