import { useState } from 'react';
import type { Weapon } from '../types';
import { generateReport } from '../report';

interface Props {
  weapons: Weapon[];
  onClose: () => void;
}

export function SummaryReportModal({ weapons, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const text = generateReport(weapons);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Forensics Report</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
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
