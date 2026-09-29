import React from 'react';
import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = true,
  loading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="flex items-start gap-4 py-2">
        <div className={`p-3 rounded-full flex-shrink-0 ${danger ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="text-sm text-slate-300 leading-relaxed">
          {message}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors disabled:opacity-50"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`px-4 py-2 text-sm font-semibold rounded-lg text-white shadow-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${
            danger
              ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-950/50'
              : 'bg-sky-600 hover:bg-sky-700 shadow-sky-950/50'
          }`}
        >
          {loading && <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>}
          {confirmText}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
