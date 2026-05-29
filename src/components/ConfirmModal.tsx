import { useModalA11y } from '../hooks/useModalA11y';

interface Props {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: Props) {
  const ref = useModalA11y(onCancel);
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="modal modal-confirm"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="confirm-modal-title">Confirm</h2>
          <button className="btn-close" aria-label="Close" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          <p className="modal-message">{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel}>{cancelLabel}</button>
          <button className="btn-primary" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
