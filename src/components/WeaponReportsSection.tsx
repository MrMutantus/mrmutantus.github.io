import { useState } from 'react';
import type { Weapon } from '../types';
import { MatchBadge } from './MatchBadge';

interface Props {
  weapon: Weapon;
}

export function WeaponReportsSection({ weapon }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="weapon-section">
      <button
        className="weapon-section-toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded(v => !v)}
      >
        <span>Reports ({weapon.reports.length})</span>
        <span className="report-card-toggle">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div className="weapon-report-rows">
          {weapon.reports.length === 0
            ? <p className="weapon-empty-section">No reports for this weapon.</p>
            : weapon.reports.map(r => (
              <div key={r.id} className="linked-report-row">
                <span className="weapon-report-id">
                  {r.reportId ? <code>{r.reportId}</code> : <em className="unknown">— No ID —</em>}
                </span>
                <code>{r.caseId1}</code>
                <span className="match-arrow">↔</span>
                <code>{r.caseId2}</code>
                <MatchBadge result={r.result} />
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
