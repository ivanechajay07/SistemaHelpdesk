import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/axios';
import { ESTADO_LABELS, ESTADO_BADGE } from '../store/inventoryStore';
import {
  Package, Loader2, ShieldCheck, Tag, MapPin, User, Building2, Cpu, CalendarDays, X,
} from 'lucide-react';

interface PublicActivo {
  codigo: string;
  nombre: string;
  categoria?: string | null;
  marca?: string | null;
  modelo?: string | null;
  numeroSerie?: string | null;
  estado?: string | null;
  sede?: string | null;
  entidad?: string | null;
  area?: string | null;
  ubicacionFisica?: string | null;
  responsable?: string | null;
  cargoResponsable?: string | null;
  fechaIngreso?: string | null;
  fotoUrl?: string | null;
  especificaciones?: Record<string, string>;
}

export default function QrPublic() {
  const { token } = useParams<{ token: string }>();
  const [activo, setActivo] = useState<PublicActivo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    api
      .get(`/inventario/activos/qr/${encodeURIComponent(token)}`)
      .then((res) => {
        if (!active) return;
        setActivo(res.data);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setNotFound(true);
        setLoading(false);
      });
    return () => { active = false; };
  }, [token]);

  const estado = activo?.estado as string | undefined;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div className="w-10 h-10 bg-gradient-to-tr from-cyan-600 to-teal-500 rounded-xl shadow-lg flex items-center justify-center text-white font-bold text-lg">
            H
          </div>
          <h1 className="text-xl font-black tracking-tight">
            HelpDesk <span className="text-teal-500">PRO</span>
          </h1>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl p-12 flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            <p className="text-sm font-semibold">Consultando activo...</p>
          </div>
        ) : notFound || !activo ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl p-10 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-500/15 flex items-center justify-center">
              <X className="w-7 h-7 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Activo no encontrado</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              El código QR no corresponde a ningún activo registrado en el sistema.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500" />
            <div className="p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shrink-0 shadow-lg shadow-teal-500/25">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-wider text-teal-600 dark:text-teal-400">
                      {activo.categoria || 'Activo'}
                    </p>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight truncate">
                      {activo.nombre}
                    </h2>
                  </div>
                </div>
                <span className="font-mono text-xs font-black text-slate-400 shrink-0">{activo.codigo}</span>
              </div>

              {estado && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ring-1 ring-inset mb-4 ${ESTADO_BADGE[estado] || 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-400'}`}>
                  <ShieldCheck className="w-3.5 h-3.5" /> {ESTADO_LABELS[estado] || estado}
                </span>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activo.marca || activo.modelo ? (
                  <Info icon={Cpu} label="Marca / Modelo" value={`${activo.marca || ''} ${activo.modelo || ''}`.trim()} />
                ) : null}
                {activo.numeroSerie && <Info icon={Tag} label="N° de serie" value={activo.numeroSerie} />}
                {activo.sede && <Info icon={Building2} label="Sede" value={`${activo.sede}${activo.entidad ? ` · ${activo.entidad}` : ''}`} />}
                {activo.ubicacionFisica && <Info icon={MapPin} label="Ubicación" value={activo.ubicacionFisica} />}
                {activo.responsable && <Info icon={User} label="Responsable" value={`${activo.responsable}${activo.cargoResponsable ? ` (${activo.cargoResponsable})` : ''}`} />}
                {activo.fechaIngreso && <Info icon={CalendarDays} label="Fecha de ingreso" value={new Date(activo.fechaIngreso).toLocaleDateString('es-PE')} />}
              </div>

              {activo.especificaciones && Object.keys(activo.especificaciones).length > 0 && (
                <div className="mt-4 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                  {Object.entries(activo.especificaciones).map(([k, v], i) => (
                    <div key={k} className={`flex items-center justify-between px-4 py-2.5 ${i % 2 ? 'bg-slate-50 dark:bg-slate-800/40' : 'bg-white dark:bg-slate-900'}`}>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{k}</span>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}

              <p className="mt-5 text-center text-[11px] text-slate-400 font-medium">
                Información generada por el módulo de Inventario de HelpDesk PRO
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 break-words">{value}</p>
    </div>
  );
}