import { useState } from 'react';
import type { LabReport } from '../types';

interface Props {
  reports: LabReport[];
}

export function ReportList({ reports }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sorted = [...reports].sort(
    (a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime(),
  );

  if (sorted.length === 0) {
    return <p className="empty">No reports imported yet.</p>;
  }

  return (
    <div className="report-list">
      {sorted.map(r => (
        <div key={r.id} className="report-card">
          <button className="report-card-header" onClick={() => toggle(r.id)}>
            <span className="report-card-title">
              {r.reportId ? <code>{r.reportId}</code> : <em>— No ID —</em>}
            </span>
            <span className="report-card-meta">
              <code>{r.caseId1}</code>
              <span className="match-arrow">↔</span>
              <code>{r.caseId2}</code>
              <span className={`match-badge ${r.result === 'MATCH' ? 'match' : 'no-match'}`}>
                {r.result === 'MATCH' ? 'MATCH ✓' : r.result === 'DIFFERENT_WEAPON' ? 'DIFFERENT WEAPON ✗' : 'NO MATCH ✗'}
              </span>
            </span>
            <span className="report-card-toggle">{expanded.has(r.id) ? '▲' : '▼'}</span>
          </button>
          {expanded.has(r.id) && (
            <pre className="report-card-body">{r.rawText}</pre>
          )}
        </div>
      ))}
    </div>
  );
}
