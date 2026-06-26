import Modal from './Modal';
import Button from './Button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
}

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText = 'Confirm', variant = 'danger', loading }: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${variant === 'danger' ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">{title}</h3>
            <p className="mt-1.5 text-sm text-surface-500 dark:text-surface-400">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>{confirmText}</Button>
        </div>
      </div>
    </Modal>
  );
}
