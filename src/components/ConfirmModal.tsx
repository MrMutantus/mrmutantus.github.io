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
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal modal-confirm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Confirm</h2>
          <button className="btn-close" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ margin: 0 }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel}>{cancelLabel}</button>
          <button className="btn-primary" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
