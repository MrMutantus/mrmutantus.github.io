import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Weapon } from '../types';
import { generateReport } from '../report';
import { useModalA11y } from '../hooks/useModalA11y';

interface Props {
  weapons: Weapon[];
  onClose: () => void;
}

export function SummaryReportModal({ weapons, onClose }: Props) {
  const modalRef = useModalA11y(onClose);
  const [copied, setCopied] = useState(false);
  const text = useMemo(() => generateReport(weapons), [weapons]);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(text).then(() => setCopied(true));
  }, [text]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="summary-modal-title"
        className="modal modal-wide"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="summary-modal-title">Forensics Report</h2>
          <button className="btn-close" aria-label="Close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <textarea className="report-output" readOnly value={text} rows={16} />
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
          <button className="btn-primary" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}
