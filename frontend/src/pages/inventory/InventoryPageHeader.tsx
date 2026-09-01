import React from 'react';
import { Sparkles } from 'lucide-react';

interface Props {
  eyebrow: string;
  title: string;
  subtitle: string;
  gradient?: string;
  icon: React.ElementType;
}

export default function InventoryPageHeader({ eyebrow, title, subtitle, gradient = 'from-cyan-600 via-teal-600 to-emerald-700', icon: Icon }: Props) {
  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} px-6 py-7 sm:px-8 sm:py-9 shadow-xl shadow-teal-500/20 anim-fade-in-up`}>
      <div className="absolute -top-16 -right-16 w-56 h-56 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-10 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-6 right-1/3 w-24 h-24 border border-white/15 rounded-full pointer-events-none" />
      <div className="relative flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center shrink-0">
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-[11px] font-black tracking-widest uppercase text-white/90 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            {eyebrow}
          </span>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">{title}</h1>
          <p className="text-white/85 mt-2 font-medium text-sm sm:text-base max-w-2xl">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
