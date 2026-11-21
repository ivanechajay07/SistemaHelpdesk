import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-blue-600 via-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-px',
  secondary:
    'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500/40 hover:text-blue-600 dark:hover:text-blue-400',
  ghost:
    'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
  danger:
    'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 hover:-translate-y-px',
  glass:
    'bg-white/15 text-white border border-white/25 backdrop-blur-sm hover:bg-white/25',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-5 py-3 text-sm rounded-xl gap-2',
};

/** Botón base del sistema de diseño. */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    className,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-bold transition-all duration-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:opacity-50 disabled:pointer-events-none',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : leftIcon}
      {children}
      {rightIcon}
    </button>
  );
});

export default Button;
