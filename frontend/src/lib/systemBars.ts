import { Capacitor, registerPlugin } from '@capacitor/core';

interface SystemBarsPlugin {
  setStyle(options: {
    style?: 'DEFAULT' | 'DARK' | 'LIGHT';
    bar?: 'StatusBar' | 'NavigationBar';
  }): Promise<void>;
}

const SystemBars = registerPlugin<SystemBarsPlugin>('SystemBars');

/**
 * Ajusta el color de los iconos de la barra de estado y de navegación al tema
 * de la app.
 *
 * En Android el fondo de esas zonas lo pinta el propio documento (edge-to-edge),
 * así que aquí solo se cambia el contraste de los iconos: claros sobre tema
 * oscuro y oscuros sobre tema claro.
 */
export async function aplicarTemaBarrasSistema(isDark: boolean): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await SystemBars.setStyle({ style: isDark ? 'DARK' : 'LIGHT' });
  } catch {
    // Dispositivo sin el plugin (o WebView antiguo): no es un error bloqueante.
  }
}
