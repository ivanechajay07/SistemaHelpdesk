import React, { useId } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
}

/** Campo de texto con etiqueta asociada, ayuda y error accesibles. */
const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leftIcon, className, id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'w-full px-4 py-2.5 rounded-xl bg-white/80 dark:bg-slate-950/60 backdrop-blur-sm border text-slate-900 dark:text-white text-sm placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30',
            leftIcon && 'pl-10',
            error
              ? 'border-rose-400 focus:border-rose-400'
              : 'border-slate-200 dark:border-slate-800 focus:border-blue-400/60',
            className,
          )}
          {...props}
        />
      </div>
      {hint && !error && (
        <p id={hintId} className="text-[11px] text-slate-400">{hint}</p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-[11px] font-medium text-rose-500">{error}</p>
      )}
    </div>
  );
});

export default Input;
