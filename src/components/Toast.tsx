import React from 'react';
import { Undo2, CheckCircle2, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  text: string;
  actionText?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}

interface ToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  if (!toast) return null;

  return (
    <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#292524] text-[#FFFDF9] px-4 py-3 rounded-xl shadow-[3px_3px_0px_#1C1917] border border-[#44403C] animate-in slide-in-from-bottom-5 duration-150 max-w-sm sm:max-w-md w-[92%] sm:w-auto">
      <CheckCircle2 className="w-5 h-5 text-[#A7F3D0] shrink-0" />
      <span className="text-xs sm:text-sm font-medium flex-1 truncate">{toast.text}</span>
      {toast.onAction && toast.actionText && (
        <button
          onClick={() => {
            toast.onAction?.();
            onClose();
          }}
          className="flex items-center gap-1 font-ledger-mono text-xs font-bold text-[#A7F3D0] hover:text-[#FFFDF9] bg-[#1C1917] px-2.5 py-1.5 rounded-lg border border-[#44403C] transition active:translate-x-[0.5px] active:translate-y-[0.5px] shrink-0"
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span>{toast.actionText.toUpperCase()}</span>
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar notificação"
        className="text-[#A8A29E] hover:text-[#FFFDF9] p-1 rounded hover:bg-[#44403C] transition shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
