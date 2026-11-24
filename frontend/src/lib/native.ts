import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';

/**
 * Ajustes que solo aplican dentro de la APK. En el navegador no hace nada.
 *
 * Las barras del sistema se manejan en `systemBars.ts` (tema claro/oscuro).
 */
export async function initNativeShell(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await SplashScreen.hide();
  } catch {
    // Sin splash configurado: no es un error.
  }

  // Botón atrás de Android: navega en el historial y cierra la app al final.
  void App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      void App.exitApp();
    }
  });
}
