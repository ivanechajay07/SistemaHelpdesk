import { useEffect, useState } from 'react';
import { Sun, Cloud, CloudSun, CloudFog, CloudRain, CloudDrizzle, CloudSnow, CloudLightning, MapPin, Loader2 } from 'lucide-react';

interface WeatherData {
  temp: number;
  code: number;
  wind: number;
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

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [city, setCity] = useState('');
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    if (!('geolocation' in navigator)) {
      setState('error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const [w, g] = await Promise.all([
            fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`
            ).then((r) => r.json()),
            fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=es`
            ).then((r) => r.json()),
          ]);
          if (cancelled) return;
          setWeather({
            temp: Math.round(w.current?.temperature_2m ?? 0),
            code: w.current?.weather_code ?? 0,
            wind: Math.round(w.current?.wind_speed_10m ?? 0),
          });
          setCity([g.city, g.principalSubdivision].filter(Boolean).join(', ') || 'Tu ubicación');
          setState('ok');
        } catch {
          if (!cancelled) setState('error');
        }
      },
      () => {
        if (!cancelled) setState('error');
      },
      { timeout: 12000, maximumAge: 600000 }
    );

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
              <MapPin className="w-3 h-3 shrink-0 text-cyan-200" /> {city}
            </p>
            <p className="text-[10px] font-semibold text-white/60 mt-0.5">Viento {weather.wind} km/h</p>
          </div>
        </>
      )}

      {state === 'error' && (
        <div className="leading-tight">
          <p className="text-xs font-bold text-white/80">Clima no disponible</p>
          <p className="text-[10px] text-white/50">Activa tu ubicación e intenta de nuevo</p>
        </div>
      )}
    </div>
  );
}