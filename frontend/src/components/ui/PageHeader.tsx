import React from 'react';
import { Sparkles } from 'lucide-react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  gradient?: string;
  /** Acciones (botones) alineadas a la derecha del encabezado. */
  children?: React.ReactNode;
}

/**
 * Encabezado de página común a todos los módulos.
 * Mantiene el mismo lenguaje visual del Dashboard: aurora, malla sutil y glass.
 */
export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  gradient = 'from-blue-600 via-blue-700 to-slate-800',
  children,
}: PageHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-hero bg-slate-950 p-px shadow-2xl shadow-blue-950/25 anim-fade-in-up">
      <div className={`relative overflow-hidden rounded-hero bg-gradient-to-br ${gradient} px-6 py-7 sm:px-8 sm:py-8 transition-colors duration-700`}>
        {/* Aurora + malla sutil, igual que el hero del Dashboard */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(255,255,255,0.18),transparent_38%),radial-gradient(circle_at_85%_10%,rgba(34,211,238,0.28),transparent_40%),radial-gradient(circle_at_60%_110%,rgba(16,185,129,0.18),transparent_40%)]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.10]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.75) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.75) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
            maskImage: 'radial-gradient(ellipse at 30% 20%, black, transparent 75%)',
          }}
        />
        <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center shrink-0 shadow-lg shadow-black/15">
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              {eyebrow && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/15 text-[10px] font-black tracking-[0.16em] uppercase text-white/90 mb-2">
                  <Sparkles className="w-3 h-3" /> {eyebrow}
                </span>
              )}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-white/80 mt-1.5 font-medium text-sm sm:text-base max-w-2xl">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {children && (
            <div className="relative flex flex-wrap items-center gap-2.5 shrink-0">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

