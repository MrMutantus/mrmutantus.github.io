import { useState } from 'react';
import { parseLabReport } from '../parser';
import type { ParsedReport } from '../types';

const REPORT_ID_RE = /^#[0-9a-f]{7}$/i;

interface Props {
  onImport: (reportId: string | undefined, parsed: ParsedReport, rawText: string) => void;
  onClose: () => void;
}

export function ImportReportModal({ onImport, onClose }: Props) {
  const [text, setText] = useState('');
  const [reportId, setReportId] = useState('');
  const [reportIdError, setReportIdError] = useState('');

  const parsed = text.trim() ? parseLabReport(text) : null;

  const handleReportIdChange = (val: string) => {
    setReportId(val);
    setReportIdError(val && !REPORT_ID_RE.test(val) ? 'Format: #xxxxxxx (7 hex chars)' : '');
  };

  const handleConfirm = () => {
    if (!parsed || reportIdError) return;
    onImport(reportId || undefined, parsed, text.trim());
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Import Lab Report</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <label>
            Report ID <span className="optional">(optional)</span>
            <input
              value={reportId}
              onChange={e => handleReportIdChange(e.target.value)}
              placeholder="#a4f2871"
              className={reportIdError ? 'input-error' : ''}
            />
            {reportIdError && <span className="field-error">{reportIdError}</span>}
          </label>

          <label>
            Report Text
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={8}
              placeholder="Paste the German lab report here..."
            />
          </label>

          {text.trim() && (
            <div className={`parse-preview ${parsed ? 'parse-ok' : 'parse-fail'}`}>
              {parsed ? (
                <>
                  <div><code>{parsed.caseId1}</code> vs <code>{parsed.caseId2}</code></div>
                  <div>Weapon 1: {parsed.weaponType1 || '—'}</div>
                  <div>Weapon 2: {parsed.weaponType2 || '—'}</div>
                  <div className={parsed.result === 'MATCH' ? 'match-text' : 'no-match-text'}>
                    Result: {parsed.result === 'MATCH' ? 'MATCH ✓' : parsed.result === 'DIFFERENT_WEAPON' ? 'DIFFERENT WEAPON ✗' : 'NO MATCH ✗'}
                  </div>
                </>
              ) : (
                <span>Could not parse report — check format.</span>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleConfirm}
            disabled={!parsed || !!reportIdError}
          >
            Confirm Import
          </button>
        </div>
      </div>
    </div>
  );
}
