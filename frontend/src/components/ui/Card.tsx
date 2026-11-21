import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

/** Superficie base: glass suave, borde y sombras en capas. */
const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { hover = false, className, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/70 shadow-sm ring-1 ring-slate-900/5 backdrop-blur-sm',
        hover && 'app-card-interactive',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});

export default Card;
