import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from './Button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/** Estado de error consistente con acción de reintento. */
export default function ErrorState({
  title = 'No se pudo cargar la información',
  description = 'Revisa tu conexión e inténtalo nuevamente.',
  onRetry,
  retryLabel = 'Reintentar',
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center justify-center text-center py-10 px-4', className)}
    >
      <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-100 dark:ring-rose-500/20 flex items-center justify-center mb-3">
        <AlertTriangle className="w-6 h-6 text-rose-500 dark:text-rose-400" />
      </div>
      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{title}</p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm">{description}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          className="mt-4"
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
