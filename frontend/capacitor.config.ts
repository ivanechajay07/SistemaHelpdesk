import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Configuración de la app Android (distribución libre, sin Play Store).
 *
 * androidScheme 'http' permite que el WebView hable con un backend en la LAN
 * (http://192.168.x.x:8089) sin certificado TLS. Si algún día el backend se
 * publica con HTTPS, cambiar a 'https' y poner cleartext en false.
 */
const config: CapacitorConfig = {
  appId: 'com.empresa.helpdesk',
  appName: 'HelpDesk PRO',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#0f172a',
      showSpinner: false,
    },
  },
};

export default config;
