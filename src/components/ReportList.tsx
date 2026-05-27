import { useState } from 'react';
import type { LabReport } from '../types';

interface Props {
  reports: LabReport[];
  onSaveReportId: (id: string, reportId: string | undefined) => void;
}

const REPORT_ID_RE = /^#[0-9a-f]{7}$/i;

export function ReportList({ reports, onSaveReportId }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState('');

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startEdit = (r: LabReport) => {
    setEditingId(r.id);
    setDraft(r.reportId ?? '');
    setDraftError('');
  };

  const handleDraftChange = (val: string) => {
    setDraft(val);
    setDraftError(val && !REPORT_ID_RE.test(val.trim()) ? 'Format: #xxxxxxx (7 hex chars)' : '');
  };

  const commitEdit = () => {
    if (draftError) return;
    const trimmed = draft.trim().toLowerCase();
    onSaveReportId(editingId!, trimmed || undefined);
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

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
          <div
            className="report-card-header"
            role="button"
            tabIndex={0}
            onClick={() => { if (editingId !== r.id) toggle(r.id); }}
            onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && editingId !== r.id) toggle(r.id); }}
          >
            <span className="report-card-title">
              {editingId === r.id ? (
                <span className="report-id-edit" onClick={e => e.stopPropagation()}>
                  <input
                    className={`report-id-input${draftError ? ' input-error' : ''}`}
                    value={draft}
                    onChange={e => handleDraftChange(e.target.value)}
                    autoFocus
                    spellCheck={false}
                    placeholder="#xxxxxxx"
                    onKeyDown={e => {
                      e.stopPropagation();
                      if (e.key === 'Enter') commitEdit();
                      if (e.key === 'Escape') cancelEdit();
                    }}
                  />
                  <button className="report-id-btn" onClick={e => { e.stopPropagation(); commitEdit(); }} title="Save" disabled={!!draftError}>✓</button>
                  <button className="report-id-btn" onClick={e => { e.stopPropagation(); cancelEdit(); }} title="Cancel">✕</button>
                  {draftError && <span className="field-error report-id-error">{draftError}</span>}
                </span>
              ) : (
                <span className="report-id-display">
                  {r.reportId ? <code>{r.reportId}</code> : <em>— No ID —</em>}
                  <button className="report-id-edit-btn" title="Edit report ID" onClick={e => { e.stopPropagation(); startEdit(r); }}>✎</button>
                </span>
              )}
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
          </div>
          {expanded.has(r.id) && (
            <pre className="report-card-body">{r.rawText}</pre>
          )}
        </div>
      ))}
    </div>
  );
}
