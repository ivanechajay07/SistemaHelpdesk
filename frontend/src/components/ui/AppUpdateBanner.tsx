import { useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Download, X } from 'lucide-react';
import { appService, type AppVersion } from '../../services/appService';
import { isNativeApp } from '../../lib/session';

/**
 * Aviso de nueva versión del APK.
 *
 * Como la distribución es libre (sin Play Store), la app compara su versionCode
 * con el que publica el backend y ofrece descargar el APK en el navegador del
 * dispositivo, que es el flujo de instalación que Android espera.
 */
export default function AppUpdateBanner() {
  const [version, setVersion] = useState<AppVersion | null>(null);
  const [descartado, setDescartado] = useState(false);

  useEffect(() => {
    if (!isNativeApp) return;
    let activo = true;

    const comprobar = async () => {
      try {
        const [info, { data }] = await Promise.all([App.getInfo(), appService.getVersion()]);
        const actual = Number.parseInt(info.build, 10) || 0;
        if (activo && data.apkUrl && data.versionCode > actual) {
          setVersion(data);
        }
      } catch {
        // Sin red o backend sin APK configurada: no se muestra nada.
      }
    };

    void comprobar();
    return () => {
      activo = false;
    };
  }, []);

  if (!version || (descartado && !version.mandatory)) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[70] border-b border-blue-500/30 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-4 py-3 text-white shadow-lg">
      <div className="mx-auto flex max-w-5xl items-center gap-3">
        <Download className="h-5 w-5 shrink-0 text-cyan-300" aria-hidden="true" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-bold">
            Nueva versión disponible: {version.versionName}
          </p>
          <p className="truncate text-xs text-blue-200">
            {version.notes || 'Incluye mejoras y correcciones.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void Browser.open({ url: version.apkUrl })}
          className="shrink-0 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 px-3 py-1.5 text-xs font-bold shadow hover:opacity-90"
        >
          Actualizar
        </button>
        {!version.mandatory && (
          <button
            type="button"
            onClick={() => setDescartado(true)}
            aria-label="Ocultar aviso de actualización"
            className="shrink-0 rounded-lg p-1 text-blue-200 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
