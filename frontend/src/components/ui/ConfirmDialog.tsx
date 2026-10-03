import React from 'react';
import { AlertTriangle, CheckCircle2, XCircle, Info, X } from 'lucide-react';

export type DialogVariant = 'warning' | 'danger' | 'success' | 'error' | 'info';

interface ConfirmDialogProps {
  isOpen: boolean;
  variant?: DialogVariant;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onClose: () => void;
}

const variantConfig: Record<DialogVariant, {
  icon: React.ElementType;
  iconClasses: string;
  confirmClasses: string;
}> = {
  warning: {
    icon: AlertTriangle,
    iconClasses: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
    confirmClasses: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25',
  },
  danger: {
    icon: XCircle,
    iconClasses: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400',
    confirmClasses: 'bg-red-600 hover:bg-red-700 shadow-red-500/25',
  },
  success: {
    icon: CheckCircle2,
    iconClasses: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
    confirmClasses: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25',
  },
  error: {
    icon: XCircle,
    iconClasses: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400',
    confirmClasses: 'bg-red-600 hover:bg-red-700 shadow-red-500/25',
  },
  info: {
    icon: Info,
    iconClasses: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
    confirmClasses: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25',
  },
};

export default function ConfirmDialog({
  isOpen,
  variant = 'info',
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const config = variantConfig[variant];
  const Icon = config.icon;
  const isConfirmation = typeof onConfirm === 'function';

  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center bg-slate-900/70 backdrop-blur-md p-3 anim-fade-in">
      <div className="my-auto relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden anim-scale-in">

        {/* Barra superior de color según variante */}
        <div className={`h-1.5 w-full ${
          variant === 'warning' ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
          variant === 'danger' || variant === 'error' ? 'bg-gradient-to-r from-red-500 to-rose-600' :
          variant === 'success' ? 'bg-gradient-to-r from-emerald-400 to-teal-500' :
          'bg-gradient-to-r from-blue-500 to-sky-600'
        }`} />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${config.iconClasses}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="min-w-0 pt-0.5">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug pr-6">
                {title}
              </h3>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 leading-relaxed break-words">
                {message}
              </p>
            </div>
          </div>

          <div className={`flex gap-3 mt-7 ${isConfirmation ? '' : 'justify-end'}`}>
            {isConfirmation && (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors active:scale-[0.98]"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={() => { onConfirm?.(); }}
              className={`${isConfirmation ? 'flex-1' : 'min-w-[120px]'} px-4 py-2.5 text-sm font-bold text-white rounded-xl transition-all shadow-md active:scale-[0.98] ${config.confirmClasses}`}
            >
              {isConfirmation ? confirmText : 'Entendido'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
