import React from 'react';
import { AlertOctagon, Home, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message?: string;
}

/** Captura errores de renderizado (incluidos chunks lazy) y muestra una salida segura. */
export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error?.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary:', error, info.componentStack);
  }

  private reload = () => {
    window.location.reload();
  };

  private goHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="relative w-full max-w-lg overflow-hidden rounded-hero border border-slate-200/80 bg-white/90 p-8 text-center shadow-2xl shadow-slate-950/10 ring-1 ring-slate-900/5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-rose-400/10 blur-3xl" />
          <div className="relative">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:ring-rose-500/20">
              <AlertOctagon className="h-7 w-7 text-rose-500 dark:text-rose-400" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Algo salió mal
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              La pantalla no pudo cargarse. Puedes recargar la página o volver al panel principal.
            </p>
            {this.state.message && (
              <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-mono text-slate-400 dark:bg-slate-950/60 dark:text-slate-500 break-words">
                {this.state.message}
              </p>
            )}
            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              <button
                onClick={this.reload}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-px active:scale-[0.98]"
              >
                <RefreshCw className="h-4 w-4" /> Recargar
              </button>
              <button
                onClick={this.goHome}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500/40 dark:hover:text-blue-400"
              >
                <Home className="h-4 w-4" /> Ir al dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

