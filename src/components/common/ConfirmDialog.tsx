import { Modal } from './Modal';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Excluir',
  onConfirm,
  onCancel,
  danger = true,
}: ConfirmDialogProps) {
  return (
    <Modal
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" onClick={onCancel} className="mini-btn">
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} className={`mini-btn ${danger ? 'danger' : 'accent'}`}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-app-muted">{message}</p>
    </Modal>
  );
}
