import React from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';

export type FormTheme = 'users' | 'tickets' | 'tasks' | 'monitoring' | 'inventory' | 'categories' | 'templates' | 'knowledge';

const THEMES: Record<FormTheme, {
  header: string;
  iconBg: string;
  submit: string;
  submitShadow: string;
}> = {
  users: {
    header: 'from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10',
    iconBg: 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-blue-500/25',
    submit: 'from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700',
    submitShadow: 'shadow-blue-500/25',
  },
  tickets: {
    header: 'from-blue-50 to-sky-50 dark:from-blue-500/10 dark:to-sky-500/10',
    iconBg: 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-blue-500/25',
    submit: 'from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700',
    submitShadow: 'shadow-blue-500/25',
  },
  tasks: {
    header: 'from-teal-50 to-emerald-50 dark:from-teal-500/10 dark:to-emerald-500/10',
    iconBg: 'bg-gradient-to-br from-teal-600 to-emerald-600 shadow-teal-500/25',
    submit: 'from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700',
    submitShadow: 'shadow-teal-500/25',
  },
  monitoring: {
    header: 'from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10',
    iconBg: 'bg-gradient-to-br from-emerald-600 to-teal-600 shadow-emerald-500/25',
    submit: 'from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700',
    submitShadow: 'shadow-emerald-500/25',
  },
  inventory: {
    header: 'from-cyan-50 to-blue-50 dark:from-cyan-500/10 dark:to-blue-500/10',
    iconBg: 'bg-gradient-to-br from-cyan-600 to-blue-600 shadow-cyan-500/25',
    submit: 'from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700',
    submitShadow: 'shadow-cyan-500/25',
  },
  categories: {
    header: 'from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10',
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/25',
    submit: 'from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700',
    submitShadow: 'shadow-amber-500/25',
  },
  templates: {
    header: 'from-violet-50 to-fuchsia-50 dark:from-violet-500/10 dark:to-fuchsia-500/10',
    iconBg: 'bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-violet-500/25',
    submit: 'from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700',
    submitShadow: 'shadow-violet-500/25',
  },
  knowledge: {
    header: 'from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10',
    iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/25',
    submit: 'from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700',
    submitShadow: 'shadow-violet-500/25',
  },
};

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  theme?: FormTheme;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  loadingLabel?: string;
  loading?: boolean;
  children: React.ReactNode;
  maxWidth?: string;
  error?: string;
  closeOnBackdrop?: boolean;
}

/** Título de sección reutilizable dentro de los modales. */
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">{children}</h3>
  );
}

/** Shell de modal de formulario con diseño consistente y color por módulo. */
export default function FormModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  theme = 'tickets',
  onSubmit,
  submitLabel,
  loadingLabel,
  loading = false,
  children,
  maxWidth = 'max-w-lg',
  error,
  closeOnBackdrop = false,
}: FormModalProps) {
  if (!isOpen) return null;
  const t = THEMES[theme];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-md anim-fade-in"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        className={`my-auto w-full ${maxWidth} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden anim-scale-in flex flex-col max-h-[calc(100dvh-1.5rem)]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-gradient-to-r ${t.header}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl text-white shadow-md ${t.iconBg}`}>{icon}</div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{title}</h2>
              {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {children}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r ${t.submit} disabled:opacity-50 rounded-xl transition-all shadow-md ${t.submitShadow} flex items-center gap-2 active:scale-95`}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? (loadingLabel || 'Guardando...') : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
