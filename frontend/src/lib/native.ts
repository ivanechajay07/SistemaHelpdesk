import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Ajustes que solo aplican dentro de la APK. En el navegador no hace nada.
 */
export async function initNativeShell(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setStyle({ style: Style.Light });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#0f172a' });
      await StatusBar.setOverlaysWebView({ overlay: false });
    }
  } catch {
    // El plugin puede no estar disponible en el navegador o en iOS.
  }

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
