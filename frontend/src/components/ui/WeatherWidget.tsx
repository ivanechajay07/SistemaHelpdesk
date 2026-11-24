import { useEffect, useState } from 'react';
import { Sun, Cloud, CloudSun, CloudFog, CloudRain, CloudDrizzle, CloudSnow, CloudLightning, MapPin, Loader2 } from 'lucide-react';
import { Geolocation } from '@capacitor/geolocation';
import { isNativeApp } from '../../lib/session';

interface WeatherData {
  temp: number;
  code: number;
  wind: number;
  city: string;
}

/**
 * Ubicación de respaldo (Lima, Perú) cuando el usuario no da permiso de
 * ubicación o el navegador la bloquea. Así el widget siempre muestra algo útil.
 */
const UBICACION_RESPALDO = { lat: -12.0464, lon: -77.0428, city: 'Lima, Perú' };

interface Coords {
  lat: number;
  lon: number;
  city?: string;
}

const codeToIcon = (code: number) => {
  if (code === 0) return Sun;
  if (code <= 2) return CloudSun;
  if (code === 3) return Cloud;
  if (code <= 48) return CloudFog;
  if (code <= 57) return CloudDrizzle;
  if (code <= 67 || (code >= 80 && code <= 82)) return CloudRain;
  if (code <= 77) return CloudSnow;
  if (code <= 86) return CloudSnow;
  if (code >= 95) return CloudLightning;
  return Cloud;
};

const conditionText = (code: number) => {
  if (code === 0) return 'Despejado';
  if (code <= 2) return 'Parcial nublado';
  if (code === 3) return 'Nublado';
  if (code <= 48) return 'Niebla';
  if (code <= 57) return 'Llovizna';
  if (code <= 67 || (code >= 80 && code <= 82)) return 'Lluvia';
  if (code <= 77) return 'Nieve';
  if (code <= 86) return 'Nieve';
  if (code >= 95) return 'Tormenta';
  return 'Nublado';
};

async function ubicacionNativa(): Promise<Coords | null> {
  try {
    const actuales = await Geolocation.checkPermissions();
    if (actuales.location !== 'granted') {
      const pedidos = await Geolocation.requestPermissions();
      if (pedidos.location !== 'granted') return null;
    }
    const pos = await Geolocation.getCurrentPosition({
      timeout: 12000,
      maximumAge: 600000,
      enableHighAccuracy: false,
    });
    return { lat: pos.coords.latitude, lon: pos.coords.longitude };
  } catch {
    return null;
  }
}

function ubicacionNavegador(): Promise<Coords | null> {
  if (!('geolocation' in navigator)) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 12000, maximumAge: 600000 },
    );
  });
}

async function cargarClima(coords: Coords): Promise<WeatherData> {
  const [clima, geo] = await Promise.all([
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`,
    ).then((r) => r.json()),
    coords.city
      ? Promise.resolve(null)
      : fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.lat}&longitude=${coords.lon}&localityLanguage=es`,
        )
          .then((r) => r.json())
          .catch(() => null),
  ]);

  return {
    temp: Math.round(clima.current?.temperature_2m ?? 0),
    code: clima.current?.weather_code ?? 0,
    wind: Math.round(clima.current?.wind_speed_10m ?? 0),
    city: coords.city || [geo?.city, geo?.principalSubdivision].filter(Boolean).join(', ') || 'Tu ubicación',
  };
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;

    const cargar = async () => {
      const coords =
        (isNativeApp ? await ubicacionNativa() : await ubicacionNavegador()) ?? UBICACION_RESPALDO;

      try {
        const data = await cargarClima(coords);
        if (!cancelled) {
          setWeather(data);
          setState('ok');
        }
      } catch {
        if (cancelled) return;
        // Si falló con la ubicación real, intenta al menos con la de respaldo.
        if (!coords.city) {
          try {
            const data = await cargarClima(UBICACION_RESPALDO);
            if (!cancelled) {
              setWeather(data);
              setState('ok');
              return;
            }
          } catch {
            /* sin conexión */
          }
        }
        if (!cancelled) setState('error');
      }
    };

    void cargar();

    return () => {
      cancelled = true;
    };
  }, []);

  const Icon = weather ? codeToIcon(weather.code) : Cloud;

  return (
    <div className="px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 flex items-center gap-3 w-full sm:w-auto anim-fade-in-up">
      {state === 'loading' && (
        <div className="flex items-center gap-2.5">
          <Loader2 className="w-6 h-6 text-white/70 animate-spin" />
          <p className="text-xs font-semibold text-white/80">Obteniendo clima...</p>
        </div>
      )}

      {state === 'ok' && weather && (
        <>
          <div className="flex items-center gap-2.5">
            <Icon className="w-8 h-8 text-amber-300 drop-shadow-lg" />
            <div className="leading-tight">
              <p className="text-lg font-black text-white tabular-nums leading-none">{weather.temp}°C</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/70 mt-0.5">{conditionText(weather.code)}</p>
            </div>
          </div>
          <div className="h-8 w-px bg-white/20" />
          <div className="leading-tight min-w-0">
            <p className="flex items-center gap-1 text-xs font-bold text-white truncate max-w-[120px]">
              <MapPin className="w-3 h-3 shrink-0 text-cyan-200" /> {weather.city}
            </p>
            <p className="text-[10px] font-semibold text-white/60 mt-0.5">Viento {weather.wind} km/h</p>
          </div>
        </>
      )}

      {state === 'error' && (
        <div className="leading-tight">
          <p className="text-xs font-bold text-white/80">Clima no disponible</p>
          <p className="text-[10px] text-white/50">Sin conexión a internet</p>
        </div>
      )}
    </div>
  );
}
