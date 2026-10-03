import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  variant: ToastVariant;
  title: string;
  message?: string;
  duration: number;
}

interface ToastOptions {
  variant?: ToastVariant;
  title: string;
  message?: string;
  duration?: number;
}

const ToastContext = createContext<{ toast: (options: ToastOptions) => void } | null>(null);

const variantConfig: Record<ToastVariant, {
  icon: React.ElementType;
  iconClasses: string;
  barClasses: string;
}> = {
  success: {
    icon: CheckCircle2,
    iconClasses: 'text-emerald-500',
    barClasses: 'bg-gradient-to-r from-emerald-400 to-teal-500',
  },
  error: {
    icon: XCircle,
    iconClasses: 'text-red-500',
    barClasses: 'bg-gradient-to-r from-red-400 to-rose-500',
  },
  info: {
    icon: Info,
    iconClasses: 'text-blue-500',
    barClasses: 'bg-gradient-to-r from-blue-400 to-sky-500',
  },
  warning: {
    icon: AlertTriangle,
    iconClasses: 'text-amber-500',
    barClasses: 'bg-gradient-to-r from-amber-400 to-orange-500',
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(({ variant = 'info', title, message, duration = 4200 }: ToastOptions) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev.slice(-4), { id, variant, title, message, duration }]);
    window.setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-3 w-[calc(100vw-2rem)] max-w-sm pointer-events-none">
        {toasts.map((t) => {
          const config = variantConfig[t.variant];
          const Icon = config.icon;
          return (
            <div
              key={t.id}
              className="anim-slide-in-right pointer-events-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-start gap-3 p-4 pr-2.5">
                <div className={`mt-0.5 shrink-0 ${config.iconClasses}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{t.title}</p>
                  {t.message && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed break-words">
                      {t.message}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                  aria-label="Cerrar notificación"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div
                className={`h-1 origin-left ${config.barClasses}`}
                style={{ animation: `shrinkBar ${t.duration}ms linear forwards` }}
              />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx.toast;
}
