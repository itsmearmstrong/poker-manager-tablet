import Modal from './Modal';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal title={title} onClose={onCancel} width="max-w-sm">
      <p className="mb-5 text-sm text-ink-500">{message}</p>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-lg border border-ink-600 px-4 py-2 text-sm text-white hover:bg-ink-700"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
            danger ? 'bg-red-700 hover:bg-red-600' : 'bg-felt-700 hover:bg-felt-600'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
